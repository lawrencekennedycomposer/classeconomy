/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC071-A1
   Module: burnline.bootmanager.pc071.js
   Purpose: Burn-line Boot Manager (Standalone Popup)
   Canonical Source: Timing Spec v2.0 + Burn-line Engine Dev Guide
   Notes: Additive-only. No summarising. No assumptions.
   ========================================================= */

// PC071 — Burn-line Boot Manager (Popup Window)
// Responsibilities:
// - Triggered AFTER Coin Flip winner is confirmed
// - Opens a standalone popup window (NOT a PhaseWindow)
// - Collects:
//     • STW Mode (Short 9×N or Long 15×N)
//     • BellTime (HH:MM teacher selection)
// - On Confirm:
//     • Emit lesson:start
//     • Emit burnline:init (handled in PC072)
//     • Emit burnline:start (handled in PC072)
//     • Emit lesson:phaseChange { from: 2, to: 3 }
// - Close popup
// - Begin Phase 3 (STW)
// DOES NOT:
// - Render burn-line visuals
// - Start ticker directly
// - Modify PhaseWindows

import * as Events from './events.js';
import Storage from './storage.js';
// Bridge to CE_BOOT global event bus (additive only)
const CE = window.__CE_BOOT?.modules?.Events;

const BurnlineBootManager = (() => {

  let popup = null;
  let stwMode = null;        // 'short' or 'long'
  let bellTime = null;       // timestamp or HH:MM string


  // Advisory/Timeline mode detector (read-only)
  function getBurnlineMode() {
    return window.__CE_BOOT?.lessonConfig?.burnlineMode || 'timeline';
  }

  //------------------------------------------------------------
  // PUBLIC INIT — called once during app boot via PC072
  //------------------------------------------------------------
  function init() {
    Events.on('coinflip:completed', () => {
      // Defensive: clear any stale popup reference before open
      if (popup && getBurnlineMode() === 'advisory') {
        try { closePopup(); } catch (e) {}
      }
      openPopup();
    });
  }

  //------------------------------------------------------------
  // OPEN POPUP
  //------------------------------------------------------------
  function openPopup() {
    if (popup) return; // prevent duplicates


    // Advisory mode: DO NOT gate phase flow with Bell Time / STW mode.
    // Preserve timeline boot payload optionally, but never block teacher navigation.
    if (getBurnlineMode() === 'advisory') {
      const now = Date.now();
      const snap = window.Dashboard?.getRosterSnapshot?.();
      const numStudents = snap?.students?.length || 0;

      // Preservation-only: provide a benign payload so timeline mode can be re-enabled later.
      // In advisory mode this payload is non-authoritative.
      const bellTimestamp = now + (60 * 60 * 1000); // +60 min dummy
      const stwDurationMs = 0;

      Events.emit('lesson:start', { startTime: now });
      CE?.emit('lesson:start', { startTime: now });

      Events.emit('burnline:bootConfigured', {
        startTime: now,
        bellTime: bellTimestamp,
        stwDurationMs,
        numStudents
      });
      CE?.emit('burnline:bootConfigured', {
        startTime: now,
        bellTime: bellTimestamp,
        stwDurationMs,
        numStudents
      });

      console.log('[PC071] Advisory mode: bootConfigured emitted (non-blocking).');
      return;
    }    

    popup = document.createElement('div');
    popup.id = 'burnline-boot-popup';
    popup.className = 'burnline-boot-overlay';

    popup.innerHTML = `
      <div class="burnline-boot-window">
        <h2>Burn-line Setup</h2>

        <div class="burnline-section">
          <label>STW Duration:</label>
          <div class="stw-options">
            <button id="stw-short">STW-S (Short)</button>
            <button id="stw-long">STW-L (Long)</button>
          </div>
        </div>

        <div class="burnline-section">
          <label>Set Bell Time:</label>
          <input type="time" id="burnline-belltime" />
        </div>

        <div class="burnline-actions">
          <button id="burnline-confirm">Confirm</button>
        </div>
      </div>
    `;

   const host = document.getElementById('popup-host') || document.body;
host.appendChild(popup);

    bindPopupControls();
  }

  //------------------------------------------------------------
  // BIND POPUP CONTROLS
  //------------------------------------------------------------
  function bindPopupControls() {
    const shortBtn = document.getElementById('stw-short');
    const longBtn = document.getElementById('stw-long');
    const bellInput = document.getElementById('burnline-belltime');
    const confirmBtn = document.getElementById('burnline-confirm');

    shortBtn.onclick = () => {
      stwMode = 'short';
      shortBtn.classList.add('active');
      longBtn.classList.remove('active');
    };

    longBtn.onclick = () => {
      stwMode = 'long';
      longBtn.classList.add('active');
      shortBtn.classList.remove('active');
    };

    bellInput.onchange = e => {
      bellTime = e.target.value; // HH:MM format
    };

    confirmBtn.onclick = onConfirm;
  }

  //------------------------------------------------------------
// CONFIRM — Begin Burn-line + Phase 3
//------------------------------------------------------------
function onConfirm() {
  if (!stwMode || !bellTime) {
    alert('Please select STW duration and Bell Time.');
    return;
  }

  const now = Date.now();
  const [hh, mm] = bellTime.split(':').map(Number);
  const bellTimestamp = makeBellTimestamp(hh, mm);

  // Emit lifecycle events
  Events.emit('lesson:start', { startTime: now });
  CE?.emit('lesson:start', { startTime: now });
  Events.emit('lesson:bellTimeSelected', { bellTime: bellTimestamp });
  CE?.emit('lesson:bellTimeSelected', { bellTime: bellTimestamp });

  // Phase 2 → Phase 3
  // Timeline mode: preserve existing behaviour (auto-advance)
  // Advisory mode: do NOT auto-advance; emit UI request for PhaseGate
  if (getBurnlineMode() === 'advisory') {
    Events.emit('ui:phaseRequestEnter', { toPhase: 3, source: 'bootmanager' });
    CE?.emit('ui:phaseRequestEnter', { toPhase: 3, source: 'bootmanager' });
  } else {
    Events.emit('lesson:phaseChange', { from: 2, to: 3, ts: Date.now() });
    CE?.emit('lesson:phaseChange', { from: 2, to: 3, ts: Date.now() });
  }

// Compute STW duration BEFORE emitting to PC072
const snap = window.Dashboard?.getRosterSnapshot?.();
const numStudents = snap?.students?.length || 0;

const stwDurationMs =
  (stwMode === 'long')
    ? numStudents * 15000
    : numStudents *  9000;

// Provide expanded canonical payload to PC072
Events.emit('burnline:bootConfigured', {
  startTime: now,
  bellTime: bellTimestamp,
  stwDurationMs,
  numStudents
});
 
 CE?.emit('burnline:bootConfigured', {
 startTime: now,
 bellTime: bellTimestamp,
 stwDurationMs,
 numStudents
});

  closePopup();
}


  //------------------------------------------------------------
  // HELPER: produce today’s bell timestamp
  //------------------------------------------------------------
  function makeBellTimestamp(hh, mm) {
    const t = new Date();
    t.setHours(hh, mm, 0, 0);
    return t.getTime();
  }

  //------------------------------------------------------------
  // CLOSE POPUP
  //------------------------------------------------------------
  function closePopup() {
    if (!popup) return;
    popup.remove();
    popup = null;
  }

  return {
    init,
  };

})();

export default BurnlineBootManager;

// ------------------------------------------------------------
// PC071 STYLE INJECTION (safe, additive)
// ------------------------------------------------------------
const style = document.createElement('style');
style.textContent = `
  #burnline-boot-popup {
    position: absolute;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 999999;
    pointer-events: auto;
  }

  .burnline-boot-window {
    background: #222;
    color: #fff;
    padding: 20px 28px;
    min-width: 340px;
    max-width: 420px;
    border-radius: 12px;
    box-shadow: 0px 4px 18px rgba(0,0,0,0.4);
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-family: system-ui, sans-serif;
  }

  .burnline-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .burnline-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
  }

  .burnline-actions button {
    cursor: pointer;
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    background: #444;
    color: #fff;
    font-size: 14px;
  }

  .burnline-actions button:hover {
    background: #555;
  }

  .stw-options button.active {
    background: #666;
  }
`;

document.head.appendChild(style);
