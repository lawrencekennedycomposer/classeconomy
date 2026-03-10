/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#052 – Burn-line Visual Sync (phase highlight + re-render)
   Generated: 2025-11-12 (AEST)
   Notes:
     - Pure visual sync (no timers or /16 formula yet).
     - Responds to phase changes, undo/redo, hydration.
     - Uses CSS vars for colouring; safe additive pass.
     - Event naming aligned to canon (lesson:phaseChange, history:undo/redo).
========================================================= */

import * as Events from './events.js';
import * as Dashboard from './dashboard.js';

let _root = null;
let _current = null;

/* =========================================================
   PC052 Neutralisation Guard (Append-Only)
   Purpose:
     - Disable PC052 rendering when PC066 is active.
     - Prevent overwrite of #burnline UI.
     - Canon: PC066 (PC064–PC072 pipeline) is the modern owner.
   ========================================================= */

let _pc052Disabled = false;

// Detect if PC066 is present (loaded through PC072)
try {
  if (window.__CE_BOOT?.modules?.BurnlineVisual) {
    _pc052Disabled = true;
    console.log('[PC052] Neutralised: PC066 detected — skipping legacy rendering.');
  }
} catch(e) {
  /* no-op: safe fallback */
}

function ensureStyle() {
  if (document.getElementById('burnline-style-052')) return;
  const s = document.createElement('style');
  s.id = 'burnline-style-052';
  s.textContent = `
    #burnline {
      display:flex; align-items:center; justify-content:space-between;
      padding:8px 10px; background:var(--panel,#11151a); border-top:1px solid #2a3542;
      font:600 13px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;
      user-select:none; min-height:38px;
    }
    .burn-seg {
      flex:1; text-align:center; padding:4px 0; border-left:1px solid #2a3542;
      opacity:.6; transition:opacity .2s ease, background .2s ease;
    }
    .burn-seg:first-child { border-left:0; }
    .burn-seg.active {
      opacity:1; background:var(--accent,#4aa3ff); color:#fff;
    }
  `;
  document.head.appendChild(s);
}

function getAnchor() {
  return document.getElementById('burnline');
}

function mount() {

if (_pc052Disabled) return true;  // ← prevents legacy rendering

  _root = getAnchor();
  if (!_root) return false;
  ensureStyle();
  renderStatic();
  wire();
  console.log('[PC#052] Burn-line visual sync mounted');
  return true;
}

function renderStatic() {
  if (!_root) return;
  const phases = ['1','2','3','4','5','6','7'];
  let html = '';
  for (const p of phases) {
    html += '<div class="burn-seg" data-phase="' + p + '">Phase ' + p + '</div>';
  }
  _root.innerHTML = html;
  updateHighlight(Dashboard.session?.phase ?? 1);
}

function updateHighlight(phase) {
  if (!_root) return;
  _current = String(phase ?? 1);
  const segs = _root.querySelectorAll('.burn-seg');
  segs.forEach(el => {
    el.classList.toggle('active', el.dataset.phase === _current);
  });
}

function handlePhaseChange(e) {
  const next = e?.detail?.to ?? e?.detail?.phase ?? e?.detail;
  if (next != null) updateHighlight(next);
}

function wire() {
  const Ev = Events.EVENTS || {};

  // Canonical event names:
  // - lesson:phaseChange
  // - history:undo
  // - history:redo
  // Hydration remains an internal lifecycle event.
  const phaseEvt   = Ev.LESSON_PHASE_CHANGE || 'lesson:phaseChange';
  const undoEvt    = Ev.HISTORY_UNDO || 'history:undo';
  const redoEvt    = Ev.HISTORY_REDO || 'history:redo';
  const hydrateEvt = Ev.HYDRATION_COMPLETE || 'hydration:complete';

  Events.on(phaseEvt, handlePhaseChange);
  Events.on(undoEvt, () => updateHighlight(Dashboard.session?.phase));
  Events.on(redoEvt, () => updateHighlight(Dashboard.session?.phase));
  Events.on(hydrateEvt, () => updateHighlight(Dashboard.session?.phase));
}

window.__CE_BURN = Object.freeze({ mount, updateHighlight });
