/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#042 – Teacher Controls (host only)
   Generated: 2025-11-13 (AEST)
========================================================= */

import * as Events from './events.js';
import { EVENTS } from './events.js';

/* ---------------------------------------------------------
   Canonical Event Bus Resolution
--------------------------------------------------------- */
const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const emit = Bus.emit || Events.emit;
const on   = Bus.on   || Events.on;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || EVENTS;

const WIN_ID = 'teacher-controls';
let _root, _panel, _btn;

function ensureStyle() {
  if (document.getElementById('tc-style')) return;
  const s = document.createElement('style');
  s.id = 'tc-style';
  s.textContent = `
    .tc-btn {
      appearance:none; border:0; padding:8px 12px; border-radius:10px;
      font: 600 14px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;
      background:#1a2230; color:#e8eef2; cursor:pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,.2);
    }
    .tc-root { position:fixed; inset:0; display:none; align-items:center; justify-content:center; z-index:9500; }
    .tc-root.on { display:flex; }
    .tc-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.45); }
    .tc-panel {
      position:relative; width:min(92vw,720px); max-height:82vh; overflow:auto;
      background:#11151a; color:#e8eef2; border-radius:14px; padding:16px;
      box-shadow: 0 10px 40px rgba(0,0,0,.5);
      font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;
    }
    .tc-h { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
    .tc-close { background:transparent; border:0; color:#e8eef2; font-size:18px; cursor:pointer; }
    .tc-sec { padding:10px; border:1px solid #2a3542; border-radius:10px; margin:8px 0; }
    .mono { font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; opacity:.8; }
  `;
  document.head.appendChild(s);
}

function ensureDom() {
  if (_root && _panel) return true;
  _root = document.querySelector('.tc-root');
  if (!_root) {
    _root = document.createElement('div');
    _root.className = 'tc-root';
    _root.innerHTML = `
      <div class="tc-backdrop" role="presentation"></div>
      <div class="tc-panel" role="dialog" aria-modal="true" aria-label="Teacher Controls">
        <div class="tc-h">
          <strong>Teacher Controls (stub)</strong>
          <button class="tc-close" aria-label="Close">×</button>
        </div>
        <div class="tc-sec">This is the host only. No behaviour yet.</div>
        <div class="tc-sec mono">Emits <code>ui:openWindow</code> and <code>ui:closeWindow</code> for observability.</div>
      </div>
    `;
    document.body.appendChild(_root);
    _panel = _root.querySelector('.tc-panel');
    _root.querySelector('.tc-backdrop')?.addEventListener('click', close);
    _root.querySelector('.tc-close')?.addEventListener('click', close);
  }
  return true;
}

function mountButton() {
  const host = document.getElementById('controls-topright');
  if (!host || _btn) return;
  _btn = document.createElement('button');
  _btn.className = 'tc-btn';
  _btn.type = 'button';
  _btn.textContent = 'Teacher';
  _btn.addEventListener('click', toggle);
  host.appendChild(_btn);
}

export function open() {
  ensureStyle(); ensureDom();
  _root.classList.add('on');
  try {
    emit(E.UI_OPEN_WINDOW || 'ui:openWindow', { id: WIN_ID, ts: Date.now() });
  } catch {}
  _panel?.querySelector('.tc-close')?.focus();
  return true;
}

export function close() {
  if (!_root) return true;
  _root.classList.remove('on');
  try {
    emit(E.UI_CLOSE_WINDOW || 'ui:closeWindow', { id: WIN_ID, ts: Date.now() });
  } catch {}
  return true;
}

export function toggle() {
  if (!_root || !_root.classList.contains('on')) return open();
  return close();
}

// Wait for anchor mount if loaded async
function waitForHostAndMount(){
  const attempt = () => {
    const host = document.getElementById('controls-topright');
    if (host) {
      try { ensureStyle(); ensureDom(); mountButton(); } catch {}
    } else {
      setTimeout(attempt, 100);
    }
  };
  attempt();
}

// PC#042 disabled (MVP)
// Teacher Controls host/button will not auto-mount.
// Re-enable by restoring the boot() IIFE below.
// (function boot(){
//   try {
//     ensureStyle();
//     ensureDom();
//     mountButton();
//     waitForHostAndMount();
//   } catch(e){ /* non-blocking */ }
// })();

// Dev handle
window.__CE_TC = Object.freeze({ open, close, toggle, id: WIN_ID });
