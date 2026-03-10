/* =========================================================
   VERSION INTEGRITY BLOCK – VI-D3 (Canon Aligned)
   Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
   Coding Charter v1.0-GOV | Build Range PC#027–PC#033
   Generated: 2025-11-13 (AEST)
   Notes:
     - Visual + nonvisual wheel API
     - Emits winnerSelected via canonical event bus
========================================================= */

import * as Events from './events.js';
import { EVENTS, EVENTS_V2 } from './events.js';

/* ---------------------------------------------------------
   Canonical Event Bus Resolution (required)
--------------------------------------------------------- */
const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const emit = Bus.emit || Events.emit;
const on   = Bus.on   || Events.on;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || EVENTS;

/* =========================================================
  PC#030 – spin(roster) (nonvisual)
========================================================= */

/**
 * Spin placeholder: choose a winner from a roster snapshot.
 * @param {{id:string,name:string,active?:boolean}[]} roster
 * @returns {{id:string,name:string}|null}
 */
export function spin(roster = []) {
  try {
    const list = Array.isArray(roster)
      ? roster.filter(s => s && (s.active !== false))
      : [];
    if (!list.length) return null;

    const winner = list[0];

    // Canon emit
    try {
      emit(
        E.STW_WINNER_SELECTED || 'stw:winnerSelected',
        {
          studentId: winner.id,
          name: winner.name,
          ts: Date.now()
        }
      );
    } catch {}

    return { id: winner.id, name: winner.name };

  } catch {
    return null;
  }
}

/* =========================================================
  PC#034 – Visual wheel API (append-only)
========================================================= */

let _host = null;
let _roster = [];
let _svg = null;
let _angle = 0;
const _MAX = 12;

function _fit(list = []) {
  return (Array.isArray(list) ? list : [])
    .filter(s => s && s.active !== false)
    .slice(0, _MAX);
}

function _deg(rad) { return rad * (180 / Math.PI); }

function _render() {
  if (!_host) return;
  const N = Math.max(1, _roster.length);
  const r = 110, cx = 120, cy = 120;

  const parts = [`<svg viewBox="0 0 240 240" class="stw2-wheel-svg">`];
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * 2 * Math.PI;
    const a1 = ((i + 1) / N) * 2 * Math.PI;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const largeArc = ((a1 - a0) > Math.PI) ? 1 : 0;
    const fill = i % 2 ? '#1a2230' : '#17202a';
    parts.push(`<path d="M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z" fill="${fill}" stroke="#2a3542"/>`);

    const mid = (a0 + a1) / 2;
    const rx = cx + (r - 28) * Math.cos(mid);
    const ry = cy + (r - 28) * Math.sin(mid);
    const label = (_roster[i]?.name || _roster[i]?.id || '').replace(/</g, '&lt;');
    parts.push(`<text x="${rx}" y="${ry}" text-anchor="middle" dominant-baseline="middle" class="stw2-wheel-label">${label}</text>`);
  }
  parts.push(`</svg><div class="stw2-pointer">▲</div>`);
  _host.innerHTML = parts.join('');
  _svg = _host.querySelector('.stw2-wheel-svg');
  _host.style.transform = `rotate(${_angle}deg)`;
}

export function mount(host, roster = []) {
  try {
    _host = host || null;
    _roster = _fit(roster);
    if (_host) {
      _host.classList.add('stw2-wheel');
      _render();
      return true;
    }
    return false;
  } catch { return false; }
}

export function setRoster(list = []) {
  _roster = _fit(list);
  if (_host) _render();
  return _roster.length;
}

export function unmount() {
  try { if (_host) _host.innerHTML = ''; } catch {}
  _host = null; _svg = null; _roster = []; _angle = 0;
  return true;
}

/**
 * Spin with easing; on stop emits stw:winnerSelected (canon).
 */
export function spinVisual() {
  if (!_host || !_roster.length) return false;
  const N = _roster.length;
  const winnerIdx = Math.floor(Math.random() * N);

  const targetDeg = 360 * 5 + (360 * (winnerIdx + 0.5) / N);
  const start = performance.now();
  const dur = 3000;

  function step(t) {
    const p = Math.min(1, (t - start) / dur);
    const ease = 1 - Math.pow(1 - p, 3);
    _angle = ease * targetDeg;
    _host.style.transform = `rotate(${_angle}deg)`;
    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      const w = _roster[winnerIdx];
      try {
        emit(
          E.STW_WINNER_SELECTED || 'stw:winnerSelected',
          { studentId: w.id, name: w.name || '', ts: Date.now() }
        );
      } catch {}
    }
  }

  requestAnimationFrame(step);
  return true;
}
