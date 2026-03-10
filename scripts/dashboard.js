/* =========================================================
   VERSION INTEGRITY BLOCK – dashboard.js (Canon-Aligned)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   Canon Alignment Pass – 2025-11-13
========================================================= */

import * as Storage from './storage.js';
import * as Events from './events.js';

/* ---------------------------------------------------------
   CANONICAL BUS RESOLUTION — required across all modules
--------------------------------------------------------- */
const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const on   = Bus.on   || Events.on;
const emit = Bus.emit || Events.emit;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || Bus.EVENTS || {};

/* ---------------------------------------------------------
   PC#001 – dashboard.init (no-op)
--------------------------------------------------------- */
export function init() { /* no-op for PC#001 */ }
export const ready = true;

/* =========================================================
   PC#003 – Roster Shell (unchanged logic, canonical calls)
========================================================= */

const DEFAULT_ROSTER = Object.freeze({
  students: [
    { id: 's1', name: 'Student 1', active: true },
    { id: 's2', name: 'Student 2', active: true },
    { id: 's3', name: 'Student 3', active: true },
    { id: 's4', name: 'Student 4', active: true },
    { id: 's5', name: 'Student 5', active: true },
    { id: 's6', name: 'Student 6', active: true },
    { id: 's7', name: 'Student 7', active: true },
    { id: 's8', name: 'Student 8', active: true },
  ]
});

function getRosterSnapshot() {
  const snap = Storage.readJSON(Storage.KEYS.ROSTER_V1, null);
  if (!snap || !Array.isArray(snap.students)) return DEFAULT_ROSTER;

  const students = snap.students
    .filter(s => s && typeof s === 'object')
    .map((s, i) => ({
      id: String(s.id ?? `s${i+1}`),
      name: String(s.name ?? `Student ${i+1}`),
      active: Boolean(s.active ?? true)
    }));

  return { students: students.length ? students : DEFAULT_ROSTER.students };
}

export function mountRoster(selector = '#leaderboard') {
  // PC#051 is now the visual owner of the leaderboard rail.
  // This function is kept only as a delegator for backwards compatibility.
  try {
    const lb = window.__CE_LB;
    if (lb && typeof lb.mount === 'function') {
      lb.mount(selector);
      console.log('[Dashboard] mountRoster → delegated to PC#051');
      return true;
    }
  } catch (e) {
    console.warn('[Dashboard] mountRoster delegation failed:', e);
  }

  console.warn('[Dashboard] mountRoster is deprecated; PC#051 owns the leaderboard visuals.');
  return false;
}


export const rosterReady = true;


/* =========================================================
   PC#009 – Scores Owner (Canon-aligned, unbanked/banked)
   Operational Routine v1.8 (Part B – Token & Score Handling)
   Notes:
     - _scores is the single runtime authority for tokens
     - Shape: { unbanked:number, banked:number }
     - Clamp rule: unbanked is never < 0
========================================================= */

const _scores = new Map();

/** Ensure every roster student has a scores entry. */
function _ensureScoresBootstrapped() {
  const snap = getRosterSnapshot();
  for (const s of snap.students) {
    const id = String(s.id);
    if (!_scores.has(id)) {
      _scores.set(id, { unbanked: 0, banked: 0 });
    }
  }
}

/** Read-only snapshot of scores by id. */
export function getScoresSnapshot() {
  _ensureScoresBootstrapped();
  const byId = {};
  for (const [id, v] of _scores.entries()) {
    byId[id] = {
      unbanked: Number(v.unbanked || 0),
      banked: Number(v.banked || 0)
    };
  }
  return Object.freeze({ byId });
}

function _emitScoresUpdated() {
  try {
    const payload = { byIdSnapshot: getScoresSnapshot().byId, ts: Date.now() };
    emit(E.SCORES_UPDATED || 'scores:updated', payload);
  } catch {}
}

/** Dev helper: bump unbanked by delta (can be +/-). */
export function __devBumpScore(studentId, delta = 1) {
  if (!studentId) return false;
  _ensureScoresBootstrapped();

  const id = String(studentId);
  const cur = _scores.get(id) || { unbanked: 0, banked: 0 };
  const baseUnbanked = Number(cur.unbanked || 0);
  const nextUnbanked = Math.max(0, baseUnbanked + Number(delta || 0)); // clamp
  const next = {
    unbanked: nextUnbanked,
    banked: Number(cur.banked || 0)
  };

  _scores.set(id, next);
  _emitScoresUpdated();
  return true;
}

export const scoresOwnerReady = true;


/* =========================================================
   PC#012 – Persistence Helpers (Canon-aligned)
   Notes:
     - Storage shape: { byId:{ [id]:{unbanked,banked} } }
     - Legacy support: accepts {points,week} on load
========================================================= */

function _toByIdObject() {
  const out = {};
  for (const [id, v] of _scores.entries()) {
    out[id] = {
      unbanked: Number(v.unbanked || 0),
      banked: Number(v.banked || 0)
    };
  }
  return out;
}

function _fromByIdObject(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const id of Object.keys(obj)) {
    const v = obj[id] || {};

    // Legacy fields fallback
    const legacyUnbanked = Number.isFinite(v.points) ? v.points : 0;
    const legacyBanked   = Number.isFinite(v.week)   ? v.week   : 0;

    const unbanked = Number.isFinite(v.unbanked)
      ? v.unbanked
      : legacyUnbanked;

    const banked = Number.isFinite(v.banked)
      ? v.banked
      : legacyBanked;

    _scores.set(String(id), {
      unbanked: Math.max(0, Number(unbanked || 0)),
      banked:   Math.max(0, Number(banked   || 0))
    });
  }
}

export function persistScores() {
  try {
    const payload = { byId: _toByIdObject() };
    return Storage.writeJSON(Storage.KEYS.SCORES_V1, payload);
  } catch {
    return false;
  }
}

export function loadScores() {
  _ensureScoresBootstrapped();

  const stored = Storage.readJSON(Storage.KEYS.SCORES_V1, null);
  if (stored?.byId && typeof stored.byId === 'object') {
    _fromByIdObject(stored.byId);
  }

  _emitScoresUpdated();
  return getScoresSnapshot();
}

export const scoresPersistenceReady = true;

/* =========================================================
   PC#015 – Minimal Award Path (Canon-aligned)
========================================================= */

/* =========================================================
   PC#015 – Minimal Award Path (Canon-aligned)
   Notes:
     - dashboard:award { studentId, value, source }
     - Applies to unbanked only (banked handled by bank:run)
     - Clamp rule: unbanked never < 0
========================================================= */

const _awardConfig = { persistOnAward: false };

export function setPersistOnAward(flag = false) {
  _awardConfig.persistOnAward = !!flag;
  return _awardConfig.persistOnAward;
}

export function applyAward(payload = {}) {
  const id = String(payload.studentId || '').trim();
  if (!id) return false;

  const delta = Number.isFinite(payload.value)
    ? Number(payload.value)
    : Number.isFinite(payload.points)
      ? Number(payload.points)
      : 1;

  _ensureScoresBootstrapped();
  const cur = _scores.get(id) || { unbanked: 0, banked: 0 };

  const baseUnbanked = Number(cur.unbanked || 0);
  const nextUnbanked = Math.max(0, baseUnbanked + delta);

  const next = {
    unbanked: nextUnbanked,
    banked: Number(cur.banked || 0)
  };

  _scores.set(id, next);
  _emitScoresUpdated();

  /* Canonical public signal */
  try {
    emit(E.DASHBOARD_AWARD_APPLIED || 'dashboard:award:applied', {
      studentId: id,
      delta,
      reason: payload.reason || null,
      phase: payload.phase ?? null,
      ts: Date.now()
    });
  } catch {}

  if (_awardConfig.persistOnAward) {
    try { persistScores(); } catch {}
  }

  return true;
}

export const minimalAwardReady = true;

/* =========================================================
   PC#018 – Re-export roster snapshot
========================================================= */
export { getRosterSnapshot };

/* =========================================================
   PC#027 – Active Student Surface
========================================================= */
let _activeStudent = { id: null, name: '' };

export function setActiveStudent(id, name = '') {
  _activeStudent = { id: id || null, name: String(name || '') };
  return !!_activeStudent.id;
}

export function getActiveStudent() {
  return { ..._activeStudent };
}

/* =========================================================
   PC#040A – Class Switch Runtime Reset (MVP scope only)
   Notes:
     - Phases are not part of multi-class profiles.
     - Clears runtime scores + active student only.
========================================================= */
export function resetRuntimeState() {
  try { _scores.clear(); } catch {}
  _activeStudent = { id: null, name: '' };
  try { _emitScoresUpdated(); } catch {}
  return true;
}


/* =========================================================
   PC#040B – Class Select (Reload-Safe Switching)
   Rule:
     - Do NOT hot-swap runtime for class changes.
     - Save current class → set session → reload (welcome phase reset).
========================================================= */
function _ensureDefaultClass(userId = 'u1') {
  const cur = Storage.getClasses(userId);
  if (Array.isArray(cur) && cur.length) return cur;
  // Create one default class if missing
  const created = Storage.createClass(userId, 'Class 1');
  return Storage.getClasses(userId) || (created ? [created] : []);
}

function _initClassSelectReloadSwitch() {
  const sel = document.getElementById('class-select');
  if (!sel) return false;

  const sess = Storage.getSession() || { userId: null, classId: null };
  const userId = String(sess.userId || '').trim() || 'u1';
  const classes = _ensureDefaultClass(userId);
  const activeId = String(sess.classId || (classes[0]?.id || '')).trim();

  sel.innerHTML = '';
  for (const c of classes) {
    const opt = document.createElement('option');
    opt.value = String(c.id);
    opt.textContent = String(c.name || c.id);
    sel.appendChild(opt);
  }
  // Special options
  const sep = document.createElement('option');
  sep.disabled = true;
  sep.textContent = '──────────';
  sel.appendChild(sep);

  const optNew = document.createElement('option');
  optNew.value = '__new__';
  optNew.textContent = '+ New class…';
  sel.appendChild(optNew);

  const optRen = document.createElement('option');
  optRen.value = '__rename__';
  optRen.textContent = 'Rename current class…';
  sel.appendChild(optRen);

  const optDel = document.createElement('option');
  optDel.value = '__delete__';
  optDel.textContent = 'Delete current class…';
  sel.appendChild(optDel);

  // Set current selection if available
  if (activeId) sel.value = activeId;

  sel.addEventListener('change', () => {
    let targetId = String(sel.value || '').trim();
    if (!targetId) return;

    if (targetId === '__new__') {
      const name = prompt('New class name:');
      if (!name || !String(name).trim()) {
        // revert selection
        sel.value = activeId || (classes[0]?.id || '');
        return;
      }
      const created = Storage.createClass(userId, String(name).trim());
      if (!created?.id) {
        sel.value = activeId || (classes[0]?.id || '');
        return;
      }
      targetId = String(created.id);
      // session will switch + reload; no need to repopulate options now
    }
    else if (targetId === '__rename__') {
      if (!activeId) return;
      const cur = (Storage.getClasses(userId) || []).find(c => String(c.id) === String(activeId));
      const curName = String(cur?.name || '').trim();
      const nextName = String(prompt('Rename class:', curName || 'Class') || '').trim();
      if (!nextName) {
        sel.value = activeId;
        return;
      }

      // Update class list record (dropdown source of truth)
      const updated = (Storage.getClasses(userId) || []).map(c => {
        if (String(c.id) !== String(activeId)) return c;
        return { ...c, name: nextName };
      });
      try { Storage.saveClasses(userId, updated); } catch {}

      // Update class meta for export/import compatibility
      try { Storage.setClassName?.(nextName); } catch {}

      // Reload-safe path: keep current class selected and refresh UI
      try { Storage.setSession(userId, String(activeId)); } catch {}
      location.reload();
      return;
    }
    else if (targetId === '__delete__') {
      if (!activeId) return;
      if (!confirm('Delete this class permanently?')) {
        sel.value = activeId;
        return;
      }

      const updated = (Storage.getClasses(userId) || [])
        .filter(c => String(c.id) !== String(activeId));

      if (updated.length === 0) {
        alert('At least one class must exist.');
        sel.value = activeId;
        return;
      }

      Storage.saveClasses(userId, updated);
      const nextId = String(updated[0].id);
      Storage.setSession(userId, nextId);
      location.reload();
      return;
    }

    // ---- FORCE SAVE CURRENT CLASS BEFORE SWITCH ----
    try { persistScores(); } catch {}
    try { Storage.remove(Storage.KEYS.HISTORY_V1); } catch {}

    // ---- SWITCH VIA SESSION + RELOAD (welcome reset) ----
    try { Storage.setSession(userId, targetId); } catch {}
    location.reload();
  });

  return true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initClassSelectReloadSwitch);
} else {
  _initClassSelectReloadSwitch();
}

/* =========================================================
   PC#028 – STW Award Listener (Canon-aligned)
========================================================= */
on(E.STW_AWARD || 'stw:award', (e) => {
  const p = e?.detail || {};
  if (p?.studentId) {
    applyAward({
      studentId: p.studentId,
      points: p.points ?? 1,
      difficulty: p.difficulty
    });
  }
});

/* =========================================================
   PC#029 – Open STW2 for Active Student
========================================================= */
export async function openSTWForActive() {
  try {
    const STW2 = await import('./stw2.js?v=dev');
    const { id, name } = getActiveStudent();
    if (!id) return false;

    STW2.setTarget(id, name);
    STW2.open();
    return true;
  } catch { return false; }
}

/* =========================================================
   PC#031 – winnerSelected → open STW2
========================================================= */
on(E.STW_WINNER_SELECTED || 'stw:winnerSelected', async (e) => {
  const p = e?.detail || {};
  if (p?.studentId) {
    setActiveStudent(p.studentId, p.name || '');
    await openSTWForActive();
  }
});

/* =========================================================
   PC#033 – Open STW2 for Random
========================================================= */
export async function openSTWForRandom() {
  try {
    const STW2 = await import('./stw2.js');
    const snap = getRosterSnapshot();
    return STW2.openWithRoster(snap.students || []);
  } catch {
    return false;
  }
}

/* =========================================================
   PC#036 – Generate Lesson Snapshot (Canon-aligned)
========================================================= */
export function getLessonSnapshot() {
  let roster = getRosterSnapshot();
  let scores = getScoresSnapshot();
  let phase  = '1';

  try {
    const ph = Storage.readJSON(Storage.KEYS.PHASE_V1, { current: '1' });
    phase = String(ph?.current || '1');
  } catch {}

  return Object.freeze({
    ts: Date.now(),
    phase,
    roster,
    scores
  });
}

/* =========================================================
   PC#037 – End Lesson (Canon-aligned)
========================================================= */
const EVT_LESSON_END = E.LESSON_END || 'lesson:end';

export function endLesson(opts = {}) {
  const persist = !!opts.persist;
  const cap = Number.isFinite(opts.cap) ? Math.max(1, opts.cap) : 50;

  const snapshot = getLessonSnapshot();

  try {
    emit(EVT_LESSON_END, { snapshot, ts: Date.now() });
  } catch {}

  if (persist) {
    try {
      const KEY = Storage.makeKey('lesson', 1);
      Storage.updateJSON(KEY, (cur) => {
        const arr = Array.isArray(cur) ? cur.slice(0, cap - 1) : [];
        arr.unshift(snapshot);
        return arr;
      }, []);
    } catch {}
  }

  return snapshot;
}

/* =========================================================
   GLOBAL MOUNT – Required by PC072, PC067, Burn-line Engine
   Canon Rule: Dashboard must be externally readable.
========================================================= */

window.Dashboard = {
  init,
  ready,
  getRosterSnapshot,
  mountRoster,
  getScoresSnapshot,
  __devBumpScore,
  applyAward,
  setActiveStudent,
  getActiveStudent,
  openSTWForActive,
  openSTWForRandom,
  getLessonSnapshot,
  endLesson
};

