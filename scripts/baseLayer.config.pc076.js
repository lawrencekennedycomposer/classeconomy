/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC076-A0
   Module: baseLayer.config.pc076.js
   Purpose: Phase Base Layer Controller (Scaffold)
   Status: INFRASTRUCTURE ONLY — No mounting logic yet
   Notes:
   - Pure controller scaffold
   - Does NOT touch DOM yet
   - Does NOT mount any components yet
   - Will be invoked by PC067 in a later step
   ========================================================= */

// PC076 — Phase Base Layer Controller (Scaffold)
// Responsibilities (current phase):
// - Receive phase change signal
// - Decide whether a base layer is defined for that phase
// - Prepare lifecycle hooks for future mount/unmount

const BaseLayerController = (() => {

  let currentPhase = null;
  let currentBase = null; // will later hold active base layer instance
  let baseHost = null;    // DOM host (#phase-base-host)

  // --- Phase Base Layer Mapping Table ---
// NOTE: This remains EMPTY at this stage (scope requirement).
// Future example: BASE_BY_PHASE = { 1: 'seating' };
const BASE_BY_PHASE = Object.freeze({
  1: 'seating',  // Phase 1 base layer
  2: 'coinflip',  // [PC#083] Phase 2 base layer (coinflip shell)
  3: 'stw',
  4: 'work', // [PC#095] Phase 4 base layer (Work)
  7: 'purchase' // [PC#105] Phase 7 base layer (Purchase)
  
});

  // shared helper (must NOT live inside onPhaseChange)
  function getBaseKeyForPhase(phase) {
    return BASE_BY_PHASE[phase] ?? null;
  }

  // Seating mode resolver: viewer (PC075) vs editor (PC077)
function resolveSeatingBaseLayer() {
  const flags = window.__CE_BOOT?.flags || (window.__CE_BOOT.flags = {});
  if (flags.seatingEditMode === true && window.__CE_SEATING_EDITOR?.mount) {
    return 'seating-editor';
  }
  return 'seating-viewer';
}

  // track true phase transitions
  let prevPhase = null;

  function init() {
  baseHost = document.getElementById('phase-base-host');
  if (!baseHost) {
    log('WARN: #phase-base-host not found at init()');
  }
   else {
   // Seating base layer needs to be interactive
    baseHost.style.pointerEvents = 'auto';
    // --- Cleanup: remove any orphaned base DOM from earlier mounts ---
    // (e.g., STW opened before BaseLayerController.init() was called)
    baseHost.innerHTML = '';
    currentBase = null;
  }

  log('init()');

   // ----- Ensure global flags object exists -----
  const boot = window.__CE_BOOT || (window.__CE_BOOT = {});
  boot.flags = boot.flags || {}; 

  // ✅ Canon event subscription — match PC073 bus exactly
  const Events = window.__CE_BOOT?.modules?.Events;
  if (Events?.on) {
    Events.on('lesson:phaseChange', evt => {
      const detail = evt?.detail;
      const next =
        detail?.to ??
        detail?.phase ??
        detail ??
        null;

      if (next == null) return;
      onPhaseChange(next);
    });

    // ----- Seating Editor Exit (PC077 → PC075) -----
    Events.on('seating:editor:exit', () => {
      log('seating editor exit requested');
      window.__CE_BOOT.flags = window.__CE_BOOT.flags || {};
      window.__CE_BOOT.flags.seatingEditMode = false;

      // 🔹 Force editor to unmount itself
     if (window.__CE_SEATING_EDITOR?.unmount) {
      window.__CE_SEATING_EDITOR.unmount();
    }
     // Force remount even if phase number hasn't changed
      currentPhase = null;
      onPhaseChange(currentPhase); // force remount as viewer
    });    
    log('subscribed to CE_BOOT.modules.Events lesson:phaseChange');

    // --- Attendance back-fill when roster changes ---


  } else {
    log('WARN: CE_BOOT.modules.Events not available for subscription');
  }
}

  

  // --- Base Layer Lifecycle ---
// onPhaseChange(toPhase):
// 1. Destroy previous base layer instance (if any)
// 2. Look up base layer for the new phase via BASE_BY_PHASE
// 3. If defined, request mount (deferred until PC076 Phase 2)
// 4. If undefined, leave base layer host empty

   function onPhaseChange(toPhase) {
   if (!toPhase) return;

   log(`phase change received: ${prevPhase} → ${toPhase}`);

  // Ignore duplicate signals (prevents unmount/remount thrash)
  if (toPhase === currentPhase) {
    prevPhase = toPhase;
    return;
  }

   // ----- Stage 3 (C): Attendance initialises ONCE at true Phase-1 entry -----
   const firstRealPhase1 =
     toPhase === 1 &&
     prevPhase !== 1 &&
     !window.__CE_BOOT.SeatingAttendanceInitialised;

   if (firstRealPhase1) {
     initAttendanceForLessonOnce();


   }

   // Destroy any existing base layer
   if (currentBase) {
     unmountBase();
   }

   const baseKey = getBaseKeyForPhase(toPhase);
   if (!baseKey) {
     log(`no base layer defined for phase ${toPhase}`);
     // Ensure we never leak a prior phase canvas when no base is defined
     try {
       if (baseHost && baseHost.children.length) baseHost.innerHTML = '';
     } catch (_) {}
     currentBase = null;
     prevPhase = toPhase;
     currentPhase = toPhase;
     return;
   }

   mountBase(baseKey);

   prevPhase = toPhase;
   currentPhase = toPhase;
 }
  function mountBase(key) {
    if (!baseHost) {
      log(`mountBase('${key}') failed — baseHost not bound`);
      return;
    }

    // Ensure host is clean (prevents leaked/orphaned base DOM persisting)
    if (baseHost.children.length) baseHost.innerHTML = '';

    
    if (currentBase) {
      unmountBase();
    }

    let instance = null;

    // [PC#083] Phase 2 Coinflip Base (new file coinflip.base.pc083.js)
    if (key === 'coinflip') {
      if (window.__CE_COINFLIP_BASE?.mount) {
        instance = window.__CE_COINFLIP_BASE.mount(baseHost);
        if (instance?.el) {
          currentBase = { el: instance.el, type: 'coinflip-base' };
          log(`base layer 'coinflip' mounted via PC083`);
          return;
        }
        log(`mountBase('coinflip') failed — PC083 returned no el`);
        return;
      } else {
        log(`mountBase('coinflip') failed — PC083 not available`);
        return;
      }
    }

    // [PC#090] Phase 3 STW Base (new file stw.base.pc090.js)
    if (key === 'stw') {
      if (window.__CE_STW_BASE?.mount) {
        instance = window.__CE_STW_BASE.mount(baseHost);
        if (instance?.el) {
          currentBase = { el: instance.el, type: 'stw-base' };
          log(`base layer 'stw' mounted via PC090`);
          return;
        }
        log(`mountBase('stw') failed — PC090 returned no el`);
        return;
      } else {
        log(`mountBase('stw') failed — PC090 not available`);
        return;
      }
    }

    // [PC#095] Phase 4 Work Base (new file work.base.pc095.js)
    if (key === 'work') {
      if (window.__CE_WORK_BASE?.mount) {
        instance = window.__CE_WORK_BASE.mount(baseHost);
        if (instance?.el) {
          currentBase = { el: instance.el, type: 'work-base' };
          log(`base layer 'work' mounted via PC095`);
          return;
        }
        log(`mountBase('work') failed — PC095 returned no el`);
        return;
      } else {
        log(`mountBase('work') failed — PC095 not available`);
        return;
      }
    }

    // [PC#105] Phase 7 Purchase Base
    if (key === 'purchase') {
      if (window.__CE_PURCHASE_BASE?.mount) {
        instance = window.__CE_PURCHASE_BASE.mount(baseHost);
        if (instance?.el) {
          currentBase = { el: instance.el, type: 'purchase-base' };
          log(`base layer 'purchase' mounted via PC105`);
          return;
        }
        log(`mountBase('purchase') failed — PC105 returned no el`);
        return;
      } else {
        log(`mountBase('purchase') failed — PC105 not available`);
        return;
      }
    }
  
    // DEV TEST BASE ONLY
    if (key === 'dev-test') {
      instance = createDevTestBase();
    }
   
    // REAL SEATING BASE (Viewer PC075 or Editor PC077)
    if (key === 'seating') {
      const mode = resolveSeatingBaseLayer();

      // ----- EDITOR MODE (PC077) -----
      if (mode === 'seating-editor') {
        if (window.__CE_SEATING_EDITOR?.mount) {
          window.__CE_SEATING_EDITOR.mount(baseHost);
          currentBase = { el: null, type: 'seating-editor' };
          log(`base layer 'seating' mounted via PC077 (editor)`);
          return;
        } else {
          log(`mountBase('seating-editor') failed — PC077 not available`);
          return;
        }
      }

      // ----- VIEWER MODE (PC075) -----
      if (window.__CE_SEATING_VIEWER_DEV?.mount) {
        window.__CE_SEATING_VIEWER_DEV.mount();
        currentBase = { el: null, type: 'seating-viewer' };
        log(`base layer 'seating' mounted via PC075 (viewer)`);
        return;
      } else {
        log(`mountBase('seating') failed — seating viewer not available`);
        return;
      }
    }

    if (!instance || !instance.el) {
      log(`mountBase('${key}') failed — unknown base key`);
      return;
    }

    baseHost.appendChild(instance.el);
    currentBase = instance;

    log(`base layer '${key}' mounted`);
  }

  function unmountBase() {
    if (!currentBase || !baseHost) return;

    // [PC#081] Delegate unmount to seating modules (they own their DOM; currentBase.el is null)
    try {
      // [PC#083] Delegate unmount to coinflip base (it owns overlay teardown)
      if (currentBase.type === 'coinflip-base') {
        const CF = window.__CE_COINFLIP_BASE;
        if (CF && typeof CF.unmount === 'function') {
          CF.unmount();
        }
      }

      // [PC#090] Delegate unmount to STW base
      if (currentBase.type === 'stw-base') {
        const STW = window.__CE_STW_BASE;
        if (STW && typeof STW.unmount === 'function') {
          STW.unmount();
        }
      }

      // [PC#095] Delegate unmount to Work base
      if (currentBase.type === 'work-base') {
        const WORK = window.__CE_WORK_BASE;
        if (WORK && typeof WORK.unmount === 'function') {
          WORK.unmount();
        }
      }

      if (currentBase.type === 'purchase-base') {
        const PURCHASE = window.__CE_PURCHASE_BASE;
        if (PURCHASE && typeof PURCHASE.unmount === 'function') {
          PURCHASE.unmount();
        }
      }

      if (currentBase.type === 'seating-viewer') {
        const Viewer = window.__CE_SEATING_VIEWER_DEV;
        if (Viewer && typeof Viewer.unmount === 'function') {
          Viewer.unmount();
        }
      }
      if (currentBase.type === 'seating-editor') {
        const Editor = window.__CE_SEATING_EDITOR;
        if (Editor && typeof Editor.unmount === 'function') {
          Editor.unmount();
        }
      }
    } catch (e) {
      // silent: base layer must not crash phase transitions
    }


   // Only remove if the base actually owns a DOM element (PC077 & PC075 do not)
   // NOTE: coinflip-base unmount already removes its element; this is a safe fallback.
   if (currentBase.el && currentBase.el.parentNode === baseHost) {
     baseHost.removeChild(currentBase.el);
   }

    currentBase = null;
    log('base layer unmounted');
  }

  // --- DEV TEST BASE FACTORY ---
  function createDevTestBase() {
    const el = document.createElement('div');
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.fontSize = '24px';
    el.style.fontWeight = '600';
    el.style.background = 'rgba(0, 0, 0, 0.04)';
    el.style.border = '2px dashed rgba(0,0,0,0.2)';
    el.innerText = 'BASE LAYER ACTIVE — DEV TEST (Phase 1)';

    return { el };
  }

  // destroyBase removed — superseded by unmountBase()

  function log(msg) {
    console.log(`[PC076][BaseLayer] ${msg}`);
  }
// ================================
// Stage 3 — Attendance Initialiser
// ================================
function initAttendanceForLessonOnce() {
  const boot = window.__CE_BOOT || (window.__CE_BOOT = {});

  if (boot.SeatingAttendanceInitialised === true) {
    log('attendance already initialised for this lesson');
    return;
  }

  const students =
    window.Dashboard?.getRosterSnapshot?.()?.students || [];

  boot.SeatingAttendance = boot.SeatingAttendance || {};

  students.forEach(s => {
    boot.SeatingAttendance[s.id] = false; // all start inactive
  });

  boot.SeatingAttendanceInitialised = true;

  log(`attendance initialised for lesson (${students.length} students)`);
}

  return {
    init,
    onPhaseChange
  };

})();

// Dev convenience (safe): allow console inspection
window.__CE_BASE_LAYER = BaseLayerController;


export default BaseLayerController;
