/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC085-A0
   Module: leaderboard.ext.pc085.coinflipHT.js
   Purpose: Phase 2 Leaderboard Extension — Heads/Tails Overlay (Input Capture Only)
   Status: ACTIVE — mounts/unmounts only during Phase 2 via coinflip.base (PC083)
   Notes:
   - Does NOT modify student tile system
   - Adds right-half overlay to existing #leaderboard .lb-item rows
   - Uses li.dataset.studentId (existing)
   - Persists picks to localStorage: 'ce:coinflip:ht:v1'
   ========================================================= */

(() => {
  const STORAGE_KEY = 'ce:coinflip:ht:v1';
  const OVERLAY_ATTR = 'data-ce-coinflip-ht-overlay';
  const ROOT_ATTR = 'data-ce-coinflip-ht-root';

  let mounted = false;
  let observer = null;
  let rescanScheduled = false;

  // Map of studentId -> 'H' | 'T'
  let picks = Object.create(null);

  function loadPicks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.create(null);
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return Object.create(null);
      return obj;
    } catch (_) {
      return Object.create(null);
    }
  }

  function savePicks(next) {
    picks = next || Object.create(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
    } catch (_) {}
  }

  function getPick(studentId) {
    return picks?.[studentId] || null;
  }

  function setPick(studentId, val) {
    const next = { ...(picks || {}) };
    if (val === 'H' || val === 'T') next[studentId] = val;
    else delete next[studentId];
    savePicks(next);
  }

  function ensureRowPositioning(li) {
    const cs = window.getComputedStyle(li);
    if (cs.position === 'static') {
      // additive: required so absolute overlay can anchor to row
      li.style.position = 'relative';
    }
  }

  function renderOverlay(overlayEl, pick) {
    // Reset base styling
    overlayEl.textContent = pick === 'H' ? 'H' : pick === 'T' ? 'T' : '–';

    // Tint logic (high visibility)
    if (pick === 'H') {
      overlayEl.style.background = 'rgba(255, 140, 0, 0.35)'; // orange tint
      overlayEl.style.borderLeft = '2px solid rgba(255, 140, 0, 0.8)';
    } else if (pick === 'T') {
      overlayEl.style.background = 'rgba(30, 144, 255, 0.30)'; // blue tint
      overlayEl.style.borderLeft = '2px solid rgba(30, 144, 255, 0.75)';
    } else {
      overlayEl.style.background = 'rgba(0,0,0,0.04)';
      overlayEl.style.borderLeft = '2px solid rgba(0,0,0,0.10)';
    }
  }

  function toggle(studentId) {
    const cur = getPick(studentId);
    const next = cur === 'H' ? 'T' : 'H';
    setPick(studentId, next);
    return next;
  }

  function makeOverlay(li) {
    const studentId = li?.dataset?.studentId;
    if (!studentId) return null;

    // [PC085] Inactive students must not be includable in coinflip picks
    if (li.classList.contains('is-inactive')) return null;

    // Avoid duplicates
    if (li.querySelector(`[${OVERLAY_ATTR}="1"]`)) return null;

    ensureRowPositioning(li);

    const overlay = document.createElement('div');
    overlay.setAttribute(OVERLAY_ATTR, '1');
    overlay.setAttribute('aria-label', 'Coinflip pick area');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.height = '100%';
    overlay.style.width = '50%';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'flex-start';
    overlay.style.paddingLeft = '16px';
    overlay.style.fontWeight = '900';
    overlay.style.fontSize = '18px';
    overlay.style.letterSpacing = '0.5px';
    overlay.style.userSelect = 'none';
    overlay.style.cursor = 'pointer';
    overlay.style.pointerEvents = 'auto';
    overlay.style.zIndex = '3'; // above row content (but only right half)
    overlay.style.borderTopRightRadius = '8px';
    overlay.style.borderBottomRightRadius = '8px';

    // Important: capture only right-half clicks, preserve left-half behaviour
    overlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const nextPick = toggle(studentId);
      renderOverlay(overlay, nextPick);
    });


    // [PC085] Block dblclick from reaching tile handlers (tile popup)
    // Do NOT toggle here — fast clicks otherwise become "click, click, dblclick" = 3 toggles.
    overlay.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    // [PC085] Capture early so underlying tile never receives press events on right-half
    overlay.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, true);

    // Touch devices / pointer events: same idea
    overlay.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, true);

    // Initial render from storage
    renderOverlay(overlay, getPick(studentId));

    li.appendChild(overlay);
    return overlay;
  }

  function scanAndAttach() {
    const root = document.getElementById('leaderboard');
    if (!root) return;

    // Mark root so we can confirm mount in DOM
    root.setAttribute(ROOT_ATTR, '1');

    const rows = root.querySelectorAll('.lb-item');

    // [PC085] If a row becomes inactive after a leaderboard rebuild, remove overlay
    rows.forEach(li => {
      if (!li.classList.contains('is-inactive')) return;
      const overlay = li.querySelector(`[${OVERLAY_ATTR}="1"]`);
      if (overlay) {
        try { overlay.remove(); } catch (_) {}
      }
      // Optional: remove any stored pick for inactive students
      try { setPick(String(li.dataset.studentId), null); } catch (_) {}
    });

    rows.forEach(li => makeOverlay(li));
  }

  function scheduleRescan() {
    if (!mounted) return;
    if (rescanScheduled) return;
    rescanScheduled = true;
    // Let PC051 finish its rebuild before we re-attach overlays
    setTimeout(() => {
      rescanScheduled = false;
      scanAndAttach();
    }, 0);
  }

  function startObserver() {
    const root = document.getElementById('leaderboard');
    if (!root) return;

    // If already observing, reset safely
    try { observer?.disconnect?.(); } catch (_) {}

    observer = new MutationObserver(() => {
      scheduleRescan();
    });

    // Watch for PC051 render() replacing lb items
    observer.observe(root, { childList: true, subtree: true });
  }

  function stopObserver() {
    try { observer?.disconnect?.(); } catch (_) {}
    observer = null;
    rescanScheduled = false;
  }


  function removeOverlays() {
    const root = document.getElementById('leaderboard');
    if (root) root.removeAttribute(ROOT_ATTR);

    document
      .querySelectorAll(`[${OVERLAY_ATTR}="1"]`)
      .forEach(el => {
        try { el.remove(); } catch (_) {}
      });
  }

  function mount() {
    if (mounted) return;
    mounted = true;

    picks = loadPicks();
    scanAndAttach();
    startObserver();
  }

  function unmount() {
    if (!mounted) return;
    mounted = false;

    stopObserver();
    removeOverlays();
  }

  window.__CE_LB_COINFLIP_HT = {
    mount,
    unmount,
    // optional dev visibility:
    _debug: {
      loadPicks,
      savePicks,
      getPick,
      setPick
    }
  };
})();
