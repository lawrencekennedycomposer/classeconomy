/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0 (Canon Aligned)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#040 – Boot Hydration (scores + phase)
   Notes:
     - Hydrates scores + phase on boot.
     - No schema changes. No UI changes.
     - Fully aligned with dashboard.js (canon award & score owner).
     - Removed legacy Burnline deps (PC#052 owns visual layer only).
========================================================= */

import * as Storage from './storage.js';
import * as Dashboard from './dashboard.js';
import * as Events from './events.js';

/* ---------------------------------------------------------
   Canonical Event Bus Resolution
--------------------------------------------------------- */
const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const emit = Bus.emit || Events.emit;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || Bus.EVENTS || {};

/* ---------------------------------------------------------
   Safe score hydration
   (Dashboard is the source of truth)
--------------------------------------------------------- */
function safeHydrateScores() {
  try {
    if (typeof Dashboard.loadScores === 'function') {
      Dashboard.loadScores();
      return true;
    }

    // Legacy fallback (never used now, but kept for tolerance)
    const raw = Storage.readJSON(Storage.KEYS.SCORES_V1, null);
    if (raw && typeof Dashboard.setScoresFromSnapshot === 'function') {
      Dashboard.setScoresFromSnapshot(raw);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------
   Safe phase hydration
   - Burn-line PC#052 owns visual layer only.
   - Dashboard + Phase Engine own phase state.
   - Hydration should notify the system via canon events.
--------------------------------------------------------- */
function safeHydratePhase() { return false; } // phase is not part of multi-class profiles (MVP)

function _emitRosterUpdated(source = 'boot') {
  try { emit('roster:updated', { ts: Date.now(), source }); } catch {}
}

function _syncSeatingFromStorage(source = 'boot') {
  try {
    const boot = (window.__CE_BOOT = window.__CE_BOOT || {});
    const layout = Storage.readJSON(Storage.KEYS.SEATING_LAYOUT_V1, { desks: [] });
    boot.SeatingLayout = { desks: Array.isArray(layout?.desks) ? layout.desks.map(d => ({ ...d })) : [] };
    emit('seating:layout:updated', { source, layout: boot.SeatingLayout });
  } catch {}
}

function _getActiveClassName(userId, classId) {
  const classes = Storage.getClasses(userId);
  const hit = (Array.isArray(classes) ? classes : []).find(c => String(c?.id) === String(classId));
  return String(hit?.name || 'Class');
}

function _closeMenu() {
  const menu = document.getElementById('class-menu');
  const btn = document.getElementById('class-menu-btn');
  if (!menu || !btn) return;
  menu.hidden = true;
  btn.setAttribute('aria-expanded', 'false');
}

function _renderMenu(userId, classId) {
  const menu = document.getElementById('class-menu');
  const btn = document.getElementById('class-menu-btn');
  if (!menu || !btn) return false;

  const classes = Storage.getClasses(userId);
  menu.innerHTML = '';

  for (const c of (Array.isArray(classes) ? classes : [])) {
    const id = String(c.id);
    const name = String(c.name || c.id);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'cm-item';
    item.textContent = (id === String(classId)) ? `✓ ${name}` : name;
    item.addEventListener('click', () => {
      _closeMenu();
      if (id === String(classId)) return;
      Storage.setContext(userId, id);
      Storage.setSession(userId, id);
      try { Storage.remove(Storage.KEYS.HISTORY_V1); } catch {}
      try { Dashboard.resetRuntimeState?.(); } catch {}
      safeHydrateScores();
      _emitRosterUpdated('class:switch');
      _syncSeatingFromStorage('class:switch');
      btn.textContent = _getActiveClassName(userId, id);
    });
    menu.appendChild(item);
  }

  const sep = document.createElement('div');
  sep.className = 'cm-sep';
  menu.appendChild(sep);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'cm-item';
  addBtn.textContent = '+ New class…';
  addBtn.addEventListener('click', () => {
    _closeMenu();
    const name = prompt('New class name:');
    if (!name || !String(name).trim()) return;
    const created = Storage.createClass(userId, String(name).trim());
    if (!created) return;
    // switch to it
    Storage.setContext(userId, created.id);
    Storage.setSession(userId, created.id);
    try { Storage.remove(Storage.KEYS.HISTORY_V1); } catch {}
    try { Dashboard.resetRuntimeState?.(); } catch {}
    safeHydrateScores();
    _emitRosterUpdated('class:switch');
    _syncSeatingFromStorage('class:switch');
    btn.textContent = _getActiveClassName(userId, created.id);
  });
  menu.appendChild(addBtn);

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'cm-item';
  delBtn.textContent = 'Delete current class…';
  delBtn.addEventListener('click', () => {
    _closeMenu();
    const ok = confirm('Delete this class? This removes its local roster/scores/seating from this browser.');
    if (!ok) return;
    const res = Storage.deleteClass(userId, classId);
    if (!res?.ok) {
      alert(res?.error || 'Delete failed');
      return;
    }
    const nextId = res.nextClassId;
    if (nextId) {
      Storage.setContext(userId, nextId);
      Storage.setSession(userId, nextId);
      try { Storage.remove(Storage.KEYS.HISTORY_V1); } catch {}
      try { Dashboard.resetRuntimeState?.(); } catch {}
      safeHydrateScores();
      _emitRosterUpdated('class:switch');
      _syncSeatingFromStorage('class:switch');
      btn.textContent = _getActiveClassName(userId, nextId);
    }
  });
  menu.appendChild(delBtn);

  return true;
}

function _initClassMenuUI(boot) {
  const btn = document.getElementById('class-menu-btn');
  const menu = document.getElementById('class-menu');
  if (!btn || !menu) return false;

  btn.textContent = _getActiveClassName(boot.userId, boot.classId);
  _renderMenu(boot.userId, boot.classId);

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = !menu.hidden;
    if (isOpen) { _closeMenu(); return; }
    // refresh menu on open (names may have changed)
    const ctx = Storage.getContext();
    _renderMenu(boot.userId, ctx.classId || boot.classId);
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  });

  // close on outside click
  document.addEventListener('click', (e) => {
    if (menu.hidden) return;
    const t = e.target;
    if (t === btn || menu.contains(t)) return;
    _closeMenu();
  });

  return true;
}

/* ---------------------------------------------------------
   Boot Action: run both hydrations
--------------------------------------------------------- */
(function hydrateOnBoot() {

  const okScores = safeHydrateScores();
  const okPhase  = safeHydratePhase();
  console.log(
    `[PC#040] Hydration → scores:${okScores ? 'ok' : 'skip'} phase:${okPhase ? 'ok' : 'skip'}`
  );
})();
