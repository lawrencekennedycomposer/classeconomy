/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC064-A1
   Module: pc064.burnline.core.js
   Purpose: Burn-line Core (Mathematics + Absolute Schedule)
   Canonical Source: Burn-line Engine Development Guide (PC064–PC070)
   Notes: Additive-only. No summarising. No assumptions.
   ========================================================= */

// PC064 — Burn-line Core
// This module is responsible ONLY for:
// - Capturing startTime
// - Capturing bellTime
// - Calculating STW duration
// - Calculating Purchases (fixed)
// - Calculating V pool
// - Calculating Work / Game1 / Game2 durations
// - Constructing absolute boundaries for phases 3–7
// - Storing canonical internal STATE
// - Emitting no ticks and no rendering
// - Exposing public API

const BurnlineCore = (() => {
  const STATE = {
    startTime: null,
    bellTime: null,
    stwDuration: null,
    purchasesDuration: 120000, // 120 seconds fixed, stored in ms
    workDuration: null,
    g1Duration: null,
    g2Duration: null,
    phaseBoundaries: {
      p3End: null,
      p4End: null,
      p5End: null,
      p6End: null,
      p7End: null
    },
  };

  /**
   * Initialize the burn-line schedule.
   * @param {number} startTime - Absolute timestamp (ms) when STW begins.
   * @param {number} bellTime - Absolute timestamp (ms) for lesson end.
   * @param {number} stwDurationMs - STW duration in milliseconds.
   * @param {number} numStudents - Number of students (N) on leaderboard.
   */
  function init({ startTime, bellTime, stwDurationMs, numStudents }) {
    STATE.startTime = startTime;
    STATE.bellTime = bellTime;

    // Record STW duration explicitly (must already be computed by caller)
    STATE.stwDuration = stwDurationMs;

    // Variable Pool Calculation (V)
    const V = bellTime - startTime - stwDurationMs - STATE.purchasesDuration;

    // Split V into canonical 9:5:2 ratio
    STATE.workDuration = V * (9 / 16);
    STATE.g1Duration = V * (5 / 16);
    STATE.g2Duration = V * (2 / 16);

    // Construct absolute boundaries
    STATE.phaseBoundaries.p3End = startTime + STATE.stwDuration;
    STATE.phaseBoundaries.p4End = STATE.phaseBoundaries.p3End + STATE.workDuration;
    STATE.phaseBoundaries.p5End = STATE.phaseBoundaries.p4End + STATE.g1Duration;
    STATE.phaseBoundaries.p6End = STATE.phaseBoundaries.p5End + STATE.g2Duration;
    STATE.phaseBoundaries.p7End = STATE.phaseBoundaries.p6End + STATE.purchasesDuration;
  }

  /** Get full internal state */
  function getState() {
    return JSON.parse(JSON.stringify(STATE));
  }

  return {
    init,
    getState,
  };
})();

export default BurnlineCore;