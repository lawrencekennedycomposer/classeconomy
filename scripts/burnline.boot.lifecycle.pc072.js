/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC072-A1
   Module: burnline.boot.lifecycle.pc072.js
   Purpose: Burn-line Boot Lifecycle Binding
   Canonical Source: Timing Spec v2.0 + PC064–PC071 chain
   Notes: Additive-only. No summarising. No assumptions.
   ========================================================= */

import Events from './events.js';

import BurnlineCore from './burnlinecore.pc064.js';
import BurnlineTicker from './burnline.ticker.pc065.js';

import PhaseEngine from './burnline.phaseengine.pc067.js';
import BellTimeHandler from './burnline.belltime.pc068.js';
import BurnlineSnapshot from './burnline.snapshot.pc069.js';
import BurnlineBootManager from './burnline.bootmanager.pc071.js';

import PhaseGate from './phaseGate.pc096.js';

// PC066 now attaches to window.__CE_BOOT.modules, no import required

const BurnlineBootLifecycle = (() => {

  // Guard: burn-line can only start once
  let started = false;


  // Advisory / Timeline mode detector (read-only)
  function getBurnlineMode() {
    return window.__CE_BOOT?.lessonConfig?.burnlineMode || 'timeline';
  }

  function init() {
    // Ensure lessonConfig exists (prevents console TypeError and enables mode gates)
    window.__CE_BOOT = window.__CE_BOOT || {};
    window.__CE_BOOT.lessonConfig = window.__CE_BOOT.lessonConfig || {};

  // TEMP DEFAULT: advisory mode if not explicitly set yet
  if (!window.__CE_BOOT.lessonConfig.burnlineMode) {
    window.__CE_BOOT.lessonConfig.burnlineMode = 'advisory';
  }

  // Ensure enabledPhases exists
  if (!window.__CE_BOOT.lessonConfig.enabledPhases) {
    window.__CE_BOOT.lessonConfig.enabledPhases = {
      1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true
    };
  } else {
    window.__CE_BOOT.lessonConfig.enabledPhases[1] = true;
    window.__CE_BOOT.lessonConfig.enabledPhases[7] = true;
  }

  // PhaseGate is now a real module import (PC096). Attach to window + init once.
  window.PhaseGate = PhaseGate;
  try {
    window.PhaseGate?.init?.({
      Events: window.__CE_BOOT?.modules?.Events
        || window.__CE_BOOT?.CE?.modules?.Events
        || window.Events,
      phaseWindows: window.__CE_BOOT?.modules?.PhaseWindows,
      getLessonConfig: () => window.__CE_BOOT?.lessonConfig
    });
    console.log('[PC072] PhaseGate initialised');
  } catch (e) {
    console.error('[PC072] PhaseGate init failed:', e);
  }



    // Initialise subsystem listeners (one-time)
    PhaseEngine.init();
    BellTimeHandler.init();
    BurnlineSnapshot.init();
    BurnlineBootManager.init();


    // Listen for the config event from PC071 popup
    Events.on('burnline:bootConfigured', onConfigured);

    console.log('[PC072] Boot lifecycle initialised');
  }

  // -------------------------------------------------------
  // CALLBACK: Burn-line boot configuration received
  // -------------------------------------------------------
function onConfigured(e) {
  if (started) return;

  const mode = getBurnlineMode();

  const { startTime, bellTime, stwDurationMs, numStudents } = e.detail;

  // Step 1: Initialise burn-line timing schedule
  BurnlineCore.init({
    startTime,
    bellTime,
    stwDurationMs,
    numStudents
  });

  // -------------------------------------------------------
  // [PC072 FIX] Trigger BurnlineCore boundary computation
  // -------------------------------------------------------
  try {
    const C = window.__CE_BOOT.modules.BurnlineCore;
    if (C && typeof C._unsafeApply === "function") {
      const st = C.getState();
      C._unsafeApply(st);  // Re-run PC064 internal duration + boundary logic
      console.log("[PC072] Boundaries computed:", C.getState().phaseBoundaries);
    } else {
      console.warn("[PC072] Missing BurnlineCore._unsafeApply");
    }
  } catch (err) {
    console.error("[PC072] Boundary computation failed:", err);
  }

  // Step 2: Start burn-line ticker (PC065)
  if (mode === 'advisory') {
    console.log('[PC072] Advisory mode: ticker started for preservation only (non-authoritative)');
  }
   // Canonical ticker start with retry fallback (BurnlineTicker MUST start)
   setTimeout(() => {
     const TICK = window.__CE_BOOT?.modules?.BurnlineTicker;
     if (TICK && typeof TICK.start === 'function') {
       console.log('[PC072] Starting ticker (primary)');
       TICK.start();
     } else {
       console.warn('[PC072] Ticker not ready. Retrying…');
       setTimeout(() => {
         const T2 = window.__CE_BOOT?.modules?.BurnlineTicker;
         if (T2 && typeof T2.start === 'function') {
           console.log('[PC072] Starting ticker (retry)');
           T2.start();
         } else {
           console.error('[PC072] ERROR: BurnlineTicker never became available.');
         }
       }, 200);
     }
   }, 0);


  // Step 3: Initialise burn-line visuals (PC066)
  window.__CE_BOOT?.modules?.BurnlineVisual?.init?.();


  // Lock started
  started = true;

  console.log('[PC072] Burn-line started.');
}


  // -------------------------------------------------------
  // HELPER: Compute STW duration
  // -------------------------------------------------------
  function computeSTW(num, mode) {
    const perStudent = mode === 'short' ? 9000 : 15000; // ms
    return num * perStudent;
  }

  // -------------------------------------------------------
  // HELPER: Get number of students from leaderboard
  // -------------------------------------------------------
  function getStudentCount() {
  try {
    // Canonical source: Dashboard roster pipeline
    const snap = window.Dashboard?.getRosterSnapshot?.();
    const list = snap?.students;

    if (Array.isArray(list)) {
      return list.length;
    }

    console.warn('[PC072] Roster snapshot invalid. Defaulting to 0.');
    return 0;
  } catch (e) {
    console.warn('[PC072] Failed to read roster. Defaulting to 0.', e);
    return 0;
  }
}


  return {
    init,
  };

})();

export default BurnlineBootLifecycle;
