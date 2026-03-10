/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC065-A1
   Module: pc065.burnline.ticker.js
   Purpose: Burn-line Ticker (Heartbeat Loop)
   Canonical Source: Burn-line Engine Development Guide (PC064–PC070)
   Notes: Additive-only. No summarising. No assumptions.
   ========================================================= */

// PC065 — Burn-line Ticker (Heartbeat)
// Responsibilities:
// - Run 1000ms tick interval
// - Compare Date.now() to BurnlineCore boundaries
// - Emit burnline:tick event
// - Detect and emit lesson:phaseChange
// - Freeze on lesson:pause
// - Resume + snap forward on lesson:resume
// - Detect sleep/wake gaps

import BurnlineCore from './burnlinecore.pc064.js';
import Events from './events.js';

const BurnlineTicker = (() => {
  let intervalId = null;
  let isPaused = false;
  let lastTick = null; 
  let lastPhaseEmitted = null;

  function getBurnlineMode() {
    return window.__CE_BOOT?.lessonConfig?.burnlineMode || 'timeline';
  }


  function start() {
    if (intervalId) return;

    lastTick = Date.now();

    intervalId = setInterval(() => {
      if (isPaused) return;

      const now = Date.now();
      const state = BurnlineCore.getState();

      // Sleep/Wake snap detection
      const delta = now - lastTick;
      if (delta > 3000) {
        // snap-forward toast handled elsewhere
      }

      lastTick = now;

      // Emit tick
      Events.emit('burnline:tick', { now, state });

      // Phase boundary detection
      if (getBurnlineMode() !== 'advisory') {
        detectPhaseChange(now, state.phaseBoundaries);
      }

    }, 1000);
  }

  function pause() {
    isPaused = true;
    Events.emit('burnline:pause');
  }

  function resume() {
    isPaused = false;
    lastTick = Date.now();
    Events.emit('burnline:resume');
  }

  function detectPhaseChange(now, boundaries) {
  const ph = phaseForTimestamp(now, boundaries);

  if (ph === null) return;

  if (ph !== lastPhaseEmitted) {
    // Advisory mode: preserve ticker + detection, but do NOT emit authoritative phase changes
    if (getBurnlineMode() !== 'advisory') {
      Events.emit('lesson:phaseChange', { from: lastPhaseEmitted, to: ph, ts: Date.now() });
    }
    lastPhaseEmitted = ph;
  }
}


  function phaseForTimestamp(ts, b) {
    if (ts < b.p3End) return 3;
    if (ts < b.p4End) return 4;
    if (ts < b.p5End) return 5;
    if (ts < b.p6End) return 6;
    if (ts < b.p7End) return 7;
    return null;
  }

  return {
    start,
    pause,
    resume,
  };
})();

// Register ticker globally for CE_BOOT (replaces old PC052 wiring)
if (window.__CE_BOOT && window.__CE_BOOT.modules) {
  window.__CE_BOOT.modules.BurnlineTicker = BurnlineTicker;
}


export default BurnlineTicker;


