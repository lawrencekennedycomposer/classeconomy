/* =========================================================
   PC#083 — Coin Flip Base Layer (Phase 2) — Knockout Runner
   File: coinflip.base.pc083.js

   Purpose:
     - Phase 2 UI + state machine for Coin Flip Knockout
     - Strict gating: FLIP enabled only when ALL survivors have chosen H/T
     - Multi-round elimination until 1 winner remains
     - Winner celebration, then emit 'coinflip:completed'
     - +3 award placeholder (wiring later)

   Depends on:
     - PC085 provides: window.__CE_LB_COINFLIP_HT.mount/unmount
       and exposes pick access via window.__CE_LB_COINFLIP_HT._debug.getPick/setPick
     - Leaderboard rows: #leaderboard .lb-item with dataset.studentId
     - PC085 overlays: [data-ce-coinflip-ht-overlay="1"]

   Notes:
     - Does not modify leaderboard rendering module (PC051)
     - Disables knocked-out overlays by DOM style (pointer-events: none)
   ========================================================= */

(() => {
  let el = null;

  // UI refs
  let roundValEl = null;
  let survValEl = null;
  let outValEl = null;
  let autoBtn = null;
  let flipBtn = null;
  let resultText = null;
  let winnerBanner = null;
  let coinWrap = null;
  let coin = null;
  let coinFaceH = null;
  let coinFaceT = null;
  let coinMark = null; // 2D overlay glyph (never mirrors)
  let glyphTickerId = null;

  // Runner loop timers
  let gateIntervalId = null;
  let flippingTimeoutId = null;
  let winnerTimeoutId = null;
  let revealTimeoutId = null;

  // State
  let round = 1;
  let survivors = new Set();     // studentIds
  let eliminated = new Set();    // studentIds
  let lastResult = null;         // 'H' | 'T' | null
  let status = 'collect';        // 'collect' | 'flipping' | 'winner' | 'completed'
  let completionFired = false;

  let lastHostEl = null;
  let playAgainBound = false;
  let winnerId = null; // persists winner across callbacks

  const OVERLAY_SELECTOR = '[data-ce-coinflip-ht-overlay="1"]';

  function stopAllTimers() {
    try { if (gateIntervalId) clearInterval(gateIntervalId); } catch (_) {}
    try { if (flippingTimeoutId) clearTimeout(flippingTimeoutId); } catch (_) {}
    try { if (winnerTimeoutId) clearTimeout(winnerTimeoutId); } catch (_) {}
    try { if (revealTimeoutId) clearTimeout(revealTimeoutId); } catch (_) {}
    gateIntervalId = null;
    flippingTimeoutId = null;
    winnerTimeoutId = null;
    revealTimeoutId = null;
  }

  function getLBRoot() {
    return document.getElementById('leaderboard');
  }

  function getAllRows() {
    const root = getLBRoot();
    if (!root) return [];
    return Array.from(root.querySelectorAll('.lb-item'));
  }

  function getRowByStudentId(studentId) {
    const sid = String(studentId);
    return getAllRows().find(li => String(li?.dataset?.studentId) === sid) || null;
  }

  function getActiveStudentIdsFromLeaderboard() {
    const ids = [];
    for (const li of getAllRows()) {
      const sid = li?.dataset?.studentId;
      if (!sid) continue;
      if (li.classList.contains('is-inactive')) continue;
      ids.push(String(sid));
    }
    return ids;
  }

  function getPick(studentId) {
    const api = window.__CE_LB_COINFLIP_HT;
    try {
      return api?._debug?.getPick?.(String(studentId)) ?? null;
    } catch (_) {
      return null;
    }
  }

  function setPick(studentId, val) {
    const api = window.__CE_LB_COINFLIP_HT;
    try {
      api?._debug?.setPick?.(String(studentId), val);
    } catch (_) {}
  }


  // Overlay-only: drive picks through the PC085 tile overlay click handler.
  // This ensures the overlay module remains the only thing that updates overlay UI.
  function setPickViaOverlay(studentId, desired) {
    const li = getRowByStudentId(studentId);
    const overlay = li?.querySelector?.(OVERLAY_SELECTOR);
    if (!overlay) return false;

    const want = desired === 'T' ? 'T' : 'H';
    let cur = getPick(studentId);
    if (cur === want) return true;

    // PC085 cycles: null -> H -> T -> null (so max 2 clicks to reach either H or T)
    for (let i = 0; i < 3; i++) {
      overlay.click();
      cur = getPick(studentId);
      if (cur === want) return true;
    }
    return false;
  }

  function clearPick(studentId) {
    // PC085 setPick deletes on non H/T
    setPick(studentId, null);
    // Also repaint overlay label immediately if present
    const li = getRowByStudentId(studentId);
    const ov = li?.querySelector?.(OVERLAY_SELECTOR);
    if (ov && window.__CE_LB_COINFLIP_HT?._debug?.getPick) {
      // Force a re-render by simulating "set then read"
      // (PC085 internally renders on click; for programmatic clear we rely on its observer/rescan)
      // Minimal: set background neutral and label dash for now
      ov.textContent = '–';
      ov.style.background = 'rgba(0,0,0,0.04)';
      ov.style.borderLeft = '2px solid rgba(0,0,0,0.10)';
    }
  }

  function clearPicksForSet(idSet) {
    for (const sid of idSet) clearPick(sid);
  }

  function resetAllPicks() {
    // Best effort: clear in-memory or storage via debug helper if present
    try {
      const api = window.__CE_LB_COINFLIP_HT;
      // If your PC085 still has savePicks/loadPicks, wipe it
      if (api?._debug?.savePicks) api._debug.savePicks({});
    } catch (_) {}

    // Also clear any rows currently present (visual + state)
    for (const li of getAllRows()) {
      const sid = li?.dataset?.studentId;
      if (!sid) continue;
      clearPick(String(sid));
    }
  }

  function disableOverlayForStudent(studentId) {
    const li = getRowByStudentId(studentId);
    if (!li) return;
    const ov = li.querySelector(OVERLAY_SELECTOR);
    if (!ov) return;

    // Disable interaction
    ov.style.pointerEvents = 'none';
    ov.style.cursor = 'not-allowed';
    ov.style.opacity = '0.20';

    // Optional: mild "out" tint
    ov.style.background = 'rgba(0,0,0,0.03)';

    // Fade the dash to near-invisible (knocked-out state)
    ov.textContent = '–';
    ov.style.color = 'rgba(0,0,0,0.25)';
    ov.style.fontSize = '16px';
    ov.style.letterSpacing = '0.5px';
    ov.style.transform = 'scale(0.9)';
  }

  function enableOverlayForStudent(studentId) {
    const li = getRowByStudentId(studentId);
    if (!li) return;
    const ov = li.querySelector(OVERLAY_SELECTOR);
    if (!ov) return;

    ov.style.pointerEvents = 'auto';
    ov.style.cursor = 'pointer';
    ov.style.opacity = '1';
    // PC085 will set colour on next click; keep neutral by default
  }

  // Freeze/unfreeze interaction without changing the pick visuals
  function setOverlaysFrozen(frozen) {
    try {
      document.querySelectorAll(OVERLAY_SELECTOR).forEach((ov) => {
        ov.style.pointerEvents = frozen ? 'none' : 'auto';
        ov.style.cursor = frozen ? 'default' : 'pointer';
      });
    } catch (_) {}
  }

  function syncOverlayEligibility() {
    // Survivors enabled; eliminated disabled
    for (const sid of survivors) enableOverlayForStudent(sid);
    for (const sid of eliminated) disableOverlayForStudent(sid);
  }

  function allSurvivorsPicked() {
    if (survivors.size === 0) return false;
    for (const sid of survivors) {
      const p = getPick(sid);
      if (p !== 'H' && p !== 'T') return false;
    }
    return true;
  }

  // Require at least one H and at least one T among survivors
  function hasBothSidesChosen() {
    let hasH = false;
    let hasT = false;
    for (const sid of survivors) {
      const p = getPick(sid);
      if (p === 'H') hasH = true;
      else if (p === 'T') hasT = true;
      if (hasH && hasT) return true;
    }
    return false;
  }

  function autoSelectForSurvivors() {
    if (status !== 'collect') return;
    if (survivors.size === 0) return;

    const ids = Array.from(survivors);
    // Guarantee at least one H and one T when possible
    if (ids.length >= 2) {
      setPickViaOverlay(ids[0], 'H');
      setPickViaOverlay(ids[1], 'T');
      for (let i = 2; i < ids.length; i++) {
        const v = Math.random() < 0.5 ? 'H' : 'T';
        setPickViaOverlay(ids[i], v);
      }
    } else {
      // Only one survivor — just assign something (flip will remain gated anyway)
      setPickViaOverlay(ids[0], Math.random() < 0.5 ? 'H' : 'T');
    }

    // FLIP gate loop will enable automatically once picks exist,
    // but we also refresh the stats UI immediately.
    updateStatsUI();
  }

  function setAutoEnabled(enabled) {
    if (!autoBtn) return;
    autoBtn.disabled = !enabled;
    autoBtn.style.opacity = enabled ? '1' : '0.55';
    autoBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
  }

  function setFlipEnabled(enabled) {
    if (!flipBtn) return;
    flipBtn.disabled = !enabled;
    flipBtn.style.opacity = enabled ? '1' : '0.55';
    flipBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
  }

  function setResultDisplay(val) {
    lastResult = val;
    if (!resultText) return;
    if (val === 'H') resultText.textContent = 'HEADS';
    else if (val === 'T') resultText.textContent = 'TAILS';
    else resultText.textContent = '—';
  }

  function startGlyphTicker() {
    if (!coinMark) return;
    if (glyphTickerId) clearInterval(glyphTickerId);
    let showH = true;
    coinMark.style.opacity = '1';
    coinMark.textContent = 'H';
    glyphTickerId = setInterval(() => {
      showH = !showH;
      coinMark.textContent = showH ? 'H' : 'T';
    }, 120);
  }

  function stopGlyphTicker(finalChar) {
    if (glyphTickerId) {
      clearInterval(glyphTickerId);
      glyphTickerId = null;
    }
    if (!coinMark) return;
    if (finalChar == null) {
      coinMark.textContent = '';
      coinMark.style.opacity = '0';
    } else {
      coinMark.textContent = finalChar;
      coinMark.style.opacity = '1';
    }
  }

  function startCoinFlipAnim() {
    if (!coin) return;
    // restart animation reliably
    coin.style.animation = 'none';
    // force reflow
    void coin.offsetHeight;
    coin.style.animation = 'ceCoinFlipSpin 2700ms linear 0s 1';

    const shine = coin.querySelector('[data-ce-coin-shine="1"]');
    if (shine) {
      shine.style.animation = 'none';
      void shine.offsetHeight;
      shine.style.animation = 'ceCoinShineSweep 2700ms ease-in-out 0s 1';
    }
  }

  function setCoinFace(result) {
    if (!coin) return;

    // Neutral (pre-flip): keep coin neutral and hide glyph
    if (result == null) {
      coin.style.background = 'rgba(255,255,255,0.85)';
      coin.style.transform = 'rotateY(0deg)';
      stopGlyphTicker(null);
      return;
    }

    // Landing: stop animation, lock glyph, and land on the intended side
    coin.style.animation = 'none';
    void coin.offsetHeight;
    stopGlyphTicker(result);
    coin.style.transform = result === 'T' ? 'rotateY(180deg)' : 'rotateY(0deg)';
    coin.style.background = result === 'H'
      ? 'rgba(255,165,0,0.10)'
      : 'rgba(0,120,255,0.10)';
  }

  function updateStatsUI() {
    if (roundValEl) roundValEl.textContent = String(round);
    if (survValEl) survValEl.textContent = String(survivors.size);
    if (outValEl) outValEl.textContent = String(eliminated.size);
  }

  function randomResult() {
    return Math.random() < 0.5 ? 'H' : 'T';
  }

  function runFlip() {
    if (status !== 'collect') return;
    if (!allSurvivorsPicked()) return;
    if (!hasBothSidesChosen()) return;

    status = 'flipping';
    setFlipEnabled(false);
    setAutoEnabled(false);

    // Coin flip animation
    setResultDisplay(null);
    if (resultText) resultText.textContent = 'FLIPPING…';
    setCoinFace(null);
    startCoinFlipAnim();
    startGlyphTicker();

    flippingTimeoutId = setTimeout(() => {
      const res = randomResult();
      setResultDisplay(res);
      setCoinFace(res);

      // Eliminate mismatches
      const nextSurvivors = new Set();
      const knockedOut = [];

      for (const sid of survivors) {
        const p = getPick(sid);
        if (p === res) {
          nextSurvivors.add(sid);
        } else {
          knockedOut.push(sid);
        }
      }

      // Update state sets
      survivors = nextSurvivors;
      for (const sid of knockedOut) eliminated.add(sid);

      updateStatsUI();

      // Reveal window: keep picks visible so students can compare vs coin result
      status = 'reveal';
      setOverlaysFrozen(true);

      revealTimeoutId = setTimeout(() => {
        // Now perform the normal cleanup/reset
        for (const sid of knockedOut) {
          disableOverlayForStudent(sid);
          clearPick(sid);
        }

        // Winner check
        if (survivors.size === 1) {
          const winnerId = Array.from(survivors)[0];
          enterWinnerState(winnerId, res);
          return;
        }

        // Next round
        round += 1;

        // Survivors must re-pick: reset to neutral
        clearPicksForSet(survivors);

        // Ensure survivors remain enabled
        syncOverlayEligibility();

        setOverlaysFrozen(false);
        status = 'collect';
        updateStatsUI();
      }, 2000);

      // Gate will re-enable flip when all survivors pick again
    }, 2700);
  }

  function showWinnerBanner(winnerId) {
    if (!winnerBanner) return;

    // Try to get student name from leaderboard dataset
    let name = null;
    try {
      const li = getRowByStudentId(winnerId);
      name = li?.dataset?.studentName || null;
    } catch (_) {}

    winnerBanner.innerHTML = '';
    const a = document.createElement('div');
    a.style.fontWeight = '900';
    a.style.fontSize = '54px';
    a.style.letterSpacing = '1.2px';
    a.style.textShadow = '0 3px 10px rgba(0,0,0,0.55)';
    a.textContent = 'WINNER!';

    const b = document.createElement('div');
    b.style.fontWeight = '900';
    b.style.fontSize = '40px';
    b.style.opacity = '0.98';
    b.style.marginTop = '6px';
    b.style.textShadow = '0 3px 10px rgba(0,0,0,0.55)';
    b.textContent = name ? name : String(winnerId);

    winnerBanner.appendChild(a);
    winnerBanner.appendChild(b);

    winnerBanner.style.display = 'flex';
    winnerBanner.style.flexDirection = 'column';
    winnerBanner.style.alignItems = 'center';
    winnerBanner.style.justifyContent = 'center';
    winnerBanner.style.gap = '10px';

    winnerBanner.style.animation = 'ceWinnerPulse 1200ms ease-in-out 0s 2';
  }

  function emitCompletionOnce() {
    if (completionFired) return;
    completionFired = true;


    try {
      window.__CE_BOOT?.modules?.Events?.emit?.('coinflip:completed');
    } catch (_) {}

    // Advisory mode: advance via PhaseGate (no belltime window)
    try {
      const mode = window.__CE_BOOT?.lessonConfig?.burnlineMode || 'advisory';
       if (mode === 'advisory') {
        window.__CE_BOOT?.modules?.Events?.emit?.(
          'ui:phaseRequestEnter',
          { toPhase: 3, source: 'coinflip' }
        );
      }
    } catch (_) {}

    // Prolonged green glow: re-trigger the same canonical bonus flash a few times
    try {
      const flash = window.__CE_FLASH?.flashLeaderboardStudent;
      if (typeof flash === 'function') {
        flash(winnerId, 'bonus');                       // t=0
        setTimeout(() => flash(winnerId, 'bonus'), 700);  // keep it alive
        setTimeout(() => flash(winnerId, 'bonus'), 1400); // extend further
      }
    } catch (_) {}
  }

  function enterWinnerState(_winnerId, res) {
    status = 'winner';
    setFlipEnabled(false);
    winnerId = String(_winnerId);

    // Disable all overlays
    for (const sid of survivors) disableOverlayForStudent(sid);
    for (const sid of eliminated) disableOverlayForStudent(sid);

    // Keep result visible
    setResultDisplay(res);

    // Celebrate
    showWinnerBanner(winnerId);

    // Award winner +3 (should trigger same UI glow pathway as +1 awards)
    try {
      window.Dashboard?.applyAward?.({
        studentId: winnerId,
        points: 3,
        reason: 'coinflip:winner',
        phase: '2'
      });
    } catch (_) {}

    winnerTimeoutId = setTimeout(() => {
      status = 'completed';
      emitCompletionOnce();
    }, 1800);
  }

  function startGateLoop() {
    stopAllTimers();
    gateIntervalId = setInterval(() => {
      try {
        if (!el) return;

        updateStatsUI();

        // Only gate-enable during collect stage
        if (status === 'collect') {
          const ready = allSurvivorsPicked() && hasBothSidesChosen();
          setFlipEnabled(ready);
          setAutoEnabled(survivors.size > 0);
        } else {
          setFlipEnabled(false);
          setAutoEnabled(false);
        }
      } catch (_) {}
    }, 250);
  }

  function buildUI() {
    // Base container already exists as el
    el.style.position = 'absolute';
    el.style.inset = '0';
    el.style.pointerEvents = 'auto';
    el.style.display = 'flex';
    el.style.alignItems = 'stretch';
    el.style.justifyContent = 'stretch';

    // Inject keyframes once (scoped id)
    if (!document.getElementById('ce-coinflip-anim-pc083')) {
      const style = document.createElement('style');
      style.id = 'ce-coinflip-anim-pc083';
      style.textContent = `
        /* --- 3D coin support (real two-sided disc) --- */
        .ce-coinflip-coinWrap { perspective: 900px; }
        .ce-coinflip-coin {
          transform-style: preserve-3d;
          will-change: transform;
        }
        .ce-coinflip-face {
          backface-visibility: hidden;
          transform-style: preserve-3d;
        }
        @keyframes ceWinnerPulse {
          0% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 0.92; }
        }
          
        @keyframes ceCoinFlipSpin {
          /* Real coin: rotate only, no scaling */
          0%   { transform: rotateY(0deg); }
          25%  { transform: rotateY(1080deg); }
          55%  { transform: rotateY(2160deg); }
          80%  { transform: rotateY(2880deg); }
          100% { transform: rotateY(3240deg); }
        }

        @keyframes ceCoinShineSweep {
          0%   { transform: translateX(-30%) rotate(25deg); opacity: 0.20; }
          50%  { transform: translateX(20%)  rotate(25deg); opacity: 0.60; }
          100% { transform: translateX(50%)  rotate(25deg); opacity: 0.25; }
        }
      `;
      document.head.appendChild(style);
    }

    const panel = document.createElement('div');
    panel.style.width = '100%';
    panel.style.height = '100%';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.borderRadius = '0px';
    panel.style.border = '0';
    panel.style.background = 'rgba(255,255,255,0.88)';
    panel.style.backdropFilter = 'blur(6px)';

    // Header bar
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '14px 16px';
    header.style.borderBottom = '1px solid rgba(0,0,0,0.18)';
    header.style.background = 'rgba(255,255,255,0.88)';

    const title = document.createElement('div');
    title.textContent = 'COIN FLIP — PHASE 2';
    title.style.fontWeight = '900';
    title.style.letterSpacing = '0.4px';
    title.style.color = 'rgba(0,0,0,0.92)';

    const stats = document.createElement('div');
    stats.style.display = 'flex';
    stats.style.gap = '10px';
    stats.style.flexWrap = 'wrap';

    const mkStat = (label) => {
      const box = document.createElement('div');
      box.style.padding = '6px 10px';
      box.style.borderRadius = '12px';
      box.style.border = '1px solid rgba(0,0,0,0.22)';
      box.style.background = 'rgba(255,255,255,0.88)';

      const a = document.createElement('div');
      a.style.fontSize = '11px';
      a.style.opacity = '1';
      a.style.color = 'rgba(0,0,0,0.75)';
      a.style.fontWeight = '700';
      a.textContent = label;

      const b = document.createElement('div');
      b.style.fontSize = '18px';
      b.style.fontWeight = '900';
      b.style.color = 'rgba(0,0,0,0.95)';
      b.textContent = '—';

      box.appendChild(a);
      box.appendChild(b);
      return { box, valueEl: b };
    };

    const roundStat = mkStat('ROUND');
    const survStat  = mkStat('SURVIVORS');
    const outStat   = mkStat('OUT');

    roundValEl = roundStat.valueEl;
    survValEl  = survStat.valueEl;
    outValEl   = outStat.valueEl;

    stats.appendChild(roundStat.box);
    stats.appendChild(survStat.box);
    stats.appendChild(outStat.box);

    header.appendChild(title);
    header.appendChild(stats);

    // Main centre stage
    const main = document.createElement('div');
    main.style.flex = '1';
    main.style.display = 'flex';
    main.style.alignItems = 'center';
    main.style.justifyContent = 'center';
    main.style.padding = '16px';

    const stage = document.createElement('div');
    stage.style.width = '100%';
    stage.style.maxWidth = '1200px';
    stage.style.height = '100%';
    stage.style.maxHeight = '720px';
    stage.style.borderRadius = '18px';
    stage.style.border = '1px solid rgba(0,0,0,0.22)';
    stage.style.background = 'rgba(255,255,255,0.85)';
    stage.style.display = 'flex';
    stage.style.alignItems = 'center';
    stage.style.justifyContent = 'center';
    stage.style.position = 'relative';

    // Footer controls bar
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '10px';
    controls.style.alignItems = 'center';
    controls.style.justifyContent = 'center';
    controls.style.padding = '14px 16px';
    controls.style.borderTop = '1px solid rgba(0,0,0,0.18)';
    controls.style.background = 'rgba(255,255,255,0.88)';

    const mkBtn = (label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.height = '44px';
      b.style.padding = '0 18px';
      b.style.borderRadius = '12px';
      b.style.border = '1px solid rgba(0,0,0,0.18)';
      b.style.background = '#fff';
      b.style.cursor = 'pointer';
      b.style.fontWeight = '900';
      b.style.color = 'rgba(0,0,0,0.95)';
      b.style.fontSize = '16px';
      return b;
    };

    autoBtn = mkBtn('AUTO SELECT');
    // Make it less “primary” than FLIP (reduce accidental presses)
    autoBtn.style.fontSize = '10px';
    autoBtn.style.padding = '0 8px';
    autoBtn.style.height = '30px';
    autoBtn.style.fontWeight = '600';
    setAutoEnabled(false);
    autoBtn.onclick = () => autoSelectForSurvivors();
    controls.appendChild(autoBtn);
    
    flipBtn = mkBtn('FLIP');
    setFlipEnabled(false);
    flipBtn.onclick = () => runFlip();

    controls.appendChild(flipBtn);

    // Coin flip visual
    coinWrap = document.createElement('div');
    coinWrap.className = 'ce-coinflip-coinWrap';
    coinWrap.style.width = '460px';
    coinWrap.style.height = '460px';
    coinWrap.style.perspective = '900px';
    coinWrap.style.display = 'flex';
    coinWrap.style.alignItems = 'center';
    coinWrap.style.justifyContent = 'center';
    coinWrap.style.position = 'relative';

    coin = document.createElement('div');
    coin.classList.add('ce-coinflip-coin');
    coin.style.width = '400px';
    coin.style.height = '400px';
    coin.style.borderRadius = '999px';
    coin.style.position = 'relative';
    coin.style.transformStyle = 'preserve-3d';
    coin.style.border = '6px solid rgba(0,0,0,0.32)';
    coin.style.boxShadow = '0 16px 30px rgba(0,0,0,0.16)';
    coin.style.background = 'rgba(255,255,255,0.92)';
    coin.style.backgroundImage = 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.70) 55%, rgba(0,0,0,0.04) 100%)';
    coin.style.overflow = 'hidden';

    // Rim (coin edge)
    const rim = document.createElement('div');
    rim.style.position = 'absolute';
    rim.style.inset = '14px';
    rim.style.borderRadius = '999px';
    rim.style.border = '4px solid rgba(0,0,0,0.18)';
    rim.style.boxShadow = 'inset 0 0 0 6px rgba(0,0,0,0.03)';
    coin.appendChild(rim);

    // Specular highlight sweep
    const shine = document.createElement('div');
    shine.style.position = 'absolute';
    shine.style.inset = '-30%';
    shine.style.transform = 'rotate(25deg)';
    shine.style.background = 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0) 70%)';
    shine.style.opacity = '0.55';
    shine.style.pointerEvents = 'none';
    shine.style.mixBlendMode = 'screen';
    shine.setAttribute('data-ce-coin-shine', '1');
    coin.appendChild(shine);

    const mkFace = (label) => {
      const face = document.createElement('div');
      face.style.position = 'absolute';
      face.style.inset = '0';
      face.style.borderRadius = '999px';
      face.style.display = 'flex';
      face.style.alignItems = 'center';
      face.style.justifyContent = 'center';
      face.style.backfaceVisibility = 'hidden';
      face.style.fontWeight = '900';
      face.style.fontSize = '96px';
      face.style.letterSpacing = '2px';
      face.style.color = 'rgba(0,0,0,0.92)';
      face.style.textShadow = '0 2px 0 rgba(255,255,255,0.55)';
      face.style.background = 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.65), rgba(255,255,255,0.08) 70%, rgba(0,0,0,0.02) 100%)';
      face.classList.add('ce-coinflip-face');      
      face.textContent = '';
      return face;
    };

    coinFaceH = mkFace('H');
    coinFaceT = mkFace('T');
    // Lock labels so they cannot drift to "H on both sides"
    coinFaceH.dataset.ceFace = 'H';
    coinFaceT.dataset.ceFace = 'T';
    
    // Real two-sided coin: back face is rotated 180°
    // Increase face separation to avoid z-fighting (prevents "H on both sides")
    coinFaceH.style.transform = 'translateZ(8px)';
    coinFaceT.style.transform = 'rotateY(180deg) translateZ(8px)';

    coin.appendChild(coinFaceH);
    coin.appendChild(coinFaceT);
    coinWrap.appendChild(coin);
    // 2D overlay glyph (alternates during spin; never mirrors)
    coinMark = document.createElement('div');
    coinMark.className = 'ce-coinflip-mark';
    coinMark.style.position = 'absolute';
    coinMark.style.inset = '0';
    coinMark.style.display = 'flex';
    coinMark.style.alignItems = 'center';
    coinMark.style.justifyContent = 'center';
    coinMark.style.fontWeight = '900';
    coinMark.style.fontSize = '96px';
    coinMark.style.letterSpacing = '2px';
    coinMark.style.color = 'rgba(0,0,0,0.92)';
    coinMark.style.textShadow = '0 2px 0 rgba(255,255,255,0.55)';
    coinMark.style.pointerEvents = 'none';
    coinMark.style.opacity = '0';
    coinMark.style.transition = 'opacity 120ms ease';

    coinWrap.appendChild(coinMark);
    stage.appendChild(coinWrap);

    // Result label (secondary)
    resultText = document.createElement('div');
    resultText.style.position = 'absolute';
    resultText.style.bottom = '16px';
    resultText.style.left = '0';
    resultText.style.right = '0';
    resultText.style.textAlign = 'center';
    resultText.style.fontWeight = '900';
    resultText.style.fontSize = '22px';
    resultText.style.letterSpacing = '1px';
    resultText.style.color = 'rgba(0,0,0,0.90)';
    resultText.textContent = '—';
    stage.appendChild(resultText);

    // Winner banner (hidden until needed)
    winnerBanner = document.createElement('div');
    winnerBanner.style.position = 'absolute';
    winnerBanner.style.inset = '0';
    winnerBanner.style.borderRadius = '18px';
    winnerBanner.style.border = '1px solid rgba(0,0,0,0.10)';
    // Dark glass overlay so the announcement pops without washing out the stage
    winnerBanner.style.background = 'rgba(0,0,0,0.35)';
    winnerBanner.style.backdropFilter = 'blur(2px)';
    winnerBanner.style.display = 'none';
    winnerBanner.style.boxShadow = '0 10px 22px rgba(0,0,0,0.10)';
    winnerBanner.style.color = 'rgba(255,255,255,0.98)';
    stage.appendChild(winnerBanner);

    main.appendChild(stage);

    panel.appendChild(header);
    panel.appendChild(main);
    panel.appendChild(controls);

    el.appendChild(panel);
  }

  function initPhaseState() {
    round = 1;
    survivors = new Set(getActiveStudentIdsFromLeaderboard());
    eliminated = new Set();
    lastResult = null;
    status = 'collect';
    completionFired = false;

    // Reset UI elements
    if (winnerBanner) {
      winnerBanner.style.display = 'none';
      winnerBanner.innerHTML = '';
    }


    // Mount overlay
    try { window.__CE_LB_COINFLIP_HT?.mount?.(); } catch (_) {}

    // Start everyone neutral (best effort)
    resetAllPicks();

    // Ensure overlays are enabled for survivors
    syncOverlayEligibility();

    // Render initial UI
    setResultDisplay(null);
    setCoinFace(null);
    updateStatsUI();
    startGateLoop();
  }

  function mount(hostEl) {
    if (!hostEl) return null;

    lastHostEl = hostEl;

    if (!playAgainBound) {
      playAgainBound = true;
      try {
        window.__CE_BOOT?.modules?.Events?.on?.('coinflip:playAgain', () => {
          // Reset Coinflip in-place (stay in Phase 2)
          stopAllTimers();
          try { window.__CE_BOOT?.modules?.Events?.emit?.('coinflip:resetting'); } catch (_) {}
          initPhaseState();
        });
      } catch (_) {}
    }

    // Clear any previous instance
    unmount();

    el = document.createElement('div');
    el.id = 'coinflip-base';

    buildUI();
    hostEl.appendChild(el);

    initPhaseState();

    return { el, type: 'coinflip-base' };
  }

  function unmount() {
    stopAllTimers();

    // Unmount overlay (PC085)
    try { window.__CE_LB_COINFLIP_HT?.unmount?.(); } catch (_) {}

    try {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    } catch (_) {}

    el = null;

    // Clear refs
    roundValEl = null;
    survValEl = null;
    outValEl = null;
    flipBtn = null;
    resultText = null;
    winnerBanner = null;
  }

  window.__CE_COINFLIP_BASE = {
    mount,
    unmount
  };
})();


