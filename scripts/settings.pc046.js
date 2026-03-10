/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0 (Canon Aligned)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#046 – Settings Stub (build metadata + dev toggles)
   Notes:
     - Canonical Event Bus resolution added
     - Toggles now emit canon-safe events (with fallback)
     - No functional changes
========================================================= */

import * as Events from './events.js';

/* ---------------------------------------------------------
   Canonical Event Bus Resolution
--------------------------------------------------------- */
const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const emit = Bus.emit || Events.emit;
const on   = Bus.on   || Events.on;

const WIN_ID = 'settings';
let _root, _panel, _btn;

/* ---------------------------------------------------------
   Styles
--------------------------------------------------------- */
function ensureStyle() {
  if (document.getElementById('settings-style-046')) return;
  const s = document.createElement('style');
  s.id = 'settings-style-046';
  s.textContent = `
    .set-btn {
      appearance:none; border:0; padding:8px 12px; border-radius:10px;
      font:600 14px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;
      background:#1a2230; color:#e8eef2; cursor:pointer;
      box-shadow:0 2px 10px rgba(0,0,0,.2);
    }
    .set-root { position:fixed; inset:0; display:none; align-items:center; justify-content:center; z-index:9505; }
    .set-root.on { display:flex; }
    .set-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.45); }
    .set-panel {
      position:relative; width:min(92vw,720px); max-height:82vh; overflow:auto;
      background:#11151a; color:#e8eef2; border-radius:14px; padding:16px;
      box-shadow:0 10px 40px rgba(0,0,0,.5);
      font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;
    }
    .set-h { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
    .set-close { background:transparent; border:0; color:#e8eef2; font-size:18px; cursor:pointer; }
    .set-sec { padding:10px; border:1px solid #2a3542; border-radius:10px; margin:8px 0; }
    .mono { font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; opacity:.85; }
    .kv { display:grid; grid-template-columns: 180px 1fr; gap:6px 12px; }
    .kv div.key { opacity:.75; }
    .toggle { display:flex; align-items:center; gap:8px; margin:6px 0; }
    .toggle input { width:18px; height:18px; }
  `;
  document.head.appendChild(s);
}

/* ---------------------------------------------------------
   DOM
--------------------------------------------------------- */
function ensureDom() {
  if (_root && _panel) return true;
  _root = document.querySelector('.set-root');
  if (!_root) {
    _root = document.createElement('div');
    _root.className = 'set-root';
    _root.innerHTML = `
      <div class="set-backdrop" role="presentation"></div>
      <div class="set-panel" role="dialog" aria-modal="true" aria-label="Settings">
        <div class="set-h">
          <strong>Settings</strong>
          <button class="set-close" aria-label="Close">×</button>
        </div>

        <section class="set-sec">
          <strong>Build Info</strong>
          <div class="kv mono" id="set-kv"></div>
        </section>

        <section class="set-sec">
          <strong>Dev Toggles (UI only)</strong>
          <label class="toggle"><input type="checkbox" data-tog="dev-helpers"> Enable Dev Helpers</label>
          <label class="toggle"><input type="checkbox" data-tog="verbose-logs"> Verbose Logs</label>
          <label class="toggle"><input type="checkbox" data-tog="dark-mode"> Dark Mode</label>
          <div class="mono" style="margin-top:6px;opacity:.7">Toggles emit <code>ui:settings:toggle</code>.</div>
        </section>
      </div>
    `;
    document.body.appendChild(_root);

    _panel = _root.querySelector('.set-panel');
    _root.querySelector('.set-backdrop')?.addEventListener('click', close);
    _root.querySelector('.set-close')?.addEventListener('click', close);
  }
  return true;
}

/* ---------------------------------------------------------
   Settings button (top-right)
--------------------------------------------------------- */
function mountButton() {
  const host = document.getElementById('controls-topright');
  if (!host || _btn) return;
  _btn = document.createElement('button');
  _btn.className = 'set-btn';
  _btn.type = 'button';
  _btn.textContent = 'Settings';
  _btn.addEventListener('click', toggle);
  host.appendChild(_btn);
}

/* ---------------------------------------------------------
   Build Info
--------------------------------------------------------- */
function kv(pairList) {
  const kvEl = _panel?.querySelector('#set-kv');
  if (!kvEl) return;
  kvEl.innerHTML = pairList
    .map(([k, v]) => `<div class="key">${k}</div><div>${v}</div>`)
    .join('');
}

function buildInfoPairs() {
  const boot  = window.__CE_BOOT || {};
  const ready = boot.ready || {};
  const ua    = navigator.userAgent;
  const ver   = (document.title.match(/v[\w\-\.]+/) || [null])[0] || 'n/a';
  const loc   = location.href;
  const now   = new Date().toISOString();

  const sKeys = ['ce:scores:v1','ce:phase:v1','ce:snapshots:v1']
    .map(k => [k, localStorage.getItem(k) ? 'yes' : '—']);

  return [
    ['Generated', now],
    ['Document Title', document.title || 'n/a'],
    ['App Version', ver],
    ['Modules Ready', JSON.stringify(ready)],
    ['User Agent', ua],
    ['Location', loc],
    ...sKeys.map(([k,v]) => [`Storage • ${k}`, v]),
  ];
}

/* ---------------------------------------------------------
   Toggle event wiring (canon-safe)
--------------------------------------------------------- */
function wireToggles() {
  _panel?.addEventListener('change', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement)) return;
    const key = el.getAttribute('data-tog');
    if (!key) return;
    try {
      emit(
        Bus.EVENTS_V3?.UI_SETTINGS_TOGGLE ||
        Bus.EVENTS_V2?.UI_SETTINGS_TOGGLE ||
        'ui:settings:toggle',
        { key, value: !!el.checked, ts: Date.now() }
      );
    } catch {}
  });
}

/* ---------------------------------------------------------
   Public Controls
--------------------------------------------------------- */
export function open() {
  ensureStyle(); ensureDom();
  kv(buildInfoPairs());
  _root.classList.add('on');
  try {
    emit(Bus.EVENTS_V3?.UI_OPEN_WINDOW || 'ui:openWindow', { id: WIN_ID, ts: Date.now() });
  } catch {}
  _panel?.querySelector('.set-close')?.focus();
  return true;
}

export function close() {
  if (!_root) return true;
  _root.classList.remove('on');
  try {
    emit(Bus.EVENTS_V3?.UI_CLOSE_WINDOW || 'ui:closeWindow', { id: WIN_ID, ts: Date.now() });
  } catch {}
  return true;
}

export function toggle() {
  return (!_root || !_root.classList.contains('on')) ? open() : close();
}

/* ---------------------------------------------------------
   Boot
--------------------------------------------------------- */
(function boot(){
  try {
