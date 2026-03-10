/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC070-A1
   Module: burnline.devtools.pc070.js
   Purpose: Developer Tools for Burn-line Engine
   Canonical Source: Burn-line Engine Development Guide (PC064–PC070)
   Notes: Additive-only. No summarising. No assumptions.
   ========================================================= */

// PC070 — Burn-line Developer Tools (DEV-ONLY)
// Responsibilities:
// - Provide controlled hooks for testing burn-line behaviour
// - Disable/enable ticker clock
// - Jump to specific phases
// - Override 'now' for simulated time advancement
// - Print full schedule for inspection
// - MUST NOT appear in production UI
// - MUST NOT be available to students/teachers

import Events from './events.js';
import BurnlineCore from './burnlinecore.pc064.js';
import BurnlineTicker from './burnline.ticker.pc065.js';

const BurnlineDevTools = (() => {
  let devNowOffset = null;
  let tickerEnabled = true;

  // -------------------------------------------------------
  // DEV CLOCK CONTROL
  // -------------------------------------------------------
  function burnlineClock(enabled) {
    tickerEnabled = enabled;
    if (!enabled) {
      BurnlineTicker.pause();
      console.log('[PC070] Burn-line clock DISABLED');
    } else {
      BurnlineTicker.resume();
      console.log('[PC070] Burn-line clock ENABLED');
    }
  }

  // -------------------------------------------------------
  // MANUAL PHASE JUMP
  // -------------------------------------------------------
  function burnlineJumpToPhase(phase) {
    console.log(`[PC070] Jumping to phase ${phase}`);
    const mode = window.__CE_BOOT?.lessonConfig?.burnlineMode || 'timeline';
    if (mode === 'advisory') {
      // Advisory mode: request only (PhaseGate decides)
      Events.emit('ui:phaseRequestEnter', { toPhase: Number(phase), source: 'devtools' });
      return;
    }
    // Timeline mode: preserve existing dev jump
    Events.emit('lesson:phaseChange', { from: null, to: phase });
  }

  // -------------------------------------------------------
  // VIRTUAL TIME OVERRIDE
  // -------------------------------------------------------
  function burnlineSetNow(offsetMs) {
    devNowOffset = offsetMs;
    console.log(`[PC070] Virtual time offset set to ${offsetMs} ms`);
  }

  // -------------------------------------------------------
  // PRINT FULL SCHEDULE
  // -------------------------------------------------------
  function burnlinePrintSchedule() {
    const s = BurnlineCore.getState();
    console.table({
      startTime: s.startTime,
      bellTime: s.bellTime,
      stwDuration: s.stwDuration,
      workDuration: s.workDuration,
      g1Duration: s.g1Duration,
      g2Duration: s.g2Duration,
      purchasesDuration: s.purchasesDuration,
      p3End: s.phaseBoundaries.p3End,
      p4End: s.phaseBoundaries.p4End,
      p5End: s.phaseBoundaries.p5End,
      p6End: s.phaseBoundaries.p6End,
      p7End: s.phaseBoundaries.p7End,
    });
  }

  // -------------------------------------------------------
  // PUBLIC API
  // -------------------------------------------------------
  return {
    burnlineClock,
    burnlineJumpToPhase,
    burnlineSetNow,
    burnlinePrintSchedule,
  };

})();

window.__CE_DEV = Object.assign({}, window.__CE_DEV || {}, {
  ...BurnlineDevTools
});

export default BurnlineDevTools;