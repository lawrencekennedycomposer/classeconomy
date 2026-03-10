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
   VERSION INTEGRITY BLOCK – VI-B1
   Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
   Coding Charter v1.0-GOV | Build Range PC#011–PC#015
   Generated: 2025-11-09 (AEST)
   SHA-256: [5f63040ef8040795ec263ddb6ab9656c94cc3910bf828febed5374925f0cfc9f]
========================================================= */
/*-- =========================================================
  VERSION INTEGRITY BLOCK – VI-A1
  Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
  Coding Charter v1.0-GOV | Build Range PC#001–PC#010
  Generated: 2025-11-09 (AEST)
  SHA-256: [9eba2f2d6a47da1f8e4edfc0172bb52e59e85cfbb5d9478f905b4c239062265d]
========================================================= */
/* =========================================================
  Version Integrity Block – storage.js
  Charter: THE CODING PROCEDURE (v1.0-GOV)
  Operational Routine: v1.8 Final + Errata v1.8-E1
  PC Range: PC#001
  Notes: Probe only; no reads/writes yet.
========================================================= */
const probeLocal = (() => {
  try { const k='__ce_probe'; localStorage.setItem(k,'1'); localStorage.removeItem(k); return true; }
  catch { return false; }
})();

export const hasLocal = probeLocal;
export const ready = true;
/* =========================================================
  PC#002 – Storage: namespacing + safe helpers (append-only)
  Charter: THE CODING PROCEDURE (v1.0-GOV)
  Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
  Notes:
    - No writes are performed by PC#002 automatically.
    - Helpers are provided for later PCs to use in a controlled manner.
========================================================= */

/** Namespace + canonical keys (no assumptions beyond labels) */
export const NAMESPACE = 'ce';
export const SESSION_KEY_V1 = `${NAMESPACE}:session:v1`;
export const KEYS = Object.freeze({
  // Full canonical localStorage keys (restores original working behaviour)
  META:      `${NAMESPACE}:meta`,
  ROSTER_V1: `${NAMESPACE}:roster:v1`,
  SCORES_V1: `${NAMESPACE}:scores:v1`,
  HISTORY_V1:`${NAMESPACE}:history:v1`,
  PHASE_V1:  `${NAMESPACE}:phase:v1`,
  SEATING_LAYOUT_V1: `${NAMESPACE}:seatingLayout:v1`,
});

const _CTX = { userId: null, classId: null };
const _CLASS_SCOPED = new Set([
  KEYS.META,
  KEYS.ROSTER_V1,
  KEYS.SCORES_V1,
  KEYS.SEATING_LAYOUT_V1
]);
 // Per-user (NOT per-class). These must never leak across tester accounts.
 const _USER_SCOPED = new Set([
   KEYS.HISTORY_V1,
   KEYS.PHASE_V1,
   `${NAMESPACE}:engagementBoost:v1`
 ]);
 // True globals (intentionally shared). Keep tiny.
 const _GLOBAL = new Set([]);

export function setContext(userId, classId) {
  _CTX.userId = String(userId || '').trim() || null;
  _CTX.classId = String(classId || '').trim() || null;
  return { userId: _CTX.userId, classId: _CTX.classId };
}

export function getContext() {
  return { userId: _CTX.userId, classId: _CTX.classId };
}

export function key(suffix) {
  // Compatibility: accept either full keys ("ce:roster:v1") or suffixes ("roster:v1")
  const s = String(suffix || '').trim();
  if (!s) throw new Error('Storage.key(...) requires a key or suffix');
  if (s.startsWith(`${NAMESPACE}:`)) return s; // already a full key
  return `${NAMESPACE}:${s}`;
}

export function classListKey(userId) {
  const u = String(userId || '').trim();
  if (!u) throw new Error('classListKey requires userId');
  return `${NAMESPACE}:${u}:classes:v1`;
}

export function getSession() {
  return readJSON(SESSION_KEY_V1, null);
}

export function setSession(userId, classId) {
  const u = String(userId || '').trim();
  const c = String(classId || '').trim();
  if (!u || !c) return false;
  return writeJSON(SESSION_KEY_V1, { userId: u, classId: c });
}

export function getClasses(userId) {
  return readJSON(classListKey(userId), []);
}

export function saveClasses(userId, classes) {
  return writeJSON(classListKey(userId), Array.isArray(classes) ? classes : []);
}

function _makeClassId() {
  return `c_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function ensureAtLeastOneClass(userId) {
  const cur = getClasses(userId);
  if (Array.isArray(cur) && cur.length) return cur[0];

  const createdAt = Date.now();
  const one = { id: _makeClassId(), name: 'Class 1', createdAt };
  saveClasses(userId, [one]);
  return one;
}

export function createClass(userId, name) {
  const nm = String(name || '').trim();
  if (!nm) return null;
  const classes = getClasses(userId);
  const createdAt = Date.now();
  const next = { id: _makeClassId(), name: nm, createdAt };
  saveClasses(userId, [...(Array.isArray(classes) ? classes : []), next]);
  return next;
}

function _scopedKeyFor(userId, classId, fullKey) {
  const tail = fullKey.startsWith(`${NAMESPACE}:`) ? fullKey.slice(`${NAMESPACE}:`.length) : fullKey;
  return `${NAMESPACE}:${userId}:${classId}:${tail}`;
}
 
 function _userScopedKeyFor(userId, fullKey) {
   const tail = fullKey.startsWith(`${NAMESPACE}:`) ? fullKey.slice(`${NAMESPACE}:`.length) : fullKey;
   return `${NAMESPACE}:${userId}:${tail}`;
 }

function _rawGet(k) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function _rawSet(k, v) {
  try { localStorage.setItem(k, v); return true; } catch { return false; }
}

function _sessionContext() {
  const sess = getSession();
  const u = String(sess?.userId || '').trim();
  const c = String(sess?.classId || '').trim();
  return { userId: u || null, classId: c || null };
}

function _migrateLegacyUnscopedToScopedOnce(userId, classId) {
  // Copy old single-class keys into the active class (first time only).
  // No deletes (safe). Scoped key wins if already present.
  const bases = [
    KEYS.META,
    KEYS.ROSTER_V1,
    KEYS.SCORES_V1,
    KEYS.SEATING_LAYOUT_V1
  ];

  for (const baseKey of bases) {
    const scoped = _scopedKeyFor(userId, classId, baseKey);
    if (_rawGet(scoped) != null) continue;
    const legacy = _rawGet(baseKey);
    if (legacy == null) continue;
    _rawSet(scoped, legacy);
  }
}
 
 function _migrateLegacyUserUnscopedToUserScopedOnce(userId) {
   // Copy old single-user keys into the active user's namespace (first time only).
   // No deletes (safe). User-scoped key wins if already present.
   const bases = [
     KEYS.HISTORY_V1,
     KEYS.PHASE_V1,
     `${NAMESPACE}:engagementBoost:v1`
   ];
 
   for (const baseKey of bases) {
     const scoped = _userScopedKeyFor(userId, baseKey);
     if (_rawGet(scoped) != null) continue;
     const legacy = _rawGet(baseKey);
     if (legacy == null) continue;
     _rawSet(scoped, legacy);
   }
 }

export function deleteClass(userId, classId) {
  const u = String(userId || '').trim();
  const c = String(classId || '').trim();
  if (!u || !c) return { ok: false, error: 'Missing userId/classId' };

  const classes = getClasses(u);
  if (!Array.isArray(classes) || classes.length <= 1) {
    return { ok: false, error: 'Cannot delete last class' };
  }

  const remaining = classes.filter(x => String(x?.id) !== c);
  if (remaining.length === classes.length) {
    return { ok: false, error: 'Class not found' };
  }

  // Remove class list entry first
  saveClasses(u, remaining);

  // Remove scoped data keys for that class
  const toRemove = [
    KEYS.META,
    KEYS.ROSTER_V1,
    KEYS.SCORES_V1,
    KEYS.SEATING_LAYOUT_V1
  ].map(k => _scopedKeyFor(u, c, k));

  for (const k of toRemove) {
    try { localStorage.removeItem(k); } catch {}
  }

  // If session was pointing to deleted class, move it to first remaining
  const sess = getSession() || {};
  const nextClassId = String(remaining[0]?.id || '').trim();
  if (String(sess.classId) === c && nextClassId) {
    setSession(u, nextClassId);
    setContext(u, nextClassId);
  }

  return { ok: true, nextClassId };
}

export function ensureBootContext() {
  // NOTE: userId accounts are coming soon; for now we seed a stable default.
  let sess = getSession();
  let userId = String(sess?.userId || '').trim();
  if (!userId) userId = 'u1';

  const classes = getClasses(userId);
  const first = (Array.isArray(classes) && classes.length) ? classes[0] : ensureAtLeastOneClass(userId);
  const classId = String(sess?.classId || '').trim() || String(first?.id || '').trim();

  // Ensure classId exists; otherwise fall back to first.
  const list = getClasses(userId);
  const ok = Array.isArray(list) && list.some(c => String(c?.id) === classId);
  const finalClassId = ok ? classId : String(list?.[0]?.id || first?.id || '').trim();

  setContext(userId, finalClassId);
  setSession(userId, finalClassId);
  return { userId, classId: finalClassId, classes: list };
}

export function resolveKey(key) {
  const k = String(key || '').trim();
  if (!k) return k;
  if (_GLOBAL.has(k)) return k;
 
   // User-only scoping (tester accounts)
   if (_USER_SCOPED.has(k)) {
     const { userId: u } = _sessionContext();
     if (!u) return k; // no session yet → behave like legacy single-user
     _migrateLegacyUserUnscopedToUserScopedOnce(u);
     return _userScopedKeyFor(u, k);
   }
 

  if (!_CLASS_SCOPED.has(k)) return k;

  // Session-driven scoping (reload-safe; avoids hot context flips)
  const { userId: u, classId: c } = _sessionContext();
  if (!u || !c) return k; // no session yet → behave like single-class

  // "ce:roster:v1" → "ce:<userId>:<classId>:roster:v1"
  _migrateLegacyUnscopedToScopedOnce(u, c);
  return _scopedKeyFor(u, c, k);
}
/** Low-level guards */
function _safeParse(json, fallback) {
  if (json == null) return fallback;
  try { return JSON.parse(json); } catch { return fallback; }
}
function _safeStringify(val) {
  try { return JSON.stringify(val); } catch { return undefined; }
}
function _hasLocalStorage() {
  try {
    const k='__ce_probe2';
    localStorage.setItem(k,'1'); localStorage.removeItem(k);
    return true;
  } catch { return false; }
}

/** Key utils */
export function makeKey(name, version = null) {
  return version == null ? `${NAMESPACE}:${name}` : `${NAMESPACE}:${name}:v${version}`;
}

/** Read helpers (no side effects) */
export function readText(key) {
  if (!hasLocal || !_hasLocalStorage()) return null;
  try { return localStorage.getItem(resolveKey(key)); } catch { return null; }
}
export function readJSON(key, fallback = null) {
  return _safeParse(readText(key), fallback);
}

/**
 * Write helpers (EXPOSED but NOT USED in PC#002)
 * - Callers must decide policy (append/replace) in later PCs.
 * - Returns boolean for success; silently no-ops if storage is unavailable.
 */
export function writeText(key, text) {
  if (!hasLocal || !_hasLocalStorage()) return false;
  try { localStorage.setItem(resolveKey(key), String(text)); return true; } catch { return false; }
}
export function writeJSON(key, value) {
  const s = _safeStringify(value);
  if (s === undefined) return false;
  return writeText(key, s);
}

/**
 * Atomic JSON updater: read → mutate in memory → write once.
 * - updater receives (currentValue) and must return the newValue.
 * - If updater throws or returns undefined, no write occurs.
 */
export function updateJSON(key, updater, fallback = null) {
  const current = readJSON(key, fallback);
  let next;
  try { next = updater(current); } catch { return { ok:false, value: current }; }
  if (typeof next === 'undefined') return { ok:false, value: current };
  const ok = writeJSON(key, next);
  return { ok, value: ok ? next : current };
}

/** Removal (not used in PC#002; provided for controlled replacements later) */
export function remove(key) {
  if (!hasLocal || !_hasLocalStorage()) return false;
  try { localStorage.removeItem(resolveKey(key)); return true; } catch { return false; }
}

/** Discovery helpers */
export function keys(prefix = `${NAMESPACE}:`) {
  if (!hasLocal || !_hasLocalStorage()) return [];
  try {
    const out = [];
    for (let i=0; i<localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) out.push(k);
    }
    return out.sort();
  } catch { return []; }
}

/** Snapshot (read-only view of all CE keys) */
export function snapshot(prefix = `${NAMESPACE}:`) {
  const ks = keys(prefix);
  const view = {};
  for (const k of ks) view[k] = readJSON(k, readText(k)); // parse if possible, else raw text
  return Object.freeze(view);
}

/* =========================================================
   PC#039 – Advisory MVP Export/Import (phase excluded)
   Requirements:
     - Export title includes className + date + time (handled in persistence)
     - Export contents: roster (names), seating plan, scores (banked/unbanked)
     - Storage layer is UI-agnostic (no downloads / prompts / DOM)
========================================================= */

export function getClassName() {
  // Prefer the active class record name (same source used by the dashboard class dropdown).
  // This prevents stale meta causing exports to always show an old name (e.g. "10Test1").
  try {
    const sess = getSession() || {};
    const u = String(sess.userId || '').trim();
    const c = String(sess.classId || '').trim();
    if (u && c) {
      const classes = getClasses(u);
      if (Array.isArray(classes)) {
        const hit = classes.find(x => String(x?.id || '').trim() === c);
        const name = String(hit?.name || '').trim();
        if (name) return name;
      }
    }
  } catch { /* non-blocking */ }

  // Fallback: class-scoped meta (legacy / import paths)
  const meta = readJSON(key(KEYS.META), {}) || {};
  const v =
    meta.className ??
    meta.classname ??
    meta.class ??
    meta.room ??
    '';
  return String(v || '').trim();
}

export function setClassName(className) {
  const name = String(className || '').trim();
  if (!name) return false;
  updateJSON(key(KEYS.META), (m) => {
    const next = (m && typeof m === 'object') ? { ...m } : {};
    next.className = name;
    return next;
  }, {});
  // Keep the active class list record in sync (so dropdown + exports agree).
  try {
    const sess = getSession() || {};
    const u = String(sess.userId || '').trim();
    const c = String(sess.classId || '').trim();
    if (u && c) {
      const classes = getClasses(u);
      if (Array.isArray(classes) && classes.length) {
        let changed = false;
        const next = classes.map(k => {
          if (String(k?.id || '').trim() !== c) return k;
          const curName = String(k?.name || '').trim();
          if (curName === name) return k;
          changed = true;
          return { ...k, name };
        });
        if (changed) saveClasses(u, next);
      }
    }
  } catch { /* non-blocking */ }
  return true;
}

function _advisoryPayloadV1() {
  return {
    version: 'advisory-mvp-v1',
    exportedAt: Date.now(),
    className: getClassName(),
    roster: readJSON(key(KEYS.ROSTER_V1), { students: [] }),
    scores: readJSON(key(KEYS.SCORES_V1), { byId: {} }),
    seatingLayout: readJSON(key(KEYS.SEATING_LAYOUT_V1), { desks: [] })
  };
}

export function exportAdvisoryJSON() {
  return _safeStringify(_advisoryPayloadV1()) || '{}';
}

export function importAdvisoryJSON(text) {
  const obj = _safeParse(String(text || ''), null);
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'Invalid JSON' };

  const className = String(obj.className || '').trim();
  const roster = obj.roster;
  const scores = obj.scores;
  const seatingLayout = obj.seatingLayout;

  if (className) setClassName(className);

  if (roster && typeof roster === 'object' && Array.isArray(roster.students)) {
    writeJSON(key(KEYS.ROSTER_V1), roster);
  }
  if (scores && typeof scores === 'object' && scores.byId && typeof scores.byId === 'object') {
    writeJSON(key(KEYS.SCORES_V1), scores);
  }
  if (seatingLayout && typeof seatingLayout === 'object' && Array.isArray(seatingLayout.desks)) {
    writeJSON(key(KEYS.SEATING_LAYOUT_V1), seatingLayout);
  }

  return { ok: true };
}

export function exportAdvisoryCSV() {
  // Key/value CSV (JSON-encoded values) to preserve complex seatingLayout.
  const rows = [
    ['key', 'value'],
    [KEYS.META, _safeStringify({ className: getClassName() }) || '{}'],
    [KEYS.ROSTER_V1, _safeStringify(readJSON(key(KEYS.ROSTER_V1), { students: [] })) || '{"students":[]}'],
    [KEYS.SCORES_V1, _safeStringify(readJSON(key(KEYS.SCORES_V1), { byId: {} })) || '{"byId":{}}'],
    [KEYS.SEATING_LAYOUT_V1, _safeStringify(readJSON(key(KEYS.SEATING_LAYOUT_V1), { desks: [] })) || '{"desks":[]}'],
  ];

  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  return rows.map(([k, v]) => `${esc(k)},${esc(v)}`).join('\n');
}

function _parseCSVTwoCols(line) {
  // Minimal parser for two quoted columns: "key","value"
  const out = [];
  let i = 0;

  while (i < line.length && out.length < 2) {
    while (line[i] === ' ' || line[i] === '\t' || line[i] === ',') i++;
    if (line[i] !== '"') break;

    i++; // open quote
    let s = '';
    while (i < line.length) {
      const ch = line[i];
      if (ch === '"') {
        if (line[i + 1] === '"') { s += '"'; i += 2; continue; }
        i++; // close quote
        break;
      }
      s += ch;
      i++;
    }

    out.push(s);
    while (i < line.length && line[i] !== ',') i++;
    if (line[i] === ',') i++;
  }

  return out;
}

export function importAdvisoryCSV(text) {
  const raw = String(text || '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { ok: false, error: 'Empty CSV' };

  let start = 0;
  if (/^\s*"?key"?\s*,\s*"?value"?\s*$/i.test(lines[0].trim())) start = 1;

  const wanted = new Set([
    KEYS.META,
    KEYS.ROSTER_V1,
    KEYS.SCORES_V1,
    KEYS.SEATING_LAYOUT_V1
  ]);

  for (let idx = start; idx < lines.length; idx++) {
    const [k, v] = _parseCSVTwoCols(lines[idx]);
    if (!k || !wanted.has(k)) continue;

    const parsed = _safeParse(String(v || ''), null);
    if (!parsed || typeof parsed !== 'object') continue;

    if (k === KEYS.META) {
      const cn = String(parsed.className || '').trim();
      if (cn) setClassName(cn);
      continue;
    }

    writeJSON(key(k), parsed);
  }

  return { ok: true };
}


/** Ready flag (module capability is present) */
export const helpersReady = true;
/* Notice: VI-B1 checkpoint complete on 2025-11-09.
   Next governed session begins at PC#016 (Stage C). */

/* =========================================================
   PATCH: Add default export for backwards compatibility
   Allows: import Storage from './storage.js';
   ========================================================= */
export default {
  hasLocal,
  ready,
  NAMESPACE,
  SESSION_KEY_V1,
  KEYS,
  setContext,
  getContext,
  key,
  classListKey,
  getSession,
  setSession,
  getClasses,
  saveClasses,
  ensureAtLeastOneClass,
  createClass,
  deleteClass,
  ensureBootContext,
  resolveKey,  
  makeKey,
  readText,
  readJSON,
  writeText,
  writeJSON,
  updateJSON,
  remove,
  keys,
  snapshot,
  helpersReady,
  getClassName,
  setClassName,
  exportAdvisoryJSON,
  importAdvisoryJSON,
  exportAdvisoryCSV,
  importAdvisoryCSV
};
