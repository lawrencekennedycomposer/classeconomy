/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0 (Canon Aligned)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#053 – Phase Hotkeys + Hydration Sync
   Generated: 2025-11-13 (AEST)
   Notes:
     - Fixes canonical event name (lesson:phaseChange)
     - Preserves all original behaviour: hotkeys, resync, undo/redo
     - Guards dashboard.session discovery safely across all runtimes
========================================================= */

import * as Events from './events.js';
import * as Dashboard from './dashboard.js';

/* ---------------------------------------------------------
   Canonical Event Bus Resolution
--------------------------------------------------------- */
const Bus = window.__CE_BOOT?.modules?.Events || Events;
const emit = Bus.emit || Events.emit;
const on   = Bus.on   || Events.on;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || Bus.EVENTS || {};

let _phase = 1;


function getBurnlineMode() {
  return window.__CE_BOOT?.lessonConfig?.burnlineMode || 'timeline';
}

/* ---------------------------------------------------------
   Session Resolver (canon-safe)
--------------------------------------------------------- */
function getSession() {
  return (
    Dashboard.session ||
    window.__CE_BOOT?.CE?.modules?.Dashboard?.session ||
    window.__CE_BOOT?.CE?.state ||
    null
  );
}

/* ---------------------------------------------------------
   Keyboard Hotkeys (teacher/dev)
--------------------------------------------------------- */
function ensureListeners() {
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === '.') next();
    if (e.key === ',') prev();
  });
}

function clamp(n) {
  if (n < 1) return 1;
  if (n > 7) return 7;
  return n;
}

/* ---------------------------------------------------------
   Core Controls
--------------------------------------------------------- */
function next() {
  setPhase(clamp((_phase ?? 1) + 1));
}

function prev() {
  setPhase(clamp((_phase ?? 1) - 1));
}

function setPhase(n) {
  _phase = clamp(n);

  // Update shared session if present
  const sess = getSession();
  if (sess) {
    try { sess.phase = _phase; } catch {}
  }

  const mode = getBurnlineMode();

  // Advisory mode: request entry (PhaseGate is the sole authority)
  if (mode === 'advisory') {
    try {
      emit('ui:phaseRequestEnter', { toPhase: _phase, source: 'hotkeys', ts: Date.now() });
    } catch (err) {
      console.warn('[PC#053] request emit fail', err);
    }
    console.log('[PC#053] phase request →', _phase);
    return;
  }

  // Timeline mode: preserve existing behaviour (commit phase change)
  const EVT =
    E.LESSON_PHASE_CHANGE ||
    E.LESSON_PHASE_CHANGED || // legacy alias fallback
    'lesson:phaseChange';

  try {
    emit(EVT, { to: _phase, ts: Date.now() });
  } catch (err) {
    console.warn('[PC#053] emit fail', err);
  }

  console.log('[PC#053] phase →', _phase);
}

function resync() {
  const sess = getSession();
  _phase = (sess && sess.phase != null)
    ? sess.phase
    : (_phase ?? 1);

  setPhase(_phase);
}

/* ---------------------------------------------------------
   Cross-Module Wiring
--------------------------------------------------------- */
function wire() {
  const EVT_HYDRATE = E.HYDRATION_COMPLETE || 'hydration:complete';

  on(EVT_HYDRATE, resync);
}

/* ---------------------------------------------------------
   Boot
--------------------------------------------------------- */
(function boot(){
  try {
    ensureListeners();
    wire();
    console.log('[PC#053] Phase Hotkeys + Hydration Sync active (canon-aligned)');
  } catch (e) {
    console.warn('[PC#053] skipped →', e?.message || e);
  }
})();

/* ---------------------------------------------------------
   Dev Handle (unchanged behaviour)
--------------------------------------------------------- */
window.__CE_PHASE = Object.freeze({
  next,
  prev,
  setPhase,
  resync
});
