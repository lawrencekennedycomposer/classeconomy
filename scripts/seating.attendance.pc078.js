/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC078-A0
   Module: seating.attendance.pc078.js
   Purpose: Seating Attendance Binding (Phase C)
   Status: ACTIVE – Viewer Behaviour Overlay
   Notes:
   - Adds attendance toggle + green/grey colouring
   - Adds student name resolution to viewer desks
   - Does NOT modify SeatingLayout geometry
   - Does NOT touch editor (PC077)
   ========================================================= */

(() => {
  const MODULE_ID = 'PC078';
  const boot = (window.__CE_BOOT = window.__CE_BOOT || {});
  const Events = boot.modules?.Events;

  function log(msg) {
    console.log(`[${MODULE_ID}] ${msg}`);
  }

  // -------------------------------
  // Canon Roster Resolver
  // -------------------------------
  function getRoster() {
    const snapshot = window.Dashboard?.getRosterSnapshot?.();
    if (Array.isArray(snapshot?.students)) return snapshot.students;
    return [];
  }

  function getStudentById(id) {
    return getRoster().find(s => s.id === id) || null;
  }

  // -------------------------------
  // Attendance Resolver
  // -------------------------------
  function getAttendanceState(studentId) {
    return !!boot.SeatingAttendance?.[studentId];
  }

  function toggleAttendance(studentId) {
    if (!boot.SeatingAttendance) boot.SeatingAttendance = {};
    boot.SeatingAttendance[studentId] = !boot.SeatingAttendance[studentId];

    if (Events?.emit) {
      Events.emit('seating:attendance:toggled', {
        studentId,
        active: boot.SeatingAttendance[studentId]
      });
    }
  }

  // -------------------------------
  // Viewer Desk Overlay Binding
  // -------------------------------
  function applyAttendanceOverlay() {
  // Viewer ONLY – never bind attendance to the editor
    const desks = document.querySelectorAll('.ce-seating-desk');

    const layout = boot.SeatingLayout?.desks || [];

    desks.forEach(deskEl => {
      const deskId = deskEl.dataset?.deskId;
      const deskData = layout.find(d => d.id === deskId);
      if (!deskData || !deskData.defaultOccupantId) return;

      const student = getStudentById(deskData.defaultOccupantId);
      if (!student) return;

      // ----- APPLY NAME -----
      let label = deskEl.querySelector('.ce-seat-label');
      if (!label) {
        label = document.createElement('div');
        label.className = 'ce-seat-label';
        label.style.marginTop = '4px';
        label.style.fontSize = '11px';
        label.style.fontWeight = '600';
        label.style.textAlign = 'center';
        deskEl.appendChild(label);
      }
      label.textContent =
        student.name || student.displayName || student.id;

      // ----- APPLY COLOUR -----
      const active = getAttendanceState(student.id);
      deskEl.style.background = active ? '#2ecc71' : '#bdc3c7';

      // ----- APPLY CLICK TOGGLE (VIEWER ONLY) -----
      deskEl.style.cursor = 'pointer';
      deskEl.onclick = () => {
        toggleAttendance(student.id);
        applyAttendanceOverlay(); // re-render state visually
      };
    });
  }

  // -------------------------------
  // Lifecycle Hooks
  // -------------------------------
  function mount() {
    applyAttendanceOverlay();
    log('attendance overlay mounted');
  }

  function refresh() {
    applyAttendanceOverlay();
  }

  // React to phase changes (viewer refresh)
  if (Events?.on) {
    Events.on('lesson:phaseChange', () => {
      setTimeout(refresh, 30);
    });

    Events.on('seating:editor:exit', () => {
  // Viewer rebuild is async – re-apply twice for safety
      setTimeout(refresh, 50);
      setTimeout(refresh, 150);
    });


    Events.on('seating:layout:updated', () => {
      setTimeout(refresh, 30);
    });
  }

  // Expose minimal dev API
  window.__CE_SEATING_ATTENDANCE = {
    mount,
    refresh
  };

  log('Seating Attendance module initialised');
})();
