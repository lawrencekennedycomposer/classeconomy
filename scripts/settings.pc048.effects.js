/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0 (Canon Aligned)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#048 – Settings effects (dark mode + verbose logs)
   Generated: 2025-11-13 (AEST)
   Notes:
     - Canon event bus resolution added
     - Event names now use EVENTS_V3/V2 fallback
     - Behaviour unchanged but drift-proofed
========================================================= */

import * as Events from './events.js';
import * as Storage from './storage.js';

/* ---------------------------------------------------------
   Canonical Event Bus Resolution
--------------------------------------------------------- */
const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const on   = Bus.on   || Events.on;
const emit = Bus.emit || Events.emit;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || Bus.EVENTS || {};

/* ---------------------------------------------------------
   LocalStorage Key
--------------------------------------------------------- */
const SETTINGS_KEY = Storage.makeKey('settings', 1);

/* ---------------------------------------------------------
   Read
--------------------------------------------------------- */
function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/* ---------------------------------------------------------
   Effects
--------------------------------------------------------- */
function applyDarkMode(onFlag) {
  document.body.classList.toggle('theme-dark', !!onFlag);
}

function applyVerbose(onFlag) {
  const enable = !!onFlag;

  // Only attach listeners once in lifetime
  if (enable && !window.__CE_VERBOSE) {
    window.__CE_VERBOSE = true;

    const log = (tag, e) => {
      try { console.log(`[VERBOSE] ${tag}`, e?.detail ?? e); } catch {}
    };

    // Use canonical events where available, fallback otherwise
    const EVT_OPEN    = E.UI_OPEN_WINDOW      || 'ui:openWindow';
    const EVT_CLOSE   = E.UI_CLOSE_WINDOW     || 'ui:closeWindow';
    const EVT_TAB     = E.UI_TEACHER_TAB      || 'ui:tc:tabChanged';
    const EVT_TST     = E.UI_SEAT_TIMER_START || 'ui:seat:timerStart';
    const EVT_TSC     = E.UI_SEAT_CANCEL      || 'ui:seat:cancel';
    const EVT_TSD     = E.UI_SEAT_DONE        || 'ui:seat:timerDone';
    const EVT_TOG     = E.UI_SETTINGS_TOGGLE  || 'ui:settings:toggle';
    const EVT_STATE   = E.UI_SETTINGS_STATE   || 'ui:settings:state';

    on(EVT_OPEN,  e => log(EVT_OPEN,  e));
    on(EVT_CLOSE, e => log(EVT_CLOSE, e));
    on(EVT_TAB,   e => log(EVT_TAB,   e));
    on(EVT_TST,   e => log(EVT_TST,   e));
    on(EVT_TSC,   e => log(EVT_TSC,   e));
    on(EVT_TSD,   e => log(EVT_TSD,   e));
    on(EVT_TOG,   e => log(EVT_TOG,   e));
    on(EVT_STATE, e => log(EVT_STATE, e));

    console.log('[PC#048] Verbose logs enabled');
  }

  if (!enable && window.__CE_VERBOSE) {
    // Listeners remain (canon = additive only)
    window.__CE_VERBOSE = false;
    console.log('[PC#048] Verbose logs flag off (listeners remain)');
  }
}

/* ---------------------------------------------------------
   Apply current state to effects
--------------------------------------------------------- */
function applyAllFromState(state) {
  applyDarkMode(state['dark-mode']);
  applyVerbose(state['verbose-logs']);
}

/* ---------------------------------------------------------
   Toggle handler
--------------------------------------------------------- */
function handleToggle(e) {
  const k = e?.detail?.key;
  const v = !!e?.detail?.value;
  if (!k) return;

  if (k === 'dark-mode') applyDarkMode(v);
  if (k === 'verbose-logs') applyVerbose(v);
}

/* ---------------------------------------------------------
   Boot
--------------------------------------------------------- */
(function boot(){
  try {
    const state = readSettings();
    applyAllFromState(state);

    const EVT_TOG   = E.UI_SETTINGS_TOGGLE || 'ui:settings:toggle';
    const EVT_STATE = E.UI_SETTINGS_STATE  || 'ui:settings:state';

    on(EVT_TOG,   handleToggle);
    on(EVT_STATE, (e) => e?.detail?.state && applyAllFromState(e.detail.state));

    console.log('[PC#048] Settings effects active');
  } catch (e) {
    console.warn('[PC#048] Settings effects skipped:', e?.message || e);
  }
})();
