/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC077-A0
   Module: seating.editor.pc077.js
   Purpose: Seating Layout Editor (Phase 1 Base Layer)
   Status: DEV-READY – Layout + Assignment only
   Notes:
   - Provides desk geometry + defaultOccupantId editing
   - Does NOT handle attendance, scoring, or activation state
   - Does NOT own mount policy (BaseLayer controller decides when to show)
   - Purely manipulates window.__CE_BOOT.SeatingLayout
   ========================================================= */

/* Canon dependencies:
   - activity-canvas base host (provided to mount(hostEl))
   - window.__CE_BOOT.classRoster (array of students)
   - window.__CE_BOOT.SeatingLayout (created/updated here)
*/

(() => {
  const MODULE_ID = 'PC077';
  const LOG_PREFIX = `[${MODULE_ID}]`;

  const boot = (window.__CE_BOOT = window.__CE_BOOT || {});
  const tmp = (boot.tmp = boot.tmp || {});
  const Events = boot.modules && boot.modules.Events
    ? boot.modules.Events
    : null;
  const Storage = boot.modules && boot.modules.Storage
    ? boot.modules.Storage
    : (window.Storage || null);

  // ==============================
  // Seating Layout Persistence
  // ==============================
  const STORAGE_KEY_LEGACY = 'CE_SEATING_LAYOUT_V1';
  const STORAGE_KEY_CANON  = 'ce:seatingLayout:v1';

  function loadLayoutFromStorage() {
    try {
      // 1) Canonical (preferred)
      if (Storage && typeof Storage.readJSON === 'function') {
        const parsed = Storage.readJSON(STORAGE_KEY_CANON, null);
        if (parsed && Array.isArray(parsed.desks)) {
          boot.SeatingLayout = { desks: parsed.desks.map(d => ({ ...d })) };
          log('hydrated SeatingLayout from canonical storage', boot.SeatingLayout);
          return;
        }
      }

      // 2) Legacy fallback
      if (!window.localStorage) return;
      const raw = window.localStorage.getItem(STORAGE_KEY_LEGACY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.desks)) return;

      boot.SeatingLayout = {
        desks: parsed.desks.map(d => ({ ...d }))
      };

      log('hydrated SeatingLayout from storage', boot.SeatingLayout);

      // 3) Migrate legacy -> canonical (one-way, best effort)
      try {
        if (Storage && typeof Storage.writeJSON === 'function') {
          Storage.writeJSON(STORAGE_KEY_CANON, {
            desks: boot.SeatingLayout.desks.map(d => ({ ...d }))
          });
        }
      } catch (_) {}
    } catch (e) {
      console.warn(`[${MODULE_ID}] failed to load SeatingLayout from storage`, e);
    }
  }

  function saveLayoutToStorage() {
    try {
      if (!boot.SeatingLayout || !Array.isArray(boot.SeatingLayout.desks)) return;

      const payload = {
        desks: boot.SeatingLayout.desks.map(d => ({ ...d }))
      };

      // Canonical write (preferred)
      if (Storage && typeof Storage.writeJSON === 'function') {
        Storage.writeJSON(STORAGE_KEY_CANON, payload);
      }

      // Legacy write (compat)
      if (window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(payload));
      }

      log('layout saved', payload);
    } catch (e) {
      console.warn(`[${MODULE_ID}] failed to save SeatingLayout to storage`, e);
    }
  }

  // Hydrate layout ONCE on module load
  loadLayoutFromStorage();


  let rootEl = null;
  let hostEl = null;
  let isMounted = false;

  // Local working copy of layout; we never mutate the canonical
  // object without going through commitLayout().
  let workingLayout = null;

  // Track which desk is selected for fine-grain rotation controls
  let selectedDeskId = null;  


  // For drag handling (with movement threshold)
  // dragState = { deskId, offsetX, offsetY, startClientX, startClientY, active }
  let dragState = null;

  function log(msg, data) {
    if (boot.debug && console && console.log) {
      if (data !== undefined) {
        console.log(`${LOG_PREFIX} ${msg}`, data);
      } else {
        console.log(`${LOG_PREFIX} ${msg}`);
      }
    }
  }

  // ---------- Layout Helpers ----------

  function ensureLayoutStructure() {
    if (!boot.SeatingLayout || !Array.isArray(boot.SeatingLayout.desks)) {
      boot.SeatingLayout = {
        desks: seedDesksFromRoster()
      };
      log('created initial SeatingLayout from roster seed');
    }

    // Make a deep-ish copy for editing
    workingLayout = {
      desks: boot.SeatingLayout.desks.map(d => ({ ...d }))
    };
  }

  function seedDesksFromRoster() {
    const roster = getRoster();
    const desks = [];

    // Simple default grid: 4 columns, spaced 150x120
    const cols = 4;
    const xSpacing = 150;
    const ySpacing = 120;
    const startX = 80;
    const startY = 80;

    roster.forEach((student, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      desks.push({
        id: `desk-${index + 1}`,
        x: startX + col * xSpacing,
        y: startY + row * ySpacing,
        rotation: 0,
        defaultOccupantId: student && student.id ? student.id : null
      });
    });

    return desks;
  }

  function getWorkingDesks() {
    if (!workingLayout || !Array.isArray(workingLayout.desks)) {
      ensureLayoutStructure();
    }
    return workingLayout.desks;
  }

  function getAssignedStudentIds() {
    return new Set(
      getWorkingDesks()
        .map(d => d.defaultOccupantId)
        .filter(Boolean)
    );
  }

  function getRoster() {
  // Primary source (future-ready)
  if (Array.isArray(boot.classRoster) && boot.classRoster.length > 0) {
    return boot.classRoster;
  }

  // Canon fallback (current runtime truth)
  const snapshot = window.Dashboard?.getRosterSnapshot?.();
  if (Array.isArray(snapshot?.students)) {
    return snapshot.students;
  }

  return [];
  }

  function getStudentById(id) {
    return getRoster().find(s => s.id === id) || null;
  }

  function getUnassignedStudents() {
    const assigned = getAssignedStudentIds();
    return getRoster().filter(s => !assigned.has(s.id));
  }

  // ---------- Commit / Undo ----------

  function commitLayout() {
    if (!workingLayout) return;

    // One-level undo buffer
    tmp.SeatingLayoutUndo = boot.SeatingLayout
      ? {
          desks: boot.SeatingLayout.desks.map(d => ({ ...d }))
        }
      : null;

    boot.SeatingLayout = {
      desks: workingLayout.desks.map(d => ({ ...d }))
    };

    log('layout committed to boot.SeatingLayout', boot.SeatingLayout);

    // 🔒 Persist layout (teacher authority)
     saveLayoutToStorage();

    if (Events && Events.emit) {
      Events.emit('seating:layout:updated', {
        source: MODULE_ID,
        layout: boot.SeatingLayout
      });
    }
  }

  function undoLastCommit() {
    if (!tmp.SeatingLayoutUndo) {
      log('no undo buffer available');
      return;
    }

    workingLayout = {
      desks: tmp.SeatingLayoutUndo.desks.map(d => ({ ...d }))
    };

    boot.SeatingLayout = {
      desks: tmp.SeatingLayoutUndo.desks.map(d => ({ ...d }))
    };

    tmp.SeatingLayoutUndo = null;

    log('layout reverted from undo buffer');

    // 🔒 Keep persistence in sync with undo
    saveLayoutToStorage();

    render();
  }

  // ---------- DOM / UI ----------

  function createRoot() {
    const el = document.createElement('div');
    el.className = 'ce-seating-editor-root';
    el.style.position = 'absolute';
    el.style.inset = '0';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.pointerEvents = 'auto';
    el.style.zIndex = '10'; // above base, below popups
    el.style.background = 'rgba(0,0,0,0.02)';

    return el;
  }

  function render() {
    if (!rootEl || !isMounted) return;

    rootEl.innerHTML = '';

    const layout = getWorkingDesks();
    const roster = getRoster();
    const selectedDesk = layout.find(d => d.id === selectedDeskId) || null;


    // Controls bar
    const controls = document.createElement('div');
    controls.className = 'ce-seating-editor-controls';
    controls.style.flex = '0 0 auto';
    controls.style.display = 'flex';
    controls.style.alignItems = 'center';
    controls.style.gap = '8px';
    controls.style.padding = '8px 12px';
    controls.style.background = 'rgba(255,255,255,0.9)';
    controls.style.borderBottom = '1px solid rgba(0,0,0,0.08)';
    controls.style.fontSize = '13px';

    const title = document.createElement('div');
    title.textContent = 'Seating Editor – Layout & Assignment (no attendance)';
    title.style.fontWeight = '600';
    title.style.marginRight = '12px';

    const createDeskBtn = document.createElement('button');
    createDeskBtn.textContent = 'Add Desk';
    createDeskBtn.onclick = () => {
      createDesk();
    };

    // [PC#078] Delete selected desk (highlighted)
    const deleteDeskBtn = document.createElement('button');
    deleteDeskBtn.textContent = 'Delete Desk';
    deleteDeskBtn.disabled = !selectedDeskId;
    deleteDeskBtn.style.opacity = selectedDeskId ? '1' : '0.5';
    deleteDeskBtn.onclick = () => {
      if (!selectedDeskId) return;

      const desks = getWorkingDesks();
      const idx = desks.findIndex(d => d.id === selectedDeskId);
      if (idx === -1) return;

      const deskId = selectedDeskId;
      const ok = window.confirm(`Delete ${deskId}? This removes the desk from the layout (not saved until "Save Layout").`);
      if (!ok) return;

      // Close any open menu tied to the previous selection
      closeMenu();

      // Remove desk from working layout only (commit happens via Save Layout)
      desks.splice(idx, 1);

      // Clear selection so rotation panel + controls reflect removal
      selectedDeskId = null;

      render();
    };


    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Layout';
    saveBtn.onclick = () => {
      commitLayout();
      render();
    };

    const undoBtn = document.createElement('button');
    undoBtn.textContent = 'Undo';
    undoBtn.onclick = () => {
      undoLastCommit();
    };

    const exitBtn = document.createElement('button');
    exitBtn.textContent = 'Exit Editor';
    exitBtn.onclick = () => {
     // Notify listeners that editor wants to exit; base layer can respond if needed.
      if (Events && Events.emit) {
    Events.emit('seating:editor:exit', { source: MODULE_ID });
    }

     // Also close the seating-plan canvas window so no empty shell remains.
    const Canvas = window.__CE_CANVAS;
      if (Canvas && typeof Canvas.close === 'function') {
    Canvas.close('seating-plan');
    }
  };


    const rosterInfo = document.createElement('div');
    rosterInfo.style.marginLeft = 'auto';
    rosterInfo.style.opacity = '0.7';
    rosterInfo.textContent = `${roster.length} students / ${layout.length} desks`;


    // Rotation controls (work on the currently selected desk)
    const rotationPanel = document.createElement('div');
    rotationPanel.style.display = 'flex';
    rotationPanel.style.alignItems = 'center';
    rotationPanel.style.gap = '4px';
    rotationPanel.style.marginLeft = '16px';

    const rotationLabel = document.createElement('span');
    rotationLabel.style.fontSize = '12px';

    if (selectedDesk) {
      const currentDeg = normaliseDegrees(
        typeof selectedDesk.rotation === 'number' ? selectedDesk.rotation : 0
      );
      rotationLabel.textContent = `Desk ${selectedDesk.id}: ${currentDeg}°`;

      const minusBtn = document.createElement('button');
      minusBtn.textContent = '−15°';
      minusBtn.onclick = () => nudgeSelectedDeskRotation(-15);

      const plusBtn = document.createElement('button');
      plusBtn.textContent = '+15°';
      plusBtn.onclick = () => nudgeSelectedDeskRotation(+15);

      const resetBtn = document.createElement('button');
      resetBtn.textContent = 'Reset';
      resetBtn.onclick = () => setDeskRotation(selectedDesk.id, 0);

      rotationPanel.appendChild(rotationLabel);
      rotationPanel.appendChild(minusBtn);
      rotationPanel.appendChild(plusBtn);
      rotationPanel.appendChild(resetBtn);
    } else {
      rotationLabel.textContent = 'No desk selected for rotation';
      rotationPanel.appendChild(rotationLabel);
    }

    controls.appendChild(title);
    controls.appendChild(createDeskBtn);
    controls.appendChild(deleteDeskBtn);
    controls.appendChild(saveBtn);
    controls.appendChild(undoBtn);
    controls.appendChild(exitBtn);
    controls.appendChild(rotationPanel);
    controls.appendChild(rosterInfo);

    // Canvas area
    const canvas = document.createElement('div');
    canvas.className = 'ce-seating-editor-canvas';
    canvas.style.flex = '1 1 auto';
    canvas.style.position = 'relative';
    canvas.style.overflow = 'hidden';
    canvas.style.userSelect = 'none';

    // Render each desk
    layout.forEach(desk => {
      const deskEl = document.createElement('div');
      deskEl.className = 'ce-seating-editor-desk';
      deskEl.dataset.deskId = desk.id;

      deskEl.style.position = 'absolute';
      deskEl.style.width = '100px';
      deskEl.style.height = '60px';
      deskEl.style.left = `${desk.x}px`;
      deskEl.style.top = `${desk.y}px`;
      deskEl.style.transform = `rotate(${desk.rotation || 0}deg)`;
      deskEl.style.transformOrigin = 'center center';
      const isSelected = desk.id === selectedDeskId;
      deskEl.style.background = isSelected ? '#d6eaf8' : '#ecf0f1';
      deskEl.style.border = isSelected ? '2px solid #2980b9' : '1px solid #7f8c8d';
      deskEl.style.boxShadow = isSelected
        ? '0 0 0 2px rgba(41, 128, 185, 0.35)'
        : '0 1px 2px rgba(0,0,0,0.15)';

      deskEl.style.borderRadius = '6px';
      deskEl.style.display = 'flex';
      deskEl.style.flexDirection = 'column';
      deskEl.style.alignItems = 'center';
      deskEl.style.justifyContent = 'center';
      deskEl.style.fontSize = '11px';
      deskEl.style.cursor = 'move';
      // boxShadow now set above based on isSelected

      const label = document.createElement('div');
      label.style.fontWeight = '600';
      label.textContent = desk.id;

       const studentLine = document.createElement('div');
     studentLine.style.position = 'absolute';
     studentLine.style.bottom = '4px';
     studentLine.style.left = '4px';
     studentLine.style.right = '4px';
     studentLine.style.fontSize = '11px';
     studentLine.style.textAlign = 'center';
     studentLine.style.pointerEvents = 'none';
     studentLine.style.zIndex = '5';
    
      const student = desk.defaultOccupantId
        ? getStudentById(desk.defaultOccupantId)
        : null;

    if (student) {
      studentLine.textContent = student.name || student.displayName || student.id;
      studentLine.style.opacity = '1';
      studentLine.style.color = '#000';
      studentLine.style.fontWeight = '700';
    } else {
      studentLine.textContent = 'Unassigned';
      studentLine.style.opacity = '0.6';
      studentLine.style.color = '#666';
      studentLine.style.fontWeight = '500';
    }

      deskEl.appendChild(label);
      deskEl.appendChild(studentLine);

      // Dragging
      deskEl.addEventListener('mousedown', onDeskMouseDown);
      
      // Assignment menu (right-click)
      deskEl.addEventListener('contextmenu', event => {
        event.preventDefault();
        selectedDeskId = desk.id;
        render();
        openAssignmentMenu(desk, event.clientX, event.clientY);
      });

      // Assignment menu (double-click) – mirror right-click behaviour
      deskEl.addEventListener('dblclick', event => {
        // Don't fight with Shift+double-click / rotation ideas
        if (event.shiftKey) return;
        selectedDeskId = desk.id;
        render();
        openAssignmentMenu(desk, event.clientX, event.clientY);
      });
      

      // Rotate with Shift+click, otherwise select desk for rotation panel
      deskEl.addEventListener('click', event => {
        if (event.shiftKey) {
          rotateDesk(desk.id);
          return;
        }

        selectedDeskId = desk.id;
        render();
      });

      canvas.appendChild(deskEl);
    });

    rootEl.appendChild(controls);
    rootEl.appendChild(canvas);
  }

        // ---------- Desk Creation ----------

  function createDesk() {
    const desks = getWorkingDesks();

    // Find the highest existing numeric suffix for ids like "desk-12"
    let maxIndex = 0;
    desks.forEach(d => {
      const match = /^desk-(\d+)$/.exec(d.id || '');
      if (match) {
        const num = parseInt(match[1], 10);
        if (!Number.isNaN(num) && num > maxIndex) {
          maxIndex = num;
        }
      }
    });

    const newId = `desk-${maxIndex + 1 || desks.length + 1}`;

    // Default position near the centre of the canvas if possible
    let x = 80;
    let y = 80;
    if (rootEl) {
      const canvas = rootEl.querySelector('.ce-seating-editor-canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        // Desk visual size is ~100x60 in CSS
        x = Math.round(rect.width / 2 - 50);
        y = Math.round(rect.height / 2 - 30);
      }
    }

    desks.push({
      id: newId,
      x,
      y,
      rotation: 0,
      defaultOccupantId: null
    });

    // Immediately select + highlight the new desk
    selectedDeskId = newId;
    render();
  }

  // ---------- Drag Handlers ----------

  function onDeskMouseDown(event) {
    const target = event.currentTarget;
    const deskId = target && target.dataset.deskId;
    if (!deskId) return;

    const rect = target.getBoundingClientRect();

    dragState = {
      deskId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startClientX: event.clientX,
      startClientY: event.clientY,
      active: false // becomes true only after movement threshold
    };

    window.addEventListener('mousemove', onDeskMouseMove);
    window.addEventListener('mouseup', onDeskMouseUp);

    event.preventDefault();
  }

  function onDeskMouseMove(event) {
    if (!dragState || !rootEl) return;

    const canvas = rootEl.querySelector('.ce-seating-editor-canvas');
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const desk = getWorkingDesks().find(d => d.id === dragState.deskId);
    if (!desk) return;

    // Require a small movement before we treat this as a drag
    const dx0 = event.clientX - dragState.startClientX;
    const dy0 = event.clientY - dragState.startClientY;
    const distanceSq = dx0 * dx0 + dy0 * dy0;
    const THRESHOLD = 3; // pixels

    if (!dragState.active) {
      if (distanceSq < THRESHOLD * THRESHOLD) {
        // Mouse hasn't moved far enough yet; don't move the desk
        return;
      }
      // Now we consider this a real drag
      dragState.active = true;
    }

    let x = event.clientX - canvasRect.left - dragState.offsetX;
    let y = event.clientY - canvasRect.top - dragState.offsetY;

    // Snap to 5px grid
    x = Math.round(x / 5) * 5;
    y = Math.round(y / 5) * 5;

    desk.x = x;
    desk.y = y;

    const deskEl = canvas.querySelector(`[data-desk-id="${desk.id}"]`);
    if (deskEl) {
      deskEl.style.left = `${desk.x}px`;
      deskEl.style.top = `${desk.y}px`;
    }
  }

  function onDeskMouseUp() {
    if (!dragState) return;

    window.removeEventListener('mousemove', onDeskMouseMove);
    window.removeEventListener('mouseup', onDeskMouseUp);

    dragState = null;
  }

  // ---------- Assignment Menu ----------

  let menuEl = null;

  function ensureMenuContainer() {
    if (menuEl && document.body.contains(menuEl)) return menuEl;

    menuEl = document.createElement('div');
    menuEl.className = 'ce-seating-editor-menu';
    menuEl.style.position = 'fixed';
    menuEl.style.minWidth = '200px';
    menuEl.style.background = '#ffffff';
    menuEl.style.border = '1px solid rgba(0,0,0,0.15)';
    menuEl.style.borderRadius = '6px';
    menuEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.25)';
    menuEl.style.padding = '6px 8px';
    menuEl.style.fontSize = '12px';
    menuEl.style.zIndex = '9999';

    document.body.appendChild(menuEl);
    return menuEl;
  }

  function closeMenu() {
    if (menuEl && menuEl.style) {
      menuEl.style.display = 'none';
    }
  }

  function openAssignmentMenu(desk, clientX, clientY) {
    const menu = ensureMenuContainer();
    menu.innerHTML = '';

    const title = document.createElement('div');
    title.textContent = `Desk ${desk.id}`;
    title.style.fontWeight = '600';
    title.style.marginBottom = '4px';

    const current = document.createElement('div');
    current.style.marginBottom = '6px';
    const student = desk.defaultOccupantId
      ? getStudentById(desk.defaultOccupantId)
      : null;
    current.textContent = 'Current: ' + (student
      ? (student.name || student.displayName || student.id)
      : 'Unassigned');

    const unassigned = getUnassignedStudents();

    const select = document.createElement('select');
    select.style.width = '100%';
    select.style.marginBottom = '4px';

    const optNone = document.createElement('option');
    optNone.value = '';
    optNone.textContent = '— Unassigned —';
    select.appendChild(optNone);

    unassigned.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name || s.displayName || s.id;
      select.appendChild(opt);
    });

    if (desk.defaultOccupantId) {
      select.value = desk.defaultOccupantId;
    }

    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply';
    applyBtn.style.marginRight = '6px';
    applyBtn.onclick = () => {
      const newId = select.value || null;
      desk.defaultOccupantId = newId;
      closeMenu();
      render();
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
      closeMenu();
    };

    const unassignBtn = document.createElement('button');
    unassignBtn.textContent = 'Unassign';
    unassignBtn.style.marginLeft = '6px';
    unassignBtn.onclick = () => {
      desk.defaultOccupantId = null;
      closeMenu();
      render();
    };

    menu.appendChild(title);
    menu.appendChild(current);
    menu.appendChild(select);
    menu.appendChild(applyBtn);
    menu.appendChild(cancelBtn);
    menu.appendChild(unassignBtn);

    menu.style.left = `${clientX + 4}px`;
    menu.style.top = `${clientY + 4}px`;
    menu.style.display = 'block';
  }

  // Close menu on escape or click outside
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });

  window.addEventListener('click', event => {
    if (!menuEl || menuEl.style.display !== 'block') return;
    if (menuEl.contains(event.target)) return;
    closeMenu();
  });

  // ---------- Rotation ----------

  function normaliseDegrees(value) {
    if (typeof value !== 'number' || isNaN(value)) return 0;
    let d = value % 360;
    if (d < 0) d += 360;
    return d;
  }

  function rotateDesk(deskId, delta = 90) {
    const desk = getWorkingDesks().find(d => d.id === deskId);
    if (!desk) return;

    const current = typeof desk.rotation === 'number' ? desk.rotation : 0;
    desk.rotation = normaliseDegrees(current + delta);

    render();
  }

  function setDeskRotation(deskId, degrees) {
    const desk = getWorkingDesks().find(d => d.id === deskId);
    if (!desk) return;

    desk.rotation = normaliseDegrees(degrees);
    render();
  }

  function nudgeSelectedDeskRotation(delta) {
    if (!selectedDeskId) return;
    rotateDesk(selectedDeskId, delta);
  }


  // ---------- Public API ----------

  function mount(host) {
    if (!host || !host.appendChild) {
      log('mount() called without valid host');
      return;
    }

    hostEl = host;

    if (!rootEl) {
      rootEl = createRoot();
    }

    if (!hostEl.contains(rootEl)) {
      hostEl.appendChild(rootEl);
    }

    isMounted = true;
    
    // Auto-reseed if layout is empty but roster exists (first real load)
   if (
     Array.isArray(workingLayout?.desks) &&
     workingLayout.desks.length === 0 &&
     getRoster().length > 0
   ) {
     workingLayout.desks = seedDesksFromRoster();
     commitLayout();
   }

    render();

    log('Seating Editor mounted');
  }

  function unmount() {
    if (!isMounted) return;

    if (rootEl && rootEl.parentNode) {
      rootEl.parentNode.removeChild(rootEl);
    }

    isMounted = false;
    hostEl = null;

    log('Seating Editor unmounted');
  }

  // Expose for base layer controller + dev tools
  window.__CE_SEATING_EDITOR = {
    mount,
    unmount,
    getWorkingLayout: () => workingLayout
      ? { desks: workingLayout.desks.map(d => ({ ...d })) }
      : null,
    commitLayout
  };

  log('Seating Editor module initialised');

})();

