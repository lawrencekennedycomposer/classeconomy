/* =========================================================
  STW2 (Legacy Placeholder Shim)
  ---------------------------------------------------------
  Phase 3 STW is now implemented as a Phase Base Layer via:
    - PC076 mounts: window.__CE_STW_BASE into #phase-base-host
    - PC090 provides: window.__CE_STW_BASE (mount/unmount)

  This legacy module is kept ONLY to satisfy any existing
  imports/callers (e.g., openPhase('stw')) without rendering
  any overlay UI (no popups, no body appends).
========================================================= */

export function open() { return false; }
export function close() { return true; }

// Some callers may pass a target student or roster/wheel payload.
// We accept the calls but intentionally do nothing.
export function setTarget() { return false; }
export function openWithRoster() { return false; }
export function openWithWheel() { return false; }

// Debug helpers that existed in legacy builds:
export function __toggleOutcomeControls() { return false; }
export function __setTimerMs() { return true; }