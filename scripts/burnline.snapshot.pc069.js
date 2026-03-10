/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC069-A1
   Module: burnline.snapshot.pc069.js
   Purpose: Burn-line Snapshot & Persistence Integration
   Canonical Source: Burn-line Engine Development Guide (PC064–PC070)
   Notes: Additive-only. No summarising. No assumptions.
   ========================================================= */

// PC069 — Snapshot Integration
// Responsibilities:
// - Write timing data to snapshots
// - Restore timing data from snapshots
// - Introduce the ONLY controlled mutation pathway for BurnlineCore (_unsafeApply)
// - Ensure integrity after sleep/wake or reload
// - No maths, no ticking, no rendering

import Events from './events.js';
import Storage from './storage.js';
import BurnlineCore from './burnlinecore.pc064.js';

const BurnlineSnapshot = (() => {

  // -------------------------------------------------------
  // PUBLIC INIT
  // -------------------------------------------------------
  function init() {

    // Attach the ONLY legal state mutation function to BurnlineCore
    BurnlineCore._unsafeApply = applyStateUnsafe;

    // Snapshot write triggers
    Events.on('lesson:end', writeSnapshot);
    Events.on('snapshot:manualExport', writeSnapshot);
    Events.on('snapshot:preReset', writeSnapshot);

    // Snapshot load trigger
    Events.on('snapshot:load', ({ data }) => {
      if (data && data.burnline) restoreSnapshot(data.burnline);
    });
  }

  // -------------------------------------------------------
  // WRITE SNAPSHOT
  // -------------------------------------------------------
  function writeSnapshot() {
    const state = BurnlineCore.getState();

    const burnlinePayload = {
      startTime: state.startTime,
      bellTime: state.bellTime,
      stwDuration: state.stwDuration,
      workDuration: state.workDuration,
      g1Duration: state.g1Duration,
      g2Duration: state.g2Duration,
      purchasesDuration: state.purchasesDuration,
      phaseBoundaries: { ...state.phaseBoundaries }
    };

    Storage.saveField('burnline', burnlinePayload);
  }

  // -------------------------------------------------------
  // RESTORE SNAPSHOT
  // -------------------------------------------------------
  function restoreSnapshot(payload) {
    if (!payload) return;

    const restored = {
      startTime: payload.startTime,
      bellTime: payload.bellTime,
      stwDuration: payload.stwDuration,
      workDuration: payload.workDuration,
      g1Duration: payload.g1Duration,
      g2Duration: payload.g2Duration,
      purchasesDuration: payload.purchasesDuration,
      phaseBoundaries: payload.phaseBoundaries
    };

    applyStateUnsafe(restored);

    Events.emit('burnline:scheduleUpdated', {
      bellTime: restored.bellTime,
      boundaries: restored.phaseBoundaries
    });
  }

  // -------------------------------------------------------
  // INTERNAL UNSAFE STATE APPLIER
  // -------------------------------------------------------
  function applyStateUnsafe(newState) {
    // This is the ONLY place in the entire system allowed to
    // mutate BurnlineCore internal state.
    // BellTimeHandler (PC068) will use this too.
    BurnlineCore.__STATE = JSON.parse(JSON.stringify(newState));
  }

  return { init };

})();

export default BurnlineSnapshot;
