/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC108-A0
   Module: challenge.base.pc108.js
   Purpose: Phase 6 Challenge Base
   Notes:
     - Additive-only; must unmount cleanly.
     - Must not emit lesson:phaseChange.
     - Must not touch burnline.
     - Must not persist state directly.
     - Must not modify leaderboard/tile behaviour in PC108.
     - PC108 scope: base shell only for Challenge Phase.
   ========================================================= */

(() => {
  const CHALLENGE = {
    el: null,
    mounted: false,
    host: null,
    root: null,

    offScores: null,
    offRoster: null,
    offPhase: null,

    currentPhase: null,
    phaseEndsAt: null,
    timerId: null,

    elPhaseTimer: null,
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

  function getPhaseGateState() {
    return window.__CE_BOOT?.phaseGateState || null;
  }

  function isPhase6(phase) {
    return String(phase) === '6';
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatMMSS(ms) {
    const s = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${pad2(ss)}`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getRoster() {
    try {
      return getDashboard()?.getRosterSnapshot?.()?.students || [];
    } catch {
      return [];
    }
  }

  function getScoresById() {
    try {
      return getDashboard()?.getScoresSnapshot?.()?.byId || {};
    } catch {
      return {};
    }
  }

  function getEnteredStudentsCount() {
    const roster = getRoster();
    const scoresById = getScoresById();

    let count = 0;
    for (const s of roster) {
      if (!s || s.active === false) continue;
      const rec = scoresById[String(s.id)] || {};
      const unbanked = Number(rec.unbanked || 0);
      if (unbanked > 0) count += 1;
    }
    return count;
  }

  function ensureStyles() {
    if (document.getElementById('ce-challenge108-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-challenge108-styles';
    s.textContent = `
      #ce-challenge-root{
        position:absolute;
        inset:0;
        z-index:2;
        pointer-events:none;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }

      .ce-challenge-shell{
        position:absolute;
        inset:12px 12px 12px 12px;
        display:grid;
        grid-template-columns:360px 1fr;
        gap:12px;
        pointer-events:none;
      }

      .ce-challenge-panel{
        pointer-events:auto;
        background:rgba(17,21,26,0.94);
        border:1px solid rgba(255,255,255,0.10);
        border-radius:16px;
        box-shadow:0 12px 30px rgba(0,0,0,0.25);
        color:#e8eef2;
        min-height:0;
      }

      .ce-challenge-card{
        padding:14px;
      }

      .ce-challenge-title{
        font-size:14px;
        font-weight:900;
        letter-spacing:0.04em;
        text-transform:uppercase;
        opacity:0.9;
        margin-bottom:10px;
      }

      .ce-challenge-hero{
        font-size:24px;
        font-weight:950;
        line-height:1.15;
        margin-bottom:8px;
      }

      .ce-challenge-copy{
        font-size:14px;
        line-height:1.45;
        opacity:0.9;
      }

      .ce-challenge-kpis{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
        margin-top:12px;
      }

      .ce-challenge-kpi{
        padding:10px;
        border-radius:12px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.08);
      }

      .ce-challenge-kpi-label{
        font-size:11px;
        text-transform:uppercase;
        opacity:0.72;
        margin-bottom:4px;
      }

      .ce-challenge-kpi-value{
        font-size:22px;
        font-weight:900;
      }

      .ce-challenge-actions{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:14px;
      }

      .ce-challenge-btn{
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(255,255,255,0.08);
        color:#fff;
        padding:10px 12px;
        border-radius:12px;
        font-weight:900;
        cursor:not-allowed;
        opacity:0.55;
      }

      .ce-challenge-list{
        display:flex;
        flex-direction:column;
        gap:10px;
      }

      .ce-challenge-empty{
        padding:16px;
        border-radius:12px;
        background:rgba(255,255,255,0.05);
        border:1px dashed rgba(255,255,255,0.14);
        font-size:14px;
        opacity:0.82;
      }

      .ce-challenge-note{
        margin-top:12px;
        padding:12px;
        border-radius:12px;
        background:rgba(80,140,255,0.14);
        border:1px solid rgba(80,140,255,0.24);
        color:#dbeafe;
        font-size:13px;
        line-height:1.4;
      }
    `;
    document.head.appendChild(s);
  }

  function render() {
    if (!CHALLENGE.root) return;

    const pg = getPhaseGateState();
    const enteredCount = getEnteredStudentsCount();
    const isLive = isPhase6(getPhaseNow());
    const phaseLabel = isLive ? 'Challenge Phase live' : 'Challenge Phase idle';

    CHALLENGE.root.innerHTML = `
      <div class="ce-challenge-shell">
        <section class="ce-challenge-panel">
          <div class="ce-challenge-card">
            <div class="ce-challenge-title">Phase 6 • Challenge</div>
            <div class="ce-challenge-hero">${escapeHtml(phaseLabel)}</div>
            <div class="ce-challenge-copy">
              PC108 mounts the base shell only.
              Live staking, pairing, colour coding, leaderboard augmentation,
              commit logic, lineup generation, wheel flow and duel resolution
              land in later Challenge PCs.
            </div>

            <div class="ce-challenge-kpis">
              <div class="ce-challenge-kpi">
                <div class="ce-challenge-kpi-label">Phase timer</div>
                <div class="ce-challenge-kpi-value" data-ce-challenge-timer>${escapeHtml(formatMMSS(Math.max(0, Number(pg?.countdown?.endsAt || 0) - Date.now())))}</div>
              </div>
              <div class="ce-challenge-kpi">
                <div class="ce-challenge-kpi-label">Active entries</div>
                <div class="ce-challenge-kpi-value">${escapeHtml(String(enteredCount))}</div>
              </div>
            </div>

            <div class="ce-challenge-actions">
              <button type="button" class="ce-challenge-btn" disabled>Commit Stakes</button>
              <button type="button" class="ce-challenge-btn" disabled>Start Duel</button>
            </div>

            <div class="ce-challenge-note">
              Challenge is Phase 6 and already sits inside the timed phase path.
              This base keeps the phase visually mounted and ready for the next PC.
            </div>
          </div>
        </section>

        <section class="ce-challenge-panel">
          <div class="ce-challenge-card">
            <div class="ce-challenge-title">Official Duel Lineup</div>
            <div class="ce-challenge-list">
              <div class="ce-challenge-empty">
                No committed duels yet. The official lineup and registered duel
                amounts will render here after Commit is implemented.
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    CHALLENGE.elPhaseTimer = qs('[data-ce-challenge-timer]', CHALLENGE.root);
  }

  function updateTimerUi() {
    if (!CHALLENGE.elPhaseTimer) return;

    const pg = getPhaseGateState();
    const endsAt = Number(pg?.countdown?.endsAt);
    const overtimeSince = Number(pg?.overtimeSince);
    const now = Date.now();

    if (Number.isFinite(endsAt)) {
      CHALLENGE.elPhaseTimer.textContent = formatMMSS(Math.max(0, endsAt - now));
      return;
    }

    if (Number.isFinite(overtimeSince)) {
      CHALLENGE.elPhaseTimer.textContent = formatMMSS(Math.max(0, now - overtimeSince));
      return;
    }

    CHALLENGE.elPhaseTimer.textContent = '00:00';
  }

  function startUiTick() {
    stopUiTick();
    CHALLENGE.timerId = window.setInterval(updateTimerUi, 250);
  }

  function stopUiTick() {
    if (CHALLENGE.timerId) {
      clearInterval(CHALLENGE.timerId);
      CHALLENGE.timerId = null;
    }
  }

  function mount(baseHost) {
    if (CHALLENGE.mounted) return { el: CHALLENGE.el };
    CHALLENGE.mounted = true;
    CHALLENGE.host = baseHost;

    ensureStyles();

    const el = document.createElement('div');
    el.id = 'ce-challenge-root';

    CHALLENGE.el = el;
    CHALLENGE.root = el;

    try { baseHost?.appendChild?.(el); } catch {}

    render();
    startUiTick();

    return { el };
  }

  function unmount() {
    if (!CHALLENGE.mounted) return;
    CHALLENGE.mounted = false;

    stopUiTick();

    try { CHALLENGE.offScores?.(); } catch {}
    try { CHALLENGE.offRoster?.(); } catch {}
    try { CHALLENGE.offPhase?.(); } catch {}

    CHALLENGE.offScores = null;
    CHALLENGE.offRoster = null;
    CHALLENGE.offPhase = null;
    CHALLENGE.elPhaseTimer = null;

    try { CHALLENGE.el?.remove?.(); } catch {}
    CHALLENGE.el = null;
    CHALLENGE.root = null;
    CHALLENGE.host = null;
    CHALLENGE.currentPhase = null;
    CHALLENGE.phaseEndsAt = null;
  }

  CHALLENGE.mount = mount;
  CHALLENGE.unmount = unmount;

  window.__CE_CHALLENGE_BASE = CHALLENGE;
})();
