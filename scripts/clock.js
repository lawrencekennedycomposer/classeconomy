/* =========================================================
  PC#022 – Timing Automation Shell (read-only)
  Charter: THE CODING PROCEDURE (v1.0-GOV)
  Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
  Notes:
    - Harmless interval used for UI refresh ticks.
    - No storage writes. No autonomous phase changes.
    - Compatible with Burn-line PC#052 (optional).
========================================================= */

import * as Events from './events.js';

let _iv = null;
let _cadenceMs = 500; // UI refresh cadence (safe default)

/* ---------------------------------------------------------
   Canonical Event Bus Resolution
--------------------------------------------------------- */
const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const emit = Bus.emit || Events.emit;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || Bus.EVENTS || {};

/* ---------------------------------------------------------
   Start the visual refresh loop (idempotent)
--------------------------------------------------------- */
export function start() {
  if (_iv) return true;

  _iv = setInterval(() => {
    // Optional: future burn-line micro-refresh hook (PC#052)
    try {
      const phase =
        String(window.__CE_BOOT?.CE?.modules?.Dashboard?.session?.phase ?? 1);
      window.__CE_BURN?.updateHighlight?.(phase);
    } catch {}
  }, _cadenceMs);

  emit(E.TIMING_REFRESH_START || 'timing:refreshStart', { cadence: _cadenceMs });
  return true;
}

/* ---------------------------------------------------------
   Stop the visual refresh loop
--------------------------------------------------------- */
export function stop() {
  if (_iv) {
    clearInterval(_iv);
    _iv = null;
    emit(E.TIMING_REFRESH_STOP || 'timing:refreshStop', {});
  }
  return true;
}

/* ---------------------------------------------------------
   Is the loop currently running?
--------------------------------------------------------- */
export function isRunning() {
  return !!_iv;
}

/* ---------------------------------------------------------
   Set cadence (ms) with clamp 100..5000
--------------------------------------------------------- */
export function setCadence(ms) {
  const v = Math.max(100, Math.min(5000, Number(ms) || 1000));
  _cadenceMs = v;

  // Restart if running (no side effects)
  if (_iv) { stop(); start(); }

  emit(E.TIMING_CADENCE_SET || 'timing:cadenceSet', { cadence: _cadenceMs });
  return _cadenceMs;
}

/* ---------------------------------------------------------
   Convenience: create an in-memory lesson window
   Does not write to storage.
--------------------------------------------------------- */
export function autoWindow(durationMin = 45) {
  const startMs = Date.now();
  const durationMs =
    Math.max(1, Number(durationMin) || 45) * 60_000;

  // Optional gentle repaint to sync burn-line
  try {
    const phase =
      String(window.__CE_BOOT?.CE?.modules?.Dashboard?.session?.phase ?? 1);
    window.__CE_BURN?.updateHighlight?.(phase);
  } catch {}

  emit(E.LESSON_WINDOW_SET || 'lesson:windowSet', {
    startMs,
    durationMs
  });

  return { startMs, durationMs };
}

/* Marker: timing shell ready. */
export const timingShellReady = true;
