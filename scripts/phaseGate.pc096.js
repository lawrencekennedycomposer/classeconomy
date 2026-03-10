/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC096-A1
   Module: phaseGate.pc096.js
   Purpose: Canonical Phase Entry / Exit Authority (Advisory Mode)
   Canonical Source: Tech Spec v1 – Phase Advisory System
   Notes:
   - Additive-only relative to system
   - No timeline authority
   - Emits lesson:phaseChange as the ONLY commit
   ========================================================= */

import Events from './events.js';

const PhaseGate = (() => {

  let initialised = false;

  // Optional CE event bus (window.__CE_BOOT.modules.Events)
  let CEEvents = null;
  let phaseWindows = null;
  let getLessonConfig = null;

  const state = {
    currentPhase: 1,
    phaseEnteredAt: Date.now(),
    countdown: null,        // { phase, durationMs, endsAt }
    overtimeSince: null,    // timestamp
    tickId: null,
    exitLoopId: null,
    exitModalOpen: false,
    configLocked: false,
  };

  function log(...a) { console.log('[PC096][PhaseGate]', ...a); }
  function warn(...a) { console.warn('[PC096][PhaseGate]', ...a); }

  function cfg() {
    return (typeof getLessonConfig === 'function'
      ? getLessonConfig()
      : (window.__CE_BOOT?.lessonConfig || {})
    ) || {};
  }

  function mode() {
    return cfg().burnlineMode || 'advisory';
  }

  function enabledPhases() {
    const e = Object.assign({}, cfg().enabledPhases || {});
    e[1] = true;
    e[7] = true;
    return e;
  }

  function isTimedPhase(p) {
    return p >= 3 && p <= 6;
  }

  function emitBoth(evt, detail) {
    Events.emit(evt, detail);
    if (CEEvents && typeof CEEvents.emit === 'function') {
      CEEvents.emit(evt, detail);
    }
  }

  function lockConfigIfLeavingPhase1(prev, next) {
    if (state.configLocked) return;
    if (Number(prev) === 1 && Number(next) !== 1) {
      const c = cfg();
      c.__locked = true;
      state.configLocked = true;
      log('lessonConfig locked (left Phase 1)');
    }
  }

  function nextEnabledPhase(fromPhase) {
    const e = enabledPhases();
    for (let p = Number(fromPhase) + 1; p <= 7; p++) {
      if (e[p]) return p;
    }
    return 7;
  }

  // --------------------------------------------------
  // Countdown / overtime engine
  // --------------------------------------------------
  function clearTick() {
    if (state.tickId) {
      clearInterval(state.tickId);
      state.tickId = null;
    }
  }

  function clearExitLoop() {
    if (state.exitLoopId) {
      clearTimeout(state.exitLoopId);
      state.exitLoopId = null;
    }
  }

  function publishState() {
    window.__CE_BOOT = window.__CE_BOOT || {};
    window.__CE_BOOT.phaseGateState = {
    inited: !!state.inited,
      currentPhase: state.currentPhase,
      phaseEnteredAt: state.phaseEnteredAt,
      countdown: state.countdown,
      overtimeSince: state.overtimeSince,
    };
  }

  function startCountdown(phase, durationMs) {
    clearTick();
    clearExitLoop();

    state.overtimeSince = null;
    state.countdown = {
      phase,
      durationMs,
      endsAt: Date.now() + durationMs,
    };

    state.tickId = setInterval(() => {
      if (!state.countdown) return;
      const remaining = state.countdown.endsAt - Date.now();
      if (remaining <= 0) {
        clearTick();
        state.countdown = null;
        requestExitModal({ reason: 'timeout' });
      }
    }, 250);

    publishState();
  }

  function enterOvertime() {
    if (!state.overtimeSince) state.overtimeSince = Date.now();
    scheduleExitLoop();
    publishState();
  }

  function scheduleExitLoop() {
    clearExitLoop();
    state.exitLoopId = setTimeout(() => {
      state.exitLoopId = null;
      if (state.overtimeSince && isTimedPhase(state.currentPhase)) {
        requestExitModal({ reason: 'overtimeReminder' });
      }
    }, 60000);
  }

  // --------------------------------------------------
  // UI helpers (PhaseWindows or fallback)
  // --------------------------------------------------
  function hasPhaseWindows() {
    return phaseWindows &&
      typeof phaseWindows.open === 'function' &&
      typeof phaseWindows.close === 'function';
  }

  function closeExitModal() {
    state.exitModalOpen = false;
    if (hasPhaseWindows()) phaseWindows.close('phaseGateExit');
  }

  function closeEntryModal() {
    if (hasPhaseWindows()) phaseWindows.close('phaseGateEntry');
  }

  function promptForMinutes(defaultMin) {
    const raw = window.prompt('How many minutes for this phase?', String(defaultMin));
    if (raw == null) return null;
    const v = Number(raw);
    if (!Number.isFinite(v) || v <= 0) return null;
    return Math.round(v * 60 * 1000);
  }

  function openEntryModal(toPhase, opts = {}) {
    const p = Number(toPhase);
    const defaultMin = 5;
    const doCommit = opts.commit !== false;

    // Spec invariant: phases 1,2,7 never require time entry
    if (!isTimedPhase(p)) {
      if (doCommit) commitPhaseChange(p);
      return;
    }

    if (hasPhaseWindows()) {
      const content = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div>How much time for this phase?</div>
          <input id="pg096-minutes" type="number" min="1" step="1"
                 value="${defaultMin}"
                 style="padding:8px; font-size:14px; width:120px;" />
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button id="pg096-cancel">Cancel</button>
            <button id="pg096-ok">Start</button>
          </div>
        </div>
      `;

      phaseWindows.open({
        id: 'phaseGateEntry',
        title: 'Set Phase Time',
        content,
         mode: 'bottomsheet'
      });

      setTimeout(() => {
        const ok = document.getElementById('pg096-ok');
        const cancel = document.getElementById('pg096-cancel');
        const inp = document.getElementById('pg096-minutes');

        if (cancel) cancel.onclick = () => closeEntryModal();
        if (ok) ok.onclick = () => {
          const mins = Number(inp?.value);
          if (!Number.isFinite(mins) || mins <= 0) return;
          closeEntryModal();
          if (doCommit) commitPhaseChange(p);
          startCountdown(p, mins * 60000);
        };
      }, 0);

      return;
    }

    const durMs = promptForMinutes(defaultMin);
    if (durMs == null) return;
    if (doCommit) commitPhaseChange(p);
    startCountdown(p, durMs);
  }

  function openCoinflipCompleteModal(toPhase) {
    const p = Number(toPhase);
    if (!Number.isFinite(p)) return;

    if (hasPhaseWindows()) {
      const content = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="font-weight:800;">Coinflip complete.</div>
          <div>What next?</div>
          <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button id="pg096-cf-again">Play again</button>
            <button id="pg096-cf-next">Next phase</button>
          </div>
        </div>
      `;

      phaseWindows.open({
        id: 'phaseGateConfirm',
        title: 'Phase 2 Complete',
        content,
        mode: 'bottomsheet'
      });

      setTimeout(() => {
        // Hide the X for this modal (no close path)
        try {
          const win = window.__CE_CANVAS?.windows?.phaseGateConfirm;
          const x = win?.querySelector?.('.close');
          if (x) x.style.display = 'none';
        } catch (_) {}

        const again = document.getElementById('pg096-cf-again');
        const next  = document.getElementById('pg096-cf-next');

        if (again) again.onclick = () => {
          phaseWindows.close('phaseGateConfirm');
          try { window.__CE_BOOT?.modules?.Events?.emit?.('coinflip:playAgain', { source: 'phaseGate' }); } catch (_) {}
        };

        if (next) next.onclick = () => {
          phaseWindows.close('phaseGateConfirm');
          commitPhaseChange(p);
          openEntryModal(p, { commit: false });
        };
      }, 0);

      return;
    }

    // Fallback: proceed to next phase
    commitPhaseChange(p);
    openEntryModal(p, { commit: false });
  }

function openExtendModal(currentPhase) {
  const p = Number(currentPhase);
  const defaultMin = 5;

  if (hasPhaseWindows()) {
    const content = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div>Extend time for this phase</div>
        <input id="pg096-ext-minutes" type="number" min="1" step="1"
               value="${defaultMin}"
               style="padding:8px; font-size:14px; width:120px;" />
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button id="pg096-ext-cancel">Cancel</button>
          <button id="pg096-ext-ok">Start</button>
        </div>
      </div>
    `;

    phaseWindows.open({
      id: 'phaseGateExtend',
      title: 'Extend Time',
      content,
      mode: 'modal'
    });

    setTimeout(() => {
      const ok = document.getElementById('pg096-ext-ok');
      const cancel = document.getElementById('pg096-ext-cancel');
      const inp = document.getElementById('pg096-ext-minutes');

      if (cancel) cancel.onclick = () => phaseWindows.close('phaseGateExtend');
      if (ok) ok.onclick = () => {
        const mins = Number(inp?.value);
        if (!Number.isFinite(mins) || mins <= 0) return;
        phaseWindows.close('phaseGateExtend');
        state.overtimeSince = null;
        startCountdown(p, mins * 60000);
      };
    }, 0);

    return;
  }

  const durMs = promptForMinutes(defaultMin);
  if (durMs == null) return;
  state.overtimeSince = null;
  startCountdown(p, durMs);
}

    function requestExitModal({ reason, target } = {}) {
    if (!isTimedPhase(state.currentPhase)) return;
    if (state.exitModalOpen) return;
    state.exitModalOpen = true;

    const current = state.currentPhase;
    const e = enabledPhases();
    const next = nextEnabledPhase(current);
    const desired =
      reason === 'teacherAttemptLeave' &&
      Number.isFinite(Number(target)) &&
      e[Number(target)] &&
      Number(target) !== current
        ? Number(target)
        : next;

    const onYes = () => {
      closeExitModal();
      clearTick();
      clearExitLoop();
      state.countdown = null;
      state.overtimeSince = null;
      if (isTimedPhase(desired)) {
        commitPhaseChange(desired);
        openEntryModal(desired, { commit: false });
        return;
      }
      commitPhaseChange(desired);
    };

    const onExtend = () => {
      closeExitModal();
      openExtendModal(current);
    };

    const onClose = () => {
      closeExitModal();
      if (reason === 'timeout') enterOvertime();
    };

    if (hasPhaseWindows()) {
      const content = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div>${reason === 'timeout' ? 'Time is up.' : 'Confirm leaving this phase.'}</div>
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button id="pg096-close">Close ×</button>
            ${reason === 'timeout'
              ? `<button id="pg096-extend">Extend</button><button id="pg096-yes">Leave</button>`
              : `<button id="pg096-yes">Confirm</button>`
            }
          </div>
        </div>
      `;

      phaseWindows.open({
        id: 'phaseGateExit',
        title: 'Exit Phase?',
        content,
         mode: 'bottomsheet'
      });

      setTimeout(() => {
        const yes = document.getElementById('pg096-yes');
        const extend = document.getElementById('pg096-extend');
        const close = document.getElementById('pg096-close');
        if (yes) yes.onclick = onYes;
        if (extend) extend.onclick = onExtend;
        if (close) close.onclick = onClose;
      }, 0);

      return;
    }

    if (reason === 'timeout') {
      const leave = window.confirm('Time is up. Leave this phase?');
      if (leave) return onYes();
      const extend = window.confirm('Extend time for this phase?');
      if (extend) return onExtend();
      return onClose();
    }

    const yes = window.confirm('Confirm leaving this phase?');
    if (yes) return onYes();
    onClose();
  }

  // --------------------------------------------------
  // Canonical commit
  // --------------------------------------------------
  function commitPhaseChange(toPhase) {
    const prev = state.currentPhase;
    const next = Number(toPhase);

    lockConfigIfLeavingPhase1(prev, next);

    state.phaseEnteredAt = Date.now();
    state.exitModalOpen = false;
    clearExitLoop();

    if (prev !== next) {
      state.countdown = null;
      state.overtimeSince = null;
      clearTick();
      closeExitModal();
    }

    emitBoth('lesson:phaseChange', {
      from: prev,
      to: next,
      ts: Date.now()
    });

    publishState();
  }

  // --------------------------------------------------
  // Entry request routing
  // --------------------------------------------------
    function onRequestEnter(payload = {}) {
    if (mode() !== 'advisory') return;

  // Support nested CustomEvent payloads and plain objects
    let d = payload;
    for (let i = 0; i < 3; i++) d = d?.detail ?? d;
    const toPhase = d?.toPhase;
    const source = d?.source;

    const target = Number(toPhase);
    const cur = Number(state.currentPhase);
    const e = enabledPhases();

    if (!e[target] || target === cur) return;

    if (cur === 2 && source !== 'burnline' && source !== 'coinflip') {
      warn('Phase 2 early exit blocked');
      return;
    }

    if (isTimedPhase(cur)) {
     requestExitModal({ reason: 'teacherAttemptLeave', target });
      return;
    }


    if (isTimedPhase(target)) {
      if (cur === 2 && source === 'coinflip' && target === 3) {
        openCoinflipCompleteModal(target);
        return;
      }
      commitPhaseChange(target);
      openEntryModal(target, { commit: false });
      return;
    }

    commitPhaseChange(target);
  }

  function onLessonPhaseChange({ detail } = {}) {
    const next = Number(detail?.to ?? detail ?? 1);
    if (!Number.isFinite(next) || next === state.currentPhase) return;

    const prev = state.currentPhase;
    lockConfigIfLeavingPhase1(prev, next);

    state.currentPhase = next;
    state.countdown = null;
    state.overtimeSince = null;
    state.exitModalOpen = false;
    clearTick();
    clearExitLoop();
    closeExitModal();

    publishState();
  }

  function init(opts = {}) {
    if (initialised) return;
    initialised = true;

    state.inited = true;

    CEEvents = opts.Events || null;
    phaseWindows = opts.phaseWindows || null;
    getLessonConfig = opts.getLessonConfig || null;

    state.currentPhase = Number(window.__CE_BOOT?.phase?.current ?? 1) || 1;
    publishState();

    Events.on('ui:phaseRequestEnter', onRequestEnter);
    Events.on('lesson:phaseChange', onLessonPhaseChange);

    if (CEEvents && typeof CEEvents.on === 'function') {
      CEEvents.on('ui:phaseRequestEnter', onRequestEnter);
      CEEvents.on('lesson:phaseChange', onLessonPhaseChange);
    }

    if (window.__CE_BOOT?.modules) {
      window.__CE_BOOT.modules.PhaseGate = PhaseGate;
    }

    log('initialised');
  }

  return { init };

})();

window.PhaseGate = PhaseGate;
export default PhaseGate;


