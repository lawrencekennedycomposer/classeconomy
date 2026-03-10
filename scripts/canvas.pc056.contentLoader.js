/* =========================================================
   VERSION INTEGRITY BLOCK – PC#056
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   Module: Phase Content Loader (registry-driven)
   Date: 2025-11-13
========================================================= */

import * as Events from './events.js';

(() => {

  /* -------------------------------------------------------
     Singleton guard (prevents duplicate listeners)
  ------------------------------------------------------- */
  if (window.__CE_PC056_ACTIVE) {
    console.log('[PC#056] already active — skip');
    return;
  }
  window.__CE_PC056_ACTIVE = true;

  /* -------------------------------------------------------
     Canonical Event Bus Resolution
     (same pattern as PC#054 + PC#055)
  ------------------------------------------------------- */
  const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
  const on   = Bus.on   || Events.on;
  const emit = Bus.emit || Events.emit;
  const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || Bus.EVENTS || {};

  /* -------------------------------------------------------
     DOM helper
  ------------------------------------------------------- */
  const bySel = (root, sel) => {
    try { return root.querySelector(sel); }
    catch { return null; }
  };

  /* -------------------------------------------------------
     Component Registry (phase stubs)
     No logic — per canon, only placeholders.
  ------------------------------------------------------- */
  const Registry = {
    1: (mount) => {
      mount.innerHTML = `
        <div class="p56-card">
          <p class="p56-lead">Punctuality check & seating. Ready up.</p>
          <button class="p56-btn" data-act="ready">Mark class ready</button>
        </div>
      `;
    },
    2: (mount) => {
      mount.innerHTML = `
        <div class="p56-card">
          <p class="p56-lead">Coin Flip Knockout</p>
          <button class="p56-btn" data-act="coin">Open Coin Flip (stub)</button>
        </div>
      `;
    },
    3: (mount) => {
      mount.innerHTML = `
        <div class="p56-card">
          <p class="p56-lead">STW (Spin That Wheel)</p>
          <button class="p56-btn" data-act="stw">Open STW (stub)</button>
        </div>
      `;
    },
    4: (mount) => {
      mount.innerHTML = `
        <div class="p56-card">
          <p class="p56-lead">Work Mode — engagement phase</p>
          <small>Batch awards every ~3 minutes (to be wired later).</small>
        </div>
      `;
    },
    5: (mount) => {
      mount.innerHTML = `
        <div class="p56-card"><p class="p56-lead">Game 1 (rewards) — stub</p></div>
      `;
    },
    6: (mount) => {
      mount.innerHTML = `
        <div class="p56-card"><p class="p56-lead">Game 2 (competitive risk) — stub</p></div>
      `;
    },
    7: (mount) => {
      mount.innerHTML = `
        <div class="p56-card"><p class="p56-lead">Purchases — 120s marketplace (stub)</p></div>
      `;
    }
  };

  /* -------------------------------------------------------
     Stub button wiring
  ------------------------------------------------------- */
  function wireButtons(container, phase) {
    const btn = bySel(container, '.p56-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      console.log('[PC#056] clicked stub action:', btn.dataset.act, 'phase=', phase);
      // Real modules will mount in PCs ~070+
    });
  }

  /* -------------------------------------------------------
     Main Loader (canonical)
     Replaces contents of .canvas-body based on phase ID.
     Uses Registry stubs for now — real modules mount later.
  ------------------------------------------------------- */

  function loadPhaseContent(phase) {
    try {
      const mount = document.querySelector('.canvas-body');
      if (!mount) {
        console.warn('[PC#056] .canvas-body not found');
        return;
      }

      mount.innerHTML = '';

      const builder = Registry[phase];
      if (builder) {
        builder(mount);
        wireButtons(mount, phase);
        console.log(`[PC#056] Phase ${phase} content mounted`);
      } else {
        mount.innerHTML = `<p class="p56-lead">[PC#056] No registry entry for phase ${phase}</p>`;
      }
    } catch (err) {
      console.error('[PC#056] loadPhaseContent error:', err);
    }
  }

  /* -------------------------------------------------------
     EVENT HOOK — LESSON_PHASE_CHANGE
     Mirrors PC055 behaviour (normalized phases)
  ------------------------------------------------------- */
  const PHASE_EVENTS = [
    E.LESSON_PHASE_CHANGE,
    'lesson:phaseChange',
    'phaseChange'
  ];

  PHASE_EVENTS.forEach(evt => {
    if (!evt) return;
    on(evt, ({ to }) => {
      if (!to) return;
      loadPhaseContent(to);
    });
  });

  console.log('[PC#056] Content Loader active');

})();
