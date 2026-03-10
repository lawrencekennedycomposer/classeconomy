/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0 (Canon Aligned)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#044 – Teacher Controls signals (UI events only)
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

function ensureStyle() {
  if (document.getElementById('tc-style-044')) return;
  const s = document.createElement('style');
  s.id = 'tc-style-044';
  s.textContent = `
    .tc-row { display:flex; gap:8px; flex-wrap:wrap; margin:8px 0; }
    .tc-btn2 {
      appearance:none; border:1px solid #2a3542; background:#141a21; color:#e8eef2;
      padding:8px 12px; border-radius:10px; cursor:pointer;
      font:600 13px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;
    }
  `;
  document.head.appendChild(s);
}

function panel() {
  return document.querySelector('.tc-panel');
}

function section(id) {
  return document.querySelector(`.tc-section[data-id="${id}"]`);
}

function addRow(sec, html) {
  const row = document.createElement('div');
  row.className = 'tc-row';
  row.innerHTML = html;
  sec.appendChild(row);
}

/* ---------------------------------------------------------
   Mount section buttons (additive)
--------------------------------------------------------- */
function mountSettle() {
  const sec = section('settle'); if (!sec || sec.querySelector('[data-tc="settle-start"]')) return;
  addRow(sec, `<button class="tc-btn2" data-tc="settle-start">Start Settle Activity</button>`);
}

function mountSwear() {
  const sec = section('swear'); if (!sec || sec.querySelector('[data-tc="swear-open"]')) return;
  addRow(sec, `<button class="tc-btn2" data-tc="swear-open">Open Swear Jar</button>`);
}

function mountSeat() {
  const sec = section('seat'); if (!sec || sec.querySelector('[data-tc="seat-start"]')) return;
  addRow(sec, `
    <button class="tc-btn2" data-tc="seat-start">Start 5s Return Timer</button>
    <button class="tc-btn2" data-tc="seat-cancel">Cancel Timer</button>
  `);
}

function mountBonus() {
  const sec = section('bonus'); if (!sec || sec.querySelector('[data-tc="bonus-open"]')) return;
  addRow(sec, `<button class="tc-btn2" data-tc="bonus-open">Open Bonus Points</button>`);
}

/* ---------------------------------------------------------
   Wire signals to canon UI events
--------------------------------------------------------- */
function wireClicks() {
  const p = panel(); if (!p) return;
  p.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tc]');
    if (!btn) return;

    const id = btn.getAttribute('data-tc');
    try {
      switch (id) {

        case 'settle-start':
          emit(
            E.UI_SETTLE_START || 'ui:settle:start',
            { ts: Date.now() }
          );
          break;

        case 'swear-open':
          emit(
            E.UI_SWEAR_OPEN || 'ui:swear:open',
            { ts: Date.now() }
          );
          break;

        case 'seat-start':
          emit(
            E.UI_SEAT_TIMER_START || 'ui:seat:timerStart',
            { seconds: 5, ts: Date.now() }
          );
          break;

        case 'seat-cancel':
          emit(
            E.UI_SEAT_CANCEL || 'ui:seat:cancel',
            { ts: Date.now() }
          );
          break;

        case 'bonus-open':
          emit(
            E.UI_BONUS_OPEN || 'ui:bonus:open',
            { ts: Date.now() }
          );
          break;
      }

    } catch {}
  });
}

/* ---------------------------------------------------------
   Boot + deferred mount (waiting for PC#042/043 DOM)
--------------------------------------------------------- */
(function boot(){
  try {
    ensureStyle();
    const tick = () => {
      const p = panel();
      if (!p) return void setTimeout(tick, 50);
      mountSettle();
      mountSwear();
      mountSeat();
      mountBonus();
      wireClicks();
      console.log('[PC#044] Teacher Controls signals mounted');
    };
    tick();
  } catch (e) {
    console.warn('[PC#044] Teacher Controls signals skipped:', e?.message || e);
  }
})();
