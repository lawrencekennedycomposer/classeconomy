/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0 (Canon Aligned)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#045 – Out-of-Seat visual timer (display only)
   Generated: 2025-11-13 (AEST)
========================================================= */

import * as Events from './events.js';
import { EVENTS } from './events.js';

/* ---------------------------------------------------------
   Canonical Event Bus Resolution
--------------------------------------------------------- */
const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const emit = Bus.emit || Events.emit;
const on   = Bus.on   || Events.on;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || EVENTS;

let _t = null;       // interval id
let _ends = 0;       // epoch ms when timer ends
let _secs = 5;       // current countdown seconds
let _bar, _label;    // UI refs

function ensureStyle() {
  if (document.getElementById('tc-style-045')) return;
  const s = document.createElement('style');
  s.id = 'tc-style-045';
  s.textContent = `
    .seat-timer { margin-top:8px; }
    .seat-row { display:flex; align-items:center; gap:10px; }
    .seat-label { font:600 13px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; }
    .seat-bar-wrap { flex:1; height:10px; background:#1b2430; border-radius:8px; overflow:hidden; }
    .seat-bar { height:100%; width:0%; background:#4aa3ff; transition:width .1s linear; }
    .seat-muted { font-size:12px; opacity:.75; margin-top:6px; }
  `;
  document.head.appendChild(s);
}

function seatSection() {
  return document.querySelector('.tc-section[data-id="seat"]');
}

function mountUI() {
  const sec = seatSection();
  if (!sec) return false;
  if (sec.querySelector('.seat-timer')) return true;

  const wrap = document.createElement('div');
  wrap.className = 'seat-timer';
  wrap.innerHTML = `
    <div class="seat-row">
      <div class="seat-label">Return to seat in <span class="seat-rem">5.0s</span></div>
      <div class="seat-bar-wrap"><div class="seat-bar"></div></div>
    </div>
    <div class="seat-muted mono">Display only. Use Teacher Controls to cancel.</div>
  `;
  sec.appendChild(wrap);
  _bar = wrap.querySelector('.seat-bar');
  _label = wrap.querySelector('.seat-rem');
  return true;
}

function stop() {
  if (_t) { clearInterval(_t); _t = null; }
  if (_bar) _bar.style.width = '0%';
  if (_label) _label.textContent = `${_secs.toFixed(1)}s`;
}

function tick() {
  const now = Date.now();
  const left = Math.max(0, _ends - now);
  const pct = Math.min(100, Math.max(0, (1 - (left / (_secs * 1000))) * 100));
  if (_bar) _bar.style.width = `${pct}%`;
  if (_label) _label.textContent = `${(left/1000).toFixed(1)}s`;

  if (left <= 0) {
    stop();
    try {
      emit(
        E.UI_SEAT_DONE || 'ui:seat:timerDone',
        { ts: now }
      );
    } catch {}
  }
}

function start(seconds = 5) {
  ensureStyle();
  if (!mountUI()) return false;
  _secs = Number(seconds) > 0 ? Number(seconds) : 5;
  _ends = Date.now() + _secs * 1000;
  stop(); // clear prior
  _t = setInterval(tick, 100);
  tick();
  return true;
}

function cancel() { stop(); return true; }

/* ---------------------------------------------------------
   Event wiring (canon)
--------------------------------------------------------- */
(function boot(){
  try {
    const EVT_START =
      E.UI_SEAT_TIMER_START || 'ui:seat:timerStart';

    const EVT_CANCEL =
      E.UI_SEAT_CANCEL || 'ui:seat:cancel';

    const EVT_CLOSE =
      E.UI_CLOSE_WINDOW || 'ui:closeWindow';

    on(EVT_START, (e) => start(e?.detail?.seconds ?? 5));
    on(EVT_CANCEL, () => cancel());

    // Close-window cancels silently (PC#042)
    on(EVT_CLOSE, (e) => {
      if ((e?.detail?.id || e?.detail) === 'teacher-controls') cancel();
    });

    console.log('[PC#045] Seat timer display mounted');

  } catch (e) {
    console.warn('[PC#045] Seat timer skipped:', e?.message || e);
  }
})();

window.__CE_SEAT = Object.freeze({ start, cancel });
