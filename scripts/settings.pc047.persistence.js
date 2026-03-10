/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0 (Canon Aligned)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#047 – Settings persistence & reflection
   Generated: 2025-11-13 (AEST)
========================================================= */

import * as Events from './events.js';
import * as Storage from './storage.js';

/* ---------------------------------------------------------
   Canonical Event Bus Resolution
--------------------------------------------------------- */
const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const emit = Bus.emit || Events.emit;
const on   = Bus.on   || Events.on;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || Bus.EVENTS || {};

/* ---------------------------------------------------------
   LocalStorage Key
--------------------------------------------------------- */
const SETTINGS_KEY = Storage.makeKey('settings', 1);   // => "ce:settings:v1"

/* ---------------------------------------------------------
   Read / Write
--------------------------------------------------------- */
function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeSettings(obj) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj || {})); }
  catch {}
}

/* ---------------------------------------------------------
   Apply to UI (reflect)
--------------------------------------------------------- */
function applyToUI() {
  const panel = document.querySelector('.set-panel');   // from settings.pc046.js
  if (!panel) return;
  const state = readSettings();

  panel.querySelectorAll('input[type="checkbox"][data-tog]').forEach(el => {
    const key = el.getAttribute('data-tog');
    if (!key) return;
    if (Object.prototype.hasOwnProperty.call(state, key)) {
      el.checked = !!state[key];
    }
  });

  // Canon-safe broadcast
  try {
    emit(
      E.UI_SETTINGS_STATE || 'ui:settings:state',
      { state, ts: Date.now() }
    );
  } catch {}
}

/* ---------------------------------------------------------
   State Upsert
--------------------------------------------------------- */
function upsertSetting(key, value) {
  const state = readSettings();
  state[key] = !!value;
  writeSettings(state);
}

/* ---------------------------------------------------------
   Wiring
--------------------------------------------------------- */
try {
  // 1) Persist toggle changes
  const EVT_TOG =
    E.UI_SETTINGS_TOGGLE ||
    'ui:settings:toggle';

  on(EVT_TOG, (e) => {
    const key = e?.detail?.key;
    const val = e?.detail?.value;
    if (!key) return;
    upsertSetting(key, val);
  });

  // 2) Reflect when Settings window opens
  const EVT_OPEN =
    E.UI_OPEN_WINDOW ||
    'ui:openWindow';

  on(EVT_OPEN, (e) => {
    const id = e?.detail?.id || e?.detail;
    if (id === 'settings') applyToUI();
  });

} catch {}

/* ---------------------------------------------------------
   Initial Reflection (in case already open)
--------------------------------------------------------- */
applyToUI();

/* ---------------------------------------------------------
   Dev Handle
--------------------------------------------------------- */
window.__CE_SETTINGS_STORE = Object.freeze({
  key: SETTINGS_KEY,
  read: readSettings,
  write: writeSettings,
  applyToUI,
});
