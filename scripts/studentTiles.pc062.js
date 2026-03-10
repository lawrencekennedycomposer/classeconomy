/* =========================================================
   PC#062 – Student Tiles (Hotkey Target + Tile Actions)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C)
   Role:
     - Invisible tile layer on leaderboard rows
     - Single-click: select student (hotkey target)
     - Double-click: open small tile window (score + status)
     - Hotkeys 6/7/8/9 → +1 / -1 / Swear(-1) / What's Up?(loop)
     - Inactive students: no scoring (manual or hotkeys)
     - All scoring uses Dashboard.applyAward (canon path)
========================================================= */

import * as Events from './events.js';
import * as Dashboard from './dashboard.js';
import * as Storage from './storage.js';



const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const on   = Bus.on   || Events.on;
const emit = Bus.emit || Events.emit;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || Bus.EVENTS || {};

const Canvas = window.__CE_CANVAS;

const TILE_WINDOW_ID = '';
let _selectedId = null;
let _tilesEnabled = true;
const _tileLockUntil = Object.create(null);// PC062 – per-tile 2s lockout

/* =========================================================
   Style (highlight + tile window)
========================================================= */

(function ensureStyle() {
  if (document.getElementById('pc062-student-tiles-style')) return;

  const s = document.createElement('style');
  s.id = 'pc062-student-tiles-style';
  s.textContent = `
    /* Selected leaderboard row (hotkey target) */
    .lb-item.lb-item--selected {
      outline: 2px solid rgba(0, 200, 255, 0.9);
      outline-offset: 2px;
      background: rgba(0, 80, 120, 0.25);
    }

    .lb-item.is-inactive {
      opacity: 0.45;
    }    
    
    /* Leaderboard penalty flash (red) and bonus flash (green) */
    .lb-item.lb-item--penalty-flash {
      animation: lb-penalty-flash 900ms ease-out 0s 2;
    }

    .lb-item.lb-item--bonus-flash {
      animation: lb-bonus-flash 900ms ease-out 0s 1;
    }

    .lb-item.lb-item--turn-flash {
      animation: lb-turn-flash 900ms ease-out 0s 1;
    }

    @keyframes lb-penalty-flash {
      0%   { background-color: rgba(255, 0, 0, 0.10); }
      25%  { background-color: rgba(255, 0, 0, 0.80); }
      50%  { background-color: rgba(255, 0, 0, 0.20); }
      75%  { background-color: rgba(255, 0, 0, 0.80); }
      100% { background-color: rgba(255, 0, 0, 0.00); }
    }

    @keyframes lb-bonus-flash {
      0%   { background-color: rgba(0, 180, 0, 0.10); }
      25%  { background-color: rgba(0, 220, 0, 0.85); }
      50%  { background-color: rgba(0, 180, 0, 0.25); }
      75%  { background-color: rgba(0, 220, 0, 0.85); }
      100% { background-color: rgba(0, 180, 0, 0.00); }
    }

    @keyframes lb-turn-flash {
      0%   { background-color: rgba(255, 165, 0, 0.10); }
      25%  { background-color: rgba(255, 165, 0, 0.85); }
      50%  { background-color: rgba(255, 165, 0, 0.25); }
      75%  { background-color: rgba(255, 165, 0, 0.85); }
      100% { background-color: rgba(255, 165, 0, 0.00); }
    }




    /* Small tile window */
    .canvas-window.student-tile {
      width: 220px;
      max-width: 240px;
      font-size: 14px;
    }

    .student-tile-body {
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .student-tile-name {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .student-tile-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }

    .student-tile-grid button {
      padding: 4px 6px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-size: 13px;
      background: #222;
      color: #eee;
    }

    .student-tile-grid button:hover {
      background: #333;
    }

    .student-tile-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
    }

    .student-tile-active-toggle {
      padding: 3px 8px;
      border-radius: 999px;
      border: none;
      cursor: pointer;
      font-size: 12px;
    }

    .student-tile-active-toggle.is-active {
      background: #124d1e;
      color: #baffc0;
    }

    .student-tile-active-toggle.is-inactive {
      background: #5a1717;
      color: #ffd3d3;
    }

    .student-tile-status-label {
      opacity: 0.7;
      font-size: 12px;
    }    
    
    /* Student Tile – hide Canvas header bar and X button */
    .canvas-window.student-tile .canvas-window-header {
      display: none !important;
      height: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
    }

    .canvas-window.student-tile .canvas-window-header button {
      display: none !important;
    }
  `;
  document.head.appendChild(s);
})();


/* =========================================================
   Core helpers
========================================================= */

function getRoster() {
  try {
    const snap = Dashboard.getRosterSnapshot();
    return snap && Array.isArray(snap.students) ? snap.students.slice() : [];
  } catch {
    return [];
  }
}

function findStudentById(id) {
  const students = getRoster();
  return students.find(s => String(s.id) === String(id)) || null;
}

function isTeacherMenuOpenId(id) {
  return id === 'teacher-menu';
}

function isTeacherMenuOpenEvent(payload) {
  return payload && isTeacherMenuOpenId(payload.id);
}

function enableOutsideClose(win) {
  if (!win) return;

  function onClick(evt) {
    // If click is inside the tile window, ignore
    if (win.contains(evt.target)) return;

    // Click is outside the tile → close it
    if (typeof Canvas?.close === 'function') {
      Canvas.close(TILE_WINDOW_ID);
    }

    // Remove listener once we've closed it
    document.removeEventListener('mousedown', onClick);
  }

  document.addEventListener('mousedown', onClick);
}

/* =========================================================
   Leaderboard binding (tiles live on lb-item elements)
========================================================= */

function getLbList() {
  return document.querySelector('.leaderboard .lb-list');
}

function getLeaderboardHost() {
  // This container is stable even when PC#051 rebuilds the lb-list via innerHTML.
  return document.getElementById('leaderboard') || document.querySelector('.leaderboard');
}

let _delegatedBound = false;

function bindDelegatedTileHandlers() {
  const host = getLeaderboardHost();
  if (!host || _delegatedBound) return;
  _delegatedBound = true;

  // Capture-phase so clicks still register even if some other UI stops bubbling.
  host.addEventListener(
    'click',
    (evt) => {
      if (!_tilesEnabled) return;
      const li = evt.target.closest?.('.lb-item');
      if (!li || !host.contains(li)) return;
      handleTileClick(li);
    },
    true
  );

  host.addEventListener(
    'dblclick',
    (evt) => {
      if (!_tilesEnabled) return;
      const li = evt.target.closest?.('.lb-item');
      if (!li || !host.contains(li)) return;
      handleTileDblClick(li);
    },
    true
  );
}

function bindTilesToLeaderboard() {
  const list = getLbList();
  if (!list) return;

  const students = getRoster();
  const items = Array.from(list.querySelectorAll('.lb-item'));

  items.forEach((li, index) => {
    const student = students[index];
    if (!student) return;

    // NOTE:
    // PC#051 already stamps data-student-id / data-student-name on each lb-item.
    // Do NOT attach per-li listeners here — PC#051 rebuilds the list via innerHTML,
    // which destroys those listeners and creates "sometimes dead" tiles.
  });

  refreshSelectionHighlight();
}

function refreshSelectionHighlight() {
  const list = getLbList();
  if (!list) return;

  const items = Array.from(list.querySelectorAll('.lb-item'));
  items.forEach(li => {
    const id = li.dataset.studentId || '';
    if (id && id === _selectedId) {
      li.classList.add('lb-item--selected');
    } else {
      li.classList.remove('lb-item--selected');
    }
  });
}

function clearTileSelection() {
  _selectedId = null;
  refreshSelectionHighlight();
}

function onGlobalClickOff(evt) {
  if (!_tilesEnabled) return;

  const lbRoot = document.querySelector('.leaderboard');
  if (!lbRoot) return;

  const target = evt.target;

  // 1) Clicks inside the leaderboard DO NOT clear selection
  if (lbRoot.contains(target)) return;

  // 2) Clicks inside the student tile window DO NOT clear either
  const tileWin = document.getElementById(TILE_WINDOW_ID);
  if (tileWin && tileWin.contains(target)) return;

  // 3) Anything else → clear the selection
  clearTileSelection();
}



function flashLeaderboardStudent(studentId, type) {
  const list = getLbList();
  if (!list) return;

  const li = list.querySelector(`.lb-item[data-student-id="${String(studentId)}"]`);
  if (!li) return;

  let className = null;
  if (type === 'bonus') {
    className = 'lb-item--bonus-flash';
  } else if (type === 'penalty') {
    className = 'lb-item--penalty-flash';
  } else if (type === 'turn') {
    className = 'lb-item--turn-flash';
  } else {
    return;
  }

  li.classList.add(className);
  setTimeout(() => {
    li.classList.remove(className);
  }, 1800);
}
 
 // [PC#082] Expose leaderboard flash helper for other modules (e.g., Phase 1 Begin awards)
 // Additive-only: does not change tile behaviour; just exports a callable reference.
 (function exposeFlashHelper() {
   const root = (window.__CE_FLASH = window.__CE_FLASH || {});
   root.flashLeaderboardStudent = flashLeaderboardStudent;
 })();


/* =========================================================
   Tile click / double-click
========================================================= */

function onTileClick(evt) {
  if (!_tilesEnabled) return;
  const li = evt.currentTarget;
  if (!li) return;
  handleTileClick(li);
}

function onTileDblClick(evt) {
  if (!_tilesEnabled) return;
  const li = evt.currentTarget;
  if (!li) return;
  handleTileDblClick(li);
}

function handleTileClick(li) {
  const id = li.dataset.studentId;
  const name = li.dataset.studentName || '';

  if (!id) return;

  _selectedId = id;
  try {
    Dashboard.setActiveStudent(id, name);
  } catch {}

  refreshSelectionHighlight();
}

function handleTileDblClick(li) {
  const id = li.dataset.studentId;
  const name = li.dataset.studentName || '';

  if (!id || !Canvas) return;

  _selectedId = id;
  try {
    Dashboard.setActiveStudent(id, name);
  } catch {}

  refreshSelectionHighlight();
  openTileWindow(li, id, name);
}

/* =========================================================
   Tile window
========================================================= */

function openTileWindow(anchorEl, id, name) {
  const student = findStudentById(id);
  const active = student ? !!student.active : true;

  const content = `
    <div class="student-tile-body" data-student-id="${id}">
      <div class="student-tile-name">${name || 'Student'}</div>
      <div class="student-tile-grid">
        <button type="button" data-st-action="plus">+1</button>
        <button type="button" data-st-action="minus">-1</button>
        <button type="button" data-st-action="swear">Swear</button>
        <button type="button" data-st-action="whatsup">What’s Up?</button>
      </div>
      <div class="student-tile-footer">
        <span class="student-tile-status-label">Status</span>
        <button type="button"
          class="student-tile-active-toggle ${active ? 'is-active' : 'is-inactive'}"
          data-st-action="toggle-active">
          ${active ? 'Active' : 'Inactive'}
        </button>
      </div>
    </div>
  `;

  Canvas.open({
    id: TILE_WINDOW_ID,
    title: '',
    content,
    mode: 'modal student-tile'
  });

  const win = Canvas.windows?.[TILE_WINDOW_ID];
  if (win) {
    enableOutsideClose(win);  
    positionTileWindow(win, anchorEl);
    wireTileWindow(win, id);
  }
}

function positionTileWindow(win, anchorEl) {
  try {
    const host = Canvas.el || document.getElementById('activity-canvas');
    if (!host) return;

    const hostRect   = host.getBoundingClientRect();
    const rowRect    = anchorEl.getBoundingClientRect();
    const winRect    = win.getBoundingClientRect();

    // Target vertical alignment with row; keep within host bounds
    let top = rowRect.top;
    const minTop = hostRect.top + 8;
    const maxTop = hostRect.bottom - winRect.height - 8;

    if (top < minTop) top = minTop;
    if (top > maxTop) top = maxTop;

    // Always sit inside active area, slightly inset from left
    const left = hostRect.left + 16;

    win.style.position = 'fixed';
    win.style.top = `${top}px`;
    win.style.left = `${left}px`;
  } catch {
    // Safe to ignore; default centering will still work
  }
}

function wireTileWindow(win, studentId) {
  const body = win.querySelector('.student-tile-body');
  if (!body) return;

  body.addEventListener('click', (evt) => {
    const btn = evt.target.closest('button[data-st-action]');
    if (!btn) return;

    const action = btn.dataset.stAction;
    if (!action) return;

    if (action === 'toggle-active') {
      toggleActive(studentId, btn);
      return;
    }

    // All 4 scoring actions should close the window after firing
    handleScoreAction(studentId, action);
    Canvas.close?.(TILE_WINDOW_ID);
  });
}

/* =========================================================
   Scoring + Active toggle
========================================================= */

function handleScoreAction(studentId, action) {
  const student = findStudentById(studentId);
  if (!student) return;

  // -------------------------------------------------------
  // PC062 – 2-second per-tile lockout (B1: whole tile)
  // Applies to ALL actions on this student (plus/minus/swear/whatsup)
  // -------------------------------------------------------
  // -------------------------------------------------------
  // PC062 – 2-second per-tile lockout (B1: whole tile)
  // Applies to ALL SCORING actions on this student.
  // We do NOT block the 'whatsup' action itself so 9 can still start/resolve.
  // -------------------------------------------------------
  if (action !== 'whatsup') {
    const now = Date.now();
    const lockUntil = _tileLockUntil[studentId];
    if (lockUntil && lockUntil > now) {
      console.warn('[PC#062] Tile locked for student', studentId, 'until', lockUntil);
      return;
    }
  }


  // Inactive = NO scoring at all
  if (!student.active) {
    return;
  }

  // -------------------------------------------------------
  // WHAT'S UP? behaviour delegation (PC#063)
  //  - If no incident is active → start (and set tile lock)
  //  - If an incident is active → resolve/cancel (no scoring here)
  // -------------------------------------------------------
  if (action === 'whatsup') {
    const behaviour = window.__CE_BEHAVIOUR && window.__CE_BEHAVIOUR.whatsUp;

    if (!behaviour) {
      console.warn('[PC#062] What’s Up behaviour module not available – no action taken');
      return;
    }

    try {
      const isActive =
        typeof behaviour.isActive === 'function'
          ? !!behaviour.isActive()
          : false;

      if (isActive) {
        // Resolve/cancel existing incident – lock stays as-is; it’ll auto-expire
        if (typeof behaviour.resolveActive === 'function') {
          behaviour.resolveActive();
        } else if (typeof behaviour.cancelActive === 'function') {
          behaviour.cancelActive();
        } else {
          console.warn('[PC#062] What’s Up behaviour module has no resolve/cancel handlers');
        }
      } else {
        // Start new incident AND lock this tile for 2 seconds
        if (typeof behaviour.startForStudent === 'function') {
          behaviour.startForStudent(studentId, student.name || '');
          _tileLockUntil[studentId] = Date.now() + 1000;
        } else {
          console.warn('[PC#062] What’s Up behaviour module missing startForStudent()');
        }
      }
    } catch (err) {
      console.warn('[PC#062] Error while delegating What’s Up action', err);
    }

    return;
  }

  // -------------------------------------------------------
  // Normal scoring (+1 / -1 / Swear)
  // -------------------------------------------------------
  let delta = 0;
  let reason = '';
  let isBonus = false;
  let isPenalty = false;

  switch (action) {
    case 'plus':
      delta = +1;
      reason = 'tile:+1';
      isBonus = true;
      break;

    case 'minus':
      delta = -1;
      reason = 'tile:-1';
      isPenalty = true;
      break;

    case 'swear':
      delta = -1;
      reason = 'Penalty.SwearJar';
      isPenalty = true;
      break;

    default:
      return;
  }

  try {
    Dashboard.applyAward({
      studentId,
      points: delta,
      reason,
      phase: null
    });

    if (isBonus) {
      flashLeaderboardStudent(studentId, 'bonus');
    } else if (isPenalty) {
      flashLeaderboardStudent(studentId, 'penalty');
    }

    if (reason === 'Penalty.SwearJar') {
      try {
        showSwearJarAnimation({ studentId });
      } catch (err) {
        console.warn('[PC#063] Swear Jar animation error', err);
      }
    }
    
        // Lock this tile for 2 seconds after any manual scoring action
    _tileLockUntil[studentId] = Date.now() + 1000;

  } catch (e) {
    console.warn('[PC#062] applyAward failed for student tile action', e);
  }
}






function toggleActive(studentId, btnEl) {
  const snap = Dashboard.getRosterSnapshot();
  const students = snap && Array.isArray(snap.students)
    ? snap.students.slice()
    : [];

  const updated = students.map(s => {
    if (String(s.id) === String(studentId)) {
      return { ...s, active: !s.active };
    }
    return s;
  });

  Storage.writeJSON(Storage.KEYS.ROSTER_V1, { students: updated });

    const nowActive = !!updated.find(
    s => String(s.id) === String(studentId)
  )?.active;

  // --- Stage 4: Mirror tile active → SeatingAttendance ---
  const boot = window.__CE_BOOT;
  if (boot?.SeatingAttendance) {
    boot.SeatingAttendance[studentId] = nowActive;
  }


  // Update button UI
  if (btnEl) {
    btnEl.classList.toggle('is-active', nowActive);
    btnEl.classList.toggle('is-inactive', !nowActive);
    btnEl.textContent = nowActive ? 'Active' : 'Inactive';
  }

  try {
    emit('roster:updated', { ts: Date.now(), count: updated.length });
    emit('scores:updated', { ts: Date.now(), reason: 'tiles:active-toggle' });
  } catch {}
}

/* =========================================================
   Hotkeys 6 / 7 / 8 / 9
========================================================= */

function onKeyDown(evt) {
  if (!_tilesEnabled) return;

  // Ignore if typing into an input/textarea/etc
  const tag = (evt.target && evt.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const key = evt.key;

  // -------------------------------------------------------
  // Hotkey 9 – global rule:
  //  1) If What's Up is active → resolve it (no student needed)
  //  2) If not active and a tile is selected → start What's Up
  // -------------------------------------------------------
  if (key === '9') {
    const behaviour = window.__CE_BEHAVIOUR && window.__CE_BEHAVIOUR.whatsUp;
    const isActive =
      behaviour &&
      typeof behaviour.isActive === 'function' &&
      !!behaviour.isActive();

    if (isActive) {
      // Always resolve first if overlay is active
      evt.preventDefault();
      if (typeof behaviour.resolveActive === 'function') {
        behaviour.resolveActive();
      } else if (typeof behaviour.cancelActive === 'function') {
        behaviour.cancelActive();
      }
      return;
    }

    // Not active → only start if a student is selected
    if (!_selectedId) return;

    evt.preventDefault();
    handleScoreAction(_selectedId, 'whatsup');
    return;
  }

  // -------------------------------------------------------
  // Other hotkeys (6/7/8) – require a selected tile
  // -------------------------------------------------------
  if (!_selectedId) return;

  let action = null;

  switch (key) {
    case '6':
      action = 'plus';
      break;
    case '7':
      action = 'minus';
      break;
    case '8':
      action = 'swear';
      break;
    default:
      return;
  }

  evt.preventDefault();
  handleScoreAction(_selectedId, action);
}


/* =========================================================
   Teacher menu lockout & roster refresh
========================================================= */

function handleUiWindowOpen(payload) {
  if (!isTeacherMenuOpenEvent(payload)) return;
  _tilesEnabled = false;
  Canvas?.close?.(TILE_WINDOW_ID);
  _selectedId = null;
  refreshSelectionHighlight();
}

function handleUiWindowClose(payload) {
  if (!isTeacherMenuOpenEvent(payload)) return;
  _tilesEnabled = true;
  // No auto-selection on close – teacher must click a tile again
}

function handleRosterUpdated() {
  // Re-bind after roster changes (names, active flags, etc)
  // Click handling is delegated to the stable leaderboard host, so no rebinding needed.
  refreshSelectionHighlight();
}

/* =========================================================
   Init
========================================================= */

function initStudentTiles() {
  try {
    // One-time delegated binding on stable container (survives PC#051 innerHTML rebuilds)
    bindDelegatedTileHandlers();
    refreshSelectionHighlight();

    // Re-bind whenever the leaderboard DOM changes (e.g. scores update → PC#051 re-renders)
    const root = getLeaderboardHost();
    if (root && window.MutationObserver) {
      const observer = new MutationObserver(() => {
        // Leaderboard rows were replaced – reapply selection highlight
        refreshSelectionHighlight();
      });

      observer.observe(root, {
        childList: true,
        subtree: true
      });
    }

    // Roster changes (names / active flags, etc.)
    on('roster:updated', handleRosterUpdated);

    // Canvas window open/close for teacher-menu lockout
    on(E.UI_WINDOW_OPEN || 'ui:openWindow', handleUiWindowOpen);
    on(E.UI_WINDOW_CLOSE || 'ui:closeWindow', handleUiWindowClose);

    // Hotkeys – global
    document.addEventListener('keydown', onKeyDown);

    // Global click – allow clicking off to clear selection
    document.addEventListener('click', onGlobalClickOff);


    console.log('[PC#062] Student Tiles initialised');
  } catch (e) {
    console.warn('[PC#062] Student Tiles failed to initialise', e);
  }
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStudentTiles);
} else {
  initStudentTiles();
}

/* =========================================================
   PC#063 – Swear Jar coin→jar animation (Activity Canvas)
   Version: Medium-size animation (first attempt scale)
========================================================= */

function ensureSwearJarStyles() {
  // [PC#063] Inject styles once for Swear Jar overlay
  if (document.getElementById('ce-swearjar-styles')) return;

  const style = document.createElement('style');
  style.id = 'ce-swearjar-styles';
  style.textContent = `
    .ce-swearjar-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 40;
    }

    /* [PC#063] Medium-size container */
    .ce-swearjar-inner {
      min-width: 260px;      /* was 180 */
      max-width: 340px;      /* was 260 */
      padding: 20px 28px;    /* bigger interior spacing */
      border-radius: 20px;
      background: rgba(10, 10, 10, 0.85);
      box-shadow: 0 8px 22px rgba(0,0,0,0.45);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #f5f5f5;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      animation: ce-swearjar-pop 150ms ease-out;
    }

    /* [PC#063] Medium-size coin */
    .ce-swearjar-coin {
      width: 48px;           /* was 32 */
      height: 48px;          /* was 32 */
      border-radius: 999px;
      background: radial-gradient(circle at 30% 30%, #fff8c2, #d3a72a);
      box-shadow: 0 0 16px rgba(255, 230, 140, 0.7);
      transform: translateY(-40px);
      animation: ce-swearjar-drop 480ms ease-out forwards;
    }

    /* [PC#063] Medium-size jar */
    .ce-swearjar-jar {
      width: 96px;           /* was 72 */
      height: 58px;          /* was 40 */
      border-radius: 0 0 14px 14px;
      border: 2px solid rgba(220, 220, 220, 0.9);
      border-top: none;
      background: linear-gradient(to top, rgba(60,120,180,0.9), rgba(60,120,180,0.25));
      position: relative;
      overflow: hidden;
      margin-top: 4px;
      animation: ce-swearjar-jarpulse 500ms ease-out 420ms 1;
    }

    .ce-swearjar-jar::before {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55), transparent 60%);
      opacity: 0.95;
    }

    /* [PC#063] Medium-size label */
    .ce-swearjar-label {
      font-size: 1.2rem;     /* was 0.9rem */
      letter-spacing: 0.03em;
      text-transform: uppercase;
      opacity: 0.96;
    }
        .ce-swearjar-student {
      font-size: 1rem;
      font-weight: 600;
      opacity: 0.95;
      text-align: center;
    }


    .ce-swearjar-label span {
      font-weight: 700;
      color: #ffbf5f;
      margin-left: 8px;
      font-size: 1.25rem;
    }

    .ce-swearjar-overlay.ce-swearjar-fade {
      animation: ce-swearjar-fadeout 380ms ease-out forwards;
    }

    @keyframes ce-swearjar-drop {
      0%   { transform: translateY(-40px); opacity: 0; }
      30%  { opacity: 1; }
      100% { transform: translateY(4px); opacity: 1; }
    }

    @keyframes ce-swearjar-jarpulse {
      0%   { transform: scale(1); box-shadow: 0 0 0 rgba(255,255,255,0); }
      40%  { transform: scale(1.05); box-shadow: 0 0 16px rgba(255,220,140,0.75); }
      100% { transform: scale(1); box-shadow: 0 0 0 rgba(255,255,255,0); }
    }

    @keyframes ce-swearjar-pop {
      0%   { transform: translateY(10px) scale(0.96); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }

    @keyframes ce-swearjar-fadeout {
      0%   { opacity: 1; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

function showSwearJarAnimation(detail) {
  // [PC#063] Use Activity Canvas from PC#054 if available
  const host =
    (window.__CE_CANVAS && window.__CE_CANVAS.el) ||
    document.getElementById('activity-canvas');

  if (!host) return;

  ensureSwearJarStyles();

  // Look up student name (if we have an id)
  const studentId = detail && detail.studentId;
  let studentName = '';

  if (studentId != null) {
    const s = findStudentById(studentId);
    if (s && s.name) {
      studentName = String(s.name);
    }
  }

  const currentPosition = window.getComputedStyle(host).position;
  if (!host.dataset.ceSwearJarPrevPos && (currentPosition === 'static' || !currentPosition)) {
    host.dataset.ceSwearJarPrevPos = 'static';
    host.style.position = 'relative';
  }

  const overlay = document.createElement('div');
  overlay.className = 'ce-swearjar-overlay';

  overlay.innerHTML = `
    <div class="ce-swearjar-inner">
      <div class="ce-swearjar-coin"></div>
      <div class="ce-swearjar-jar"></div>
      <div class="ce-swearjar-label">
        Swear Jar <span>-1</span>
      </div>
      ${studentName ? `<div class="ce-swearjar-student">${studentName}</div>` : ''}
    </div>
  `;

  host.appendChild(overlay);

  // [PC#063] Medium-duration version: 2.2s visible
  const visibleMs = 2200;
  const fadeMs    = 380;

  setTimeout(() => {
    overlay.classList.add('ce-swearjar-fade');
    setTimeout(() => {
      overlay.remove();
      if (host.dataset.ceSwearJarPrevPos === 'static') {
        host.style.position = '';
        delete host.dataset.ceSwearJarPrevPos;
      }
    }, fadeMs);
  }, visibleMs);
}


