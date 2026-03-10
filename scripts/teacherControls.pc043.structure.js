/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#043 – Teacher Controls structure (tabs only)
   Generated: 2025-11-13 (AEST)
========================================================= */

import * as Events from './events.js';
import { EVENTS } from './events.js';

/* ---------------------------------------------------------
   Canonical Event Bus
--------------------------------------------------------- */
const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const emit = Bus.emit || Events.emit;
const on   = Bus.on   || Events.on;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || EVENTS;

/* Canonical tab-change event */
const TAB_EVT =
  E.UI_TEACHER_TAB ||
  'ui:tc:tabChanged';

/* Tab definitions unchanged */
const TABS = [
  { id: 'settle', label: 'Settle Activity' },
  { id: 'swear',  label: 'Swear' },
  { id: 'seat',   label: 'Out of Seat' },
  { id: 'bonus',  label: 'Bonus Points' },
];

function ensureExtraStyle() {
  if (document.getElementById('tc-style-043')) return;
  const s = document.createElement('style');
  s.id = 'tc-style-043';
  s.textContent = `
    .tc-tabs { display:flex; gap:8px; margin:6px 0 12px; flex-wrap:wrap; }
    .tc-tab {
      appearance:none; border:1px solid #2a3542; background:#141a21; color:#e8eef2;
      padding:6px 10px; border-radius:10px; cursor:pointer;
      font:600 13px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;
    }
    .tc-tab.is-on { outline:2px solid #4aa3ff; }
    .tc-sections { position:relative; }
    .tc-section { display:none; }
    .tc-section.on { display:block; }
    .tc-help { font-size:12px; opacity:.75; margin-top:8px; }
  `;
  document.head.appendChild(s);
}

function getPanel() {
  return document.querySelector('.tc-panel');
}

function mountTabs(panel) {
  if (!panel || panel.querySelector('.tc-tabs')) return;
  const bar = document.createElement('div');
  bar.className = 'tc-tabs';
  TABS.forEach(t => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tc-tab';
    b.dataset.tab = t.id;
    b.textContent = t.label;
    bar.appendChild(b);
  });
  const hdr = panel.querySelector('.tc-h');
  (hdr?.nextSibling ? panel.insertBefore(bar, hdr.nextSibling) : panel.appendChild(bar));
}

function mountSections(panel) {
  if (!panel) return;
  let wrap = panel.querySelector('.tc-sections');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'tc-sections';
    panel.appendChild(wrap);
  }
  TABS.forEach(t => {
    if (wrap.querySelector(`.tc-section[data-id="${t.id}"]`)) return;
    const sec = document.createElement('section');
    sec.className = 'tc-section';
    sec.dataset.id = t.id;
    sec.innerHTML = `
      <div class="tc-sec"><strong>${t.label}</strong> (placeholder)</div>
      <div class="tc-sec tc-help mono">Structure only. No behaviour wired yet.</div>
    `;
    wrap.appendChild(sec);
  });
}

function activate(panel, id) {
  if (!panel) return;
  const tabs = Array.from(panel.querySelectorAll('.tc-tab'));
  const secs = Array.from(panel.querySelectorAll('.tc-section'));
  tabs.forEach(b => b.classList.toggle('is-on', b.dataset.tab === id));
  secs.forEach(s => s.classList.toggle('on', s.dataset.id === id));

  // Canon emit
  try {
    emit(TAB_EVT, { id, ts: Date.now() });
  } catch {}
}

function wireInteractions(panel) {
  if (!panel) return;
  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('.tc-tab');
    if (!btn) return;
    activate(panel, btn.dataset.tab);
  });
  // default tab
  const first = panel.querySelector('.tc-tab')?.dataset.tab || TABS[0].id;
  activate(panel, first);
}

/* ---------------------------------------------------------
   Boot after PC#042 defines overlay
--------------------------------------------------------- */
// PC#043 disabled (temporarily)
// Teacher Controls structure will not auto-mount.
// Re-enable by restoring the boot() IIFE.

/* ---------------------------------------------------------
   Remount when Teacher Controls window opens
--------------------------------------------------------- */
// PC#043 remount hook disabled (MVP)

