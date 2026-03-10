/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC067-A2
   Module: burnline.phaseengine.pc067.js
   Purpose: Phase Engine Binding (corrected)
   Notes: PC055 is a side-effect module; no ES import expected.
   ========================================================= */

// PC067 — Phase Engine Binding
// Responsibilities:
// - Listen to lesson:phaseChange events
// - Route UI to correct phase window
// - Pure UI routing, no timing logic

import Events from './events.js';
// Removed invalid import of PC055

const PhaseEngine = (() => {

  let currentPhase = null;

  function init() {
    bindEvents();
  }

  function bindEvents() {
    // Prefer canon bus (PC073 + PC076 listen here)
    const Bus = window.__CE_BOOT?.modules?.Events || Events;
    Bus.on('lesson:phaseChange', (evtOrPayload) => {
      const detail = evtOrPayload?.detail;
      const to =
        detail?.to ??
        evtOrPayload?.to ??
        detail?.phase ??
        evtOrPayload?.phase ??
        detail ??
        null;
      if (!to) return;
      if (to === currentPhase) return;
      currentPhase = to;
      routePhase(to);
    });
  }

    function routePhase(phase) {

    // Prefer PhaseWindows module (current runtime). Fall back to legacy globals if present.
    const PhaseWindows = window.__CE_BOOT?.modules?.PhaseWindows || window.PhaseWindows || null;

    function closeAll() {
      if (PhaseWindows?.closeAll) return PhaseWindows.closeAll();
      if (PhaseWindows?.closeAllPhases) return PhaseWindows.closeAllPhases();
      if (typeof closeAllPhases === 'function') return closeAllPhases();
    }

    function open(id) {
      if (PhaseWindows?.open) return PhaseWindows.open(id);
      if (PhaseWindows?.openPhase) return PhaseWindows.openPhase(id);
      if (typeof openPhase === 'function') return openPhase(id);
      console.warn(`[PC067] No PhaseWindows.open/openPhase and no global openPhase — cannot open '${id}'`);
    }

    closeAll();

    // If there is no phase-window system in this runtime, do nothing.
    // BaseLayer (PC076) will still mount/unmount phase bases off lesson:phaseChange.
    if (!PhaseWindows && typeof openPhase !== 'function') return;

    switch (phase) {

      case 3:
        open('stw');
        break;
      case 4:
        open('work');
        break;
      case 5:
        open('game1');
        break;
      case 6:
        open('game2');
        break;
      case 7:
        open('purchases');
        break;
      default:
        // Phases 1 and 2 handled manually
        break;
    }
  }

  return { init };

})();

export default PhaseEngine;
