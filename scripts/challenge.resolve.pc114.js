/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC114-A1
   Module: challenge.resolve.pc114.js
   Purpose: Phase 6 Challenge Duel Resolution Modal
   Notes:
     - Additive-only modal layer for Challenge Phase.
     - Must not emit lesson:phaseChange.
     - Must not persist state directly.
     - Reads duel state from window.__CE_CHALLENGE_NOMINATION.
     - Reads committed lineup from window.__CE_CHALLENGE_COMMIT.
     - Awards via Dashboard.applyAward.
     - PC114 scope:
     -   * opens only after wheel spin has selected an activity
     -   * teacher selects winner
     -   * winner gains registered stake to unbanked
     -   * loser loses registered stake from unbanked
     -   * teacher confirms award/close
     -   * auto-advances to next duel
   ========================================================= */

(() => {
  const MOD = {
    mounted: false,
    host: null,
    root: null,
    pendingResult: null, // { winnerId, winnerName, loserId, loserName, registered, activity }
    activeGame: null,
    tickId: null,
  };

  function getDashboard() {
    return window.__CE_BOOT?.modules?.Dashboard ||
      window.__CE_BOOT?.CE?.modules?.Dashboard ||
      window.Dashboard ||
      null;
  }

  function getCommitApi() {
    return window.__CE_CHALLENGE_COMMIT || null;
  }

  function getNominationApi() {
    return window.__CE_CHALLENGE_NOMINATION || null;
  }

  function getWheelApi() {
    return window.__CE_CHALLENGE_WHEEL || null;
  }

  function getTargetTapApi() {
    return window.__CE_CHALLENGE_DUEL_TARGETTAP || null;
  }

  function getPicklePongApi() {
    return window.__CE_CHALLENGE_DUEL_PICKLEPONG || null;
  }

  function getNeonTrailsApi() {
    return window.__CE_CHALLENGE_DUEL_NEONTRAILS || null;
  }

  function getWizardDuelApi() {
    return window.__CE_CHALLENGE_DUEL_WIZARDDUEL || null;
  }

  function getRhythmStrikeApi() {
    return window.__CE_CHALLENGE_DUEL_RHYTHMSTRIKE || null;
  }

  function getPhaseNow() {
    return String(
      window.__CE_BOOT?.phaseGateState?.currentPhase ??
      window.__CE_BOOT?.phase?.current ??
      getDashboard()?.session?.phase ??
      ''
    );
  }

  function isPhase6(phase) {
    return String(phase) === '6';
  }

  function getHost() {
    return document.getElementById('activity-canvas');
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function ensureStyles() {
    if (document.getElementById('ce-challenge114-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-challenge114-styles';
    s.textContent = `
      #ce-ch114-root{
        position:absolute;
        inset:0;
        z-index:20;
        pointer-events:none;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }

      .ce-ch114-backdrop{
        position:absolute;
        inset:0;
        background:rgba(0,0,0,0.44);
        display:flex;
        align-items:center;
        justify-content:center;
        pointer-events:auto;
      }

      .ce-ch114-card{
        width:min(760px, 92vw);
        background:rgba(17,21,26,0.98);
        border:1px solid rgba(255,255,255,0.10);
        border-radius:18px;
        box-shadow:0 18px 40px rgba(0,0,0,0.35);
        color:#e8eef2;
        padding:22px;
        box-sizing:border-box;
        display:flex;
        flex-direction:column;
        gap:16px;
      }

      .ce-ch114-title{
        font-size:16px;
        font-weight:900;
        letter-spacing:0.04em;
        text-transform:uppercase;
        opacity:0.9;
      }

      .ce-ch114-duel{
        padding:14px;
        border-radius:14px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.08);
      }

      .ce-ch114-names{
        font-size:28px;
        font-weight:900;
        line-height:1.2;
      }

      .ce-ch114-meta{
        margin-top:8px;
        font-size:14px;
        opacity:0.84;
        line-height:1.4;
      }

      .ce-ch114-activity{
        padding:14px;
        border-radius:14px;
        background:rgba(80,140,255,0.14);
        border:1px solid rgba(80,140,255,0.24);
        color:#dbeafe;
        font-size:18px;
        line-height:1.3;
        font-weight:800;
      }

      .ce-ch114-actions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:12px;
      }

      .ce-ch114-btn{
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(255,255,255,0.08);
        color:#fff;
        padding:16px 14px;
        border-radius:14px;
        font-weight:900;
        font-size:16px;
        cursor:pointer;
      }

      .ce-ch114-btn:hover{
        background:rgba(255,255,255,0.12);
      }

      .ce-ch114-btn--primary{
        background:rgba(80,140,255,0.32);
        border-color:rgba(80,140,255,0.42);
      }

      .ce-ch114-btn--primary:hover{
        background:rgba(80,140,255,0.42);
      }

      .ce-ch114-congrats{
        font-size:26px;
        font-weight:900;
        line-height:1.25;
      }

      .ce-ch114-status{
        font-size:14px;
        line-height:1.4;
        padding:12px 14px;
        border-radius:12px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.08);
      }

      .ce-ch114-gameHost{
        position:absolute;
        inset:0;
        z-index:21;
        pointer-events:auto;
      }
    `;
    document.head.appendChild(s);
  }

  function applyDelta(studentId, delta) {
    const Dashboard = getDashboard();
    if (!Dashboard?.applyAward) return false;
    return !!Dashboard.applyAward({
      studentId: String(studentId),
      value: Number(delta || 0),
      phase: 6,
      reason: 'challenge-duel'
    });
  }

  function flashStudent(studentId, type = 'bonus', repeats = 1, gapMs = 700) {
    const flash = window.__CE_FLASH?.flashLeaderboardStudent;
    if (typeof flash !== 'function') return;

    try {
      flash(String(studentId), type);
      for (let i = 1; i < repeats; i++) {
        setTimeout(() => {
          try { flash(String(studentId), type); } catch {}
        }, i * gapMs);
      }
    } catch {}
  }


  function getCurrentPair() {
    return getNominationApi()?.getCurrentDuel?.() || null;
  }

  function getSelectedActivity() {
    return getNominationApi()?.getSelectedActivity?.() || null;
  }

  function ensureGameHost() {
    if (!MOD.root) return null;
    let host = qs('.ce-ch114-gameHost', MOD.root);
    if (host) return host;
    host = document.createElement('div');
    host.className = 'ce-ch114-gameHost';
    MOD.root.appendChild(host);
    return host;
  }

  function handleResult(pair, activity, api, { winnerId, winnerName, loserId, loserName }) {
    api?.unmount?.();
    MOD.activeGame = null;
    MOD.pendingResult = {
      winnerId,
      winnerName,
      loserId,
      loserName,
      registered: Number(pair?.registered || 0),
      activity: String(activity)
    };
    render();
    return host;
  }

  function launchActivity(pair, activity) {
    let api = null;

    if (String(activity) === 'Target Tap') {
      api = getTargetTapApi();
    } else if (String(activity) === 'PicklePong') {
      api = getPicklePongApi();
    } else if (String(activity) === 'Wizard Duel') {
      api = getWizardDuelApi();
    } else if (String(activity) === 'Neon Trails') {
      api = getNeonTrailsApi();         
    } else if (String(activity) === 'Rhythm Strike') {
      api = getRhythmStrikeApi();   
    } else {
      return false;
    }
    if (!api?.mount) return false;

    const host = ensureGameHost();
    if (!host) return false;

    api.mount({
      host,
      pair,
      onComplete: ({ winnerId, winnerName, loserId, loserName }) => {
        api.unmount?.();
        MOD.activeGame = null
        MOD.pendingResult = {
          winnerId,
          winnerName,
          loserId,
          loserName,
          registered: Number(pair?.registered || 0),
          activity: String(activity)
        };
        render();
      }
    });

    return true;
  }

  function startActivity(pair, activity) {
    if (MOD.activeGame) return false;
    const ok = launchActivity(pair, activity);
    if (ok) {
      MOD.activeGame = String(activity);
    }
    return ok;
  }

  function clearSelectionAndAdvance() {
    try { getNominationApi()?._setSelectedActivity?.(null); } catch {}
    try { getNominationApi()?.resetCurrentNominations?.(); } catch {}
    try { getWheelApi()?.clearSlots?.(); } catch {}
    try { getNominationApi()?.gotoNextDuel?.(); } catch {}
  }

  function chooseWinner(side) {
    const pair = getCurrentPair();
    const activity = getSelectedActivity();
    if (!pair || !activity) return;

    const registered = Number(pair?.registered || 0);
    const winner = side === 'b' ? pair?.b : pair?.a;
    const loser = side === 'b' ? pair?.a : pair?.b;
    if (!winner?.id || !loser?.id) return;

    MOD.pendingResult = {
      winnerId: String(winner.id),
      winnerName: String(winner.name || winner.id),
      loserId: String(loser.id),
      loserName: String(loser.name || loser.id),
      registered,
      activity: String(activity),
    };

    render();
  }

  function awardAndClose() {
    const r = MOD.pendingResult;
    if (!r) return;

    applyDelta(r.winnerId, r.registered);
    applyDelta(r.loserId, -r.registered);

    // Defer glow slightly so it lands after any score-triggered DOM refresh.
    setTimeout(() => {
      flashStudent(r.winnerId, 'bonus', 2, 700);
      flashStudent(r.loserId, 'penalty', 1, 700);
    }, 0);

    MOD.pendingResult = null;
    MOD.activeGame = null;
    clearSelectionAndAdvance();
    render();
  }

  function renderSelectionModal(pair, activity) {
    return `
      <div class="ce-ch114-backdrop">
        <div class="ce-ch114-card">
          <div class="ce-ch114-title">Duel Result</div>

          <div class="ce-ch114-duel">
            <div class="ce-ch114-names">${escapeHtml(pair?.a?.name || pair?.a?.id || 'Player A')} vs ${escapeHtml(pair?.b?.name || pair?.b?.id || 'Player B')}</div>
            <div class="ce-ch114-meta">
              Registered stake: ${escapeHtml(String(pair?.registered || 0))}<br>
              Activity: ${escapeHtml(activity)}
            </div>
          </div>

          <div class="ce-ch114-activity">
            ${escapeHtml(activity)}
          </div>

          <div class="ce-ch114-actions">
            <button type="button" class="ce-ch114-btn ce-ch114-btn--primary" data-ch114-win="a">${escapeHtml(pair?.a?.name || pair?.a?.id || 'Player A')} wins</button>
            <button type="button" class="ce-ch114-btn ce-ch114-btn--primary" data-ch114-win="b">${escapeHtml(pair?.b?.name || pair?.b?.id || 'Player B')} wins</button>
          </div>

          <div class="ce-ch114-status">
            Winner receives +${escapeHtml(String(pair?.registered || 0))} unbanked. Loser loses -${escapeHtml(String(pair?.registered || 0))} unbanked.
          </div>
        </div>
      </div>
    `;
  }

  function renderLaunchModal(pair, activity) {
    return `
      <div class="ce-ch114-backdrop">
        <div class="ce-ch114-card">
          <div class="ce-ch114-title">Duel Ready</div>

          <div class="ce-ch114-duel">
            <div class="ce-ch114-names">${escapeHtml(pair?.a?.name || pair?.a?.id || 'Player A')} vs ${escapeHtml(pair?.b?.name || pair?.b?.id || 'Player B')}</div>
            <div class="ce-ch114-meta">
              Registered stake: ${escapeHtml(String(pair?.registered || 0))}<br>
              Activity: ${escapeHtml(activity)}
            </div>
          </div>

          <div class="ce-ch114-activity">
            ${escapeHtml(activity)}
          </div>

          <button type="button" class="ce-ch114-btn ce-ch114-btn--primary" data-ch114-start>Start Duel</button>

          <div class="ce-ch114-status">
            Launch the full-screen duel activity for this pair.
          </div>
        </div>
      </div>
    `;
  }


  function renderCongratsModal(result) {
    return `
      <div class="ce-ch114-backdrop">
        <div class="ce-ch114-card">
          <div class="ce-ch114-title">Duel Complete</div>

          <div class="ce-ch114-congrats">Congratulations - ${escapeHtml(result.winnerName)}</div>

          <div class="ce-ch114-status">
            ${escapeHtml(result.winnerName)} gains +${escapeHtml(String(result.registered))} unbanked.<br>
            ${escapeHtml(result.loserName)} loses -${escapeHtml(String(result.registered))} unbanked.
          </div>

          <button type="button" class="ce-ch114-btn ce-ch114-btn--primary" data-ch114-award>Award and continue</button>
        </div>
      </div>
    `;
  }

  function render() {
    if (!MOD.root) return;

    if (!isPhase6(getPhaseNow()) || !getCommitApi()?.isCommitted?.()) {
      MOD.root.innerHTML = '';
      MOD.pendingResult = null;
      return;
    }

    const pair = getCurrentPair();
    const activity = getSelectedActivity();

    if (MOD.pendingResult) {
      MOD.root.innerHTML = renderCongratsModal(MOD.pendingResult);
      qs('[data-ch114-award]', MOD.root)?.addEventListener('click', awardAndClose);
      return;
    }

    if (!pair || !activity) {
      MOD.root.innerHTML = '';
      return;
    }

    if (MOD.activeGame) {
      return;
    }

    if (String(activity) === 'Target Tap' || String(activity) === 'PicklePong' || String(activity) === 'Wizard Duel' || String(activity) === 'Neon Trails' || String(activity) === 'Rhythm Strike') {
      MOD.root.innerHTML = renderLaunchModal(pair, activity);
      qs('[data-ch114-start]', MOD.root)?.addEventListener('click', () => {
        startActivity(pair, activity);
      });
      return;
    }

    MOD.root.innerHTML = renderSelectionModal(pair, activity);

    MOD.root.querySelectorAll('[data-ch114-win]').forEach((btn) => {
      btn.addEventListener('click', () => {
        chooseWinner(String(btn.getAttribute('data-ch114-win') || 'a'));
      });
    });
  }

  function startTick() {
    stopTick();
    MOD.tickId = window.setInterval(() => {
      if (!MOD.mounted) return;
      render();
    }, 300);
  }

  function stopTick() {
    if (MOD.tickId) {
      clearInterval(MOD.tickId);
      MOD.tickId = null;
    }
  }

  function mount() {
    if (MOD.mounted) return;
    MOD.mounted = true;

    MOD.host = getHost();
    if (!MOD.host) return;

    ensureStyles();

    MOD.root = document.createElement('div');
    MOD.root.id = 'ce-ch114-root';
    MOD.host.appendChild(MOD.root);

    render();
    startTick();
  }

  function unmount() {
    if (!MOD.mounted) return;
    MOD.mounted = false;
    stopTick();

    MOD.activeGame = null;

    try { MOD.root?.remove?.(); } catch {}
    MOD.root = null;
    MOD.host = null;
  }

  MOD.mount = mount;
  MOD.unmount = unmount;

  window.__CE_CHALLENGE_RESOLVE = MOD;
})();