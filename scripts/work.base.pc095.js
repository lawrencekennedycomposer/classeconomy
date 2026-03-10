/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC095-A1
   Module: pc095.work.base.js
   Purpose: Phase 4 (Work) base layer
   Notes:
     - Additive-only; must unmount cleanly.
     - Must not interfere with burnline, leaderboard core rendering, popups,
       teacher tools, undo/redo/history.
   ========================================================= */

// [PC#095] Phase 4 WORK Base
// Responsibilities:
// - PDF viewer in activity canvas (file picker + page/zoom controls)
// - Right-half engagement overlay on each active student tile
// - "ALL" toggle in topbar (forces all active on unless already all on)
// - 3-minute boundary batch awards (+1 or boosted +2/+3)
// - Uses BurnlineCore p4End and p3End for phase/interval timing
// - Excludes inactive students
// - Fail-safe: if PDF viewer fails, timers + awarding still work

(() => {
  const WORK = {
    el: null,
    mounted: false,

    // timers
    uiTickId: null,
    nextBoundaryMs: null,
    phase4StartMs: null,
    phase4EndMs: null,
    currentBoost: 1,

    // engagement
    engagedById: new Map(),
    overlayById: new Map(),

    // topbar
    topbarWrap: null,
    elIntervalTimer: null,
    elPhaseTimer: null,
    btnAll: null,

    // pdf
    pdf: {
      rosterKey: null,
      fileHandle: null,
      objectUrl: null,
      page: 1,
      zoom: 100, // percent
      frame: null,
      status: null,
      btnChoose: null,
      elPage: null,
      _onChooseClick: null,
      _onPrev: null,
      _onNext: null,
      _onZoomIn: null,
      _onZoomOut: null,
    },

    // listeners
    offBoostChanged: null,
    rosterObserver: null,
  };

  // -------------------------------
  // Utilities
  // -------------------------------
  function nowMs() {
    return Date.now();
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatMMSS(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${pad2(ss)}`;
  }

  function getEventsBus() {
    return window.__CE_BOOT?.modules?.Events || window.__CE_BOOT?.CE?.modules?.Events || window.__CE_BOOT?.Events || null;
  }

  function getBurnlineState() {
    try {
      const BL = window.__CE_BOOT?.modules?.BurnlineCore;
      if (!BL || typeof BL.getState !== 'function') return null;
      return BL.getState();
    } catch {
      return null;
    }
  }

  function getBurnlineMode() {
    // Best-effort: prefer explicit lessonConfig if present; default advisory.
    const boot = window.__CE_BOOT || {};
    const m =
      boot.lessonConfig?.burnlineMode ??
      boot.burnlineMode ??
      boot.flags?.burnlineMode ??
      'advisory';
    return (m === 'timeline') ? 'timeline' : 'advisory';
  }

  function getPhaseGateState() {
    return window.__CE_BOOT?.phaseGateState || null;
  }

  function getRosterSnapshot() {
    try {
      return window.Dashboard?.getRosterSnapshot?.() || null;
    } catch {
      return null;
    }
  }

  function getRosterKeyFromSnapshot(snap) {
    // User requested: attach to roster snapshot ID.
    // Best-effort: use known id-like fields; if missing, derive a stable key.
    const id = snap?.id || snap?.rosterId || snap?.snapshotId || snap?.classId || snap?.lessonId;
    if (id) return String(id);

    // Fallback (should be rare): stable hash of student ids
    const ids = Array.isArray(snap?.students) ? snap.students.map(s => String(s.id ?? s.studentId ?? '')).filter(Boolean) : [];
    return ids.length ? `derived:${ids.join('|')}` : `derived:unknown`;
  }

  function getActiveStudentIds() {
    // DOM-driven (stable): lb-item has data-student-id (see PC062)
    const rows = Array.from(document.querySelectorAll('.lb-item[data-student-id]'));
    const ids = [];
    for (const row of rows) {
      if (!row) continue;
      if (row.classList.contains('is-inactive')) continue;
      const sid = String(row.getAttribute('data-student-id') || '').trim();
      if (!sid) continue;

      // Cross-check roster snapshot active flag if present
      const snap = getRosterSnapshot();
      if (snap?.students && Array.isArray(snap.students)) {
        const rec = snap.students.find(s => String(s.id ?? s.studentId ?? '') === sid);
        if (rec && rec.active === false) continue;
      }

      ids.push(sid);
    }
    return ids;
  }

  function getRowEl(studentId) {
    return document.querySelector(`.lb-item[data-student-id="${CSS.escape(String(studentId))}"]`);
  }

  function ensureRowPositioning(row) {
    try {
      const pos = getComputedStyle(row).position;
      if (!pos || pos === 'static') row.style.position = 'relative';
    } catch {
      // ignore
    }
  }

  function isAllActiveEngaged() {
    const active = getActiveStudentIds();
    if (!active.length) return false;
    for (const id of active) {
      if (WORK.engagedById.get(id) !== true) return false;
    }
    return true;
  }

  // -------------------------------
  // Topbar UI
  // -------------------------------
  function mountTopbar() {
    const topbar = document.getElementById('topbar');
    if (!topbar) return;

    const findClassEconomyBtn = () => {
      const btns = Array.from(topbar.querySelectorAll('button'));
      return btns.find(b => (b.textContent || '').trim().toLowerCase() === 'class economy')
        || btns.find(b => (b.textContent || '').toLowerCase().includes('class economy'))
        || null;
    };


    // Wrap
    const wrap = document.createElement('div');
    wrap.className = 'topbar-work';
    wrap.style.display = 'inline-flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '8px';
    wrap.style.marginLeft = '8px';

    // Interval timer
    const interval = document.createElement('span');
    interval.className = 'topbar-timer topbar-timer--interval';
    interval.textContent = '3:00';
    interval.style.display = 'inline-block';
    interval.style.minWidth = '56px';
    interval.style.textAlign = 'center';


    // ALL button
    const btnAll = document.createElement('button');
    btnAll.className = 'topbar-btn';
    btnAll.type = 'button';
    btnAll.textContent = 'ALL';
    btnAll.addEventListener('click', () => {
      const active = getActiveStudentIds();
      if (!active.length) return;

      const allOn = isAllActiveEngaged();
      const setTo = !allOn; // if allOn -> false, else true

      for (const sid of active) {
        WORK.engagedById.set(sid, setTo);
      }
      syncOverlayVisuals();
    });

    wrap.appendChild(interval);
    wrap.appendChild(btnAll);

    topbar.appendChild(wrap);


    // Swap positions: ensure ALL is on the other side of "Class Economy"
    // (best-effort: move whichever exists so their order flips)
    const ceBtn = findClassEconomyBtn();
    if (ceBtn) {
      const ceBeforeWrap = !!(ceBtn.compareDocumentPosition(wrap) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (ceBeforeWrap) {
        // CE is before wrap -> move CE after wrap (so ALL comes before CE)
        try { topbar.insertBefore(ceBtn, wrap.nextSibling); } catch { /* no-op */ }
      } else {
        // CE is after wrap -> move CE before wrap (so CE comes before ALL)
        try { topbar.insertBefore(ceBtn, wrap); } catch { /* no-op */ }
      }
    }


    WORK.topbarWrap = wrap;
    WORK.elIntervalTimer = interval;
    WORK.elPhaseTimer = null; // keep phase timer ONLY in burnline bar
    WORK.btnAll = btnAll;
  }

  function unmountTopbar() {
    try {
      WORK.topbarWrap?.remove?.();
    } catch {
      // no-op
    }
    WORK.topbarWrap = null;
    WORK.elIntervalTimer = null;
    WORK.elPhaseTimer = null;
    WORK.btnAll = null;
  }

  // -------------------------------
  // Engagement overlays
  // -------------------------------
  function applyOverlayStyle(ov, engaged) {
    if (!ov) return;
    ov.style.background = engaged ? 'rgba(0, 255, 0, 0.12)' : 'transparent'; // very light green tint
  }

  function ensureOverlayForStudent(studentId) {
    const sid = String(studentId);
    if (!sid) return null;

    if (WORK.overlayById.has(sid)) {
      const existing = WORK.overlayById.get(sid);
      if (existing && document.body.contains(existing)) return existing;
      WORK.overlayById.delete(sid);
    }

    const row = getRowEl(sid);
    if (!row) return null;

    ensureRowPositioning(row);

    // Overlay element (right half only)
    const ov = document.createElement('div');
    ov.className = 'ce-work-engagement-overlay';
    ov.setAttribute('data-ce-work-overlay', '1');
    ov.style.position = 'absolute';
    ov.style.top = '0';
    ov.style.right = '0';
    ov.style.width = '50%';
    ov.style.height = '100%';
    ov.style.cursor = 'pointer';
    ov.style.pointerEvents = 'auto';
    ov.style.zIndex = '3';

    // Do NOT block the left half interactions
    ov.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const activeIds = getActiveStudentIds();
      if (!activeIds.includes(sid)) return; // exclude inactive

      const cur = WORK.engagedById.get(sid) === true;
      WORK.engagedById.set(sid, !cur);
      applyOverlayStyle(ov, !cur);
    });

    row.appendChild(ov);

    WORK.overlayById.set(sid, ov);

    // initialise visual
    const engaged = WORK.engagedById.get(sid) === true;
    applyOverlayStyle(ov, engaged);

    return ov;
  }

  function bindOverlays() {
    const active = getActiveStudentIds();
    for (const sid of active) ensureOverlayForStudent(sid);
  }

  function unbindOverlays() {
    for (const [sid, ov] of WORK.overlayById.entries()) {
      try { ov?.remove?.(); } catch { /* no-op */ }
      WORK.overlayById.delete(sid);
    }
    WORK.engagedById.clear();
  }

  function syncOverlayVisuals() {
    const active = getActiveStudentIds();
    // Remove overlays for students no longer present/active
    for (const [sid, ov] of Array.from(WORK.overlayById.entries())) {
      if (!active.includes(sid)) {
        try { ov?.remove?.(); } catch { /* no-op */ }
        WORK.overlayById.delete(sid);
        WORK.engagedById.delete(sid);
      }
    }

    // Ensure overlays for active and sync tint
    for (const sid of active) {
      const ov = ensureOverlayForStudent(sid);
      if (!ov) continue;
      applyOverlayStyle(ov, WORK.engagedById.get(sid) === true);
    }
  }

  function mountRosterObserver() {
    // Keep overlays consistent if roster rows re-render (names/active flags)
    const list = document.querySelector('.lb-list') || document.querySelector('.leaderboard') || null;
    if (!list || typeof MutationObserver !== 'function') return;

    const mo = new MutationObserver(() => {
      // Lightweight refresh: ensure overlays exist + correct tint
      syncOverlayVisuals();
    });

    try {
      mo.observe(list, { childList: true, subtree: true });
      WORK.rosterObserver = mo;
    } catch {
      // ignore
    }
  }

  function unmountRosterObserver() {
    try { WORK.rosterObserver?.disconnect?.(); } catch { /* no-op */ }
    WORK.rosterObserver = null;
  }

  // -------------------------------
  // Boost listener (Teacher Menu PC050)
  // -------------------------------
  function mountBoostListener() {
    const Ev = getEventsBus();
    if (!Ev || typeof Ev.on !== 'function') return;

    const handler = (payload = {}) => {
      const b = Number(payload.boost);
      if (b === 1 || b === 2 || b === 3) WORK.currentBoost = b;
    };

    try {
      Ev.on('lesson:boostChanged', handler);
      WORK.offBoostChanged = () => {
        try { Ev.off?.('lesson:boostChanged', handler); } catch { /* no-op */ }
      };
    } catch {
      WORK.offBoostChanged = null;
    }
  }

  function unmountBoostListener() {
    try { WORK.offBoostChanged?.(); } catch { /* no-op */ }
    WORK.offBoostChanged = null;
  }

  // -------------------------------
  // Awarding + glow
  // -------------------------------
  function flashStudent(studentId) {
    try {
      window.__CE_FLASH?.flashLeaderboardStudent?.(studentId, 'bonus');
    } catch {
      // fail-safe: no glow
    }
  }

  function applyAward(studentId, points) {
    try {
      const ok = window.Dashboard?.applyAward?.({ studentId, points });
      if (ok !== false) flashStudent(studentId);
      return ok;
    } catch {
      return false;
    }
  }

  function awardBoundary() {
    const active = getActiveStudentIds();
    if (!active.length) return;

    const boost = WORK.currentBoost || 1;
    const flashed = [];

    for (const sid of active) {
      if (WORK.engagedById.get(sid) !== true) continue;
      const ok = applyAward(sid, boost);
      if (ok !== false) flashed.push(sid);
    }

    // Defer flash so it happens after any score-triggered DOM updates
    if (flashed.length) {
      setTimeout(() => {
        for (const sid of flashed) flashStudent(sid);
      }, 0);
    }

    // Reset engagement flags for next interval
    for (const sid of active) {
      WORK.engagedById.set(sid, false);
    }
    syncOverlayVisuals();
  }

  // -------------------------------
  // Phase timing (BurnlineCore)
  // -------------------------------
  function initPhaseTiming() {
    const mode = getBurnlineMode();

    // Advisory mode: phase timer must sync to PhaseGate countdown (same as burnline timer slot).
    if (mode === 'advisory') {
      const pg = getPhaseGateState();
      const enteredAt = Number(pg?.phaseEnteredAt);
      WORK.phase4StartMs = Number.isFinite(enteredAt) ? enteredAt : nowMs();

      // In advisory, PhaseGate owns the end time for timed phases (3–6).
      const endsAt = Number(pg?.countdown?.endsAt);
      WORK.phase4EndMs = Number.isFinite(endsAt) ? endsAt : null;
    } else {
      // Timeline mode (existing): preserve BurnlineCore boundaries.
      const st = getBurnlineState();
      const p3End = st?.phaseBoundaries?.p3End ?? null;
      const p4End = st?.phaseBoundaries?.p4End ?? null;

      WORK.phase4StartMs = Number.isFinite(p3End) ? Number(p3End) : nowMs();
      WORK.phase4EndMs   = Number.isFinite(p4End) ? Number(p4End) : nowMs();
    }

    // Align boundaries to phase4Start
    const interval = 180000; // 3 minutes
    const n = nowMs();
    if (n <= WORK.phase4StartMs) {
      WORK.nextBoundaryMs = WORK.phase4StartMs + interval;
    } else {
      const elapsed = n - WORK.phase4StartMs;
      const k = Math.floor(elapsed / interval) + 1;
      WORK.nextBoundaryMs = WORK.phase4StartMs + k * interval;
    }
  }

  function updateTimersUI() {
    const n = nowMs();

    // Phase timer (topbar) must match burnline timer in advisory mode
    if (WORK.elPhaseTimer) {
      if (getBurnlineMode() === 'advisory') {
        const pg = getPhaseGateState();
        const endsAt = Number(pg?.countdown?.endsAt);
        const ot = Number(pg?.overtimeSince);

        if (Number.isFinite(endsAt)) {
          WORK.elPhaseTimer.textContent = formatMMSS(Math.max(0, endsAt - n));
        } else if (Number.isFinite(ot)) {
          WORK.elPhaseTimer.textContent = formatMMSS(Math.max(0, n - ot));
        } else {
          WORK.elPhaseTimer.textContent = '00:00';
        }
      } else {
        // Timeline mode: remaining to p4End, clamp at 0
        const phaseRemain = Math.max(0, (WORK.phase4EndMs ?? n) - n);
        WORK.elPhaseTimer.textContent = formatMMSS(phaseRemain);
      }
    }

    // Interval countdown, clamp at 0 (resets at boundary)
    let intervalRemain = 0;
    if (WORK.nextBoundaryMs != null) {
      intervalRemain = Math.max(0, WORK.nextBoundaryMs - n);
    }
    if (WORK.elIntervalTimer) WORK.elIntervalTimer.textContent = formatMMSS(intervalRemain);
  }

  function tickWorkLoop() {
    const n = nowMs();

    // Keep overlays synced in case roster changed
    // (cheap guard: only when mounted)
    if (WORK.mounted) bindOverlays();

    // Timers always render
    updateTimersUI();


    // Boundary check (catch-up safe)
    if (WORK.nextBoundaryMs != null && n >= WORK.nextBoundaryMs) {
      const mode = getBurnlineMode();
      const hardStop = (mode === 'timeline' && WORK.phase4EndMs != null) ? WORK.phase4EndMs : Infinity;
      // Ensure we only award once per boundary even if tick is delayed
      while (WORK.nextBoundaryMs != null && n >= WORK.nextBoundaryMs && WORK.nextBoundaryMs < hardStop) {
        awardBoundary();
        WORK.nextBoundaryMs += 180000;
      }
    }
  }

  function startUiTick() {
    stopUiTick();
    WORK.uiTickId = setInterval(tickWorkLoop, 250);
  }

  function stopUiTick() {
    if (WORK.uiTickId) {
      clearInterval(WORK.uiTickId);
      WORK.uiTickId = null;
    }
  }

  // -------------------------------
  // PDF Viewer (Choose PDF + controls)
  // -------------------------------

  // Minimal IndexedDB helper for FileSystemHandles (R2)
  const IDB = (() => {
    const DB_NAME = 'ce-work-pdf';
    const STORE = 'handles';
    const VER = 1;

    function open() {
      return new Promise((resolve, reject) => {
        try {
          const req = indexedDB.open(DB_NAME, VER);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        } catch (e) {
          reject(e);
        }
      });
    }

    async function get(key) {
      const db = await open();
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE, 'readonly');
          const st = tx.objectStore(STORE);
          const r = st.get(key);
          r.onsuccess = () => resolve(r.result ?? null);
          r.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    async function set(key, val) {
      const db = await open();
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE, 'readwrite');
          const st = tx.objectStore(STORE);
          const r = st.put(val, key);
          r.onsuccess = () => resolve(true);
          r.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    }

    return { get, set };
  })();

  function makePdfFrameUrl(objectUrl, page, zoom) {
    const p = Math.max(1, Number(page) || 1);
    const z = Math.max(25, Math.min(400, Number(zoom) || 100));
    // Most browser PDF viewers accept fragment page/zoom.
    return `${objectUrl}#page=${p}&zoom=${z}`;
  }

  function updatePdfStatus(text) {
    if (WORK.pdf.status) WORK.pdf.status.textContent = text;
  }

  function revokeObjectUrl() {
    try {
      if (WORK.pdf.objectUrl) URL.revokeObjectURL(WORK.pdf.objectUrl);
    } catch { /* no-op */ }
    WORK.pdf.objectUrl = null;
  }

  async function loadPdfFromFile(file) {
    if (!file) return false;

    revokeObjectUrl();
    try {
      const url = URL.createObjectURL(file);
      WORK.pdf.objectUrl = url;
      WORK.pdf.page = 1;
      WORK.pdf.zoom = 100;

      if (WORK.pdf.frame) {
        WORK.pdf.frame.src = makePdfFrameUrl(url, WORK.pdf.page, WORK.pdf.zoom);
      }

      updatePdfStatus('');
      if (WORK.pdf.elPage) WORK.pdf.elPage.textContent = `p${WORK.pdf.page} @${WORK.pdf.zoom}%`;
      return true;
    } catch (e) {
      updatePdfStatus('PDF load failed');
      return false;
    }
  }

  async function tryAutoRestorePdf() {
    // R2: attempt to reopen previously selected file handle (if supported)
    const key = WORK.pdf.rosterKey;
    if (!key) return false;

    // If no File System Access support, we cannot auto-reopen; fall back
    if (typeof window.showOpenFilePicker !== 'function') return false;

    try {
      const handle = await IDB.get(`workpdf:${key}`);
      if (!handle) return false;

      // Some browsers may require permission check
      if (handle.queryPermission && (await handle.queryPermission({ mode: 'read' })) !== 'granted') {
        const res = handle.requestPermission ? await handle.requestPermission({ mode: 'read' }) : 'denied';
        if (res !== 'granted') return false;
      }

      const file = await handle.getFile();
      WORK.pdf.fileHandle = handle;
      return await loadPdfFromFile(file);
    } catch {
      return false;
    }
  }

  async function choosePdfViaPicker() {
    // Preferred (native picker). Also enables R2 via handle storage when available.
    if (typeof window.showOpenFilePicker === 'function') {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
        });
        if (!handle) return false;

        const file = await handle.getFile();
        WORK.pdf.fileHandle = handle;

        // Persist handle for this rosterKey (R2)
        if (WORK.pdf.rosterKey) {
          await IDB.set(`workpdf:${WORK.pdf.rosterKey}`, handle);
        }

        return await loadPdfFromFile(file);
      } catch {
        // user cancelled or unsupported
        return false;
      }
    }

    // Fallback: hidden input
    return new Promise((resolve) => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf,.pdf';
        input.style.display = 'none';
        input.addEventListener('change', async () => {
          const file = input.files && input.files[0];
          const ok = await loadPdfFromFile(file);
          try { input.remove(); } catch { /* no-op */ }
          resolve(ok);
        });
        document.body.appendChild(input);
        input.click();
      } catch {
        resolve(false);
      }
    });
  }

  function pdfPrevPage() {
    if (!WORK.pdf.objectUrl) return;
    WORK.pdf.page = Math.max(1, (WORK.pdf.page || 1) - 1);
    WORK.pdf.frame.src = makePdfFrameUrl(WORK.pdf.objectUrl, WORK.pdf.page, WORK.pdf.zoom);
    if (WORK.pdf.elPage) WORK.pdf.elPage.textContent = `p${WORK.pdf.page} @${WORK.pdf.zoom}%`;
  }

  function pdfNextPage() {
    if (!WORK.pdf.objectUrl) return;
    WORK.pdf.page = Math.max(1, (WORK.pdf.page || 1) + 1);
    WORK.pdf.frame.src = makePdfFrameUrl(WORK.pdf.objectUrl, WORK.pdf.page, WORK.pdf.zoom);
    if (WORK.pdf.elPage) WORK.pdf.elPage.textContent = `p${WORK.pdf.page} @${WORK.pdf.zoom}%`;
  }

  function pdfZoomIn() {
    if (!WORK.pdf.objectUrl) return;
    WORK.pdf.zoom = Math.min(400, (WORK.pdf.zoom || 100) + 25);
    WORK.pdf.frame.src = makePdfFrameUrl(WORK.pdf.objectUrl, WORK.pdf.page, WORK.pdf.zoom);
    if (WORK.pdf.elPage) WORK.pdf.elPage.textContent = `p${WORK.pdf.page} @${WORK.pdf.zoom}%`;
  }

  function pdfZoomOut() {
    if (!WORK.pdf.objectUrl) return;
    WORK.pdf.zoom = Math.max(25, (WORK.pdf.zoom || 100) - 25);
    WORK.pdf.frame.src = makePdfFrameUrl(WORK.pdf.objectUrl, WORK.pdf.page, WORK.pdf.zoom);
    if (WORK.pdf.elPage) WORK.pdf.elPage.textContent = `p${WORK.pdf.page} @${WORK.pdf.zoom}%`;
  }

  function mountPdfViewer(root) {
    // Container fills base layer
    const wrap = document.createElement('div');
    wrap.className = 'work-pdf-wrap';
    wrap.style.position = 'absolute';
    wrap.style.inset = '0';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.pointerEvents = 'auto'; // PDF viewer area is interactive
    wrap.style.zIndex = '1';

    // Toolbar
    const bar = document.createElement('div');
    bar.className = 'work-pdf-bar';
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.gap = '8px';
    bar.style.padding = '6px 8px';
    bar.style.borderBottom = '1px solid rgba(255,255,255,0.15)';
    bar.style.background = 'rgba(0,0,0,0.15)';

    const btnChoose = document.createElement('button');
    btnChoose.className = 'topbar-btn';
    btnChoose.type = 'button';
    btnChoose.textContent = 'Choose PDF';

    const elPage = document.createElement('span');
    elPage.style.opacity = '0.85';
    elPage.textContent = 'p1 @100%';

    const status = document.createElement('span');
    status.style.marginLeft = 'auto';
    status.style.opacity = '0.85';
    status.textContent = 'No PDF loaded';

    bar.appendChild(btnChoose);
    bar.appendChild(elPage);
    bar.appendChild(status);

    // Frame
    const frame = document.createElement('iframe');
    frame.className = 'work-pdf-frame';
    frame.style.flex = '1';
    frame.style.width = '100%';
    frame.style.border = '0';
    frame.style.background = 'rgba(0,0,0,0.05)';
    frame.setAttribute('title', 'Work PDF Viewer');

    wrap.appendChild(bar);
    wrap.appendChild(frame);
    root.appendChild(wrap);

    WORK.pdf.frame = frame;
    WORK.pdf.status = status;
    WORK.pdf.btnChoose = btnChoose;
    WORK.pdf.elPage = elPage;

    // Handlers
    WORK.pdf._onChooseClick = async () => {
      const ok = await choosePdfViaPicker();
      if (!ok) {
        // if user cancelled, keep prior state
        if (!WORK.pdf.objectUrl) updatePdfStatus('No PDF loaded');
      }
    };
    WORK.pdf._onPrev = null;
    WORK.pdf._onNext = null;
    WORK.pdf._onZoomIn = null;
    WORK.pdf._onZoomOut = null;

    btnChoose.addEventListener('click', WORK.pdf._onChooseClick);
  }

  function unmountPdfViewer() {
    try {
      if (WORK.pdf.btnChoose && WORK.pdf._onChooseClick) WORK.pdf.btnChoose.removeEventListener('click', WORK.pdf._onChooseClick);
    } catch { /* no-op */ }

    revokeObjectUrl();

    // Remove viewer DOM by removing root container (WORK.el handles it)
    WORK.pdf.frame = null;
    WORK.pdf.status = null;
    WORK.pdf.btnChoose = null;
    WORK.pdf.elPage = null;

    WORK.pdf._onChooseClick = null;
    WORK.pdf._onPrev = null;
    WORK.pdf._onNext = null;
    WORK.pdf._onZoomIn = null;
    WORK.pdf._onZoomOut = null;
  }

  // -------------------------------
  // Mount / Unmount
  // -------------------------------
  function mount(baseHost) {
    if (WORK.mounted) return { el: WORK.el };
    WORK.mounted = true;

    // Base root (must opt-in to clicks only where needed)
    const el = document.createElement('div');
    el.id = 'work-base-root';
    el.style.position = 'absolute';
    el.style.inset = '0';
    el.style.pointerEvents = 'none'; // only specific UI (pdf viewer + overlays) receives clicks
    el.style.zIndex = '1';

    WORK.el = el;

    // Roster key for PDF restore
    const snap = getRosterSnapshot();
    WORK.pdf.rosterKey = getRosterKeyFromSnapshot(snap);

    // Mount topbar
    mountTopbar();

    // Mount PDF viewer inside base (viewer has pointerEvents auto)
    mountPdfViewer(el);

    // Try auto-restore PDF (R2), fail-safe
    Promise.resolve()
      .then(() => tryAutoRestorePdf())
      .then((ok) => {
        if (ok) updatePdfStatus('');
        else if (!WORK.pdf.objectUrl) updatePdfStatus('No PDF loaded');
      })
      .catch(() => {
        if (!WORK.pdf.objectUrl) updatePdfStatus('No PDF loaded');
      });

    // Engagement overlays
    bindOverlays();
    mountRosterObserver();

    // Boost listener
    mountBoostListener();

    // Phase timing
    initPhaseTiming();

    // Start ticker (timers + boundary awards)
    startUiTick();

    // Attach
    try {
      baseHost?.appendChild?.(el);
    } catch {
      // no-op
    }

    return { el };
  }

  function unmount() {
    if (!WORK.mounted) return;
    WORK.mounted = false;

    stopUiTick();
    unmountBoostListener();
    unmountRosterObserver();
    unbindOverlays();
    unmountTopbar();
    unmountPdfViewer();

    try { WORK.el?.remove?.(); } catch { /* no-op */ }
    WORK.el = null;

    // reset timing
    WORK.nextBoundaryMs = null;
    WORK.phase4StartMs = null;
    WORK.phase4EndMs = null;
    WORK.currentBoost = 1;
  }

  // Expose
  WORK.mount = mount;
  WORK.unmount = unmount;

  window.__CE_WORK_BASE = WORK;
})();
