/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC111-A0
   Module: challenge.commit.pc111.js
   Purpose: Phase 6 Challenge Commit + Official Lineup
   Notes:
     - Additive-only activity-canvas layer for Challenge commit flow.
     - Must not emit lesson:phaseChange.
     - Must not persist state directly.
     - Reads pairing state from window.__CE_CHALLENGE_OVERLAY.
     - Commit freezes the current snapshot for this phase run.
     - PC111 scope:
     -   * show Commit button before commit
     -   * render official lineup after commit
     -   * reserve wheel space in activity canvas
   ========================================================= */

(() => {
  const MOD = {
    mounted: false,
    root: null,
    host: null,
    committed: false,
    committedSnapshot: null,
    offChallengeStakes: null, 
    offNominationsUpdated: null,   
    offPhase: null,
    offRoster: null,
    offScores: null,
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

  function getOverlayApi() {
    return window.__CE_CHALLENGE_OVERLAY || null;
  }

  function getInputApi() {
    return window.__CE_CHALLENGE_INPUT || null;
  }

  function getNominationApi() {
    return window.__CE_CHALLENGE_NOMINATION || null;
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

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function getHost() {
    return document.getElementById('activity-canvas');
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
    if (document.getElementById('ce-challenge111-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-challenge111-styles';
    s.textContent = `
      #ce-challenge111-root{
        position:absolute;
        inset:0;
        z-index:3;
        pointer-events:none;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }

      .ce-ch111-shell{
        position:absolute;
        inset:12px;
        display:grid;
        grid-template-columns: minmax(320px, 420px) 1fr;
        gap:12px;
        pointer-events:none;
      }

      .ce-ch111-panel{
        pointer-events:auto;
        background:rgba(17,21,26,0.94);
        border:1px solid rgba(255,255,255,0.10);
        border-radius:16px;
        box-shadow:0 12px 30px rgba(0,0,0,0.25);
        color:#e8eef2;
        min-height:0;
      }

      .ce-ch111-card{
        padding:14px;
        display:flex;
        flex-direction:column;
        gap:12px;
        height:100%;
        box-sizing:border-box;
      }

      .ce-ch111-title{
        font-size:14px;
        font-weight:900;
        letter-spacing:0.04em;
        text-transform:uppercase;
        opacity:0.9;
      }

      .ce-ch111-copy{
        font-size:14px;
        line-height:1.45;
        opacity:0.9;
      }

      .ce-ch111-btn{
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(80,140,255,0.32);
        border-color:rgba(80,140,255,0.42);
        color:#fff;
        padding:12px 14px;
        border-radius:12px;
        font-weight:900;
        cursor:pointer;
      }

      .ce-ch111-btn:hover{
        background:rgba(80,140,255,0.42);
      }

      .ce-ch111-btn[disabled]{
        opacity:0.45;
        cursor:not-allowed;
      }

      .ce-ch111-list{
        display:flex;
        flex-direction:column;
        gap:8px;
        min-height:0;
        overflow:auto;
      }

      .ce-ch111-empty{
        padding:16px;
        border-radius:12px;
        background:rgba(255,255,255,0.05);
        border:1px dashed rgba(255,255,255,0.14);
        font-size:14px;
        opacity:0.82;
      }

      .ce-ch111-row{
        padding:12px;
        border-radius:12px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.08);
        display:grid;
        grid-template-columns:auto 1fr auto;
        gap:10px;
        align-items:center;
      }

      .ce-ch111-row.is-active{
        background:rgba(245,158,11,0.14);
        border-color:rgba(245,158,11,0.34);
        box-shadow:0 0 0 2px rgba(245,158,11,0.12) inset;
      }


      .ce-ch111-order{
        min-width:28px;
        height:28px;
        border-radius:999px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:12px;
        font-weight:900;
        background:rgba(255,255,255,0.10);
      }

      .ce-ch111-match{
        display:flex;
        flex-direction:column;
        gap:4px;
        min-width:0;
      }

      .ce-ch111-names{
        font-size:15px;
        font-weight:900;
        line-height:1.2;
      }

      .ce-ch111-meta{
        font-size:12px;
        opacity:0.8;
        line-height:1.3;
      }

      .ce-ch111-stake{
        font-size:18px;
        font-weight:900;
        color:#7dd3fc;
        white-space:nowrap;
      }

      .ce-ch111-wheel{
        flex:1 1 auto;
        min-height:240px;
        border-radius:14px;
        background:rgba(255,255,255,0.05);
        border:1px dashed rgba(255,255,255,0.14);
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding:20px;
        font-size:15px;
        line-height:1.45;
        opacity:0.85;
      }


      .ce-ch111-wheelPlaceholder{
        flex:1 1 auto;
        min-height:240px;
        border-radius:14px;
        background:rgba(255,255,255,0.05);
        border:1px dashed rgba(255,255,255,0.14);
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding:20px;
        font-size:15px;
        line-height:1.45;
        opacity:0.85;
      }

      .ce-ch111-status{
        padding:10px 12px;
        border-radius:12px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.08);
        font-size:13px;
        line-height:1.4;
      }
    `;
    document.head.appendChild(s);
  }

  function getLiveSnapshot() {
    const api = getOverlayApi();
    return api?.getSnapshot?.() || { stakes: {}, orderedPairs: [] };
  }

  function hasCommitablePairs() {
    const snap = getLiveSnapshot();
    return Array.isArray(snap?.orderedPairs) && snap.orderedPairs.length > 0;
  }

  function cloneSnapshot(snap) {
    return JSON.parse(JSON.stringify(snap || { stakes: {}, orderedPairs: [] }));
  }

  function lockStakeEditing() {
    try { getInputApi()?.closeEditor?.({ commit: true, move: 0 }); } catch {}
    qsa('.lb-item[data-student-id]').forEach((row) => {
      row.setAttribute('data-ch-locked', MOD.committed ? '1' : '0');
    });
  }

  function unlockStakeEditing() {
    qsa('.lb-item[data-student-id]').forEach((row) => {
      row.removeAttribute('data-ch-locked');
    });
  }

  function commitCurrentSnapshot() {
    const snap = getLiveSnapshot();
    if (!Array.isArray(snap?.orderedPairs) || snap.orderedPairs.length === 0) return false;

    MOD.committedSnapshot = cloneSnapshot(snap);
    MOD.committed = true;
    lockStakeEditing();
    render();
    return true;
  }

  function clearCommitOnPhaseExit() {
    MOD.committed = false;
    MOD.committedSnapshot = null;
    unlockStakeEditing();
  }

  function getRenderSnapshot() {
    if (MOD.committed && MOD.committedSnapshot) return MOD.committedSnapshot;
    return getLiveSnapshot();
  }

  function renderPreCommit() {
    const canCommit = hasCommitablePairs();

    return `
      <div class="ce-ch111-card">
        <div class="ce-ch111-title">Challenge Queue</div>
        <div class="ce-ch111-copy">
          Stakes are still live. Adjust nominations on the leaderboard, then press Commit to freeze the official duel lineup.
        </div>
        <button type="button" class="ce-ch111-btn" data-ch111-commit ${canCommit ? '' : 'disabled'}>Commit</button>
        <div class="ce-ch111-status">
          ${canCommit
            ? 'At least one valid pair is available. Commit will lock the current pairings and convert this area into the official lineup.'
            : 'No valid pairs yet. Enter stakes on the leaderboard until at least one duel is formed.'}
        </div>
        <div class="ce-ch111-empty">
          Official duel order will appear here after Commit. Registered duel stake is always the lower of the two paired nominations.
        </div>
      </div>
    `;
  }

  function renderCommittedLineup(snapshot) {
    const pairs = Array.isArray(snapshot?.orderedPairs) ? snapshot.orderedPairs : [];
    const activeDuelIndex = Number(getNominationApi()?.getCurrentDuelIndex?.() || 0);

    if (!pairs.length) {
      return `
        <div class="ce-ch111-card">
          <div class="ce-ch111-title">Official Lineup</div>
          <div class="ce-ch111-empty">No committed duels.</div>
        </div>
      `;
    }

    const rows = pairs.map((pair, index) => `
      <div class="ce-ch111-row ${index === activeDuelIndex ? 'is-active' : ''}">
        <div class="ce-ch111-order">${index + 1}</div>
        <div class="ce-ch111-match">
          <div class="ce-ch111-names">${escapeHtml(pair?.a?.name || pair?.a?.id || 'Student')} vs ${escapeHtml(pair?.b?.name || pair?.b?.id || 'Student')}</div>
          <div class="ce-ch111-meta">Nomination ${escapeHtml(String(pair?.a?.stake ?? 0))} vs ${escapeHtml(String(pair?.b?.stake ?? 0))}</div>
        </div>
        <div class="ce-ch111-stake">${escapeHtml(String(pair?.registered ?? 0))}</div>
      </div>
    `).join('');

    return `
      <div class="ce-ch111-card">
        <div class="ce-ch111-title">Official Lineup</div>
        <div class="ce-ch111-status">
          Duel order is now locked. Highest registered stake goes first. Registered stake = lower of the two paired nominations.
        </div>
        <div class="ce-ch111-list">${rows}</div>
      </div>
    `;
  }

  function renderWheelPanel() {
    if (!MOD.committed) {
      return `
        <div class="ce-ch111-card">
          <div class="ce-ch111-title">Random Selector Wheel</div>
          <div class="ce-ch111-wheelPlaceholder">
            Wheel space reserved for post-commit duel activity selection.
          </div>
        </div>
      `;
    }

    return `
      <div class="ce-ch111-card">
        <div class="ce-ch111-title">Random Selector Wheel</div>
        <div class="ce-ch111-wheel"></div>
      </div>
    `;
  }

  function bindUi() {
    const commitBtn = qs('[data-ch111-commit]', MOD.root);
    if (commitBtn) {
      commitBtn.addEventListener('click', () => {
        commitCurrentSnapshot();
      });
    }
  }

  function render() {
    if (!MOD.root) return;

    const inPhase = isPhase6(getPhaseNow());
    if (!inPhase) {
      MOD.root.innerHTML = '';
      clearCommitOnPhaseExit();
      return;
    }

    // Keep leaderboard lock state in sync on every render.
    // This prevents stale data-ch-locked="1" from hiding the staking overlay
    // before commit.
    if (MOD.committed) {
      lockStakeEditing();
    } else {
      unlockStakeEditing();
    }

    const snapshot = getRenderSnapshot();

    MOD.root.innerHTML = `
      <div class="ce-ch111-shell">
        <section class="ce-ch111-panel">
          ${MOD.committed ? renderCommittedLineup(snapshot) : renderPreCommit()}
        </section>
        <section class="ce-ch111-panel">
          ${renderWheelPanel()}
        </section>
      </div>
    `;

    bindUi();
  }



  function mount() {
    if (MOD.mounted) return;
    MOD.mounted = true;

    MOD.host = getHost();
    if (!MOD.host) return;

    ensureStyles();

    MOD.root = document.createElement('div');
    MOD.root.id = 'ce-challenge111-root';
    MOD.host.appendChild(MOD.root);

    const Bus = getBus();
    if (Bus?.on) {
      const rerender = () => render();
      Bus.on('challenge:stakesUpdated', rerender);
      Bus.on('challenge:nominationsUpdated', rerender);
      Bus.on('lesson:phaseChange', rerender);
      Bus.on('roster:updated', rerender);
      Bus.on('scores:updated', rerender);
      MOD.offChallengeStakes = () => { try { Bus.off?.('challenge:stakesUpdated', rerender); } catch {} };
      MOD.offNominationsUpdated = () => { try { Bus.off?.('challenge:nominationsUpdated', rerender); } catch {} };
      MOD.offPhase = () => { try { Bus.off?.('lesson:phaseChange', rerender); } catch {} };
      MOD.offRoster = () => { try { Bus.off?.('roster:updated', rerender); } catch {} };
      MOD.offScores = () => { try { Bus.off?.('scores:updated', rerender); } catch {} };
    }

    render();
  }

  function unmount() {
    if (!MOD.mounted) return;
    MOD.mounted = false;
    clearCommitOnPhaseExit();

    try { MOD.offChallengeStakes?.(); } catch {}
    try { MOD.offNominationsUpdated?.(); } catch {}
    try { MOD.offPhase?.(); } catch {}
    try { MOD.offRoster?.(); } catch {}
    try { MOD.offScores?.(); } catch {}
    MOD.offChallengeStakes = null;
    MOD.offNominationsUpdated = null;
    MOD.offPhase = null;
    MOD.offRoster = null;
    MOD.offScores = null;

    try { MOD.root?.remove?.(); } catch {}
    MOD.root = null;
    MOD.host = null;
  }

  MOD.mount = mount;
  MOD.unmount = unmount;
  MOD.commit = commitCurrentSnapshot;
  MOD.clearCommit = clearCommitOnPhaseExit;
  MOD.getCommittedSnapshot = () => cloneSnapshot(MOD.committedSnapshot);
  MOD.isCommitted = () => !!MOD.committed;

  window.__CE_CHALLENGE_COMMIT = MOD;
})();
