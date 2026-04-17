/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC109-A1
   Module: challenge.overlay.pc109.js
   Purpose: Phase 6 Challenge Leaderboard Overlay
   Notes:
     - Additive-only leaderboard augmentation.
     - Must not emit lesson:phaseChange.
     - Must not persist state directly.
     - Must not replace core leaderboard rendering.
     - Stakes are session-only in PC109.
     - Visual strategy aligned to compact token display style.
     - Pairing uses minimum-total-difference with nomination-order tie-break.
   ========================================================= */

(() => {
  const MOD = {
    mounted: false,
    stakesById: new Map(),
    pairByStudentId: new Map(),
    orderedPairs: [],
    pairPalette: [
      'red', 'blue', 'green', 'yellow',
      'purple', 'orange', 'cyan', 'pink',
      'teal', 'lime', 'gold', 'indigo',
      'coral', 'mint', 'magenta', 'brown'
    ],
    tickId: null,
    offScores: null,
    offRoster: null,
    offPhase: null,
  };

  function getBus() {
    return window.__CE_BOOT?.modules?.Events ||
      window.__CE_BOOT?.CE?.modules?.Events ||
      null;
  }

  function getDashboard() {
    return window.__CE_BOOT?.modules?.Dashboard ||
      window.__CE_BOOT?.CE?.modules?.Dashboard ||
      window.Dashboard ||
      null;
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

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function getScoresById() {
    try {
      return getDashboard()?.getScoresSnapshot?.()?.byId || {};
    } catch {
      return {};
    }
  }

  function getRoster() {
    try {
      return getDashboard()?.getRosterSnapshot?.()?.students || [];
    } catch {
      return [];
    }
  }

  function emitChallengeStakeUpdate() {
    try {
      window.__CE_BOOT?.modules?.Events?.emit?.('challenge:stakesUpdated', {
        snapshot: getSnapshot(),
        ts: Date.now()
      });
    } catch {}
    try {
      window.__CE_BOOT?.CE?.modules?.Events?.emit?.('challenge:stakesUpdated', {
        snapshot: getSnapshot(),
        ts: Date.now()
      });
    } catch {}
  }

  function ensureStyles() {
    if (document.getElementById('ce-challenge109-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-challenge109-styles';
    s.textContent = `
      .lb-item[data-ch-phase="6"]{
        position:relative;
      }

      /* compact token overlay aligned to existing leaderboard score placement */
      .ce-ch109-token-overlay{
        position:absolute;
        top:50%;
        right:44px;
        transform:translateY(-50%);
        display:none;
        align-items:center;
        gap:6px;
        min-width:56px;
        justify-content:flex-end;
        pointer-events:none;
        z-index:2;
      }

      .lb-item[data-ch-phase="6"] .ce-ch109-token-overlay{
        display:flex;
      }


      .ce-ch109-stake{
        display:inline-block;
        min-width:28px;
        text-align:right;
        font-size:14px;
        line-height:1;
        font-weight:900;
        color:#7dd3fc;
        text-shadow:0 1px 0 rgba(0,0,0,0.35);
        white-space:nowrap;
        opacity:0.75;
      }

      .ce-ch109-stake.is-visible{
        opacity:1;
      }

      .lb-item[data-ch-phase="6"][data-ch-locked="1"] .ce-ch109-stake{
        opacity:0.45;
      }

      .lb-item[data-ch-phase="6"][data-ch-locked="1"] .ce-ch109-stake.is-visible{
        opacity:0.45;
      }

      .ce-ch109-pairdot.red{ background:rgba(255,90,90,0.95); }
      .ce-ch109-pairdot.blue{ background:rgba(80,140,255,0.95); }
      .ce-ch109-pairdot.green{ background:rgba(70,200,120,0.95); }
      .ce-ch109-pairdot.yellow{ background:rgba(255,210,70,0.95); }
      .ce-ch109-pairdot.purple{ background:rgba(180,110,255,0.95); }
      .ce-ch109-pairdot.orange{ background:rgba(255,155,70,0.95); }
      .ce-ch109-pairdot.cyan{ background:rgba(70,220,255,0.95); }
      .ce-ch109-pairdot.pink{ background:rgba(255,120,190,0.95); }

      .lb-item[data-ch-phase="6"][data-ch-pair-color="red"]{ box-shadow: inset 8px 0 0 rgba(255,90,90,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="blue"]{ box-shadow: inset 8px 0 0 rgba(80,140,255,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="green"]{ box-shadow: inset 8px 0 0 rgba(70,200,120,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="yellow"]{ box-shadow: inset 8px 0 0 rgba(255,210,70,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="purple"]{ box-shadow: inset 8px 0 0 rgba(180,110,255,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="orange"]{ box-shadow: inset 8px 0 0 rgba(255,155,70,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="cyan"]{ box-shadow: inset 8px 0 0 rgba(70,220,255,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="pink"]{ box-shadow: inset 8px 0 0 rgba(255,120,190,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="teal"]{ box-shadow: inset 8px 0 0 rgba(45,212,191,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="lime"]{ box-shadow: inset 8px 0 0 rgba(132,204,22,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="gold"]{ box-shadow: inset 8px 0 0 rgba(245,158,11,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="indigo"]{ box-shadow: inset 8px 0 0 rgba(99,102,241,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="coral"]{ box-shadow: inset 8px 0 0 rgba(251,113,133,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="mint"]{ box-shadow: inset 8px 0 0 rgba(110,231,183,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="magenta"]{ box-shadow: inset 8px 0 0 rgba(217,70,239,0.95); }
      .lb-item[data-ch-phase="6"][data-ch-pair-color="brown"]{ box-shadow: inset 8px 0 0 rgba(161,98,7,0.95); }

      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="red"]{ box-shadow: inset 8px 0 0 rgba(255,90,90,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="blue"]{ box-shadow: inset 8px 0 0 rgba(80,140,255,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="green"]{ box-shadow: inset 8px 0 0 rgba(70,200,120,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="yellow"]{ box-shadow: inset 8px 0 0 rgba(255,210,70,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="purple"]{ box-shadow: inset 8px 0 0 rgba(180,110,255,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="orange"]{ box-shadow: inset 8px 0 0 rgba(255,155,70,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="cyan"]{ box-shadow: inset 8px 0 0 rgba(70,220,255,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="pink"]{ box-shadow: inset 8px 0 0 rgba(255,120,190,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="teal"]{ box-shadow: inset 8px 0 0 rgba(45,212,191,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="lime"]{ box-shadow: inset 8px 0 0 rgba(132,204,22,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="gold"]{ box-shadow: inset 8px 0 0 rgba(245,158,11,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="indigo"]{ box-shadow: inset 8px 0 0 rgba(99,102,241,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="coral"]{ box-shadow: inset 8px 0 0 rgba(251,113,133,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="mint"]{ box-shadow: inset 8px 0 0 rgba(110,231,183,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="magenta"]{ box-shadow: inset 8px 0 0 rgba(217,70,239,0.35); }
      .lb-item[data-ch-phase="6"][data-ch-locked="1"][data-ch-pair-color="brown"]{ box-shadow: inset 8px 0 0 rgba(161,98,7,0.35); }
    `;
    document.head.appendChild(s);
  }

  function getEligibleStudents() {
    const roster = getRoster();
    const scoresById = getScoresById();

    return roster
      .filter((s) => s && s.active !== false)
      .map((s, index) => {
        const id = String(s.id ?? '').trim();
        const rec = scoresById[id] || {};
        const unbanked = Number(rec.unbanked || 0);
        const stake = Number(MOD.stakesById.get(id) || 0);
        return {
          id,
          name: String(s.name || s.studentName || ''),
          order: index,
          unbanked,
          stake,
        };
      })
      .filter((s) => s.id && s.stake > 0 && s.stake <= s.unbanked);
  }

function buildPairings(students) {
  // Sort by stake DESC, then nomination order ASC
  const remaining = students
    .slice()
    .sort((a, b) => {
      if (b.stake !== a.stake) return b.stake - a.stake;
      return a.order - b.order;
    });

  const pairs = [];

  // Greedy pairing from highest to lowest
  while (remaining.length >= 2) {
    const first = remaining.shift();

    let bestIndex = -1;
    let bestDiff = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const diff = Math.abs(first.stake - candidate.stake);

      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = i;
      } else if (diff === bestDiff) {
        // tie-break: earlier nomination order
        if (candidate.order < remaining[bestIndex].order) {
          bestIndex = i;
        }
      }
    }

    if (bestIndex === -1) break;

    const second = remaining.splice(bestIndex, 1)[0];

    const ordered = [first, second].sort((a, b) => a.order - b.order);

    pairs.push({
      a: ordered[0],
      b: ordered[1],
      registered: Math.min(first.stake, second.stake),
    });
  }

  return {
    pairs,
    leftovers: remaining,
  };
}

  function recomputeSnapshot() {
    const eligible = getEligibleStudents();
    const solved = buildPairings(eligible);

    MOD.orderedPairs = solved.pairs
      .slice()
      .sort((a, b) => {
        if (b.registered !== a.registered) return b.registered - a.registered;
        if (a.a.order !== b.a.order) return a.a.order - b.a.order;
        return a.b.order - b.b.order;
      })
      .map((pair, index) => ({
        pairKey: `pair-${index + 1}`,
        color: MOD.pairPalette[index % MOD.pairPalette.length],
        registered: pair.registered,
        a: pair.a,
        b: pair.b,
      }));

    MOD.pairByStudentId = new Map();
    MOD.orderedPairs.forEach((pair) => {
      MOD.pairByStudentId.set(pair.a.id, pair);
      MOD.pairByStudentId.set(pair.b.id, pair);
    });
  }

  function ensureOverlay(row) {
    let overlay = row.querySelector('.ce-ch109-token-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'ce-ch109-token-overlay';
    overlay.innerHTML = `
      <span class="ce-ch109-stake"></span>
    `;
    row.appendChild(overlay);
    return overlay;
  }

  function ensureStakeNode(overlay) {
    if (!overlay) return null;
    let stakeEl = overlay.querySelector('.ce-ch109-stake, [data-ch110-input="1"]');
    if (stakeEl) return stakeEl;

    stakeEl = document.createElement('span');
    stakeEl.className = 'ce-ch109-stake';
    overlay.insertAdjacentElement('afterbegin', stakeEl);
    return stakeEl;
  }

  function ensureDotNode(overlay) {
    if (!overlay) return null;
    let dotEl = overlay.querySelector('.ce-ch109-pairdot');
    if (dotEl) return dotEl;

    dotEl = document.createElement('span');
    dotEl.className = 'ce-ch109-pairdot';
    overlay.appendChild(dotEl);
    return dotEl;
  }

  function applyRow(row) {
    const studentId = String(row.dataset.studentId || '').trim();
    if (!studentId) return;

    const inPhase = isPhase6(getPhaseNow());

    if (inPhase) row.setAttribute('data-ch-phase', '6');
    else row.removeAttribute('data-ch-phase');

    const overlay = ensureOverlay(row);
    const stakeEl = ensureStakeNode(overlay);

    const stake = Number(MOD.stakesById.get(studentId) || 0);
    const pair = MOD.pairByStudentId.get(studentId) || null;

    if (pair && inPhase) {
      row.setAttribute('data-ch-pair-color', pair.color);
      row.setAttribute('data-ch-pair-key', pair.pairKey);
      row.setAttribute('data-ch-registered', String(pair.registered));
    } else {
      row.removeAttribute('data-ch-pair-color');
      row.removeAttribute('data-ch-pair-key');
      row.removeAttribute('data-ch-registered');
    }

    if (stakeEl && !stakeEl.matches('[data-ch110-input="1"]')) {
      if (stake > 0 && inPhase) {
        stakeEl.classList.add('is-visible');
        stakeEl.textContent = String(stake);
      } else {
        stakeEl.classList.remove('is-visible');
        stakeEl.textContent = '—';
      }
    }
  }

  function render() {
    recomputeSnapshot();
    qsa('.lb-item[data-student-id]').forEach(applyRow);
  }

  function scrubRows() {
    qsa('.lb-item[data-student-id]').forEach((row) => {
      row.removeAttribute('data-ch-phase');
      row.removeAttribute('data-ch-pair-color');
      row.removeAttribute('data-ch-pair-key');
      row.removeAttribute('data-ch-registered');
      row.querySelector('.ce-ch109-token-overlay')?.remove?.();
    });
  }

  function startTick() {
    stopTick();
    MOD.tickId = window.setInterval(() => {
      if (!MOD.mounted) return;
      render();
    }, 500);
  }

  function stopTick() {
    if (MOD.tickId) {
      clearInterval(MOD.tickId);
      MOD.tickId = null;
    }
  }

  function clampStake(studentId, amount) {
    const id = String(studentId || '').trim();
    if (!id) return 0;
    const byId = getScoresById();
    const unbanked = Number(byId[id]?.unbanked || 0);
    const n = Math.max(0, Math.floor(Number(amount || 0)));
    return Math.min(n, Math.max(0, unbanked));
  }

  function setStake(studentId, amount) {
    const id = String(studentId || '').trim();
    if (!id) return 0;
    const next = clampStake(id, amount);
    if (next <= 0) MOD.stakesById.delete(id);
    else MOD.stakesById.set(id, next);
    render();
    emitChallengeStakeUpdate();
    return next;
  }

  function setStakes(obj = {}) {
    Object.entries(obj || {}).forEach(([studentId, amount]) => {
      const id = String(studentId || '').trim();
      if (!id) return;
      const next = clampStake(id, amount);
      if (next <= 0) MOD.stakesById.delete(id);
      else MOD.stakesById.set(id, next);
    });
    render();
    emitChallengeStakeUpdate();
    return getSnapshot();
  }

  function clearStake(studentId) {
    const id = String(studentId || '').trim();
    if (!id) return false;
    MOD.stakesById.delete(id);
    render();
    emitChallengeStakeUpdate();
    return true;
  }

  function clearAllStakes() {
    MOD.stakesById.clear();
    render();
    emitChallengeStakeUpdate();
    return true;
  }

  function getSnapshot() {
    return {
      stakes: Object.fromEntries(MOD.stakesById.entries()),
      orderedPairs: MOD.orderedPairs.map((p) => ({
        pairKey: p.pairKey,
        color: p.color,
        registered: p.registered,
        a: { id: p.a.id, name: p.a.name, stake: p.a.stake, order: p.a.order },
        b: { id: p.b.id, name: p.b.name, stake: p.b.stake, order: p.b.order },
      }))
    };
  }

  function mount() {
    if (MOD.mounted) return;
    MOD.mounted = true;

    ensureStyles();

    const Bus = getBus();
    if (Bus?.on) {
      const rerender = () => render();
      Bus.on('scores:updated', rerender);
      Bus.on('roster:updated', rerender);
      Bus.on('lesson:phaseChange', rerender);
      MOD.offScores = () => { try { Bus.off?.('scores:updated', rerender); } catch {} };
      MOD.offRoster = () => { try { Bus.off?.('roster:updated', rerender); } catch {} };
      MOD.offPhase = () => { try { Bus.off?.('lesson:phaseChange', rerender); } catch {} };
    }

    render();
    startTick();
  }

  function unmount() {
    if (!MOD.mounted) return;
    MOD.mounted = false;
    stopTick();

    try { MOD.offScores?.(); } catch {}
    try { MOD.offRoster?.(); } catch {}
    try { MOD.offPhase?.(); } catch {}
    MOD.offScores = null;
    MOD.offRoster = null;
    MOD.offPhase = null;

    scrubRows();
  }

  MOD.mount = mount;
  MOD.unmount = unmount;
  MOD.setStake = setStake;
  MOD.setStakes = setStakes;
  MOD.clearStake = clearStake;
  MOD.clearAllStakes = clearAllStakes;
  MOD.getSnapshot = getSnapshot;
  MOD.recompute = render;

  window.__CE_CHALLENGE_OVERLAY = MOD;
})();
