/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0 (Canon Aligned)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#049 – Swear Jar (first live action)
   Generated: 2025-11-13 (AEST)
========================================================= */

import * as Events from './events.js';
import * as Dashboard from './dashboard.js';
import { EVENTS } from './events.js';

/* ---------------------------------------------------------
   Canonical Event Bus Resolution
--------------------------------------------------------- */
const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const emit = Bus.emit || Events.emit;
const on   = Bus.on   || Events.on;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || EVENTS;

function ensureStyle() {
  if (document.getElementById('tc-swear-049')) return;
  const s = document.createElement('style');
  s.id = 'tc-swear-049';
  s.textContent = `
    .swear-wrap { display:grid; gap:8px; margin-top:8px; }
    .swear-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .swear-select {
      min-width:220px; padding:8px 10px; border-radius:10px; border:1px solid #2a3542;
      background:#141a21; color:#e8eef2; font:600 13px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;
    }
    .swear-btn {
      appearance:none; border:1px solid #2a3542; background:#1a2230; color:#e8eef2;
      padding:8px 12px; border-radius:10px; cursor:pointer; font:600 13px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;
    }
    .swear-note { font-size:12px; opacity:.75; }
  `;
  document.head.appendChild(s);
}

function getSwearSection() {
  return document.querySelector('.tc-section[data-id="swear"]');
}

function getRoster() {
  try {
    const snap = Dashboard.getLessonSnapshot({ persist:false });
    const list = snap?.roster?.students || [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function mountUI() {
  const sec = getSwearSection();
  if (!sec) return false;
  if (sec.querySelector('.swear-wrap')) return true;

  const box = document.createElement('div');
  box.className = 'swear-wrap';
  box.innerHTML = `
    <div class="swear-row">
      <select class="swear-select" data-swear="student"></select>
      <button class="swear-btn" data-swear="apply">Apply -1</button>
    </div>
    <div class="swear-note mono">Demerit: routes via Dashboard.applyAward({studentId, points:-1, reason:'swear'})</div>
  `;
  sec.appendChild(box);
  return true;
}

function populateStudents() {
  const sel = document.querySelector('.swear-select[data-swear="student"]');
  if (!sel) return;
  const roster = getRoster();
  sel.innerHTML = '';
  for (const s of roster) {
    const opt = document.createElement('option');
    opt.value = String(s.id ?? '');
    opt.textContent = String(s.name ?? s.id ?? 'Student');
    sel.appendChild(opt);
  }
}

function applyMinusOne() {
  const sel = document.querySelector('.swear-select[data-swear="student"]');
  const id = sel ? String(sel.value || '').trim() : '';
  if (!id) return;

  // Canon apply event (observability)
  try {
    emit(
      E.UI_SWEAR_APPLY || 'ui:swear:apply',
      { studentId: id, ts: Date.now() }
    );
  } catch {}

  // Canonical award path (same behaviour)
  const ok = Dashboard.applyAward
    ? Dashboard.applyAward({ studentId: id, points: -1, reason: 'swear' })
    : (Dashboard.bumpScore ? Dashboard.bumpScore(id, -1, 'swear') : false);

  // Canon done event
  try {
    emit(
      E.UI_SWEAR_DONE || 'ui:swear:done',
      { studentId: id, ok: !!ok, ts: Date.now() }
    );
  } catch {}
}

function wire() {
  const sec = getSwearSection();
  if (!sec) return;
  sec.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-swear="apply"]');
    if (btn) applyMinusOne();
  });
}

/* ---------------------------------------------------------
   Boot + Teacher Controls integration
--------------------------------------------------------- */
(function boot(){
  try {
    ensureStyle();

    // Mount immediately if structure (PC#043) is already present
    const sec = getSwearSection();
    if (sec) { mountUI(); populateStudents(); wire(); }

    // Re-mount on Teacher Controls open
    const openEvt =
      E.UI_OPEN_WINDOW ||
      EVENTS.UI_OPEN_WINDOW ||
      'ui:openWindow';

    on(openEvt, (e) => {
      if ((e?.detail?.id || e?.detail) !== 'teacher-controls') return;
      if (mountUI()) {
        populateStudents();
        wire();
      } else {
        populateStudents();
      }
    });

    console.log('[PC#049] Swear Jar live action mounted');
  } catch (e) {
    console.warn('[PC#049] Swear Jar skipped:', e?.message || e);
  }
})();
