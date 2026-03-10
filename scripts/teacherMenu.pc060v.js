/* =========================================================
   PC#060 – Teacher Menu (Administrative Controls Only)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine v1.8 (Parts A–C)
   Notes:
     - 5 administrative buttons ONLY
     - No score-affecting actions here
     - Engagement Boost cycles +1/+2/+3 (persistent)
     - Seating Plan is placeholder
========================================================= */

import * as Events from './events.js';
import * as Dashboard from './dashboard.js';


/* ---------------------------------------------------------
   CANONICAL BUS RESOLUTION (minimal-use)
   Only used for new export/import buttons to avoid disruption.
--------------------------------------------------------- */
const __TM_Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const __TM_emit = __TM_Bus.emit || Events.emit;

const WIN_ID = 'teacher-menu';
let _boostCache = 1;

//---------------------------------------------------------
// Helpers
//---------------------------------------------------------

function getCanvas() {
  return window.__CE_CANVAS || null;
}


//---------------------------------------------------------
// Secondary Windows
//---------------------------------------------------------

function openSeatingPlanWindow() {
  const Canvas = getCanvas();
  if (!Canvas) return;

  // Open the Seating Plan window as a normal canvas window
  Canvas.open({
    id: 'seating-plan',
    title: 'Seating Plan Editor',
    content: `
      <div class="seating-plan-host" style="width:100%; height:100%; padding:0; margin:0;">
        <!-- PC077 Seating Editor will mount into this body -->
      </div>
    `,
    mode: 'modal'
  });

  // After the window is created, mount the Seating Editor into its body
  const win = Canvas.windows['seating-plan'];
  if (!win) return;

  const body = win.querySelector('.canvas-body');
  if (!body) return;

  if (window.__CE_SEATING_EDITOR?.mount) {
    window.__CE_SEATING_EDITOR.mount(body);
  }
}


function openBellTimeEditor() {
  const Canvas = getCanvas();
  if (!Canvas) return;

  const endTime = Dashboard.session?.lesson?.endTime || null;
  const display = endTime ? new Date(endTime).toLocaleTimeString() : 'Unknown';

  Canvas.open({
    id: 'bell-time',
    title: 'Edit Bell Time',
    content: `
      <div class="bt-panel">
        <div>Current Bell Time: <b>${display}</b></div>
        <label>New Time (HH:MM): <input id="bt-input" type="time"></label>
        <button id="bt-save" class="tm-btn tm-btn-primary">Save</button>
      </div>
    `,
    mode: 'modal'
  });

  const win = Canvas.windows['bell-time'];
  if (!win) return;
  const body = win.querySelector('.canvas-body');

  body.querySelector('#bt-save').addEventListener('click', () => {
    const t = body.querySelector('#bt-input').value;
    if (!t) return;

    const [h, m] = t.split(':').map(Number);
    const now = new Date();
    const newTS = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      h,
      m,
      0,
      0
    ).getTime();

    Dashboard.updateBellTime?.(newTS);
    Events.emit('lesson:bellTimeEdited', { newTime: newTS });
    Canvas.close('bell-time');
  });
}

//---------------------------------------------------------
// Engagement Boost Cycling
//---------------------------------------------------------

function cycleBoost(button) {
  Events.emit('teacher:boost:cycle');
}

function updateBoostButton(button, v) {
  button.textContent = `Engagement Boost: +${v}`;
}

//---------------------------------------------------------
// Pause/Play Lesson
//---------------------------------------------------------

function toggleLesson(button) {
  const paused = Dashboard.session?.lesson?.paused === true;

  if (paused) {
    Dashboard.resumeLesson?.();
    Events.emit('lesson:play');
    button.textContent = 'Pause Lesson';
  } else {
    Dashboard.pauseLesson?.();
    Events.emit('lesson:pause');
    button.textContent = 'Play Lesson';
  }
}

//---------------------------------------------------------
// Teacher Menu Window
//---------------------------------------------------------

function renderContent() {
  const boost = _boostCache;

  return `
    <div class="tm-panel">

      <button id="tm-edit-names" class="tm-btn tm-btn-primary">
        Edit Names
      </button>

      <button id="tm-seating" class="tm-btn">
        Edit Seating Plan
      </button>

      <button id="tm-bell" class="tm-btn">
        Edit Bell Time
      </button>

      <button id="tm-pauseplay" class="tm-btn">
        ${Dashboard.session?.lesson?.paused ? 'Play Lesson' : 'Pause Lesson'}
      </button>

      <button id="tm-boost" class="tm-btn">
        Engagement Boost: +${boost}
      </button>
      <div class="tm-note">(Work Phase 4)</div>

      <hr style="margin:10px 0; opacity:0.25;">

      <button id="tm-dl-json" class="tm-btn">
        Download JSON
      </button>

      <button id="tm-dl-csv" class="tm-btn">
        Download CSV
      </button>

      <button id="tm-ul" class="tm-btn">
        Upload JSON/CSV
      </button>


    </div>
  `;
}

function openTeacherMenu() {
  const Canvas = getCanvas();
  if (!Canvas) return;

  Canvas.open({
    id: WIN_ID,
    title: 'Teacher Menu',
    content: renderContent(),
    mode: 'modal teacher-menu-window'
  });

  wireMenuEvents();

  Events.emit('teacher:boost:request');
}

//---------------------------------------------------------
// Event Binding
//---------------------------------------------------------

function wireMenuEvents() {
  const Canvas = getCanvas();
  const win = Canvas.windows[WIN_ID];
  if (!win) return;

  const body = win.querySelector('.canvas-body');

  // Edit Names (external module handles actual editor)
  body.querySelector('#tm-edit-names')
      .addEventListener('click', () => Events.emit('roster:edit'));

  // Seating Plan
  body.querySelector('#tm-seating')
      .addEventListener('click', openSeatingPlanWindow);

  // Bell Time
  body.querySelector('#tm-bell')
      .addEventListener('click', openBellTimeEditor);

  // Pause / Play
  const pauseBtn = body.querySelector('#tm-pauseplay');
  pauseBtn.addEventListener('click', () => toggleLesson(pauseBtn));

  // Engagement Boost
  const boostBtn = body.querySelector('#tm-boost');
  boostBtn.addEventListener('click', () => cycleBoost(boostBtn));

  // Export / Import (events only)
  body.querySelector('#tm-dl-json')
      .addEventListener('click', () => __TM_emit('teacher:download-json'));

  body.querySelector('#tm-dl-csv')
      .addEventListener('click', () => __TM_emit('teacher:download-csv'));

  body.querySelector('#tm-ul')
      .addEventListener('click', () => __TM_emit('teacher:upload'));
}

//---------------------------------------------------------
// Canonical Trigger
//---------------------------------------------------------

Events.on('teacher:menu', openTeacherMenu);

Events.on('teacher:boost:value', (e) => {
  const v = Number(e?.detail?.value || 1);
  _boostCache = (v >= 1 && v <= 3) ? v : 1;

  try {
    const Canvas = getCanvas();
    const win = Canvas?.windows?.[WIN_ID];
    const body = win?.querySelector?.('.canvas-body');
    const btn = body?.querySelector?.('#tm-boost');
    if (btn) updateBoostButton(btn, _boostCache);
  } catch {}
});


// Dev handle
window.__CE_TEACHER_MENU = Object.freeze({
  open: openTeacherMenu
});
