/* =========================================================
   VERSION INTEGRITY BLOCK – PC#055
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   Module: Phase → Canvas Wiring (Canonical Window Loader)
   Date: 2025-11-13
========================================================= */

import * as Events from './events.js';

(function initPhaseCanvasWiring() {


  // Resolve event bus canonically (boot → fallback)
  const BootEvents =
    window.__CE_BOOT?.modules?.Events ||      // ✅ primary bus (PC073 uses this)
    window.__CE_BOOT?.CE?.modules?.Events ||  // legacy CE namespace
    null;

  const Bus  = BootEvents || Events;
  const emit = (Bus && Bus.emit) || Events.emit;
  const on   = (Bus && Bus.on)   || Events.on;
  const E    = Bus?.EVENTS_V3 || Bus?.EVENTS_V2 || Bus?.EVENTS || {};


  // Canvas host
  const Canvas = window.__CE_CANVAS;
  if (!Canvas) {
    console.warn('[PC#055] Canvas host not found — aborting');
    return;
  }

  /* -------------------------------------------------------
      PHASE TITLES — Canon from Operational Routine v1.8
  ------------------------------------------------------- */
  const PHASE_TITLES = {
    1: 'Phase 1 — Welcome (Punctuality & Seating)',
    2: 'Phase 2 — Coin Flip Knockout',
    3: 'Phase 3 — STW (Spin That Wheel)',
    4: 'Phase 4 — Work (Engagement Phase)',
    5: 'Phase 5 — Game 1 (Rewards Phase)',
    6: 'Phase 6 — Game 2 (Competitive Risk Phase)',
    7: 'Phase 7 — Purchases (End Segment)'
  };

  /* -------------------------------------------------------
      PHASE STUB WINDOWS — Placeholder content
      (no game logic in this module per canon)
  ------------------------------------------------------- */
  const PHASE_STUBS = {
    1: '<p>Punctuality check & seating. Ready up.</p>',
    2: '<p>Coin Flip Knockout: winner + choose STW-S/L.</p>',
    3: '<p>STW shell — student pick & Q/A (dashboard-awarded).</p>',
    4: '<p>Engagement phase — batch awards every 3 minutes.</p>',
    5: '<p>Game 1 (rewards) — light skill/joy round.</p>',
    6: '<p>Game 2 (competitive risk) — staked tokens, skill-based.</p>',
    7: '<p>Purchases — 120s fixed marketplace.</p>'
  };

  let currentPhase = null;

  function normalizePhase(v) {
    const s = String(v ?? '').trim();
    const n = Number(s);
    if (Number.isFinite(n) && n >= 1 && n <= 7) return n;
    if (['1','2','3','4','5','6','7'].includes(s)) return Number(s);
    return 0;
  }

    function openPhase(phaseNum) {
    if (!phaseNum) return;

    // Close previous phase window EXCEPT Phase 1 (persistent Seating)
    if (currentPhase && currentPhase !== 1) {
      Canvas.close(`phase-${currentPhase}`);
    }

    const title = PHASE_TITLES[phaseNum] || `Phase ${phaseNum}`;

    // --------------------------------------------------
    // Phase 1 — Persistent Seating Window
    // --------------------------------------------------
    if (phaseNum === 1) {
      // Phase 1 now owned by Base Layer (PC076)
      currentPhase = 1;
      return;
    }

    // --------------------------------------------------
    // All other phases (unchanged)
    // --------------------------------------------------
    const content = PHASE_STUBS[phaseNum] || `<p>Phase ${phaseNum} stub window.</p>`;

    Canvas.open({
      id: `phase-${phaseNum}`,
      title,
      content
    });

    currentPhase = phaseNum;
  }


    /* -------------------------------------------------------
      CANONICAL EVENT: LESSON_PHASE_CHANGE
      (with legacy alias support)
  ------------------------------------------------------- */

  const PHASE_CHANGE_EVENTS = [
  E?.LESSON_PHASE_CHANGE,
  'lesson:phaseChange',
  'phaseChange',
  'burnline:phaseChanged' // ✅ REQUIRED — emitted by PC073
];


    PHASE_CHANGE_EVENTS.forEach(evt => {
  if (!evt) return;

  Bus.on(evt, payload => {
    const raw = payload?.to ?? payload?.phase ?? payload;
    const next = normalizePhase(raw);

    if (next) {
      console.log(`[PC#055] Switching canvas to phase ${next}`);
      openPhase(next);
    
     // Forward phase change to Base Layer system (PC076)
     if (window.BaseLayerController?.onPhaseChange) {
      window.BaseLayerController.onPhaseChange(next);
     }
    
    }
  });
});


})();

