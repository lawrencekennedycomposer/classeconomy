// seating.viewer.pc001.js
// PHASE A — Seating Viewer + Attendance Toggle (No Scoring Yet)
// [PC#080] Phase 1 Top Bar Controls: Reset All / Burnline Schedule (placeholder) / Begin

/* Canon dependencies:
   - activity-canvas
   - window.__CE_BOOT.classRoster
   - window.__CE_LB
   - lesson:phaseChange
   - SeatingAttendance (scope-approved)
*/

(() => {

  function findRosterStudentById(studentId) {
    const Dash = window.__CE_BOOT?.modules?.Dashboard || window.Dashboard;
    if (!Dash?.getRosterSnapshot) return null;
    const snap = Dash.getRosterSnapshot();
    const arr = snap?.students;
    if (!Array.isArray(arr)) return null;
    return arr.find(s => String(s.id) === String(studentId)) || null;
  }

   // [PC#082] Phase 1 "Begin" awards +1 token to every ACTIVE student (no attendance/state changes here)
   function awardOneTokenToAllActiveStudents() {
     const Dash = window.__CE_BOOT?.modules?.Dashboard || window.Dashboard;
     if (!Dash?.getRosterSnapshot || !Dash?.applyAward) {
       return { ok: false, reason: 'dashboard-missing' };
     }
 
     const snap = Dash.getRosterSnapshot();
     const students = Array.isArray(snap?.students) ? snap.students : [];
     let awarded = 0;
 
     students.forEach(s => {
       if (!s || s.active === false) return; // only ACTIVE
       const id = s.id;
       if (!id) return;
 
       const ok = Dash.applyAward({
         studentId: id,
         points: 1,
         reason: 'phase1:begin',
         phase: 1
       });
       if (ok) awarded++;
       if (ok) {
         awarded++;
         // [PC#083] Match existing green flash behaviour (owned by PC062)
         const flash = window.__CE_FLASH?.flashLeaderboardStudent;
         if (typeof flash === 'function') {
           setTimeout(() => flash(id, 'bonus'), 0);
         }
       }

     });
 
     return { ok: true, awarded };
   }
 

  function isStudentActiveFromRoster(studentId) {
    const s = findRosterStudentById(studentId);
    if (!s) return null;
    return s.active !== false;
  }

  function setStudentActiveOnRoster(studentId, nextActive) {
    const s = findRosterStudentById(studentId);
    if (!s) return false;
    s.active = !!nextActive;
    return true;
  }

  // Canonical toggle path (matches Student Tiles behaviour):
  // write roster active flags into localStorage key 'ce:roster:v1'
  function toggleRosterActiveInStorage(studentId) {
    const Storage = window.__CE_BOOT?.modules?.Storage;
    if (!Storage?.readJSON || !Storage?.writeJSON || !Storage?.KEYS?.ROSTER_V1) {
      return { ok: false, reason: 'storage-missing' };
    }

    const data = Storage.readJSON(Storage.KEYS.ROSTER_V1, null);
    if (!data || !Array.isArray(data.students)) {
      return { ok: false, reason: 'no-students-array' };
    }

    const s = data.students.find(x => String(x.id) === String(studentId));
    if (!s) {
      return { ok: false, reason: 'student-not-found' };
    }

    const current = (s.active !== false);
    const next = !current;
    s.active = next;

    Storage.writeJSON(Storage.KEYS.ROSTER_V1, data);
    return { ok: true, next };
  }


  // [PC#080] Reset ALL students to inactive in ce:roster:v1 (pure roster write, no scoring logic)
  function resetAllRosterInactiveInStorage() {
    const Storage = window.__CE_BOOT?.modules?.Storage;
    if (!Storage?.readJSON || !Storage?.writeJSON || !Storage?.KEYS?.ROSTER_V1) {
      return { ok: false, reason: 'storage-missing' };
    }

    const data = Storage.readJSON(Storage.KEYS.ROSTER_V1, null);
    if (!data || !Array.isArray(data.students)) {
      return { ok: false, reason: 'no-students-array' };
    }
  
    data.students = data.students.map(s => {
      if (!s || typeof s !== 'object') return s;
      return { ...s, active: false };
    });

    const ok = !!Storage.writeJSON(Storage.KEYS.ROSTER_V1, data);
    return ok ? { ok: true } : { ok: false, reason: 'write-failed' };
  }

  // [PC#080] Small Phase 1 top bar (above seating layout, inside base layer only)
  function buildPhase1TopBar() {
    const bar = document.createElement('div');
    bar.className = 'ce-phase1-topbar';
    bar.style.position = 'absolute';
    bar.style.left = '0';
    bar.style.right = '0';
    bar.style.top = '0';
    bar.style.height = '44px';
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.gap = '10px';
    bar.style.padding = '8px 10px';
    bar.style.zIndex = '5';
    bar.style.pointerEvents = 'auto';
    bar.style.userSelect = 'none';
    bar.style.background = 'rgba(255,255,255,0.72)';
    bar.style.backdropFilter = 'blur(4px)';
    bar.style.borderBottom = '1px solid rgba(0,0,0,0.10)';

    const mkBtn = (label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.height = '28px';
      b.style.padding = '0 10px';
      b.style.borderRadius = '8px';
      b.style.border = '1px solid rgba(0,0,0,0.18)';
      b.style.background = '#fff';
      b.style.cursor = 'pointer';
      b.style.fontSize = '12px';
      b.style.fontWeight = '800';
      return b;
    };

    const resetBtn = mkBtn('Reset All');
    resetBtn.onclick = () => {
      const ok = window.confirm('Reset ALL students to INACTIVE?');
      if (!ok) return;
      const res = resetAllRosterInactiveInStorage();
      if (!res.ok) {
        alert(`Reset failed: ${res.reason || 'unknown'}`);
        return;
      }

      // Keep SeatingAttendance in sync as a courtesy (viewer visuals fallback)
      if (window.__CE_BOOT?.SeatingAttendance) {
        Object.keys(window.__CE_BOOT.SeatingAttendance).forEach(id => {
          window.__CE_BOOT.SeatingAttendance[id] = false;
        });
      }

      // Trigger redraws (whatever is listening) — match existing pattern
      emitEvent('roster:updated', { ts: Date.now(), reason: 'phase1:reset-all', ok: true });
      emitEvent('scores:updated', { ts: Date.now(), reason: 'phase1:reset-all', ok: true });

      render();
    };

    const burnlineBtn = mkBtn('Burnline Schedule');
    burnlineBtn.onclick = () => {
      // Placeholder: open a small window for now
      const Canvas = window.__CE_CANVAS;
      if (Canvas && typeof Canvas.open === 'function') {
        Canvas.open({
          id: 'burnline-schedule',
          title: 'Burnline Schedule',
          content: `
            <div style="padding:10px; font-size:13px; line-height:1.35;">
              <div style="font-weight:800; margin-bottom:6px;">Burnline Schedule</div>
              <div style="opacity:0.75;">Placeholder window — scheduler build comes next.</div>
            </div>
          `,
          mode: 'modal'
        });
      } else {
        alert('Burnline Schedule (placeholder): window system not available.');
      }
    };

    const beginBtn = mkBtn('Begin');
    beginBtn.onclick = () => {
       const res = awardOneTokenToAllActiveStudents();
       if (!res.ok) {
         console.warn('[PC075][PC082] Begin award failed:', res.reason);
       } else {
         // Courtesy ping for any listeners on the CE_BOOT bus
         emitEvent('scores:updated', { ts: Date.now(), reason: 'phase1:begin-award', awarded: res.awarded });
       }
      emitEvent('lesson:phaseChange', { from: 1, to: 2, reason: 'phase1:begin', ts: Date.now() });
    };

    bar.appendChild(resetBtn);
    bar.appendChild(burnlineBtn);
    bar.appendChild(beginBtn);
    return bar;
  }

  let root = null;
  let viewportEl = null;
  let worldEl = null;
  let lastBounds = null;

  // [PC#081] Unmount support (Phase 1 base layer must clear on phase exit)
  function unmount() {
    try {
      if (root && root.parentNode) {
        root.parentNode.removeChild(root);
      }
    } catch (_) {}

    root = null;
    viewportEl = null;
    worldEl = null;
    lastBounds = null;
  }


  const DESK_W = 100;
  const DESK_H = 60;
  const PAD = 24;
  const TOPBAR_H = 44;

  function mount() {
  // Prefer the scaled world container created by PC076 (if present)
  const baseHost =
    document.getElementById('phase-base-world') ||
    document.getElementById('phase-base-host');
    if (!baseHost) return; 
    
    if (root) root.remove();
    root = document.createElement('div');
    root.className = 'seating-viewer-root';
  // IMPORTANT: baseHost is pointer-events:none (canon). Re-enable for seating subtree.
    root.style.pointerEvents = 'auto';
    root.style.width = '100%';
    root.style.height = '100%';
    root.style.position = 'relative';
    baseHost.appendChild(root);

    // [PC#080] Phase 1 top bar (above desks)
    // Must be inside root; do NOT touch #activity-canvas or #window-host.
    root.appendChild(buildPhase1TopBar());


    // Scaling shell (viewport fills host; world is transformed)
    viewportEl = document.createElement('div');
    viewportEl.id = 'seating-viewer-viewport';
    viewportEl.style.position = 'absolute';
    // Leave space for top bar
    viewportEl.style.inset = `${TOPBAR_H}px 0 0 0`;
    viewportEl.style.overflow = 'hidden';
    viewportEl.style.pointerEvents = 'auto';

    worldEl = document.createElement('div');
    worldEl.id = 'seating-viewer-world';
    worldEl.style.position = 'absolute';
    worldEl.style.left = '0';
    worldEl.style.top = '0';
    worldEl.style.transformOrigin = '0 0';
    worldEl.style.pointerEvents = 'auto';

    viewportEl.appendChild(worldEl);
    root.appendChild(viewportEl);

    render();
  }

  function getRoster() {
    const boot = window.__CE_BOOT || {};

  // Future-ready primary source
    if (Array.isArray(boot.classRoster) && boot.classRoster.length > 0) {
      return boot.classRoster;
  }

  // Current runtime truth (Dashboard)
  const snapshot = window.Dashboard?.getRosterSnapshot?.();
  if (Array.isArray(snapshot?.students)) {
    return snapshot.students;
  }

  return [];
}


  function getSeatingLayout() {
    return window.__CE_BOOT?.SeatingLayout?.desks || [];
  }

  function emitEvent(type, detail) {
    const Events = window.__CE_BOOT?.modules?.Events;
    if (!Events) return;

    // Preferred API
    if (typeof Events.emit === 'function') {
      Events.emit(type, detail);
      return;
    }

    // If Events itself is an EventTarget
    if (typeof Events.dispatchEvent === 'function') {
      try {
        Events.dispatchEvent(new CustomEvent(type, { detail }));
      } catch (_) {}
      return;
    }

    // Common pattern: Events.bus is the EventTarget
    if (Events.bus && typeof Events.bus.dispatchEvent === 'function') {
      try {
        Events.bus.dispatchEvent(new CustomEvent(type, { detail }));
      } catch (_) {}
    }
  }

  function render() {
    if (!root) return;
    // Preserve viewport/world wrapper; only clear the world contents
    if (!viewportEl || !worldEl) {
      root.innerHTML = '';
    } else {
      worldEl.innerHTML = '';
    }

    const grid = document.createElement('div');
   grid.className = 'seating-grid';
   grid.style.position = 'relative';
   grid.style.width = '100%';
   grid.style.height = '100%';

   // --- Seating Grid Geometry (prevents zero-height collapse) ---
    grid.style.width = '100%';
    grid.style.height = '100%';
    grid.style.minHeight = '300px';   // safety floor
   // Absolute-positioned desks; don't grid-center the container
    grid.style.display = 'block';

    const roster = getRoster();
    const desks = getSeatingLayout();

    desks.forEach(deskDef => {
      const student =
        roster.find(s => s.id === deskDef.defaultOccupantId) || null;

      const desk = document.createElement('div');
      desk.className = 'seat-desk';
      desk.style.position = 'absolute';
      desk.style.left = `${deskDef.x}px`;
      desk.style.top = `${deskDef.y}px`;
      desk.style.transform = `rotate(${deskDef.rotation || 0}deg)`;
      desk.style.transformOrigin = 'center center';

      // Slightly larger / nicer than editor tiles, but same basic feel
      desk.style.width = '100px';
      desk.style.height = '60px';
      desk.style.borderRadius = '8px';
      desk.style.display = 'flex';
      desk.style.flexDirection = 'column';
      desk.style.alignItems = 'center';
      desk.style.justifyContent = 'center';
      desk.style.fontSize = '11px';
      desk.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
      desk.style.cursor = 'pointer';
      desk.style.pointerEvents = 'auto';

      const nameLine = document.createElement('div');
      nameLine.style.fontWeight = '700';
      nameLine.style.fontSize = '14px';
      nameLine.style.lineHeight = '1.1';
      nameLine.style.textAlign = 'center';
      nameLine.style.color = '#2c3e50';
      nameLine.style.textShadow = '0 1px 0 rgba(255,255,255,0.6)';
      nameLine.style.textTransform = 'uppercase';




      if (student) {
        const rosterActive = isStudentActiveFromRoster(student.id);
        const present =
          rosterActive !== null
            ? rosterActive
            : !!window.__CE_BOOT?.SeatingAttendance?.[student.id];

        const shortName =
          student.displayName || student.name || student.id || 'Student';
        nameLine.textContent = shortName;

        // Attendance-driven styling
        desk.style.background = present ? '#e8f8f5' : '#f4f6f7';
        desk.style.border = present ? '2px solid #27ae60' : '1px solid #95a5a6';

        // Small status dot
        const statusDot = document.createElement('div');
        statusDot.style.width = '8px';
        statusDot.style.height = '8px';
        statusDot.style.borderRadius = '50%';
        statusDot.style.marginTop = '2px';
        statusDot.style.background = present ? '#27ae60' : '#bdc3c7';

        desk.onclick = () => {
          // Canonical toggle (matches tiles): persist to ce:roster:v1
          const res = toggleRosterActiveInStorage(student.id);

          // Keep SeatingAttendance in sync for seating-only visuals (optional but tidy)
          if (res.ok && window.__CE_BOOT?.SeatingAttendance) {
            window.__CE_BOOT.SeatingAttendance[student.id] = res.next;
          }

          // Trigger redraws (whatever is listening)
          emitEvent('roster:updated', { ts: Date.now(), reason: 'seating:active-toggle', ok: res.ok });
          emitEvent('scores:updated', { ts: Date.now(), reason: 'seating:active-toggle', ok: res.ok });

          render();
         };

        desk.appendChild(nameLine);
        desk.appendChild(statusDot);
      } else {
        // Empty desk styling
        desk.style.background = '#ecf0f1';
        desk.style.border = '1px dashed #bdc3c7';
        desk.style.opacity = '0.9';

        nameLine.textContent = 'Empty';
        desk.appendChild(nameLine);
      }

      grid.appendChild(desk);
    });


    // Render into world (so we can scale it)
    if (worldEl) {
      worldEl.appendChild(grid);
      computeBoundsAndScale(desks);
    } else {
      root.appendChild(grid);
    }
  }

  function computeBoundsAndScale(desks) {
    if (!viewportEl || !worldEl) return;
    if (!Array.isArray(desks) || desks.length === 0) {
      worldEl.style.transform = '';
      lastBounds = null;
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    desks.forEach(d => {
      const x = Number(d.x || 0);
      const y = Number(d.y || 0);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + DESK_W);
      maxY = Math.max(maxY, y + DESK_H);
    });

    lastBounds = { minX, minY, maxX, maxY };
    applyScale();
  }

  function applyScale() {
    if (!viewportEl || !worldEl || !lastBounds) return;
    const vw = viewportEl.clientWidth;
    const vh = viewportEl.clientHeight;
    if (!vw || !vh) return;

    const worldW = (lastBounds.maxX - lastBounds.minX) + PAD * 2;
    const worldH = (lastBounds.maxY - lastBounds.minY) + PAD * 2;
    if (!worldW || !worldH) return;

    const scale = Math.min(vw / worldW, vh / worldH);

    // Center scaled world within viewport
    const offsetX = (vw - worldW * scale) / 2;
    const offsetY = (vh - worldH * scale) / 2;

    // Translate so min corner becomes PAD inside world, then scale, then center
    const tx = offsetX + (PAD - lastBounds.minX) * scale;
    const ty = offsetY + (PAD - lastBounds.minY) * scale;

    worldEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }



  // Phase detection
(function attachWhenReady() {
  const Events = window.__CE_BOOT?.modules?.Events;

  if (!Events || !Events.on) {
    // Boot not ready yet, retry next tick
    setTimeout(attachWhenReady, 0);
    return;
  }

  // Phase ownership migrated to Base Layer (PC076)
  // Seating is now mounted/unmounted exclusively via Base Layer controller
  
  // --- Live Roster Sync (Canon Event from PC061) ---
  Events.on("roster:updated", () => {
    render();
  });
})();

  // Keep base layer fitted to available space
  window.addEventListener('resize', () => {
    applyScale();
  });


  // Manual dev mount helper
  window.__CE_SEATING_VIEWER_DEV = {
    mount,
    unmount,
    dump: () => JSON.parse(JSON.stringify(window.__CE_BOOT?.SeatingAttendance || {}))
  };

})();
