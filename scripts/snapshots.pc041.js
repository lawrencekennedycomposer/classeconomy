/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0 (Canon Aligned)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#041 – Snapshot cap/rotate on lesson:end
   Generated: 2025-11-13 (AEST)
========================================================= */

import * as Events from './events.js';
import * as Storage from './storage.js';
import * as Dashboard from './dashboard.js';

/* ---------------------------------------------------------
   Canonical Event Bus
--------------------------------------------------------- */
const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const on   = Bus.on   || Events.on;
const emit = Bus.emit || Events.emit;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || Bus.EVENTS || {};

const SNAP_KEY = Storage.makeKey('snapshots', 1);
const MAX_KEEP = 20;

/* ---------------------------------------------------------
   Normalize snapshot payload
--------------------------------------------------------- */
function normalizeSnapshot(raw) {
  const now = Date.now();
  try {
    if (raw && typeof raw === 'object') {
      return {
        ts: Number(raw.ts ?? now),
        phase: String(raw.phase ?? (raw.state?.phase ?? '1')),
        roster: Array.isArray(raw.roster)
          ? raw.roster
          : (raw.state?.roster ?? []),
        scores: raw.scores || raw.state?.scores || null,
        meta: Object.assign({ source: 'event' }, raw.meta || {})
      };
    }
  } catch { /* ignore */ }

  // Dashboard fallback snapshot (non-persist)
  try {
    if (typeof Dashboard.endLesson === 'function') {
      const snap = Dashboard.endLesson({ persist: false, cap: MAX_KEEP });
      return normalizeSnapshot(snap);
    }
  } catch { /* ignore */ }

  return {
    ts: now,
    phase: '1',
    roster: [],
    scores: null,
    meta: { source: 'fallback' }
  };
}

/* ---------------------------------------------------------
   Save (cap/rotate)
--------------------------------------------------------- */
function saveSnapshot(snap) {
  try {
    const list = Storage.readJSON(SNAP_KEY, []);
    const arr = Array.isArray(list) ? list : [];
    arr.unshift(snap);
    const trimmed = arr.slice(0, MAX_KEEP);
    Storage.writeJSON(SNAP_KEY, trimmed);
    return { ok: true, count: trimmed.length };
  } catch {
    return { ok: false, count: 0 };
  }
}

/* ---------------------------------------------------------
   Listener
--------------------------------------------------------- */
function onLessonEnd(e) {
  const raw = e?.detail?.snapshot ?? e?.detail ?? null;
  const snap = normalizeSnapshot(raw);
  const res  = saveSnapshot(snap);

  try {
    console.log(
      `[PC#041] snapshot saved (${res.count}/${MAX_KEEP}) @ ${new Date(snap.ts).toISOString()}`
    );
  } catch {}
}

/* ---------------------------------------------------------
   Wire (canon-safe)
--------------------------------------------------------- */

try {
  // Canonical preferred event name
  const EVT =
    E.LESSON_END ||      // canon (“lesson:end”)
    E.LESSON_ENDED ||    // legacy alias
    'lesson:end';        // hard fallback

  on(EVT, onLessonEnd);

} catch { /* ignore */ }

/* ---------------------------------------------------------
   Dev handle
--------------------------------------------------------- */
window.__CE_SNAP = Object.freeze({
  key: SNAP_KEY,
  list: () => Storage.readJSON(SNAP_KEY, []),
  clear: () => Storage.writeJSON(SNAP_KEY, [])
});
