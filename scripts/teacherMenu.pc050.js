/* =========================================================
   PC#050 – Teacher Menu – Class Economy Window
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C)
   Role:
     - Administrative controls only (no direct scoring math here)
     - Opens from "Class Economy" title strip
     - Emits clean Events for other modules to handle
     - Buttons:
       Pause lesson, Resume, Edit bell time,
       Bank tokens, Download CSV/JSON, Upload CSV/JSON,
       Edit names, Edit seating plan, Engagement Boost
========================================================= */

import * as Events from './events.js';

const MENU_ID = 'teacher-menu';


// --------------------------------------------------------
// Helpers
// --------------------------------------------------------

function getBus() {
  // Prefer bootstrapped event bus if present
  return window.__CE_BOOT?.CE?.modules?.Events || Events;
}

function getCanvas() {
  return window.__CE_CANVAS || null;
}

function isOpen() {
  const Canvas = getCanvas();
  if (!Canvas) return false;
  return !!(Canvas.windows && Canvas.windows[MENU_ID]);
}

function getWindowRoot() {
  const Canvas = getCanvas();
  if (Canvas && Canvas.windows && Canvas.windows[MENU_ID]) {
    return Canvas.windows[MENU_ID];
  }
  // Fallback: query by class name
  return document.querySelector('.canvas-window.teacher-menu-window') || null;
}

// --------------------------------------------------------
// Window Content
// --------------------------------------------------------

function buildContent() {
  const currentBoost =
    window.__CE_BOOT?.CE?.modules?.Dashboard?.getLessonBoost?.() ?? 1;

  // Header + close button are provided by Canvas Host; we only render the body.
  return `
    <div class="tm-panel">

      <div class="tm-row">
        <button type="button" class="tm-btn" data-tm-action="pause">
          Pause lesson
        </button>
        <button type="button" class="tm-btn" data-tm-action="resume">
          Resume
        </button>
        <button type="button" class="tm-btn" data-tm-action="endtime">
          Edit bell time…
        </button>
      </div>

      <div class="tm-row">
        <button type="button" class="tm-btn tm-btn-primary" data-tm-action="bank">
          Bank unbanked tokens
        </button>
        <button type="button" class="tm-btn" data-tm-action="csv">
          Download CSV
        </button>
        <button type="button" class="tm-btn" data-tm-action="json">
          Download JSON
        </button>
        <button type="button" class="tm-btn" data-tm-action="upload">
          Upload CSV/JSON
        </button>
      </div>

      <div class="tm-row">
        <button type="button" class="tm-btn" data-tm-action="names">
          Edit names…
        </button>
        <button type="button" class="tm-btn" data-tm-action="seating">
          Edit seating plan…
        </button>
      </div>

      <div class="tm-row">
        <button type="button" class="tm-btn" data-tm-action="logout">
          Logout / Switch user
        </button>
      </div>


      <div class="tm-row tm-row-boost">
        <button type="button" class="tm-btn" data-tm-action="boost" id="tm-boost">
          Engagement Boost: +${currentBoost}
        </button>
        <span class="tm-note">Work Phase 4</span>
      </div>

    </div>
  `;
}

// --------------------------------------------------------
// Open / Close
// --------------------------------------------------------

function openMenu() {
  const Canvas = getCanvas();
  if (!Canvas) return;

  Canvas.open({
    id: MENU_ID,
    title: 'Teacher Menu – Class Economy',
    content: buildContent(),
    mode: 'modal teacher-menu-window',
  });

  wireWindow();
}

function closeMenu() {
  const Canvas = getCanvas();
  if (!Canvas) return;
  Canvas.close(MENU_ID);
}

function toggleMenu(evt) {
  if (evt && typeof evt.preventDefault === 'function') evt.preventDefault();
  if (isOpen()) closeMenu();
  else openMenu();
}

// --------------------------------------------------------
// Seating Plan Placeholder
// --------------------------------------------------------

function openSeatingPlanPlaceholder() {
  const Canvas = getCanvas();
  if (!Canvas) {
    // If for some reason Canvas is unavailable, just emit a hook.
    const Ev = getBus();
    Ev.emit('seating:edit', { ts: Date.now(), source: 'teacher-menu' });
    return;
  }

  // Open the Seating Plan window as a large, centred editor host
  Canvas.open({
    id: 'seating-plan',
    title: 'Seating Plan Editor',
    content: `
      <div class="seating-plan-host" style="width:100%; height:100%; padding:0; margin:0;">
        <!-- PC077 Seating Editor will mount into this body -->
      </div>
    `,
    mode: 'modal seating-plan-window',
  });

  const win = Canvas.windows['seating-plan'];
  if (!win) return;

  // Make this window big and central, not squeezed like the teacher menu
  win.style.position = 'fixed';
  win.style.top = '10vh';
  win.style.left = '20vw';
  win.style.width = '75vw';
  win.style.height = '80vh';
  win.style.maxWidth = 'none';
  win.style.maxHeight = 'none';

  // Ensure the body fills the window and gives all space to the editor
  const body = win.querySelector('.canvas-body') || win;
  body.style.height = 'calc(100% - 40px)'; // header ~40px
  body.style.padding = '0';
  body.style.overflow = 'hidden';

  // Use the dedicated host if present, otherwise fall back to body
  const host = body.querySelector('.seating-plan-host') || body;

  if (window.__CE_SEATING_EDITOR?.mount) {
    window.__CE_SEATING_EDITOR.mount(host);
  }
}




// --------------------------------------------------------
// Engagement Boost Helpers
// --------------------------------------------------------

function updateBoostLabel(button) {
  if (!button) return;
  const currentBoost =
    window.__CE_BOOT?.CE?.modules?.Dashboard?.getLessonBoost?.() ?? 1;
  button.textContent = `Engagement Boost: +${currentBoost}`;
}

function cycleBoost(Ev, button) {
  const Dashboard = window.__CE_BOOT?.CE?.modules?.Dashboard || null;
  if (!Dashboard?.cycleLessonBoost) return;
  Dashboard.cycleLessonBoost();
  updateBoostLabel(button);
}

// --------------------------------------------------------
// Wire Events
// --------------------------------------------------------

function wireWindow() {
  const root = getWindowRoot();
  if (!root) return;

  const body = root.querySelector('.canvas-body') || root;
  const Ev = getBus();
  const q = (sel) => body.querySelector(sel);
  const __IS_TIMED = !!window.__CE_BOOT?.CE?.timedMode;

  function hideIfAdvisory(el) {
    if (!el) return;
    if (!__IS_TIMED) {
      el.style.display = 'none';
    }
  }

  // Lesson controls
  const pauseBtn = q('[data-tm-action="pause"]');
  hideIfAdvisory(pauseBtn);
  pauseBtn?.addEventListener('click', () => {
    Ev.emit('lesson:pause', { ts: Date.now(), source: 'teacher-menu' });
  });

  const resumeBtn = q('[data-tm-action="resume"]');
  hideIfAdvisory(resumeBtn);
  resumeBtn?.addEventListener('click', () => {
    Ev.emit('lesson:resume', { ts: Date.now(), source: 'teacher-menu' });
  });

  const endtimeBtn = q('[data-tm-action="endtime"]');
  hideIfAdvisory(endtimeBtn);
  endtimeBtn?.addEventListener('click', () => {
    const current =
      window.__CE_BOOT?.CE?.modules?.Dashboard?.session?.endTime || '';
    const next = window.prompt('Set lesson end time (HH:MM)', current || '14:55');
    if (!next) return;
    Ev.emit('lesson:setEndTime', {
      ts: Date.now(),
      time: String(next),
      source: 'teacher-menu',
    });
  });

  // Banking & export
  q('[data-tm-action="bank"]')?.addEventListener('click', () => {
    Ev.emit('bank:run', { ts: Date.now(), source: 'teacher-menu' });
  });

  q('[data-tm-action="csv"]')?.addEventListener('click', () => {
    Ev.emit('teacher:download-csv');
  });

  q('[data-tm-action="json"]')?.addEventListener('click', () => {
    Ev.emit('teacher:download-json');
  });

  // Upload hook – CSV/JSON (placeholder hook, no parsing here)
  q('[data-tm-action="upload"]')?.addEventListener('click', () => {
    Ev.emit('teacher:upload');
  });

  // Roster editor
  q('[data-tm-action="names"]')?.addEventListener('click', () => {
    Ev.emit('roster:edit', { ts: Date.now(), source: 'teacher-menu' });
  });

  // Seating plan editor (placeholder window)
  q('[data-tm-action="seating"]')?.addEventListener('click', () => {
    openSeatingPlanPlaceholder();
  });

  // PC#100 – Logout / Switch user (preboot wall will re-appear)
  q('[data-tm-action="logout"]')?.addEventListener('click', () => {
    if (window.__CE_ACCOUNTS?.logout) {
      window.__CE_ACCOUNTS.logout();
      return;
    }
    try { localStorage.removeItem('ce:session:v1'); } catch {}
    try { location.reload(); } catch {}
  });

  // Engagement Boost – single button cycling +1 / +2 / +3
  const boostBtn = q('[data-tm-action="boost"]');
  if (boostBtn) {
    updateBoostLabel(boostBtn);
    boostBtn.addEventListener('click', () => cycleBoost(Ev, boostBtn));
  }
}

// --------------------------------------------------------
// Trigger Wiring
// --------------------------------------------------------

function markTriggerClickable(el) {
  if (!el) return;
  el.classList.add('tm-trigger');
  el.style.cursor = 'pointer';
  el.title = 'Open Teacher Menu';
  el.addEventListener('click', toggleMenu);
}

// Attach to the "Class Economy" title strip once DOM is ready
(function bootTeacherMenuTrigger() {
  try {
    const onReady = () => {
      const el =
        document.getElementById('title-strip') ||
        document.querySelector('#title-strip');
      if (!el) return;
      markTriggerClickable(el);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady);
    } else {
      onReady();
    }
  } catch (e) {
    console.warn('[PC#050] Teacher Menu boot failed:', e?.message || e);
  }
})();

// Dev hook
window.__CE_TM = Object.freeze({
  id: MENU_ID,
  open: openMenu,
  close: closeMenu,
  toggle: toggleMenu,
  buildContent,
});
