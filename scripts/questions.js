/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0 (Canon Aligned)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#017 – Question Source Shell
   Notes:
     - Placeholder offline question bank
     - Canon difficulty range: 1–3
========================================================= */

const BANK = Object.freeze({
  1: [
    "Level 1: Name two prime numbers under 10.",
    "Level 1: Spell the word ‘ecosystem’.",
    "Level 1: What shape has 4 equal sides?"
  ],
  2: [
    "Level 2: Simplify 18/24 to lowest terms.",
    "Level 2: Define ‘photosynthesis’ in one sentence.",
    "Level 2: Which continent is the Nile primarily on?"
  ],
  3: [
    "Level 3: Solve 3x + 7 = 22.",
    "Level 3: Contrast weather vs. climate in one sentence.",
    "Level 3: Explain the purpose of a thesis statement."
  ]
});

/* ---------------------------------------------------------
   Clamp difficulty to canonical range (1–3)
--------------------------------------------------------- */
function clampDifficulty(d) {
  const n = Number(d);
  if (n === 1 || n === 2 || n === 3) return n;
  return 1;  // canon fallback
}

/* ---------------------------------------------------------
   Public API
--------------------------------------------------------- */

/**
 * Return a placeholder question for a given difficulty (1/2/3).
 * Difficulty is clamped canonically.
 */
export function getQuestion(difficulty) {
  const d = clampDifficulty(difficulty);
  const list = BANK[d];
  const idx = Math.floor(Math.random() * list.length);
  return String(list[idx] || "Question unavailable.");
}

/** 
 * Return entire bank (for dev tools / previews)
 * Read-only: BANK is already frozen.
 */
export function getBank() {
  return BANK;
}

export const questionsReady = true;
