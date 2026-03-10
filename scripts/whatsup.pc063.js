/* =========================================================
   VERSION INTEGRITY BLOCK – VI-063
   File: whatsup.pc063.js
   Role:
     - Owns full-screen behavioural overlay for "What’s Up?"
     - (Future) Swear Jar overlay can share this layer
     - Attaches absolute-position overlay to document.body
     - Provides a small global API for other modules to call
   Governance:
     - Append-only changes; no silent deletions
     - Single overlay instance; state machine per active student
========================================================= */

(() => {
  const STYLE_ID = 'pc063-whatsup-style';
  const OVERLAY_ID = 'pc063-whatsup-overlay-root';

  // --------------------------------------------------------
  //  State model for a single What’s Up? incident
  // --------------------------------------------------------
  const STATE = {
    active: false,
    studentId: null,
    studentName: '',
    cycleIndex: 0,      // cycle 0–2
    secondsLeft: 0,     // countdown 5 → 1
    deductedSoFar: 0,   // running total deducted (-10 cap)
    timerId: null,
    ariaHideId: null,    
  };

  // --------------------------------------------------------
  //  Dashboard lookup (correct + resilient)
  // --------------------------------------------------------
  function getDashboard() {
    // CE boot registry
    const modDash = window.__CE_BOOT?.CE?.modules?.Dashboard;
    if (modDash && typeof modDash.applyAward === 'function') {
      return modDash;
    }

    // Legacy global
    if (window.Dashboard && typeof window.Dashboard.applyAward === 'function') {
      return window.Dashboard;
    }

    // ES module fallback — always succeeds in your architecture
    try {
      return Dashboard;
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------
  //  Penalty engine (fully corrected)
  // --------------------------------------------------------
  function applyWhatsUpPenalty(studentId, amount) {
    const abs = Math.abs(amount);
    STATE.deductedSoFar += abs;

    const dash = getDashboard();
    if (!dash) {
      console.warn('[PC#063] Dashboard.applyAward not found; skipping What’s Up? penalty', {
        studentId,
        amount: abs
      });
      return;
    }

    try {
      dash.applyAward({
        studentId,
        points: -abs,
        reason: 'Penalty.WhatsUp',
        phase: null
      });

      flashWhatsUpPenalty(studentId);
    } catch (e) {
      console.warn('[PC#063] applyAward failed for What’s Up?', e);
    }
  }

  // --------------------------------------------------------
  //  Style + DOM bootstrap
  // --------------------------------------------------------
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.type = 'text/css';
    s.textContent = `
      :root {
        --wu-soft-yellow: #ffd666;
        --wu-overlay-bg: rgba(0, 0, 0, 0.3);
        --wu-text-shadow: 0 0 18px rgba(0,0,0,0.6);
      }

      .whatsup-overlay-root {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        opacity: 0;
        transition: opacity 180ms ease-out;
        background: var(--wu-overlay-bg);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
                     "Segoe UI", Roboto, Arial, sans-serif;
      }

      .whatsup-overlay-root.is-active {
        opacity: 1;
        pointer-events: auto;
      }

      .whatsup-overlay-inner {
        max-width: 960px;
        width: 100%;
        padding: 32px 24px 40px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        color: var(--wu-soft-yellow);
        text-shadow: var(--wu-text-shadow);
      }

      .whatsup-overlay-toprow {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 32px;
        gap: 16px;
      }

      .whatsup-resolve-button {
        flex: 0 0 auto;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        border: 2px solid var(--wu-soft-yellow);
        background: rgba(0,0,0,0.55);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--wu-soft-yellow);
        cursor: pointer;
      }

      .whatsup-resolve-button-label {
        line-height: 1.1;
        margin-bottom: 2px;
      }

      .whatsup-resolve-button-tick {
        font-size: 16px;
        line-height: 1;
      }

      .whatsup-student-name {
        font-size: 32px;
        font-weight: 600;
        color: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .whatsup-countdown {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .whatsup-digit {
        font-size: 240px;
        font-weight: 700;
        line-height: 0.9;
        color: var(--wu-soft-yellow);
        text-shadow:
          0 0 24px rgba(0,0,0,0.8),
          0 0 64px rgba(0,0,0,0.8);
      }

      .whatsup-label {
        font-size: 60px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--wu-soft-yellow);
      }

      .whatsup-digit.is-fading,
      .whatsup-label.is-fading {
        transition: opacity 1000ms ease-out;
        opacity: 0.25;
      }

      .whatsup-toast {
        margin-top: 18px;
        font-size: 18px;
        color: #ffe8a0;
      }

      @media (max-width: 900px) {
        .whatsup-digit { font-size: 180px; }
        .whatsup-label { font-size: 44px; }
        .whatsup-student-name { font-size: 26px; }
      }

      @media (max-width: 600px) {
        .whatsup-digit { font-size: 140px; }
        .whatsup-label { font-size: 32px; }
        .whatsup-student-name { font-size: 22px; }
      }
    `;
    document.head.appendChild(s);
  }

  function ensureOverlayRoot() {
    let root = document.getElementById(OVERLAY_ID);
    if (root) return root;

    root = document.createElement('div');
    root.id = OVERLAY_ID;
    root.className = 'whatsup-overlay-root';
    root.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('div');
    inner.className = 'whatsup-overlay-inner';

    const topRow = document.createElement('div');
    topRow.className = 'whatsup-overlay-toprow';

    const resolveBtn = document.createElement('button');
    resolveBtn.type = 'button';
    resolveBtn.className = 'whatsup-resolve-button';
    resolveBtn.setAttribute('data-role', 'whatsup-resolve');

    const resolveLabel = document.createElement('div');
    resolveLabel.className = 'whatsup-resolve-button-label';
    resolveLabel.textContent = 'RESUMED';

    const resolveTick = document.createElement('div');
    resolveTick.className = 'whatsup-resolve-button-tick';
    resolveTick.textContent = '✓';

    resolveBtn.appendChild(resolveLabel);
    resolveBtn.appendChild(resolveTick);

    const nameEl = document.createElement('div');
    nameEl.className = 'whatsup-student-name';
    nameEl.setAttribute('data-role', 'whatsup-student-name');
    nameEl.textContent = 'Student Name';

    topRow.appendChild(resolveBtn);
    topRow.appendChild(nameEl);

    const countdown = document.createElement('div');
    countdown.className = 'whatsup-countdown';

    const digitEl = document.createElement('div');
    digitEl.className = 'whatsup-digit';
    digitEl.setAttribute('data-role', 'whatsup-digit');
    digitEl.textContent = '5';

    const labelEl = document.createElement('div');
    labelEl.className = 'whatsup-label';
    labelEl.setAttribute('data-role', 'whatsup-label');
    labelEl.textContent = "WHAT'S UP?";

    const toastEl = document.createElement('div');
    toastEl.className = 'whatsup-toast';
    toastEl.setAttribute('data-role', 'whatsup-toast');
    toastEl.textContent = '';
    toastEl.style.display = 'none';

    countdown.appendChild(digitEl);
    countdown.appendChild(labelEl);
    countdown.appendChild(toastEl);

    inner.appendChild(topRow);
    inner.appendChild(countdown);
    root.appendChild(inner);

    document.body.appendChild(root);

    resolveBtn.addEventListener('click', () => {
      if (!STATE.active) return;
      resolveCurrent('button');
    });

    return root;
  }

  function getOverlayElements() {
    const root = document.getElementById(OVERLAY_ID);
    if (!root) return null;
    return {
      root,
      nameEl: root.querySelector('[data-role="whatsup-student-name"]'),
      digitEl: root.querySelector('[data-role="whatsup-digit"]'),
      labelEl: root.querySelector('[data-role="whatsup-label"]'),
      toastEl: root.querySelector('[data-role="whatsup-toast"]')
    };
  }

  // --------------------------------------------------------
  //  Rendering / transitions
  // --------------------------------------------------------
  function showOverlayShell(studentId, studentName) {
    const els = getOverlayElements();
    if (!els) return;

    const { root, nameEl, digitEl, labelEl, toastEl } = els;

    STATE.active = true;
    STATE.studentId = studentId;
    STATE.studentName = studentName || 'Student';
    STATE.cycleIndex = 0;
    STATE.secondsLeft = 5;
    STATE.deductedSoFar = 0;

    nameEl.textContent = STATE.studentName;
    toastEl.textContent = '';
    toastEl.style.display = 'none';

    digitEl.textContent = '5';
    digitEl.classList.remove('is-fading');
    labelEl.classList.remove('is-fading');

    root.classList.add('is-active');
    // Ensure overlay can receive clicks/focus when active
    if (STATE.ariaHideId != null) {
      clearTimeout(STATE.ariaHideId);
      STATE.ariaHideId = null;
    }
    root.removeAttribute('inert');
    root.setAttribute('aria-hidden', 'false');
  }

  function hideOverlayShell() {
    const els = getOverlayElements();
    if (!els) return;

    // If something inside overlay has focus, drop focus before hiding
    if (els.root.contains(document.activeElement)) {
      try { document.activeElement.blur(); } catch {}
    }

    els.root.classList.remove('is-active');
    // Prevent interaction/focus immediately while hidden
    els.root.setAttribute('inert', '');

    // Defer aria-hidden so focus changes settle before hiding from AT
    if (STATE.ariaHideId != null) clearTimeout(STATE.ariaHideId);
    STATE.ariaHideId = setTimeout(() => {
      els.root.setAttribute('aria-hidden', 'true');
      STATE.ariaHideId = null;
    }, 0);
  }

  function clearTimer() {
    if (STATE.timerId != null) {
      clearInterval(STATE.timerId);
      STATE.timerId = null;
    }
  }

  function resetState() {
    clearTimer();
    if (STATE.ariaHideId != null) {
      clearTimeout(STATE.ariaHideId);
      STATE.ariaHideId = null;
    }
    STATE.active = false;
    STATE.studentId = null;
    STATE.studentName = '';
    STATE.cycleIndex = 0;
    STATE.secondsLeft = 0;
    STATE.deductedSoFar = 0;
  }

  function scheduleCountdownTick() {
    clearTimer();
    STATE.secondsLeft = 5;
    renderDigit(STATE.secondsLeft);

    STATE.timerId = window.setInterval(() => {
      STATE.secondsLeft -= 1;

      if (STATE.secondsLeft >= 1) {
        renderDigit(STATE.secondsLeft);
      } else {
        clearTimer();
        handleCountdownCycleEnd();
      }
    }, 2000);
  }

  function renderDigit(value) {
    const els = getOverlayElements();
    if (!els) return;


    const { digitEl, labelEl } = els;

    digitEl.textContent = String(value);

    // restart fade transition
    digitEl.classList.remove('is-fading');
    labelEl.classList.remove('is-fading');
    digitEl.offsetHeight; // reflow
    digitEl.classList.add('is-fading');
    labelEl.classList.add('is-fading');
  }

  function showCapToast() {
    const { toastEl } = getOverlayElements() || {};
    if (!toastEl) return;
    toastEl.textContent = "What's Up? limit reached (-10). Case closed.";
    toastEl.style.display = 'block';
  }

  // --------------------------------------------------------
  //  Penalty flash
  // --------------------------------------------------------
  function flashWhatsUpPenalty(studentId) {
    try {
      const list = document.querySelector('.leaderboard .lb-list');
      if (!list) return;
      const li = list.querySelector(`.lb-item[data-student-id="${String(studentId)}"]`);
      if (!li) return;

      li.classList.add('lb-item--penalty-flash');
      setTimeout(() => {
        li.classList.remove('lb-item--penalty-flash');
      }, 1800);
    } catch (err) {
      console.warn('[PC#063] flashWhatsUpPenalty error', err);
    }
  }

  // --------------------------------------------------------
  //  Countdown cycle endings
  // --------------------------------------------------------
  function handleCountdownCycleEnd() {
    const studentId = STATE.studentId;
    if (!studentId) {
      hideOverlayShell();
      resetState();
      return;
    }

    if (STATE.cycleIndex < 2) {
      applyWhatsUpPenalty(studentId, 2);
      STATE.cycleIndex += 1;
      scheduleCountdownTick();
    } else {
      const remaining = Math.max(0, 10 - STATE.deductedSoFar);
      if (remaining > 0) {
        applyWhatsUpPenalty(studentId, remaining);
      }

      showCapToast();

      window.setTimeout(() => {
        hideOverlayShell();
        resetState();
      }, 2000);
    }
  }

  // --------------------------------------------------------
  //  Resolution + Cancel
  // --------------------------------------------------------
  function resolveCurrent(reason) {
    if (!STATE.active) return;
    hideOverlayShell();
    resetState();
  }

  function cancelCurrent(reason) {
    if (!STATE.active) return;
    hideOverlayShell();
    resetState();
  }

  // --------------------------------------------------------
  //  Public API
  // --------------------------------------------------------
  function startForStudent(studentId, studentName) {
    if (!studentId && studentId !== 0) {
      console.warn('[PC#063] startForStudent called without studentId');
      return;
    }

    if (STATE.active && STATE.studentId === studentId) {
      clearTimer();
      STATE.cycleIndex = 0;
      STATE.deductedSoFar = 0;
      showOverlayShell(studentId, studentName || STATE.studentName);
      scheduleCountdownTick();
      return;
    }

    if (STATE.active && STATE.studentId !== studentId) {
      cancelCurrent('new-student');
    }

    showOverlayShell(studentId, studentName);
    scheduleCountdownTick();
  }

  const API = {
    startForStudent,
    resolveActive: () => resolveCurrent('external'),
    cancelActive: () => cancelCurrent('external'),
    isActive: () => !!STATE.active,
  };

  if (!window.__CE_BEHAVIOUR) {
    window.__CE_BEHAVIOUR = {};
  }
  window.__CE_BEHAVIOUR.whatsUp = API;



  // --------------------------------------------------------
  //  Bootstrap
  // --------------------------------------------------------
  try {
    const init = () => {
      ensureStyle();
      ensureOverlayRoot();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  } catch (e) {
    console.warn('[PC#063] bootstrap error', e);
  }
})();
