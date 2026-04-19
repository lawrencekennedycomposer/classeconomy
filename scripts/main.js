console.log('DASHBOARD LIVE v20251111-1');

/* =========================================================
   VERSION INTEGRITY BLOCK – VI-DASH-6
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   Status: Canvas Host + Phase Windows + Content Loader online
   Scope: PC#054–PC#056 confirmed, zero console errors
   Date: 2025-11-13
========================================================= */
/* =========================================================
   VERSION INTEGRITY BLOCK – VI-DASH-4
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   Status: Visual + Phase Engine Unified (PC#039–PC#053)
   Date: 2025-11-13
   Notes:
     - Legacy burnline.js retired (visual layer only)
     - PC#052 sync + PC#053 phase hotkeys active
     - No console errors; state hydration stable
========================================================= */

/* =========================================================
   VERSION INTEGRITY BLOCK – VI-C1
   Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
   Coding Charter v1.0-GOV | Parent: VI-B1 | Build Range PC#016–PC#020
   Generated: 2025-11-10 (AEST)
   SHA-256: [ff17fdd0be37f86a2354a4ac3fe7a6bc5f0cef5bc303e1be455090ffe675ce6c]
========================================================= */
/* =========================================================
   VERSION INTEGRITY BLOCK – VI-B1
   Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
   Coding Charter v1.0-GOV | Build Range PC#011–PC#015
   Generated: 2025-11-09 (AEST)
   SHA-256: [349f73206df1759645f137ce9d7e91516048d1dc71ee0de3d4cc1bb6b9c3d683]
========================================================= */
/*-- =========================================================
  VERSION INTEGRITY BLOCK – VI-A1
  Operational Routine v1.8 Final (A–C) + Errata v1.8-E1
  Coding Charter v1.0-GOV | Build Range PC#001–PC#010
  Generated: 2025-11-09 (AEST)
  SHA-256: [9eba2f2d6a47da1f8e4edfc0172bb52e59e85cfbb5d9478f905b4c239062265d]
========================================================= */
/* =========================================================
  Classroom Gameflow OS – Version Integrity Block
  Charter: THE CODING PROCEDURE (v1.0-GOV)
  Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
  PC Range: PC#001
  Checksum: [SHA-256 after save]
  Generated: [ISO-8601]
  Notes: ES module bootstrap; imports shell modules only.
========================================================= */
import * as Events from './events.js';
import * as Storage from './storage.js';
import * as Dashboard from './dashboard.js';
// Burnline retired in VI-DASH-4 (superseded by PC#052 burn-line sync)
// import * as Burnline from './burnline.js';

import * as STW from './stw2.js';
import './canvas.pc054.host.js';

const CE = Object.freeze({
  version: 'v1.8',
  modules: { Events, Storage, Dashboard, STW }
});

(function bootstrap(){
  /* console.log('Runtime bootstrap initialised — Stage A compliance confirmed.');*/
  // Dev-only: expose minimal inspection hook without side effects
  // --- Modern Stage-A Bootstrap (VI-DASH-4 compliant) ---
  window.__CE_BOOT = {
    CE,
    ready: {
      events: !!Events.ready,
      storage: !!Storage.ready,
      dashboard: !!Dashboard.ready,
      stw: !!STW.ready
    },
    // Direct references to modern runtime modules
    modules: {
      Events,
      Storage,
      Dashboard,
      STW
    }
  };
  // Burn-line visuals are now handled exclusively by PC#052 (window.__CE_BURN)
})();

/* =========================================================
   PC#003 – Roster mount (DISABLED – superseded by PC#051)
   ========================================================= */
try {
  console.log('[PC#003] Roster mount disabled (PC#051 is authoritative)');
  // Do not call Dashboard.mountRoster()
  // This prevents overwriting the PC#051 leaderboard.
} catch (e) {
  console.warn('[PC#003] disable block error:', e);
}


/* =========================================================
  PC#004 – Expose EVENTS for inspection (append-only)
========================================================= */
try {
  // Attach event constants to the dev inspection hook (read-only)
  if (window.__CE_BOOT && CE && CE.modules && CE.modules.Events && CE.modules.Events.EVENTS) {
    window.__CE_BOOT.events = Object.freeze({ names: CE.modules.Events.EVENTS });
  }
} catch {
  // no-op; exposure is purely for developer clarity
}

/* =========================================================
   PC#085 – Load Phase Base + Coinflip Base + Coinflip HT overlay (append-only)
   Purpose:
     - Ensure PC076 (BaseLayerController), PC083 (coinflip base), PC085 (LB overlay)
       are actually loaded into runtime.
   Notes:
     - Order matters:
         1) PC085 overlay defines window.__CE_LB_COINFLIP_HT
         2) PC083 coinflip base may mount overlay
         3) PC076 base layer controller mounts coinflip base on phase=2
========================================================= */
try {
  import('./leaderboard.ext.pc085.coinflipHT.js').catch(() => {});
  import('./coinflip.base.pc083.js').catch(() => {});
  import('./stw.base.pc090.js').catch(() => {});
  import('./work.base.pc095.js').catch(() => {});
  import('./challenge.base.pc108.js').catch(() => {});
  import('./challenge.overlay.pc109.js')
    .then(() => { try { window.__CE_CHALLENGE_OVERLAY?.mount?.(); } catch {} })
    .catch(() => {});
  import('./challenge.input.pc110.js')
    .then(() => { try { window.__CE_CHALLENGE_INPUT?.mount?.(); } catch {} })
    .catch(() => {});
  import('./challenge.commit.pc111.js')
    .then(() => { try { window.__CE_CHALLENGE_COMMIT?.mount?.(); } catch {} })
    .catch(() => {});
  import('./challenge.wheel.pc112.js')
    .then(() => { try { window.__CE_CHALLENGE_WHEEL?.mount?.(); } catch {} })
    .catch(() => {});
  import('./challenge.nomination.pc113.js')
    .then(() => { try { window.__CE_CHALLENGE_NOMINATION?.mount?.(); } catch {} })
    .catch(() => {});
  import('./challenge.resolve.pc114.js')
    .then(() => { try { window.__CE_CHALLENGE_RESOLVE?.mount?.(); } catch {} })
    .catch(() => {});
  import('./challenge.gamepadtest.pc123.js')
    .then(() => { try { window.__CE_CHALLENGE_GAMEPADTEST?.mount?.(); } catch {} })
    .catch(() => {});
  import('./challenge.duel.targettap.pc115.js').catch(() => {});
  import('./challenge.duel.picklepong.pc116.js').catch(() => {});
  import('./challenge.duel.wizardduel.pc117.js').catch(() => {});
  import('./challenge.duel.neontrails.pc118.js').catch(() => {});
  import('./challenge.duel.rhythmstrike.pc119.js').catch(() => {});
  import('./input.gamepad.pc122.js').catch(() => {});
  // PC#122 gamepad input layer supports pad index assignment for duel modules
  import('./purchase.base.pc105.js').catch(() => {}); 
  import('./purchase.listings.pc106.js').catch(() => {}); 
  import('./baseLayer.config.pc076.js').catch(() => {});
} catch { /* no-op */ }

/* =========================================================
   PC#098 – Phase 5 Activity Hub + Activities (append-only)
   Purpose:
     - Phase 5 is a multi-activity container (NOT an activity)
     - Renders Phase 5 activity selector buttons in the top bar
     - Mounts/unmounts selected activities into #activity-canvas
     - Cleans up fully when leaving Phase 5
   Notes:
     - Hub is authoritative for Phase 5 activity switching
     - Activities (e.g. Bingo) register with the hub
     - No phase control, no burnline interaction
========================================================= */
try {
  // Phase 5 container / selector
  import('./phase5.activityHub.pc098.js').catch(() => {});

  // PC#121 – Authoritative STW / Phase 5 QB index
  import('./qb.index.pc121.js')
    .then(() => console.log('[PC#121] QB Index loaded'))
    .catch(() => {});


  // Phase 5 activities (register with hub; do not auto-mount)
  import('./bingo.activity.pc097.js').catch(() => {});
  import('./pickbrick.activity.pc099.js').catch(() => {});
  import('./quadconnect.activity.pc102.js').catch(() => {});
  import('./hexflex.activity.pc103.js').catch(() => {}); 
  import('./digdirt.activity.pc120.js').catch(() => {});


  // Future Phase 5 activities go here:
  // import('./phase5.someActivity.pc0xx.js').catch(() => {});
} catch { /* no-op */ }

/* =========================================================
  PC#005 – Burn-line label mount (append-only)
========================================================= */
try {
  // Retired in VI-DASH-4: legacy Burnline.mountLabel removed
  // New system: PC#052 module handles visuals
} catch { /* no-op */ }

/* =========================================================
  PC#006 – Dev-only phase cycling (modernised)
========================================================= */
const DEV_MODE = true;

(function devPhasePreview(){
  if (!DEV_MODE) return;

  // Modern burn-line dev preview (silent until PC#052 is ready)
  function devPhasePreview(id) {
    const ORDER = ['1','2','3','4','5','6','7'];
    const phase =
      String(id ?? window.__CE_BOOT?.CE?.modules?.Dashboard?.session?.phase ?? 1);
    const valid = ORDER.includes(phase) ? phase : '1';

    const ready =
      !!(window.__CE_BURN && typeof window.__CE_BURN.updateHighlight === 'function');

    if (!ready) return; // ← no warning, just no-op until PC#052 mounts

    window.__CE_BURN.updateHighlight(valid);
    console.log(`[DEV] Burn-line preview → Phase ${valid}`);
  }

  // Initial paint
  devPhasePreview(Dashboard.session?.phase ?? 1);

  // Legacy [ ] keys kept as harmless preview keys
  window.addEventListener('keydown', (e) => {
    if (e.key === '[') devPhasePreview((Number(Dashboard.session?.phase||1)-1)||1);
    if (e.key === ']') devPhasePreview((Number(Dashboard.session?.phase||1)+1)||2);
  });

  // Console helper
  window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
    setPhasePreview: (id) => devPhasePreview(id)
  });
})();

/* =========================================================
  PC#007 – Dev open/close hooks for STW shell (append-only)
========================================================= */
try {
  // Expose minimal dev helpers (no effect unless called manually)
  window.__CE_STW = Object.freeze({
    open: () => CE.modules.STW.open(),
    close: () => CE.modules.STW.close(),
    isOpen: () => CE.modules.STW.isOpen()
  });

  // Optional keybindings under DEV_MODE (from PC#006); inert in classroom.
  if (typeof DEV_MODE !== 'undefined' && DEV_MODE) {
    window.addEventListener('keydown', (e) => {
      if (e.key === 's' || e.key === 'S') { CE.modules.STW.open(); }
      if (e.key === 'Escape' && CE.modules.STW.isOpen()) { CE.modules.STW.close(); }
    });
  }
} catch {
  // no-op
}

/* =========================================================
  PC#008 – React to lesson:phaseChange (append-only)
  Behaviour:
    - When phase changes TO '3' → open STW shell.
    - When phase changes AWAY from '3' → close STW shell (if open).
    - Update burn-line label visually (no storage writes).
========================================================= */
try {
  const EVT_PHASE =
    CE.modules.Events.EVENTS.LESSON_PHASE_CHANGE ||
    CE.modules.Events.EVENTS.LESSON_PHASE_CHANGED ||
    'lesson:phaseChange';

  CE.modules.Events.on(EVT_PHASE, (e) => {
    const detail = e?.detail || {};
    const next = String(detail.to ?? detail.phase ?? '');

    // ---- Burn-line visual update (robust) ----
    try {
      const rootExists = !!document.getElementById('burnline');
      let used = false;

      // Prefer legacy helper IF it exists AND we can point it at #burnline
      if (rootExists && typeof CE.modules?.Burnline?.previewLabel === 'function') {
        try {
          CE.modules.Burnline.previewLabel(next, '#burnline');
          used = true;
        } catch (_) { /* will fall back below */ }
      }

      // Fallback to our new sync module if legacy path didn’t run
      if (!used && window.__CE_BURN?.updateHighlight) {
        window.__CE_BURN.updateHighlight(next);
      }
    } catch { /* no-op */ }

    // ---- STW shell lifecycle (guarded) ----
    const _STW = window.__CE_BOOT?.CE?.modules?.STW || CE.modules?.STW;

    if (next === '3') {
      if (_STW && typeof _STW.open === 'function') _STW.open();
    } else {
      if (_STW && typeof _STW.isOpen === 'function' && _STW.isOpen()) {
        if (typeof _STW.close === 'function') _STW.close();
      }
    }
  });

} catch {
  // Non-blocking: if events not ready, no behaviour is attached.
}

/* --- Optional DEV hook (inert by default; requires DEV_MODE=true) --- */
(function devEmitPhaseChange(){
  if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;
  // Expose a helper to simulate phase changes without writes
  window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
    emitPhaseChange(from, to) {
      try {
        const EVT =
          CE.modules.Events.EVENTS.LESSON_PHASE_CHANGE ||
          CE.modules.Events.EVENTS.LESSON_PHASE_CHANGED ||
          'lesson:phaseChange';

        CE.modules.Events.emit(
          EVT,
          { from: String(from), to: String(to), ts: Date.now() }
        );
        console.log(`[DEV] Emitted lesson:phaseChange ${from} → ${to}`);
      } catch { /* no-op */ }
    }
  });
})();

/* =========================================================
  PC#009 – Dev-only score bump hook (append-only; inert by default)
  Purpose:
    - Provide a safe way to observe `scores:updated` payloads during development.
    - No storage writes; updates are in-memory and ephemeral.
========================================================= */
(function devScorePreview(){
  if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;

  // Wire a tiny helper to bump a student's score in memory and emit `scores:updated`
  window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
    bumpScore(id, delta = 1) {
      try {
        CE.modules.Dashboard.__devBumpScore(String(id), Number(delta));
        console.log(`[DEV] Bumped ${id} by ${delta}`);
      } catch { /* no-op */ }
    },
    viewScores() {
      try {
        const snap = CE.modules.Dashboard.getScoresSnapshot();
        console.table(snap.byId);
        return snap;
      } catch { return null; }
    }
  });

  // Optional: log scores:updated to observe payload shape
  try {
    CE.modules.Events.on(CE.modules.Events.EVENTS.SCORES_UPDATED, (e) => {
      const d = e?.detail;
      console.log('[DEV] scores:updated', d);
    });
  } catch { /* no-op */ }
})();

/* =========================================================
  PC#010 – Mount minimal history viewer (append-only)
========================================================= */
try {
  // Use dynamic import to avoid editing prior import block (governance-safe)
  import('./history.js')
    .then(mod => { if (mod?.mountHistory) mod.mountHistory({ max: 10, position: 'top-right' }); })
    .catch(() => {});
} catch { /* no-op */ }

/* =========================================================
  PC#011 – Phase controller init (modern)
========================================================= */
try {
  // Modern path: hydration.pc040 + PC#053 handle phase resync.
  // Legacy Burnline.loadPhaseFromStorage is retired in VI-DASH-4.
} catch { /* no-op */ }

/* --- Optional DEV helpers (inert unless DEV_MODE = true) --- */
(function devPhaseControls(){
  if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;

  // Prefer the modern phase controller if present
  const setPhaseModern = (to) => {
    if (window.__CE_PHASE?.setPhase) {
      window.__CE_PHASE.setPhase(Number(to));
      return true;
    }
    // Fallback: emit event directly
    try {
      const Ev = window.__CE_BOOT?.CE?.modules?.Events || Events;
      const evt =
        Ev.EVENTS?.LESSON_PHASE_CHANGE ||
        Ev.EVENTS?.LESSON_PHASE_CHANGED ||
        'lesson:phaseChange';
      const n = Number(to);
      const sess = (Dashboard?.session) || (window.__CE_BOOT?.CE?.modules?.Dashboard?.session);
      if (sess) sess.phase = n;
      Ev.emit(evt, { to: n, ts: Date.now() });
      return true;
    } catch {
      return false;
    }
  };

  const getPhaseModern = () =>
    (Dashboard?.session?.phase ??
     window.__CE_BOOT?.CE?.modules?.Dashboard?.session?.phase ??
     null);

  // persistPhase is a no-op for now; history/storage handle it elsewhere
  const persistPhaseModern = () => true;

  window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
    setPhase: (to) => setPhaseModern(to),
    getPhase: () => getPhaseModern(),
    persistPhase: () => persistPhaseModern()
  });
})();

/* =========================================================
  PC#012 – Dev helpers for scores persist/load (append-only; inert by default)
========================================================= */
(function devScoresPersistence(){
  if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;

  window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
    persistScores: () => {
      try {
        const ok = CE.modules.Dashboard.persistScores();
        console.log(`[DEV] persistScores → ${ok ? 'ok' : 'failed'}`);
        return ok;
      } catch { return false; }
    },
    loadScores: () => {
      try {
        const snap = CE.modules.Dashboard.loadScores();
        console.log('[DEV] loadScores snapshot:', snap);
        return snap;
      } catch { return null; }
    }
  });
})();

/* =========================================================
  PC#014 – Dev helper to trigger Work.tick() (append-only; inert by default)
========================================================= */
try {
  import('./work.js')
    .then(mod => {
      if (typeof DEV_MODE !== 'undefined' && DEV_MODE) {
        // Console helper: __CE_DEV.workTick({ note:'test' })
        window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
          workTick: (meta = {}) => {
            try { mod.tick(meta); console.log('[DEV] Work.tick emitted', meta); }
            catch { /* no-op */ }
          }
        });
      }
    })
    .catch(() => {});
} catch { /* no-op */ }

/* =========================================================
  PC#015 – Wire `stw:award` → dashboard.applyAward (append-only)
========================================================= */
try {
  // PC#015 STW award path DISABLED
  // Reason:
  // Dashboard already owns and wires STW awards internally.
  // Leaving this active causes double-application (+2).
} catch { /* non-blocking */ }

/* --- Optional DEV helpers (inert unless DEV_MODE = true) --- */
(function devAwardHelpers(){
  if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;

  window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
    // Emit a DEV-only award (simulates STW completing with +1)
    emitAward: (studentId, points = 1, difficulty = 1) => {
      try {
        CE.modules.Events.emit(
          CE.modules.Events.EVENTS.STW_AWARD,
          { studentId: String(studentId), points: Number(points), difficulty: Number(difficulty), ts: Date.now() }
        );
        console.log(`[DEV] Emitted stw:award → ${studentId} +${points} (d${difficulty})`);
      } catch { /* no-op */ }
    },
    // Toggle automatic persist behaviour after applyAward
    persistOnAward: (flag = true) => {
      try {
        const v = CE.modules.Dashboard.setPersistOnAward(!!flag);
        console.log(`[DEV] persistOnAward → ${v}`);
        return v;
      } catch { return false; }
    }
  });
})();

/* Notice: VI-B1 checkpoint complete on 2025-11-09.
   Next governed session begins at PC#016 (Stage C). */

/* =========================================================
  PC#017 – DEV helper: emit teacher fairness override (append-only; inert by default)
========================================================= */
(function devFairnessOverride(){
  if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;
  window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
    // Simulate a teacher pressing 1/2/3 to replace an unfair question (no re-spin)
    replaceQuestion: (difficulty = 1, reason = 'unfair') => {
      try {
        CE.modules.Events.emit(
          CE.modules.Events.EVENTS.STW_QUESTION_REPLACED,
          { difficulty: Number(difficulty), reason: String(reason), ts: Date.now() }
        );
        console.log(`[DEV] Emitted stw:questionReplaced (d=${difficulty})`);
      } catch { /* no-op */ }
    }
  });
})();

/* =========================================================
  PC#018 – DEV helper: set current player (append-only; inert by default)
========================================================= */
(function devWhosUp(){
  if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;
  window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
    setCurrentPlayer: (id) => {
      try {
        CE.modules.STW.setCurrentPlayer(String(id));
        console.log(`[DEV] Current player set → ${id}`);
        return true;
      } catch { return false; }
    },
    getCurrentPlayer: () => {
      try { return CE.modules.STW.getCurrentPlayer(); }
      catch { return null; }
    }
  });
})();

/* =========================================================
  PC#019 – DEV helpers: toggle picker & quick select (append-only; inert by default)
========================================================= */
(function devRosterPicker(){
  if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;

  window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
    // Show/hide the dropdown inside STW
    togglePicker: (flag = true) => {
      try {
        const v = CE.modules.STW.enableRosterPicker(!!flag);
        console.log(`[DEV] Roster picker → ${v ? 'enabled' : 'disabled'}`);
        return v;
      } catch { return false; }
    },
    // Convenience: pick by student id directly
    pickPlayer: (id) => {
      try {
        CE.modules.STW.setCurrentPlayer(String(id));
        console.log(`[DEV] Current player set → ${id}`);
        return true;
      } catch { return false; }
    }
  });
})();

/* =========================================================
  PC#020 – Mount slice pill + DEV helpers (append-only)
========================================================= */
try {
  // Paint once on boot (no timers; static read)
  if (typeof CE.modules.Burnline?.mountSlicePill === 'function') {
    CE.modules.Burnline.mountSlicePill('.burnline');
  }
} catch { /* no-op */ }

/* --- DEV-only helpers (inert unless DEV_MODE = true) --- */
(function devSlice16(){
  if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;

  // Simple visual refresher interval for development only
  let _iv = null;

  window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
    // Set lesson start/duration (ms). Example: setSliceWindow(Date.now(), 45*60*1000)
    setSliceWindow: (startMs, durationMs) => {
      try {
        const win = CE.modules.Burnline.setLessonWindow(Number(startMs), Number(durationMs));
        CE.modules.Burnline.mountSlicePill('.burnline');
        console.log('[DEV] Lesson window set:', win);
        return win;
      } catch { return null; }
    },
    // Show current slice and optionally start a dev-only refresher
    showSlice: (refreshMs = 0) => {
      try {
        CE.modules.Burnline.mountSlicePill('.burnline');
        if (_iv) { clearInterval(_iv); _iv = null; }
        if (Number(refreshMs) > 0) {
          _iv = setInterval(() => CE.modules.Burnline.mountSlicePill('.burnline'), Number(refreshMs));
          console.log(`[DEV] Slice refresher started @ ${refreshMs}ms`);
        }
        return CE.modules.Burnline.sliceFor();
      } catch { return null; }
    },
    stopSliceRefresh: () => { if (_iv) { clearInterval(_iv); _iv = null; console.log('[DEV] Slice refresher stopped'); } }
  });
})();

/* Notice: VI-C1 checkpoint complete on 2025-11-10. Next PC = #021. */

/* =========================================================
  PC#021 – Mount advisory phase hint + DEV helpers (append-only)
========================================================= */
try {
  if (typeof CE.modules.Burnline?.refreshBurnlineHints === 'function') {
    CE.modules.Burnline.refreshBurnlineHints('.burnline');
  }
} catch { /* no-op */ }

/* --- DEV-only helpers (inert unless DEV_MODE = true) --- */
(function devPhaseHint(){
  if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;

  let _iv = null;

  window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
    /**
     * Configure advisory slice→phase mapping.
     * Example:
     * __CE_DEV.setSlicePhaseMap([
     *   {from:0, to:1, phase:'1'},   // Welcome
     *   {from:2, to:8, phase:'4'},   // Work
     *   {from:9, to:10, phase:'3'},  // STW
     *   {from:11, to:12, phase:'5'}, // Review
     *   {from:13, to:15, phase:'6'}  // Packdown, etc.
     * ])
     */
    setSlicePhaseMap: (rules=[]) => {
      try {
        const res = CE.modules.Burnline.setSlicePhaseMap(rules);
        CE.modules.Burnline.refreshBurnlineHints('.burnline');
        console.log('[DEV] slice→phase map set:', res);
        return res;
      } catch { return null; }
    },

    /** Manually repaint pills once (useful after changing window/map). */
    paintHints: () => {
      try { return CE.modules.Burnline.refreshBurnlineHints('.burnline'); }
      catch { return false; }
    },

    /** Optional live refresher for development viewing. */
    startHintRefresh: (ms=1000) => {
      try {
        if (_iv) clearInterval(_iv);
        _iv = setInterval(() => CE.modules.Burnline.refreshBurnlineHints('.burnline'), Number(ms)||1000);
        console.log(`[DEV] hint refresher @ ${ms}ms`);
        return true;
      } catch { return false; }
    },
    stopHintRefresh: () => { if (_iv) { clearInterval(_iv); _iv = null; console.log('[DEV] hint refresher stopped'); } }
  });
})();

/* =========================================================
  PC#022 – Wire Timing Automation Shell (append-only)
========================================================= */
try {
  // Lazy-load the clock so we don't touch existing imports
  import('./clock.js?v=20251111-1')
    .then(clock => {
      // No auto-start in classroom builds; purely opt-in via DEV helpers below.
      if (typeof DEV_MODE !== 'undefined' && DEV_MODE) {
        // Provide simple console helpers
        window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
          clockStart: () => { try { return clock.start(); } catch { return false; } },
          clockStop:  () => { try { return clock.stop(); }  catch { return false; } },
          clockIsOn: () => { try { return clock.isRunning(); } catch { return null; } },
          clockCadence: (ms) => { try { return clock.setCadence(ms); } catch { return null; } },
          clockAutoWindow: (min=45) => { try { return clock.autoWindow(min); } catch { return null; } },
        });
        // Optional: convenience defaults for dev inspection
        console.log('[DEV] PC#022 timing shell loaded. Use clockAutoWindow(45) then clockStart().');
      }
    })
    .catch(() => {});
} catch { /* no-op */ }

/* =========================================================
  PC#023 – DEV helpers for phase nudge (append-only)
========================================================= */
(function devPhaseNudge(){
  if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;

  window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
    // Show/hide the ◀ ▶ controls beside the burn-line label
    togglePhaseNudge: (flag = true) => {
      try {
        const v = CE.modules.Burnline.enablePhaseNudge(!!flag, '.burnline');
        console.log(`[DEV] Phase nudge → ${v ? 'enabled' : 'disabled'}`);
        return v;
      } catch { return false; }
    },
    // Programmatic nudge (manual call). Set persist=true if you explicitly want it saved.
    nudgePhase: (dir = 'next', persist = false) => {
      try {
        const cur = CE.modules.Burnline.getCurrentPhase();
        const to = (String(dir) === 'prev')
          ? (CE.modules.Burnline.PHASE_ORDER
              ? CE.modules.Burnline.PHASE_ORDER[Math.max(0, CE.modules.Burnline.PHASE_ORDER.indexOf(cur) - 1)]
              : String(Number(cur) - 1))
          : (CE.modules.Burnline.PHASE_ORDER
              ? CE.modules.Burnline.PHASE_ORDER[Math.min(CE.modules.Burnline.PHASE_ORDER.length - 1, CE.modules.Burnline.PHASE_ORDER.indexOf(cur) + 1)]
              : String(Number(cur) + 1));
        CE.modules.Burnline.setPhase(to, { persist: !!persist });
        CE.modules.Burnline.refreshBurnlineHints('.burnline');
        return to;
      } catch { return null; }
    }
  });
})();

/* =========================================================
  PC#024 – DEV helpers for prompt outcome controls (append-only)
========================================================= */
(function devPromptOutcome(){
  if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;

  window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
    // Show/hide the outcome bar in STW
    togglePromptControls: (flag = true) => {
      try {
        const v = CE.modules.STW.enablePromptDevControls(!!flag);
        console.log(`[DEV] STW prompt controls → ${v ? 'enabled' : 'disabled'}`);
        return v;
      } catch { return false; }
    },
    // Quick emitters (no UI click needed)
    award: (studentId, points = 1, difficulty = 1) => {
      try {
        CE.modules.Events.emit(
          CE.modules.Events.EVENTS.STW_AWARD,
          { studentId: String(studentId), points: Number(points), difficulty: Number(difficulty), ts: Date.now() }
        );
        return true;
      } catch { return false; }
    },
    replaceQ: (difficulty = 1, reason = 'dev:unfair') => {
      try {
        CE.modules.Events.emit(
          CE.modules.Events.EVENTS.STW_QUESTION_REPLACED,
          { difficulty: Number(difficulty), reason: String(reason), ts: Date.now() }
        );
        return true;
      } catch { return false; }
    }
  });
})();

/* =========================================================
  PC#038 – DEV helper to end lesson (append-only)
========================================================= */
(function devEndLesson(){
  const DEV_MODE = false; // remains false in classroom builds
  if (!DEV_MODE) return;

  try {
    window.__CE_DEV = Object.assign({}, window.__CE_DEV, {
      // e.g., __CE_DEV.endLesson(true) to persist snapshot
      endLesson: (persist = true, cap = 50) => {
        try {
          const snap = CE.modules.Dashboard.endLesson({ persist, cap });
          console.log('[DEV] lesson:end snapshot', snap);
          return snap;
        } catch (e) { console.warn('endLesson failed', e); return null; }
      }
    });
  } catch {}
})();

/* =========================================================
  PC#039 – Activate persistence loop (append-only)
========================================================= */
try {
  import('./persistence.pc039.js')
    .then(() => console.log('[PC#039] Persistence loop active (scores + phase autosave)'))
    .catch(()=>{});
} catch { /* no-op */ }

/* =========================================================
  PC#040 – Boot Hydration (append-only)
========================================================= */
try {
  import('./hydration.pc040.js')
    .then(() => console.log('[PC#040] Boot hydration loaded'))
    .catch(() => {});
} catch { /* no-op */ }

/* =========================================================
   PC#055 – emit initial phase after hydration (novice-safe)
========================================================= */
setTimeout(() => {
  try {
    const CEBOOT = window.__CE_BOOT;
    const Ev = CEBOOT?.CE?.modules?.Events;
    const Dash = CEBOOT?.CE?.modules?.Dashboard;
    const phaseNow = Dash?.session?.phase ?? 1;   // default to Phase 1 if missing
    const EVT =
      Ev?.EVENTS?.LESSON_PHASE_CHANGE ||
      Ev?.EVENTS?.LESSON_PHASE_CHANGED ||
      'lesson:phaseChange';
    if (Ev && phaseNow) {
      Ev.emit(EVT, { to: phaseNow, ts: Date.now() });
      console.log('[PC#055] emitted initial phase →', phaseNow);
      
      // Forward initial boot phase into Base Layer system (PC076)
      if (window.BaseLayerController?.onPhaseChange) {
        window.BaseLayerController.onPhaseChange(phaseNow);
      }
    } else {
      console.warn('[PC#055] no phase emitted — dashboard not ready');
    }
  } catch (e) {
    console.error('[PC#055] phase emit error:', e);
  }
}, 800);  // small delay so hydration finishes

/* =========================================================
   PC#041 – Snapshot cap/rotate (append-only)
========================================================= */
try {
  import('./snapshots.pc041.js')
    .then(() => console.log('[PC#041] Snapshot listener loaded'))
    .catch(() => {});
} catch { /* no-op */ }

/* =========================================================
   PC#042 – Teacher Controls overlay (append-only)
========================================================= */
try {
  import('./teacherControls.pc042.js')
    .then(() => console.log('[PC#042] Teacher Controls host loaded'))
    .catch(()=>{});
} catch { /* no-op */ }

/* =========================================================
   PC#043 – Teacher Controls structure (append-only)
========================================================= */
try {
  import('./teacherControls.pc043.structure.js')
    .then(() => console.log('[PC#043] Teacher Controls structure loaded'))
    .catch(()=>{});
} catch { /* no-op */ }

/* =========================================================
   PC#044 – Teacher Controls signals (append-only)
========================================================= */
try {
  import('./teacherControls.pc044.signals.js')
    .then(() => console.log('[PC#044] Teacher Controls signals loaded'))
    .catch(()=>{});
} catch { /* no-op */ }

/* =========================================================
   PC#045 – Teacher Controls seat timer (append-only)
========================================================= */
try {
  import('./teacherControls.pc045.seatTimer.js')
    .then(() => console.log('[PC#045] Seat timer loaded'))
    .catch(()=>{});
} catch { /* no-op */ }

/* =========================================================
   PC#046 – Settings Stub (append-only)
========================================================= */
try {
  import('./settings.pc046.js')
    .then(() => console.log('[PC#046] Settings stub loaded'))
    .catch(()=>{});
} catch {}

/* =========================================================
   PC#047 – Settings persistence & reflection (append-only)
========================================================= */
try {
  import('./settings.pc047.persistence.js')
    .then(() => console.log('[PC#047] Settings persistence loaded'))
    .catch(()=>{});
} catch {}

/* =========================================================
   PC#048 – Settings effects (append-only)
========================================================= */
try {
  import('./settings.pc048.effects.js')
    .then(() => console.log('[PC#048] Settings effects loaded'))
    .catch(()=>{});
} catch {}

/* =========================================================
   PC#049 – Swear Jar live action (append-only)
========================================================= */
try {
  import('./teacherControls.pc049.swear.js')
    .then(() => console.log('[PC#049] Swear Jar loaded'))
    .catch(()=>{});
} catch {}


/* =========================================================
   PC#0XX – Wire topbar undo / redo buttons (append-only)
========================================================= */
try {
  (function wireUndoRedoButtons() {
    const attempt = () => {
      const Ev =
        window.__CE_BOOT?.CE?.modules?.Events ||
        window.__CE_BOOT?.modules?.Events ||
        Events;

      const undoBtn = document.getElementById('undo-btn');
      const redoBtn = document.getElementById('redo-btn');

      if (!undoBtn && !redoBtn) {
        return setTimeout(attempt, 100);
      }

      if (undoBtn && !undoBtn.dataset.wiredUndo) {
        undoBtn.dataset.wiredUndo = '1';
        undoBtn.addEventListener('click', () => {
          try { Ev.emit('history:undo', { ts: Date.now(), source: 'topbar' }); } catch {}
        });
      }

      if (redoBtn && !redoBtn.dataset.wiredRedo) {
        redoBtn.dataset.wiredRedo = '1';
        redoBtn.addEventListener('click', () => {
          try { Ev.emit('history:redo', { ts: Date.now(), source: 'topbar' }); } catch {}
        });
      }
    };

    attempt();
  })();
} catch {}

/* =========================================================
   PC#050 – Teacher Menu (Class Economy) – append-only
========================================================= */
try {
  import('./teacherMenu.pc050.js')
    .then(() => console.log('[PC#050] Teacher Menu loaded'))
    .catch(() => {});
} catch {}

/* =========================================================
   PC#051 – Leaderboard module (append-only)
========================================================= */
try {
  import('./leaderboard.pc051.js?v=pc051r1')
    .then(() => {
      console.log('[PC#051] Leaderboard module loaded');
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.__CE_LB?.mount?.());
      } else {
        window.__CE_LB?.mount?.();
      }
    })
    .catch(e => console.error('[PC#051] failed:', e));
} catch (e) {
  console.warn('[PC#051] outer try error', e);
}

/* =========================================================
   PC#066 – Burn-line Visual Engine (redirect from PC052)
   Additive-only, no PC052 deletion required.
========================================================= */

try {
  import('./burnline.visual.pc066.js?v=pc066r1')
    .then(() => {
      console.log('[PC#066] Burn-line Visual Engine loaded');

      // Initialize PC066
      const BLV = window.__CE_BOOT?.modules?.BurnlineVisual;
      if (!BLV) return console.warn('[PC#066] No BurnlineVisual module found');

      // Mount Mode 1 immediately (equal layout, no timing)
      BLV.init();
      BLV.renderEqualLayout();

      // Highlight current phase (Phase 1-2)
      const phase = String(
        window.__CE_BOOT?.CE?.modules?.Dashboard?.session?.phase ?? 1
      );
      BLV.updateHighlight(phase);

      console.log('[PC#066] Burn-line rendered → Mode 1 (equal layout)');
    })
    .catch(e => console.error('[PC#066] failed:', e));

} catch (e) {
  console.warn('[PC#066] outer try error', e);
}


// ---- PC#066 initial highlight sync ---- 
function applyPC066Preview() {
  const BLV = window.__CE_BOOT?.modules?.BurnlineVisual;
  if (BLV && typeof BLV.updateHighlight === 'function') {
    const phase = String(
      window.__CE_BOOT?.CE?.modules?.Dashboard?.session?.phase ?? 1
    );
    BLV.updateHighlight(phase);
  } else {
    setTimeout(applyPC066Preview, 100);
  }
}
applyPC066Preview();

/* =========================================================
   PC#053 – Phase Hotkeys + Hydration Sync (append-only)
========================================================= */
try {
  import('./phase.pc053.hotkeys.js?v=pc053r1')
    .then(() => console.log('[PC#053] Phase Hotkeys module loaded'))
    .catch(e => console.error('[PC#053] failed:', e));
} catch (e) {
  console.warn('[PC#053] outer import error', e);
}

/* =========================================================
   PC#096 – PhaseGate (Advisory Phase Authority)
========================================================= */
try {
  import('./phaseGate.pc096.js')
    .then(mod => {
      if (window.__CE_BOOT && mod?.default) {
        window.__CE_BOOT.modules.PhaseGate = mod.default;
        console.log('[PC#096] PhaseGate loaded');
      }
    })
    .catch(e => console.error('[PC#096] failed:', e));
} catch (e) {
  console.warn('[PC#096] outer import error', e);
}

/* =========================================================
   PC#054 – Canvas Host import (explicit log)
========================================================= */
try {
  import('./canvas.pc054.host.js?v=pc054r1')
    .then(() => console.log('[PC#054] Canvas host module loaded'))
    .catch(e => console.error('[PC#054] failed to load host:', e));
} catch (e) {
  console.warn('[PC#054] outer import error', e);
}

/* =========================================================
   PC#055 – Phase→Canvas wiring import (explicit)
========================================================= */
try {
  import('./canvas.pc055.phaseWindows.js?v=pc055r2')
    .then(() => console.log('[PC#055] phaseWindows module loaded'))
    .catch(e => console.error('[PC#055] failed to load:', e));
} catch (e) {
  console.warn('[PC#055] outer import error', e);
}

/* =========================================================
   PC#096-A – PhaseWindows Adapter (Canvas-backed)
========================================================= */
try {
  (function attachPhaseWindowsAdapter() {
    if (!window.__CE_BOOT || !window.__CE_CANVAS) {
      return setTimeout(attachPhaseWindowsAdapter, 50);
    }

    window.__CE_BOOT.modules.PhaseWindows = {
      open: (opts) => {
        // Guard: legacy callers may pass a string (e.g. open('stw')).
        // That creates an "undefined" window in PC054. Refuse those opens.
        if (!opts || typeof opts !== 'object') return false;
        if (!opts.id) return false;
        return window.__CE_CANVAS.open(opts);
      },
      close: (id)  => window.__CE_CANVAS.close(id)
    };

    console.log('[PC#096-A] PhaseWindows adapter attached');
  })();
} catch (e) {
  console.warn('[PC#096-A] adapter attach failed', e);
}

/* =========================================================
   PC#096-B – PhaseGate init (ONCE, advisory authority)
   Notes:
     - Waits for PhaseGate module to finish loading
     - Requires Events + PhaseWindows adapter
========================================================= */
try {
  (function initPhaseGateOnce() {
    const Boot = window.__CE_BOOT;
    const Gate = Boot?.modules?.PhaseGate;
    const Events = Boot?.modules?.Events;
    const PhaseWindows = Boot?.modules?.PhaseWindows;

    // Wait until the required pieces exist
    if (!Gate || !Events || !PhaseWindows) {
      return setTimeout(initPhaseGateOnce, 50);
    }

    // One-time init guard
    if (Gate.__inited) return;

    Gate.init({
      Events,
      phaseWindows: PhaseWindows,
      getLessonConfig: () => Boot.lessonConfig
    });
    Gate.__inited = true;
    console.log('[PC#096-B] PhaseGate initialised');
  })();
} catch (e) {
  console.warn('[PC#096-B] PhaseGate init failed', e);
}

/* =========================================================
   PC#056 – Phase Content Loader import
========================================================= */
import('./canvas.pc056.contentLoader.js?v=pc056r1')
  .then(() => console.log('[PC#056] contentLoader module loaded'))
  .catch(e => console.error('[PC#056] failed to load:', e));

/* =========================================================
   PC#061 – Roster Editor Window
========================================================= */
try {
  import('./rosterEditor.pc061.js')
    .then(() => console.log('[PC#061] Roster Editor loaded'))
    .catch(() => {});
} catch {}

/* =========================================================
   PC#062 – Student Tiles (append-only)
   Role:
     - Bind hotkey target + tile window to leaderboard rows
     - Uses Dashboard + Events via __CE_BOOT (canon-aligned)
========================================================= */
try {
  import('./studentTiles.pc062.js?v=pc062r1')
    .then(() => console.log('[PC#062] Student Tiles module loaded'))
    .catch(e => console.error('[PC#062] failed:', e));
} catch (e) {
  console.warn('[PC#062] outer import error', e);
}

/* =========================================================
   PC#063 – What’s Up / Behaviour Overlays (append-only)
   Role:
     - Owns full-screen behavioural overlays (What’s Up?, Swear Jar)
     - Attaches absolute-position overlays to document.body
     - Provides a controlled API for tiles/teacher controls to call
========================================================= */
try {
  import('./whatsup.pc063.js?v=pc063r1')
    .then(() => console.log('[PC#063] What’s Up overlay module loaded'))
    .catch(e => console.error('[PC#063] failed:', e));
} catch (e) {
  console.warn('[PC#063] outer import error', e);
}

/* =========================================================
   PC#064 – Burn-line Core (append-only)
   Role:
     - Provides canonical burn-line schedule calculator
     - Pure mathematics, no rendering, no ticking
     - Exposed for PC#065–PC#070
========================================================= */
try {
  import('./burnlinecore.pc064.js')
    .then(mod => {
      if (window.__CE_BOOT && mod?.default) {
        window.__CE_BOOT.modules = Object.assign({}, window.__CE_BOOT.modules, {
          BurnlineCore: mod.default
        });
      }
      console.log('[PC#064] Burn-line Core loaded');
    })
    .catch(e => console.error('[PC#064] failed:', e));
} catch(e) {
  console.warn('[PC#064] outer import error:', e);
}

/* =========================================================
   PC#065 – Burn-line Ticker (append-only)
   Role:
     - Runs the 1000ms heartbeat loop
     - Emits burnline:tick
     - Detects and emits lesson:phaseChange
     - Handles pause/resume and sleep/wake
========================================================= */
try {
  import('./burnline.ticker.pc065.js')
    .then(mod => {
      if (window.__CE_BOOT && mod?.default) {
        window.__CE_BOOT.modules = Object.assign({}, window.__CE_BOOT.modules, {
          BurnlineTicker: mod.default
        });
      }
      console.log('[PC#065] Burn-line Ticker loaded');
    })
    .catch(e => console.error('[PC#065] failed:', e));
} catch(e) {
  console.warn('[PC#065] outer import error:', e);
}

/* =========================================================
   PC#066 – Burn-line Visual Sync (append-only)
   Role:
     - Renders burn-line progress bar
     - Pulses active chip
     - Reflects phase highlights
     - Reacts to burnline:tick + lesson:phaseChange
========================================================= */
try {
  import('./burnline.visual.pc066.js')
    .then(mod => {
      if (window.__CE_BOOT && mod?.default) {
        window.__CE_BOOT.modules = Object.assign({}, window.__CE_BOOT.modules, {
          BurnlineVisual: mod.default
        });
      }
      console.log('[PC#066] Burn-line Visual Sync loaded');
    })
    .catch(e => console.error('[PC#066] failed:', e));
} catch(e) {
  console.warn('[PC#066] outer import error:', e);
}

/* =========================================================
   PC#067 – Phase Engine Binding (append-only)
   Role:
     - Listens to lesson:phaseChange
     - Routes phases to UI windows (PC055)
     - No timing logic
========================================================= */
try {
  import('./burnline.phaseengine.pc067.js')
    .then(mod => {
      if (window.__CE_BOOT && mod?.default) {
        window.__CE_BOOT.modules = Object.assign({}, window.__CE_BOOT.modules, {
          PhaseEngine: mod.default
        });
      }
      console.log('[PC#067] Phase Engine Binding loaded');
    })
    .catch(e => console.error('[PC#067] failed:', e));
} catch(e) {
  console.warn('[PC#067] outer import error:', e);
}
/* =========================================================
   PC#068 – BellTime Adjustment Handler (append-only)
   Role:
     - Recalculates burn-line schedule after BellTime edit
     - Updates boundaries
     - Emits burnline:scheduleUpdated
========================================================= */
try {
  import('./burnline.belltime.pc068.js')
    .then(mod => {
      if (window.__CE_BOOT && mod?.default) {
        window.__CE_BOOT.modules = Object.assign({}, window.__CE_BOOT.modules, {
          BellTimeHandler: mod.default
        });
      }
      console.log('[PC#068] BellTime Adjustment Handler loaded');
    })
    .catch(e => console.error('[PC#068] failed:', e));
} catch(e) {
  console.warn('[PC#068] outer import error:', e);
}

/* =========================================================
   PC#069 – Burn-line Snapshot Integration (append-only)
   Role:
     - Saves burn-line timing data to snapshots
     - Restores burn-line timing on snapshot load
     - Provides the ONLY legal mutation pathway (_unsafeApply)
========================================================= */
try {
  import('./burnline.snapshot.pc069.js')
    .then(mod => {
      if (window.__CE_BOOT && mod?.default) {
        window.__CE_BOOT.modules = Object.assign({}, window.__CE_BOOT.modules, {
          BurnlineSnapshot: mod.default
        });
      }
      console.log('[PC#069] Burn-line Snapshot Integration loaded');
    })
    .catch(e => console.error('[PC#069] failed:', e));
} catch(e) {
  console.warn('[PC#069] outer import error:', e);
}
/* =========================================================
   PC#070 – Burn-line Developer Tools (append-only)
   Role:
     - Provides developer-only debug tools
     - Manual phase jumping, clock control, schedule printing
     - MUST NOT be enabled in production builds
========================================================= */
try {
  import('./burnline.devtools.pc070.js')
    .then(mod => {
      if (window.__CE_BOOT && mod?.default) {
        window.__CE_BOOT.modules = Object.assign({}, window.__CE_BOOT.modules, {
          BurnlineDevTools: mod.default
        });
      }
      console.log('[PC#070] Burn-line Dev Tools loaded');
    })
    .catch(e => console.error('[PC#070] failed:', e));
} catch(e) {
  console.warn('[PC#070] outer import error:', e);
}

/* =========================================================
   PC#071 – Burn-line Boot Manager (append-only)
   Role:
     - Displays configuration popup (STW mode + BellTime)
     - Emits burnline:bootConfigured
========================================================= */
try {
  import('./burnline.bootmanager.pc071.js')
    .then(mod => {
      if (window.__CE_BOOT && mod?.default) {
        window.__CE_BOOT.modules = Object.assign({}, window.__CE_BOOT.modules, {
          BurnlineBootManager: mod.default
        });
      }
      console.log('[PC#071] Burn-line Boot Manager loaded');
    })
    .catch(e => console.error('[PC#071] failed:', e));
} catch(e) {
  console.warn('[PC#071] outer import error:', e);
}

/* =========================================================
   PC#072 – Burn-line Boot Lifecycle Binding (append-only)
   Role:
     - Binds burn-line start sequence to lesson lifecycle
     - Initialises PhaseEngine, Snapshot, BellTimeHandler
     - Starts burn-line after configuration
========================================================= */
try {
  import('./burnline.boot.lifecycle.pc072.js')
    .then(mod => {
      if (window.__CE_BOOT && mod?.default) {
        window.__CE_BOOT.modules = Object.assign({}, window.__CE_BOOT.modules, {
          BurnlineBootLifecycle: mod.default
        });
      }

      // Automatically initialise lifecycle
      // Automatically initialise lifecycle — ensure PC071 is loaded first
      if (window.__CE_BOOT?.modules?.BurnlineBootLifecycle) {

        function waitForPC071() {
          // Wait until PC071 has attached into CE_BOOT.modules
          if (window.__CE_BOOT.modules.BurnlineBootManager) {
            window.__CE_BOOT.modules.BurnlineBootLifecycle.init();
            console.log('[PC#072] Lifecycle init after PC071 ready');
          } else {
            setTimeout(waitForPC071, 50);
          }
        }

        waitForPC071();
      }


      console.log('[PC#072] Burn-line Boot Lifecycle loaded');
    })
    .catch(e => console.error('[PC#072] failed:', e));
} catch(e) {
  console.warn('[PC#072] outer import error:', e);
}

/* =========================================================
   PC#073 – Burn-line Phase Bridge (append-only)
   Role:
     - Forwards lesson:phaseChange → burnline:phaseChanged
     - Optional compatibility layer for legacy routing
========================================================= */
try {
  import('./burnline.phasebridge.pc073.js')
    .then(mod => {
      if (window.__CE_BOOT && mod?.default) {
        window.__CE_BOOT.modules = Object.assign(
          {},
          window.__CE_BOOT.modules,
          { BurnlinePhaseBridge: mod.default }
        );
      }
      console.log('[PC#073] Burn-line Phase Bridge loaded');
    })
    .catch(e => console.error('[PC#073] failed:', e));
} catch (e) {
  console.warn('[PC#073] outer import error:', e);
}

/* =========================================================
   PC#074 – Burn-line Time-Phase Engine (append-only)
   Role:
     - Computes real burnline phase from time boundaries
     - Consumes burnline:tick
     - Writes phase → BurnlineCore.state.phase
     - Emits burnline:phaseChanged for visuals + dashboard
========================================================= */
try {
  import('./burnline.phaseengine.time.pc074.js')
    .then(mod => {
      if (window.__CE_BOOT && mod?.default) {
        window.__CE_BOOT.modules = Object.assign(
          {},
          window.__CE_BOOT.modules,
          { BurnlineTimePhaseEngine: mod.default }
        );
      }
      console.log('[PC#074] Burn-line Time-Phase Engine loaded');
    })
    .catch(e => console.error('[PC#074] failed:', e));
} catch (e) {
  console.warn('[PC#074] outer import error:', e);
}

/* =========================================================
   PC#075 – Seating Viewer (Phase A) (append-only)
   Role:
     - Renders Seating Viewer into #activity-canvas during Welcome
     - Handles click-based attendance toggles
     - No scoring, no persistence, no snapshots yet
========================================================= */
try {
  import('./seating.viewer.pc075.js')
    .then(() => console.log('[PC#075] Seating Viewer loaded'))
    .catch(e => console.error('[PC#075] failed:', e));
} catch (e) {
  console.warn('[PC#075] outer import error:', e);
}

/* =========================================================
   PC#083 – Coin Flip Base Layer (Phase 2) (append-only)
   Role:
     - Provides Phase 2 base layer shell UI
     - Mounted by PC076 into #phase-base-host
========================================================= */
try {
  import('./coinflip.base.pc083.js')
    .then(() => console.log('[PC#083] Coinflip Base loaded'))
    .catch(e => console.error('[PC#083] failed:', e));
} catch (e) {
  console.warn('[PC#083] outer import error:', e);
}

// === PC076 — Base Layer Controller Boot ===
import('./baseLayer.config.pc076.js')
  .then(mod => {
    window.BaseLayerController = mod.default;
    window.BaseLayerController.init();
    console.log('[PC076] Base Layer Controller initialised');
  })
  .catch(err => {
    console.error('[PC076] Failed to load Base Layer Controller:', err);
  });

/* =========================================================
   PC#085 – Leaderboard Extension (Phase 2) — Coinflip H/T overlay (append-only)
   Role:
     - Right-half click overlay on existing leaderboard rows
     - Input capture only (intent); persisted to localStorage
     - Mounted/unmounted by coinflip.base.pc083.js
========================================================= */
try {
  import('./leaderboard.ext.pc085.coinflipHT.js')
    .then(() => console.log('[PC#085] Leaderboard Coinflip H/T extension loaded'))
    .catch(e => console.error('[PC#085] failed:', e));
} catch (e) {
  console.warn('[PC#085] outer import error:', e);
}


// === END PC076 BOOT ===
/* =========================================================
   PC#077 – Seating Editor (Phase B) – append-only
   Role:
     - Drag + rotate desks
     - Assign default student to desks
     - Writes window.__CE_BOOT.SeatingLayout
     - NO attendance, NO scoring
========================================================= */
try {
  import('./seating.editor.pc077.js')
    .then(() => console.log('[PC#077] Seating Editor loaded'))
    .catch(e => console.error('[PC#077] failed:', e));
} catch (e) {
  console.warn('[PC#077] outer import error:', e);
}

/* =========================================================
   PC#078 – Seating Attendance Binding (Phase C)
========================================================= */
try {
  import('./seating.attendance.pc078.js')
    .then(() => console.log('[PC#078] Seating Attendance loaded'))
    .catch(e => console.error('[PC#078] failed:', e));
} catch (e) {
  console.warn('[PC#078] outer import error:', e);
}
