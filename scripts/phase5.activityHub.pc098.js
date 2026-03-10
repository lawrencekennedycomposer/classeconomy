/* =========================================================
   PC#098 – Phase 5 Activity Hub (append-only)
   Purpose:
     - Phase 5 is a multi-activity container (not an activity)
     - While Phase=5: render activity selector buttons in TOP BAR
     - Clicking a button mounts that activity into #activity-canvas
     - Switching activities unmounts previous activity fully (no leaks)
     - Leaving Phase 5 unmounts active activity and removes buttons
   Guardrails:
     - MUST NOT emit lesson:phaseChange
     - MUST NOT touch burnline
     - MUST NOT persist state
     - MUST NOT modify leaderboard/tile behaviour
========================================================= */

(() => {
  const HUB = {
    mounted: false,

    // Registry
    activities: new Map(), // id -> { id, label, mount(hostEl), unmount() }

    // UI
    topbar: null,
    wrap: null,
    buttons: new Map(), // id -> button

    // State
    currentPhase: null,
    activeId: null,

    // Events
    offPhase: null,
  };

  // Preferred button order (left-to-right) in the Phase 5 topbar.
  // Activities not listed here will appear after these, in registry insertion order.
  const PREFERRED_ORDER = ['bingo', 'pickbrick', 'quadconnect'];


  // -----------------------
  // Helpers
  // -----------------------
  function getEventsBus() {
    return window.__CE_BOOT?.modules?.Events || window.__CE_BOOT?.CE?.modules?.Events || null;
  }

  function getPhaseNow() {
    // Prefer PhaseGate canonical source: window.__CE_BOOT.phaseGateState.currentPhase
    return String(
      window.__CE_BOOT?.phaseGateState?.currentPhase ??
      window.__CE_BOOT?.phase?.current ??
      window.__CE_BOOT?.modules?.Dashboard?.session?.phase ??
      window.__CE_BOOT?.CE?.modules?.Dashboard?.session?.phase ??
      ''
    );
  }

  function isPhase5(phase) {
    return String(phase) === '5';
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function ensureStyles() {
    if (document.getElementById('ce-phase5hub-styles')) return;
    const s = document.createElement('style');
    s.id = 'ce-phase5hub-styles';
    s.textContent = `
      .ce-p5hub-wrap{
        display:inline-flex;
        gap:8px;
        align-items:center;
        margin-left: 8px;
      }
      .ce-p5hub-btn{
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.10);
        color: #fff;
        font-weight: 800;
        cursor: pointer;
        user-select:none;
      }
      .ce-p5hub-btn:hover{ background: rgba(255,255,255,0.12); }
      .ce-p5hub-btn.is-active{
        background: rgba(80,140,255,0.35);
        border-color: rgba(80,140,255,0.45);
      }
      .ce-p5hub-btn[disabled]{ opacity:0.45; cursor:not-allowed; }
    `;
    document.head.appendChild(s);
  }

  function getTopbar() {
    // work.base uses #topbar, so treat that as canonical
    return document.getElementById('topbar') || qs('#topbar') || qs('.topbar') || null;
  }

  function getActivityCanvas() {
    return document.getElementById('activity-canvas');
  }

  // -----------------------
  // UI
  // -----------------------
  function mountTopbarUI() {
    if (HUB.wrap) return;

    HUB.topbar = getTopbar();
    if (!HUB.topbar) return;

    ensureStyles();

    const wrap = document.createElement('span');
    wrap.className = 'ce-p5hub-wrap';
    wrap.id = 'ce-phase5hub-wrap';

    HUB.topbar.appendChild(wrap);
    HUB.wrap = wrap;

    // (Re)build buttons for current registry
    rebuildButtons();
  }

  function unmountTopbarUI() {
    try { HUB.wrap?.remove?.(); } catch {}
    HUB.wrap = null;
    HUB.buttons.clear();
  }

  function rebuildButtons() {
    if (!HUB.wrap) return;

    HUB.wrap.innerHTML = '';
    HUB.buttons.clear();

    const phase = HUB.currentPhase ?? getPhaseNow();
    const enabled = isPhase5(phase);

    // Build an ordered list so "pickbrick" shows next to "bingo" consistently
    const items = Array.from(HUB.activities.entries());
    items.sort((a, b) => {
      const ia = PREFERRED_ORDER.indexOf(a[0]);
      const ib = PREFERRED_ORDER.indexOf(b[0]);
      const ra = ia === -1 ? 1e9 : ia;
      const rb = ib === -1 ? 1e9 : ib;
      return ra - rb;
    });

    for (const [id, act] of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ce-p5hub-btn';
      btn.textContent = act.label || id;
      btn.disabled = !enabled;

      if (HUB.activeId === id) btn.classList.add('is-active');

      btn.addEventListener('click', () => {
        if (!isPhase5(getPhaseNow())) return;
        switchTo(id);
      });

      HUB.wrap.appendChild(btn);
      HUB.buttons.set(id, btn);
    }
  }

  function syncButtonsEnabled() {
    const enabled = isPhase5(HUB.currentPhase);
    for (const btn of HUB.buttons.values()) {
      btn.disabled = !enabled;
    }
  }

  function setActiveButton(id) {
    for (const [bid, btn] of HUB.buttons.entries()) {
      if (bid === id) btn.classList.add('is-active');
      else btn.classList.remove('is-active');
    }
  }

  // -----------------------
  // Activity switching
  // -----------------------
  function unmountActiveActivity() {
    const id = HUB.activeId;
    if (!id) return;

    const act = HUB.activities.get(id);
    try { act?.unmount?.(); } catch {}

    HUB.activeId = null;
    setActiveButton(null);
  }

  function mountActivity(id) {
    const act = HUB.activities.get(id);
    if (!act || typeof act.mount !== 'function') return false;

    const canvas = getActivityCanvas();
    if (!canvas) return false;

    try {
      act.mount(canvas);
      HUB.activeId = id;
      setActiveButton(id);
      return true;
    } catch {
      return false;
    }
  }

  function switchTo(id) {
    // Same button: toggle off (optional UX, but safe)
    if (HUB.activeId === id) {
      unmountActiveActivity();
      return true;
    }

    // Switch: unmount previous, mount next
    unmountActiveActivity();
    return mountActivity(id);
  }

  // -----------------------
  // Phase handling
  // -----------------------
  function onPhaseChange(payload = {}) {
    const to = String(payload?.to ?? payload?.phase ?? getPhaseNow());
    HUB.currentPhase = to;

    // Phase 5 entered: show buttons
    if (isPhase5(to)) {
      mountTopbarUI();
      rebuildButtons();
      syncButtonsEnabled();
      return;
    }

    // Leaving Phase 5: hard exit
    unmountActiveActivity();
    unmountTopbarUI();
  }

  // -----------------------
  // Public API
  // -----------------------
  function register(activity) {
    if (!activity || !activity.id) return false;

    const id = String(activity.id);
    HUB.activities.set(id, {
      id,
      label: String(activity.label || id),
      mount: activity.mount,
      unmount: activity.unmount
    });

    // If hub UI is mounted, update buttons
    if (HUB.wrap) rebuildButtons();
    return true;
  }

  function unregister(id) {
    const key = String(id || '');
    if (!key) return false;

    if (HUB.activeId === key) unmountActiveActivity();
    HUB.activities.delete(key);

    if (HUB.wrap) rebuildButtons();
    return true;
  }

  function mount() {
    if (HUB.mounted) return;
    HUB.mounted = true;

    // Expose API
    window.__CE_PHASE5 = Object.assign({}, window.__CE_PHASE5, {
      register,
      unregister,
      switchTo,
      exit: () => unmountActiveActivity(),
      getActive: () => HUB.activeId,
      list: () => Array.from(HUB.activities.keys())
    });

    // Listen for phase changes
    const Ev = getEventsBus();
    if (Ev?.on) {
      const handler = (p) => onPhaseChange(p);
      Ev.on('lesson:phaseChange', handler);
      HUB.offPhase = () => { try { Ev.off?.('lesson:phaseChange', handler); } catch {} };
    }

    // Initial sync
    onPhaseChange({ to: getPhaseNow() });
  }

  function unmount() {
    if (!HUB.mounted) return;
    HUB.mounted = false;

    try { HUB.offPhase?.(); } catch {}
    HUB.offPhase = null;

    unmountActiveActivity();
    unmountTopbarUI();

    // Keep registry; if you prefer hard clear, uncomment:
    // HUB.activities.clear();
  }

  // Auto-mount
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // Export minimal internal hook
  window.__CE_PHASE5_HUB = { mount, unmount };
})();
