/* =========================================================
   VERSION INTEGRITY BLOCK – VI-DASH-6
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   Status: Canvas Host + Phase Windows + Content Loader online
   Scope: PC#054–PC#056 confirmed, zero console errors
   Date: 2025-11-13
========================================================= */
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
   SHA-256: [014f8b7e7bbd76ce350f624d119fe7cdd2650aa4fc3142b0158f8bc404db3f33]
========================================================= */
/* =========================================================
   VERSION INTEGRITY BLOCK – VI-B1
   Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
   Coding Charter v1.0-GOV | Build Range PC#011–PC#015
   Generated: 2025-11-09 (AEST)
   SHA-256: [dfbbd7c43821dc043499ce89cad1709a29d5508be3134eac0188ceb43187f1d6]
========================================================= */
/*-- =========================================================
  VERSION INTEGRITY BLOCK – VI-A1
  Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
  Coding Charter v1.0-GOV | Build Range PC#001–PC#010
  Generated: 2025-11-09 (AEST)
  SHA-256: [9eba2f2d6a47da1f8e4edfc0172bb52e59e85cfbb5d9478f905b4c239062265d]
========================================================= */
/* =========================================================
  Version Integrity Block – events.js
  Charter: THE CODING PROCEDURE (v1.0-GOV)
  Operational Routine: v1.8 Final + Errata v1.8-E1
  PC Range: PC#001
  Notes: Event bus shell + canonical event map (append-only).
========================================================= */

const bus = document.createElement('div');

export const on   = (type, fn) => bus.addEventListener(type, fn);
export const off  = (type, fn) => bus.removeEventListener(type, fn);
export const emit = (type, detail) =>
  bus.dispatchEvent(new CustomEvent(type, { detail }));

export const ready = true;

/* =========================================================
  PC#004 – Event contracts (constants + typedefs, append-only)
  Notes:
    - Declares event names and payload shapes for clarity.
    - No listeners/emitters added beyond the existing bus.
    - Payloads are intentionally minimal to avoid schema lock-in.
========================================================= */

/**
 * Canonical event names (stable identifiers).
 * These strings are part of the public surface; avoid renaming.
 * Legacy aliases are provided where needed.
 */
export const EVENTS = Object.freeze({
  // Lesson lifecycle & phases (canon)
  LESSON_PHASE_CHANGE:  'lesson:phaseChange',   // payload: PhaseChangedPayload
  // Legacy alias (pre-canon); both resolve to the same string
  LESSON_PHASE_CHANGED: 'lesson:phaseChange',

  LESSON_START:  'lesson:start',   // payload: LessonStartPayload (future)
  LESSON_PAUSE:  'lesson:pause',   // payload: {}
  LESSON_RESUME: 'lesson:resume',  // payload: {}

  // STW (Spin That Wheel)
  STW_AWARD:             'stw:award',            // payload: STWAwardPayload
  STW_QUESTION_REPLACED: 'stw:questionReplaced', // payload: STWQuestionReplacedPayload (Errata E1)

  // Scores / dashboard
  SCORES_UPDATED:           'scores:updated',            // payload: ScoresUpdatedPayload
  DASHBOARD_AWARD_APPLIED:  'dashboard:award:applied',

  // History + hydration
  HISTORY_UNDO:        'history:undo',
  HISTORY_REDO:        'history:redo',
  HYDRATION_COMPLETE:  'hydration:complete',

  // Storage / resilience (read-only signals; no writes in PC#004)
  STORAGE_CORRUPT:     'storage:corrupt',        // payload: StorageCorruptPayload
});

/* ------------------------------------------------------------------------- */
/*                                Typedefs                                   */
/* ------------------------------------------------------------------------- */

/**
 * @typedef {Object} PhaseChangedPayload
 * @property {'1'|'2'|'3'|'4'|'5'|'6'|'7'|string} from  - Previous phase id
 * @property {'1'|'2'|'3'|'4'|'5'|'6'|'7'|string} to    - Next phase id
 * @property {number} ts                                 - Unix ms timestamp
 *
 * Note: Per Errata v1.8-E1, the global timer & burn-line initiate at start of Phase 3 (STW).
 */

/**
 * @typedef {Object} STWAwardPayload
 * @property {string} studentId        - Stable roster id
 * @property {number} points           - Award magnitude (+1 typical)
 * @property {1|2|3|number} difficulty - Difficulty selected
 * @property {number} ts               - Unix ms timestamp
 *
 * Award writes are performed by the dashboard owner later; this event is a signal only.
 */

/**
 * @typedef {Object} STWQuestionReplacedPayload
 * @property {1|2|3|number} difficulty - Difficulty for the replacement question
 * @property {string} [reason]         - Optional brief reason (e.g., 'unfair')
 * @property {number} ts               - Unix ms timestamp
 *
 * Clarified by Errata v1.8-E1: Wheel does NOT re-spin; only the question content is replaced.
 */

/**
 * @typedef {Object} ScoresUpdatedPayload
 * @property {any} byIdSnapshot        - Opaque snapshot of current scores map
 * @property {number} ts               - Unix ms timestamp
 */

/**
 * @typedef {Object} StorageCorruptPayload
 * @property {string} key              - The storage key that failed to parse/validate
 * @property {string} mode             - 'read' | 'write' | 'migrate'
 * @property {string} [detail]         - Optional additional context
 * @property {number} ts               - Unix ms timestamp
 */

/* =========================================================
  PC#014 + PC#016 – Normalized EVENTS_V2 (HF-004)
  Includes both LESSON_WORK_TICK and STW_PROMPT_EXPIRED
========================================================= */

/**
 * V2 event map (non-breaking): extends EVENTS with Work tick and
 * STW prompt expiry while preserving all canon from EVENTS.
 */
export const EVENTS_V2 = Object.freeze({
  ...EVENTS,
  LESSON_WORK_TICK:   'lesson:workTick',    // payload: WorkTickPayload
  STW_PROMPT_EXPIRED: 'stw:promptExpired',  // payload: STWPromptExpiredPayload
});

/**
 * @typedef {Object} WorkTickPayload
 * @property {number} ts     - Unix ms timestamp
 * @property {string} [note] - Optional developer note
 * @property {string} [phase]- Optional phase id, e.g. '4'
 */

/**
 * @typedef {Object} STWPromptExpiredPayload
 * @property {number} ts           - Unix ms timestamp when countdown hit zero
 * @property {1|2|3|number|null} difficulty - Last visually selected difficulty (if any)
 * @property {number} durationMs   - Countdown duration in milliseconds (default 10000)
 */

/* =========================================================
  PC#034 – Lesson end events (append-only, canon-aligned)
  Notes:
    - Canon event string is 'lesson:end'.
    - LESSON_ENDED kept as alias for backwards compatibility.
========================================================= */

export const EVENTS_V3 = Object.freeze({
  ...EVENTS_V2,
  LESSON_END:   'lesson:end', // payload: { snapshot:any, ts:number }
  LESSON_ENDED: 'lesson:end', // legacy alias; same canonical string
});

/* =========================================================
   PC#052 — Burn-line Events (append-only, canon-aligned)
   Notes:
     These events define the burn-line timing engine
     (PC064–PC072) and must exist in the event bus to allow
     PC071 and PC072 to communicate.
========================================================= */
export const BURNLINE_EVENTS = Object.freeze({
  BURNLINE_INIT           : 'burnline:init',
  BURNLINE_START          : 'burnline:start',
  BURNLINE_TICK           : 'burnline:tick',
  BURNLINE_PAUSE          : 'burnline:pause',
  BURNLINE_RESUME         : 'burnline:resume',
  BURNLINE_BOOTCONFIGURED : 'burnline:bootConfigured'
});

/* =========================================================
   PATCH: Add default export for backwards compatibility
   Allows: import Events from './events.js';
   ========================================================= */
export default {
  on,
  off,
  emit,
  ready,
  EVENTS,
  EVENTS_V2,
  EVENTS_V3,
  BURNLINE_EVENTS
};
