/* =========================================================
   LEGACY MODULE — DO NOT IMPORT
   Retired: VI-DASH-4 transition (PC#052)
   Preserved for timing extraction only (/16 formula)
========================================================= */
// Retired in VI-DASH-4. Mine: PHASE_LABELS, /16 math, slice mapping. Do not import.

/* =========================================================
   VERSION INTEGRITY BLOCK – VI-C1
   Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
   Coding Charter v1.0-GOV | Parent: VI-B1 | Build Range PC#016–PC#020
   Generated: 2025-11-10 (AEST)
   SHA-256: [6847339b9e8493f9d29dcd6d15f77913674cdf5e5a6823a9cd35a611b35d47ee]
========================================================= */
/* =========================================================
   VERSION INTEGRITY BLOCK – VI-B1
   Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
   Coding Charter v1.0-GOV | Build Range PC#011–PC#015
   Generated: 2025-11-09 (AEST)
   SHA-256: [f560fed14ae4de9c21bcc90d1b936d6031971b8d8626ad2d89675ebef2f892ca]
========================================================= */
/*-- =========================================================
  VERSION INTEGRITY BLOCK – VI-A1
  Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
  Coding Charter v1.0-GOV | Build Range PC#001–PC#010
  Generated: 2025-11-09 (AEST)
  SHA-256: [9eba2f2d6a47da1f8e4edfc0172bb52e59e85cfbb5d9478f905b4c239062265d]
========================================================= */
/* =========================================================
  Version Integrity Block – burnline.js
  Charter: THE CODING PROCEDURE (v1.0-GOV)
  Operational Routine: v1.8 Final + Errata v1.8-E1
  PC Range: PC#001
  Notes: Visual reserve only; timers land in later PCs.
========================================================= */
export function init(){ /* no-op in PC#001 */ }
export const ready = true;
/* =========================================================
  PC#005 – Phase state shell + minimal burn-line label (append-only)
  Charter: THE CODING PROCEDURE (v1.0-GOV)
  Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
  Notes:
    - Read-only: attempts to read ce:phase:v1, else shows a default "Phase 1: Welcome".
    - No timers and no writes in PC#005.
    - Visual label only; ratios/timing land in later PCs.
========================================================= */
import * as Storage from './storage.js';

const DEFAULT_PHASE = Object.freeze({ current: '1', slice16: 0 });

/** Human-readable labels aligned to OR v1.8 (phases 1–7). */
export const PHASE_LABELS = Object.freeze({
  '1': 'Welcome',
  '2': 'Coin Flip',
  '3': 'STW (Spin That Wheel)',   // Errata v1.8-E1: burn-line starts at Phase 3
  '4': 'Work',
  '5': 'Game 1',
  '6': 'Game 2',
  '7': 'Purchases'
});

/** Defensive read: does NOT write defaults; purely read-only. */
export function getPhaseSnapshot() {
  const snap = Storage.readJSON(Storage.KEYS.PHASE_V1, null);
  if (!snap || typeof snap !== 'object') return DEFAULT_PHASE;
  const id = String(snap.current ?? '1');
  const slice = Number.isFinite(snap.slice16) ? snap.slice16 : 0;
  return { current: id, slice16: slice };
}

/** Mount a minimal label in the burn-line footer. No progress bar/timer yet. */
export function mountLabel(selector = '.burnline') {
  const host = document.querySelector(selector);
  if (!host) return false;

  let box = host.querySelector('.bl');
  if (!box) {
    box = document.createElement('div');
    box.className = 'bl';
    // Preserve any existing text by moving it into a subtle note
    const legacy = host.textContent?.trim();
    host.replaceChildren(box);
    if (legacy) {
      const note = document.createElement('div');
      note.className = 'bl-note muted';
      note.textContent = legacy;
      host.appendChild(note);
    }
  }

  const { current } = getPhaseSnapshot();
  const name = PHASE_LABELS[current] ?? `Phase ${current}`;
  box.innerHTML = `<span class="bl-pill">Phase ${current}: ${name}</span>`;
  return true;
}

export const labelReady = true;
/* =========================================================
  PC#006 – Dev preview: cycle phase label without writes (append-only)
  Charter: THE CODING PROCEDURE (v1.0-GOV)
  Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
  Notes:
    - Provides previewLabel() for developer-only visual checks.
    - Does NOT write to storage or alter timers/state.
========================================================= */

/** Canonical ordered phase ids for cycling previews (Welcome → Purchases) */
export const PHASE_ORDER = Object.freeze(['1','2','3','4','5','6','7']);

/**
 * Render a temporary phase label preview (no storage writes).
 * Useful for developer visual checks of the burn-line pill.
 * @param {string} phaseId - one of PHASE_ORDER (or any string → "Phase X")
 * @param {string} selector - container; defaults to '.burnline'
 */
export function previewLabel(phaseId, selector = '.burnline') {
  const host = document.querySelector(selector);
  if (!host) return false;

  // Ensure container exists (reuse mountLabel logic)
  let box = host.querySelector('.bl');
  if (!box) {
    box = document.createElement('div');
    box.className = 'bl';
    const legacy = host.textContent?.trim();
    host.replaceChildren(box);
    if (legacy) {
      const note = document.createElement('div');
      note.className = 'bl-note muted';
      note.textContent = legacy;
      host.appendChild(note);
    }
  }

  const name = PHASE_LABELS[phaseId] ?? `Phase ${phaseId}`;
  box.innerHTML = `<span class="bl-pill">Phase ${phaseId}: ${name}</span>`;
  return true;
}
/* =========================================================
  PC#011 – Phase controller + safe state writes (append-only)
  Charter: THE CODING PROCEDURE (v1.0-GOV)
  Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
  Notes:
    - Provides a minimal Phase API with guarded set/get.
    - Emits `lesson:phaseChanged` on change.
    - Optional persistence to `ce:phase:v1` (only when requested).
    - No timers and no automatic writes on load.
========================================================= */
import * as Events from './events.js';
import { EVENTS } from './events.js';

let _phaseId = (getPhaseSnapshot()?.current) || '1'; // in-memory view; source of truth remains storage

/** Validate and normalise a phase id into a string '1'..'7'. */
function _normPhaseId(id) {
  const s = String(id ?? '').trim();
  return PHASE_ORDER.includes(s) ? s : '1';
}

/** Read-only accessor for current in-memory phase id. */
export function getCurrentPhase() {
  return _phaseId;
}

/**
 * Set the current phase (in-memory) and optionally persist it.
 * Emits `lesson:phaseChanged` when the effective value changes.
 *
 * @param {string|number} to - Target phase id (1..7)
 * @param {{ persist?: boolean }} [opts]
 * @returns {boolean} true on change (event emitted), false otherwise
 */
export function setPhase(to, opts = {}) {
  const target = _normPhaseId(to);
  const from = _phaseId;
  if (target === from) return false;

  // Update in-memory
  _phaseId = target;

  // Optional persistence (controlled write)
  if (opts && opts.persist === true) {
    try {
      Storage.writeJSON(Storage.KEYS.PHASE_V1, { current: target, slice16: 0 });
    } catch { /* non-blocking */ }
  }

  // Emit canonical phase-changed signal
  try {
    Events.emit(EVENTS.LESSON_PHASE_CHANGED, { from, to: target, ts: Date.now() });
  } catch { /* non-blocking */ }

  // Update visual label (read-only)
  try { previewLabel(target, '.burnline'); } catch { /* non-blocking */ }

  return true;
}

/**
 * Load phase from storage into memory (no event unless changed).
 * Returns the resolved phase id.
 */
export function loadPhaseFromStorage() {
  const snap = getPhaseSnapshot();
  const resolved = _normPhaseId(snap?.current);
  if (resolved !== _phaseId) {
    _phaseId = resolved;
    // Optionally also update the pill without emitting lesson event
    try { previewLabel(resolved, '.burnline'); } catch {}
  }
  return _phaseId;
}

/**
 * Persist the current in-memory phase to storage (controlled write).
 */
export function persistPhase() {
  try {
    return Storage.writeJSON(Storage.KEYS.PHASE_V1, { current: _phaseId, slice16: 0 });
  } catch {
    return false;
  }
}

/** Marker for feature readiness in PC#011. */
export const phaseControllerReady = true;
/* Notice: VI-B1 checkpoint complete on 2025-11-09.
   Next governed session begins at PC#016 (Stage C). */
/* =========================================================
  PC#020 – Burn-line ratios (/16) scaffold (append-only)
  Charter: THE CODING PROCEDURE (v1.0-GOV)
  Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
  Notes:
    - Pure helpers to compute slice-of-16 from a lesson window.
    - No persistence; dev-only setters provided.
    - Optional visual pill beside the phase label: "Slice k/16".
========================================================= */

// In-memory lesson window (dev-settable, no storage)
let _lessonStartMs = null;          // Unix ms
let _lessonDurationMs = 45 * 60_000; // default 45min if not specified

/** Clamp helper. */
function _clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

/**
 * Configure the lesson window in-memory (no persistence).
 * @param {number} startMs    Unix ms timestamp for lesson start
 * @param {number} durationMs Duration in ms (e.g., 2700000 for 45min)
 */
export function setLessonWindow(startMs, durationMs) {
  if (Number.isFinite(startMs)) _lessonStartMs = Number(startMs);
  if (Number.isFinite(durationMs) && durationMs > 0) _lessonDurationMs = Number(durationMs);
  return getLessonWindow();
}

/** Read current in-memory lesson window. */
export function getLessonWindow() {
  return Object.freeze({
    startMs: _lessonStartMs,
    durationMs: _lessonDurationMs
  });
}

/**
 * Get fractional progress [0..1] for a given timestamp.
 * If start is unset, returns 0.
 * @param {number} ts Unix ms (default now)
 */
export function progressFor(ts = Date.now()) {
  if (!_lessonStartMs || !_lessonDurationMs) return 0;
  const elapsed = ts - _lessonStartMs;
  return _clamp(elapsed / _lessonDurationMs, 0, 1);
}

/**
 * Map a timestamp to a slice index 0..15 (16 equal parts).
 * If start is unset, returns 0.
 * @param {number} ts Unix ms (default now)
 */
export function sliceFor(ts = Date.now()) {
  const frac = progressFor(ts);
  // 0..15 buckets; 1.0 maps to 15
  return Math.min(15, Math.floor(frac * 16));
}

/** Human label for a slice index. */
export function labelForSlice(slice) {
  const k = _clamp(Number(slice)||0, 0, 15);
  return `${k}/16`;
}

/* ---------- Optional visual: add a Slice pill next to phase pill ---------- */

let _sliceBox = null;

/**
 * Mount/refresh a small "Slice k/16" pill into the burnline area.
 * Non-intrusive: placed after the existing .bl-pill phase label.
 * @param {string} selector - container; defaults to '.burnline'
 */
export function mountSlicePill(selector = '.burnline') {
  const host = document.querySelector(selector);
  if (!host) return false;

  // Ensure burnline label exists (no-op if already there)
  try { mountLabel(selector); } catch {}

  const box = host.querySelector('.bl');
  if (!box) return false;

  if (!_sliceBox || !box.contains(_sliceBox)) {
    _sliceBox = document.createElement('span');
    _sliceBox.className = 'bl-slice';
    box.appendChild(_sliceBox);
  }
  _sliceBox.textContent = `Slice ${labelForSlice(sliceFor())}`;
  return true;
}

/** Marker: /16 scaffold ready. */
export const slice16Ready = true;
/* =========================================================
  PC#021 – /16 → Phase Hint (read-only) (append-only)
  Charter: THE CODING PROCEDURE (v1.0-GOV) | Parent: VI-C1
  Notes:
    - Maps slice indices (0..15) to a suggested phase id ('1'..'7').
    - Purely advisory: does NOT call setPhase(); zero persistence.
    - Default map is EMPTY to avoid assumptions; configure via setSlicePhaseMap().
========================================================= */

/** In-memory advisory map: [{from:0,to:3,phase:'1'}, ...] */
let _slicePhaseMap = [];

/**
 * Configure the advisory slice→phase map (no persistence).
 * rules: Array<{from:number, to:number, phase:string|'1'..'7'}>
 * All bounds are clamped to [0,15]. Invalid entries are ignored.
 */
export function setSlicePhaseMap(rules = []) {
  const out = [];
  try {
    for (const r of (Array.isArray(rules) ? rules : [])) {
      const f = Math.max(0, Math.min(15, Number(r.from)));
      const t = Math.max(0, Math.min(15, Number(r.to)));
      const p = String(r.phase ?? '').trim();
      if (!PHASE_ORDER.includes(p)) continue;
      out.push({ from: Math.min(f,t), to: Math.max(f,t), phase: p });
    }
  } catch { /* no-op */ }
  _slicePhaseMap = out;
  refreshBurnlineHints(); // repaint if visible
  return _slicePhaseMap.slice();
}

/** Get the advisory phase id for a given slice (or null). */
export function phaseHintForSlice(k) {
  const s = Math.max(0, Math.min(15, Number(k)));
  for (const r of _slicePhaseMap) {
    if (s >= r.from && s <= r.to) return r.phase;
  }
  return null;
}

/** Human label for a phase id using PHASE_LABELS (fallback to "Phase X"). */
function _phaseLabel(id) {
  return PHASE_LABELS?.[id] ?? `Phase ${id}`;
}

/* ---------- Optional visual: "Hint: Phase X – Name" pill ---------- */
let _hintBox = null;

/**
 * Mount or refresh the Phase Hint pill after the existing slice pill.
 * Non-destructive; shows 'Hint: —' if no rule applies.
 */
export function mountPhaseHintPill(selector = '.burnline') {
  const host = document.querySelector(selector);
  if (!host) return false;
  try { mountLabel(selector); } catch {}
  const box = host.querySelector('.bl');
  if (!box) return false;

  if (!_hintBox || !box.contains(_hintBox)) {
    _hintBox = document.createElement('span');
    _hintBox.className = 'bl-hint';
    box.appendChild(_hintBox);
  }

  const k = sliceFor();
  const pid = phaseHintForSlice(k);
  _hintBox.textContent = pid ? `Hint: Phase ${pid} – ${_phaseLabel(pid)}` : 'Hint: —';
  return true;
}

/**
 * Convenience: refresh both Slice and Hint pills without side effects.
 */
export function refreshBurnlineHints(selector = '.burnline') {
  try { mountSlicePill(selector); } catch {}
  try { mountPhaseHintPill(selector); } catch {}
  return true;
}

/** Marker: phase hint advisory ready. */
export const phaseHintReady = true;
/* =========================================================
  PC#023 – Manual Phase Nudge controls (append-only)
  Charter: THE CODING PROCEDURE (v1.0-GOV) | Parent: VI-C1
  Notes:
    - Adds tiny ◀ / ▶ buttons beside the burn-line label.
    - Calls setPhase() manually; never auto-advances.
    - Disabled by default; enable via enablePhaseNudge(true).
========================================================= */

let _nudgeEnabled = false;
let _nudgeBox = null;

function _phaseIndexOf(id) { return PHASE_ORDER.indexOf(String(id)); }
function _nextPhase(id) {
  const i = _phaseIndexOf(id);
  return PHASE_ORDER[Math.min(PHASE_ORDER.length - 1, Math.max(0, i + 1))];
}
function _prevPhase(id) {
  const i = _phaseIndexOf(id);
  return PHASE_ORDER[Math.min(PHASE_ORDER.length - 1, Math.max(0, i - 1))];
}

/** Paint/refresh the ◀ ▶ controls beside the burn-line label. */
function _mountNudge(selector = '.burnline') {
  if (!_nudgeEnabled) return false;
  const host = document.querySelector(selector);
  if (!host) return false;
  try { mountLabel(selector); } catch {}
  const box = host.querySelector('.bl');
  if (!box) return false;

  if (!_nudgeBox || !box.contains(_nudgeBox)) {
    _nudgeBox = document.createElement('span');
    _nudgeBox.className = 'bl-nudge';
    _nudgeBox.innerHTML = `
      <button type="button" class="bl-nudge-btn" data-dir="prev" aria-label="Previous phase">◀</button>
      <button type="button" class="bl-nudge-btn" data-dir="next" aria-label="Next phase">▶</button>
    `;
    box.appendChild(_nudgeBox);

    _nudgeBox.addEventListener('click', (e) => {
      const btn = e.target.closest('.bl-nudge-btn');
      if (!btn) return;
      const dir = btn.getAttribute('data-dir');
      const cur = getCurrentPhase();
      const to = (dir === 'prev') ? _prevPhase(cur) : _nextPhase(cur);
      // Manual only; no persistence here
      try { setPhase(to, { persist: false }); } catch {}
      // Refresh pills to reflect any visual changes
      try { refreshBurnlineHints(selector); } catch {}
    });
  }
  return true;
}

/**
 * Enable/disable the phase nudge controls (manual only).
 * @returns {boolean} true if enabled after call
 */
export function enablePhaseNudge(flag = true, selector = '.burnline') {
  _nudgeEnabled = !!flag;
  if (!_nudgeEnabled) {
    if (_nudgeBox && _nudgeBox.parentNode) {
      try { _nudgeBox.parentNode.removeChild(_nudgeBox); } catch {}
    }
    _nudgeBox = null;
    return false;
  }
  _mountNudge(selector);
  return true;
}

/** Optional: repaint controls (e.g., after layout changes). */
export function repaintPhaseNudge(selector = '.burnline') {
  if (_nudgeEnabled) _mountNudge(selector);
  return _nudgeEnabled;
}

/** Marker: manual phase nudge ready. */
export const phaseNudgeReady = true;
