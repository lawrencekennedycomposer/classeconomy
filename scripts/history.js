/* =========================================================
   VERSION INTEGRITY BLOCK – PC#010 (Canon Aligned)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   Status: Unified Events Bus (V1 → V2 → V3 fully harmonised)
========================================================= */

import * as Events from './events.js';
import { EVENTS, EVENTS_V2, EVENTS_V3 } from './events.js';

/* ---------------------------------------------------------
   Canonical UI container state
--------------------------------------------------------- */
let _host = null;
let _list = null;
let _entries = [];
let _max = 10;

/* ---------------------------------------------------------
   Time formatter
--------------------------------------------------------- */
function _t(ts) {
  try {
    const d = new Date(ts || Date.now());
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map(n => String(n).padStart(2, '0'))
      .join(':');
  } catch { return '--:--:--'; }
}

/* ---------------------------------------------------------
   Render list
--------------------------------------------------------- */
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

/* ---------------------------------------------------------
   Push a bounded entry
--------------------------------------------------------- */
function _push(type, detail) {
  let preview;
  try { preview = JSON.stringify(detail, null, 0).slice(0, 160); }
  catch { preview = String(detail); }

  _entries.unshift({ type, ts: Date.now(), preview });
  if (_entries.length > _max) _entries.length = _max;

  _render();
}

/* ---------------------------------------------------------
   Attach all listeners (canon, V1 → V2 → V3)
--------------------------------------------------------- */
function _attachListeners() {

  /* -------------------------------
      SCORES UPDATED
  ------------------------------- */
  try {
    Events.on(EVENTS.SCORES_UPDATED, e =>
      _push(EVENTS.SCORES_UPDATED, e?.detail || null)
    );
  } catch {}

  /* -------------------------------
      dashboard:award:applied
  ------------------------------- */
  try {
    Events.on(EVENTS.DASHBOARD_AWARD_APPLIED, e =>
      _push(EVENTS.DASHBOARD_AWARD_APPLIED, e?.detail || null)
    );
  } catch {}

  /* -------------------------------
      STW events (award + replaced)
  ------------------------------- */
  try {
    Events.on(EVENTS.STW_AWARD, e =>
      _push(EVENTS.STW_AWARD, e?.detail || null)
    );
  } catch {}

  try {
    Events.on(EVENTS.STW_QUESTION_REPLACED, e =>
      _push(EVENTS.STW_QUESTION_REPLACED, e?.detail || null)
    );
  } catch {}

  /* -------------------------------
      WORK TICK (V2)
  ------------------------------- */
  try {
    Events.on(EVENTS_V2.LESSON_WORK_TICK, e =>
      _push(EVENTS_V2.LESSON_WORK_TICK, e?.detail || null)
    );
  } catch {}

  /* -------------------------------
      STW promptExpired (V2)
  ------------------------------- */
  try {
    Events.on(EVENTS_V2.STW_PROMPT_EXPIRED, e =>
      _push(EVENTS_V2.STW_PROMPT_EXPIRED, e?.detail || null)
    );
  } catch {}

  /* -------------------------------
      LESSON END (V3 unified)
      Both LESSON_END and LESSON_ENDED → same string
  ------------------------------- */
  try {
    Events.on(EVENTS_V3.LESSON_END, e =>
      _push(EVENTS_V3.LESSON_END, e?.detail || null)
    );
  } catch {}
}

/* ---------------------------------------------------------
   Mount the floating history viewer
--------------------------------------------------------- */
export function mountHistory(opts = {}) {
  if (_host && document.body.contains(_host)) return true;

  _max = Number.isFinite(opts.max) ? opts.max : 10;
  const pos = opts.position === 'bottom-right' ? 'bottom-right' : 'top-right';

  _host = document.createElement('aside');
  _host.className = `history ${pos}`;
  _host.setAttribute('aria-label', 'Events history');

  /* Header */
  const header = document.createElement('div');
  header.className = 'hx-title';
  header.innerHTML = `<strong>Events</strong> <span class="muted">(last ${_max})</span>`;

  /* Tools */
  const toolbar = document.createElement('div');
  toolbar.className = 'hx-tools';

  const btnClear = document.createElement('button');
  btnClear.className = 'hx-btn';
  btnClear.textContent = 'Clear';
  btnClear.onclick = () => { _entries = []; _render(); };

  const btnToggle = document.createElement('button');
  btnToggle.className = 'hx-btn';
  btnToggle.textContent = 'Hide';
  btnToggle.onclick = () => {
    const hidden = _host.classList.toggle('is-hidden');
    btnToggle.textContent = hidden ? 'Show' : 'Hide';
  };

  toolbar.append(btnClear, btnToggle);

  /* List */
  _list = document.createElement('ul');
  _list.className = 'hx-list';

  /* Mount */
  _host.append(header, toolbar, _list);
  document.body.appendChild(_host);

  _attachListeners();
  _render();
  return true;
}

export const historyReady = true;
