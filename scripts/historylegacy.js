/* =========================================================
   VERSION INTEGRITY BLOCK – VI-DASH-4
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   Status: Visual + Phase Engine Unified (PC#039–PC#053)
   Date: 2025-11-13
   Notes:
     - Legacy burnline.js retired (visual layer only)
     - PC#052 sync + PC#053 phase hotkeys active
     - No console errors; state hydration stable
========================================================= */
/* =========================================================
   VERSION INTEGRITY BLOCK – VI-C1
   Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
   Coding Charter v1.0-GOV | Parent: VI-B1 | Build Range PC#016–PC#020
   Generated: 2025-11-10 (AEST)
   SHA-256: [83f06d87034f82f77412dd55709e4f661abcf43b8e7efd2c2f2e80f2fff60dc3]
========================================================= */
/* =========================================================
   VERSION INTEGRITY BLOCK – VI-B1
   Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
   Coding Charter v1.0-GOV | Build Range PC#011–PC#015
   Generated: 2025-11-09 (AEST)
   SHA-256: [11eb403571a1e3eaebcefea6bd9be5f048d083bce3047bf14eaa12cb95f50df8]
========================================================= */
/*-- =========================================================
  VERSION INTEGRITY BLOCK – VI-A1
  Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
  Coding Charter v1.0-GOV | Build Range PC#001–PC#010
  Generated: 2025-11-09 (AEST)
  SHA-256: [9eba2f2d6a47da1f8e4edfc0172bb52e59e85cfbb5d9478f905b4c239062265d]
========================================================= */
/* =========================================================
  PC#010 – Minimal history log (read-only viewer)
  Charter: THE CODING PROCEDURE (v1.0-GOV)
  Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
  Notes:
    - Subscribes to Events bus; mirrors recent activity visually.
    - No persistence; purely in-memory UI.
========================================================= */
import * as Events from './events.js';
import { EVENTS } from './events.js';

let _host = null;
let _list = null;
let _entries = [];
let _max = 10;

/** Format a compact time (HH:MM:SS). */
function _t(ts) {
  try {
    const d = new Date(ts || Date.now());
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map(n => String(n).padStart(2, '0')).join(':');
  } catch { return '--:--:--'; }
}

/** Render entries list. */
function _render() {
  if (!_list) return;
  _list.innerHTML = '';
  for (const e of _entries) {
    const li = document.createElement('li');
    li.className = 'hx-item';
    const head = document.createElement('div');
    head.className = 'hx-head';
    head.textContent = `${_t(e.ts)} · ${e.type}`;
    const body = document.createElement('pre');
    body.className = 'hx-body';
    body.textContent = e.preview;
    li.append(head, body);
    _list.appendChild(li);
  }
}

/** Push a new entry into memory (bounded). */
function _push(type, detail) {
  // Keep payload compact and safe
  let preview;
  try { preview = JSON.stringify(detail, null, 0).slice(0, 160); }
  catch { preview = String(detail); }
  _entries.unshift({ type, ts: Date.now(), preview });
  if (_entries.length > _max) _entries.length = _max;
  _render();
}

/** Subscribe to baseline signals (add more later as needed). */
function _attachListeners() {
  try {
    Events.on(EVENTS.SCORES_UPDATED, (e) => _push('scores:updated', e?.detail || null));
  } catch { /* no-op */ }
}

/**
 * Mount the floating history viewer.
 * @param {object} [opts]
 * @param {number} [opts.max=10] max items to keep in memory
 * @param {string} [opts.position='top-right'] 'top-right'|'bottom-right'
 */
export function mountHistory(opts = {}) {
  if (_host && document.body.contains(_host)) return true;

  _max = Number.isFinite(opts.max) ? opts.max : 10;
  const pos = (opts.position === 'bottom-right') ? 'bottom-right' : 'top-right';

  _host = document.createElement('aside');
  _host.className = `history ${pos}`;
  _host.setAttribute('aria-label', 'Events history');

  const header = document.createElement('div');
  header.className = 'hx-title';
  header.innerHTML = `<strong>Events</strong> <span class="muted">(last ${_max})</span>`;

  const toolbar = document.createElement('div');
  toolbar.className = 'hx-tools';
  const btnClear = document.createElement('button');
  btnClear.className = 'hx-btn';
  btnClear.type = 'button';
  btnClear.textContent = 'Clear';
  btnClear.addEventListener('click', () => {
    _entries = []; _render();
  });
  const btnToggle = document.createElement('button');
  btnToggle.className = 'hx-btn';
  btnToggle.type = 'button';
  btnToggle.textContent = 'Hide';
  btnToggle.addEventListener('click', () => {
    const isHidden = _host.classList.toggle('is-hidden');
    btnToggle.textContent = isHidden ? 'Show' : 'Hide';
  });
  toolbar.append(btnClear, btnToggle);

  _list = document.createElement('ul');
  _list.className = 'hx-list';

  _host.append(header, toolbar, _list);
  document.body.appendChild(_host);

  _attachListeners();
  _render();
  return true;
}

export const historyReady = true;
/* =========================================================
  PC#014 – History listener for Work tick (append-only)
========================================================= */
import { EVENTS_V2 } from './events.js';

try {
  Events.on(EVENTS_V2.LESSON_WORK_TICK, (e) => _push('lesson:workTick', e?.detail || null));
} catch { /* no-op */ }
/* =========================================================
  PC#015 – History listeners for stw:award (+ optional questionReplaced) (append-only)
========================================================= */
try {
  Events.on(EVENTS.STW_AWARD, (e) => _push('stw:award', e?.detail || null));
} catch { /* no-op */ }

try {
  // Captures teacher fairness override events when later emitted (Errata E1)
  Events.on(EVENTS.STW_QUESTION_REPLACED, (e) => _push('stw:questionReplaced', e?.detail || null));
} catch { /* no-op */ }
/* Notice: VI-B1 checkpoint complete on 2025-11-09.
   Next governed session begins at PC#016 (Stage C). */
/* =========================================================
  PC#016 – History listener for STW prompt expiry (append-only)
========================================================= */
try {
  Events.on(EVENTS_V2.STW_PROMPT_EXPIRED, (e) =>
    _push('stw:promptExpired', e?.detail || null)
  );
} catch { /* no-op */ }
/* HF-001: register promptExpired using whatever map exists */
try {
  const EVT = (typeof EVENTS_V2 === 'object' && EVENTS_V2.STW_PROMPT_EXPIRED)
           || (typeof EVENTS_V3 === 'object' && EVENTS_V3.STW_PROMPT_EXPIRED)
           || (typeof STW_PROMPT_EXPIRED !== 'undefined' && STW_PROMPT_EXPIRED)
           || 'stw:promptExpired';
  Events.on(EVT, (e) => _push('stw:promptExpired', e?.detail || null));
} catch {}
/* =========================================================
  PC#035 – History listener for lesson:ended (append-only)
========================================================= */
try {
  import('./events.js').then(({ EVENTS_V3 }) => {
    const EVT = (EVENTS_V3 && EVENTS_V3.LESSON_ENDED) || 'lesson:ended';
    Events.on(EVT, (e) => _push('lesson:ended', e?.detail || null));
  });
} catch { /* no-op */ }
