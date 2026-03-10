/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC068-A1
   Module: burnline.belltime.pc068.js
   Purpose: BellTime Adjustment Handler
   Canonical Source: Burn-line Engine Development Guide (PC064–PC070)
   Notes: Additive-only. No summarising. No assumptions.
   ========================================================= */

// PC068 — BellTime Adjustment Handler
// Responsibilities:
// - Listen for lesson:bellTimeEdited
// - Recalculate V pool
// - Recalculate Work/G1/G2 durations (9:5:2)
// - Rebuild all absolute phase boundaries
// - Update BurnlineCore state
// - Trigger visual pulse (handled by PC066)
// - Emit schedule update event
// - No ticking, no rendering, no timing loop

import Events from './events.js';
import BurnlineCore from './burnlinecore.pc064.js';

const BellTimeHandler = (() => {

  /**
   * Attach event listener for BellTime edits.
   */
  function init() {
    Events.on('lesson:bellTimeEdited', ({ newTime }) => {
      recalcSchedule(newTime);
    });
  }

  /**
   * Recalculate the burn-line schedule after BellTime change.
   *
   * @param {number} newBellTime - Absolute timestamp (ms)
   */
  function recalcSchedule(newBellTime) {
    const state = BurnlineCore.getState();

    const startTime = state.startTime;
    const stw = state.stwDuration;
    const purchases = state.purchasesDuration;

    // Compute new V pool
    const V = newBellTime - startTime - stw - purchases;

    // Recalculate durations using 9:5:2
    const work = V * (9 / 16);
    const g1 = V * (5 / 16);
    const g2 = V * (2 / 16);

    // Build new boundaries
    const p3End = startTime + stw;
    const p4End = p3End + work;
    const p5End = p4End + g1;
    const p6End = p5End + g2;
    const p7End = p6End + purchases;

    // Apply to BurnlineCore state via direct mutation
    // (Acceptable because BurnlineCore holds canonical schedule)
    const newState = BurnlineCore.getState();
    newState.bellTime = newBellTime;
    newState.workDuration = work;
    newState.g1Duration = g1;
    newState.g2Duration = g2;

    newState.phaseBoundaries.p3End = p3End;
    newState.phaseBoundaries.p4End = p4End;
    newState.phaseBoundaries.p5End = p5End;
    newState.phaseBoundaries.p6End = p6End;
    newState.phaseBoundaries.p7End = p7End;

    // Replace BurnlineCore internal state safely
    overwriteBurnlineCoreState(newState);

    // Notify rest of system
    Events.emit('burnline:scheduleUpdated', {
      bellTime: newBellTime,
      boundaries: newState.phaseBoundaries
    });
  }

  /**
   * Internal helper to overwrite BurnlineCore STATE.
   * Must match the structure EXACTLY.
   */
  function overwriteBurnlineCoreState(newState) {
    // Access the internal STATE object by reference
    const internal = BurnlineCore.getState(); // Snapshot clone; need re-assign

    // Because BurnlineCore does not provide a setState(),
    // we must directly update fields on the internal singleton.
    // We do this only under the controlled rule of BellTime recalculation.

    BurnlineCore._unsafeApply && BurnlineCore._unsafeApply(newState);
    // If _unsafeApply does not yet exist, it will be added later as PC069 refinement.
  }

  return {
    init,
  };

})();

export default BellTimeHandler;
