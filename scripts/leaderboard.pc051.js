/* =========================================================
   PC#051 – Leaderboard (Canon-Aligned Rebuild)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   Role:
     - Render leaderboard rail in #leaderboard
     - 1–20 students  → 1 column
     - 21–32 students → 2 columns (compact mode)
     - Name + unbanked score only
     - No reordering (keeps roster order for PC#062 tiles)
========================================================= */

import * as Events from './events.js';
import * as Dashboard from './dashboard.js';

/* ---------------------------------------------------------
   Canonical bus resolution (matches PC#061 / PC#062)
--------------------------------------------------------- */
const Boot    = window.__CE_BOOT;
const CE      = Boot && Boot.CE;
const Modules = (Boot && Boot.modules) || {};

const Bus = Modules.Events || Events;
const on  = Bus.on   || Events.on;
const E   = Bus.EVENTS_V3 || Bus.EVENTS_V2 || Bus.EVENTS || {};

let _host = null;

function getCurrentPhase() {
  return String(
    window.__CE_BOOT?.phaseGateState?.currentPhase ??
    window.__CE_BOOT?.phase?.current ??
    window.__CE_BOOT?.modules?.Dashboard?.session?.phase ??
    window.__CE_BOOT?.CE?.modules?.Dashboard?.session?.phase ??
    ''
  );
}

function isPurchasePhase() {
  return getCurrentPhase() === '7';
}

/* =========================================================
   STYLE
   - Uses CSS vars --lb-font / --lb-score-font on :root
   - Compact mode = .lb.lb--compact (two columns)
========================================================= */

function ensureStyle() {
  if (document.getElementById('pc051-leaderboard-style')) return;

  const s = document.createElement('style');
  s.id = 'pc051-leaderboard-style';
  s.textContent = `
    #leaderboard .lb {
      padding: 3px 6px;
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    #leaderboard .lb-list {
      list-style: none;
      margin: 0;
      padding: 0;
      flex: 1 1 auto;
      display: grid;
      grid-auto-rows: minmax(0, 1fr);
      gap: 2px;
    }

    #leaderboard .lb-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: 4px 10px;
      border: 1px solid #2a3542; 
      border-radius: 8px;
      background: var(--panel, #11151a);
      color: var(--txt, #e8eef2);
      user-select: none;
      cursor: pointer;
    }

    #leaderboard .lb-item.is-inactive {
      opacity: 0.45;
    }
    #leaderboard .lb-item.lb-item--selected {
    outline: 1px solid rgba(180, 225, 255, 0.35);
    outline-offset: 1px;
    background: rgba(180, 225, 255, 0.10);
    transition: background 120ms ease-out, outline 120ms ease-out;
    }


    #leaderboard .lb-name {
      flex: 1 1 auto;
      min-width: 0;
      font-weight: 600;
      font-size: var(--lb-font, 18px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-transform: uppercase;
      max-width: 6ch; /* trims long names so they don't bleed */
    }

    #leaderboard .lb-score {
      flex: 0 0 auto;
      margin-left: 8px;
      font-weight: 800;
      font-size: var(--lb-score-font, 16px);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        "Liberation Mono", "Courier New", monospace;
      text-align: right;
      min-width: 2ch;
    }

    #leaderboard .lb-banked {
      flex: 0 0 auto;
      margin-left: 8px;
      font-weight: 900;
      font-size: var(--lb-score-font, 16px);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        "Liberation Mono", "Courier New", monospace;
      text-align: center;
      min-width: 2.5ch;
      color: #ff79c6;
    }

    /* Compact mode: two columns when >20 students */
    #leaderboard .lb.lb--compact .lb-list {
      grid-template-columns: 1fr 1fr;
    }

    #leaderboard .lb.lb--compact .lb-item {
      padding: 3px 8px;
    }
  `;
  document.head.appendChild(s);
}

/* =========================================================
   DATA – Canon paths via dashboard.js
========================================================= */

function readRoster() {
  try {
    const snap = Dashboard.getRosterSnapshot();
    const students = snap && Array.isArray(snap.students) ? snap.students : [];
    return students.map((s, i) => ({
      id: String(s.id ?? `s${i + 1}`),
      name: String(s.name ?? `Student ${i + 1}`),
      active: s.active !== false
    }));
  } catch (e) {
    console.warn('[PC#051] getRosterSnapshot failed', e);
    return [];
  }
}

function readScoresById() {
  try {
    const snap = Dashboard.getScoresSnapshot();
    return (snap && snap.byId) || {};
  } catch (e) {
    console.warn('[PC#051] getScoresSnapshot failed', e);
    return {};
  }
}

function buildEntries() {
  const students = readRoster();
  const byId = readScoresById();

  // IMPORTANT: no sorting – keep roster order for PC#062 indexing
  return students.map((s, index) => {
    const id = String(s.id ?? `s${index + 1}`);
    const scoreRec = byId[id] || {};
    const unbanked = Number.isFinite(scoreRec.unbanked)
      ? Number(scoreRec.unbanked)
      : 0;
    const banked = Number.isFinite(scoreRec.banked)
      ? Number(scoreRec.banked)
      : 0;


    return {
      id,
      name: s.name,
      active: s.active,
      score: unbanked,
      banked
    };
  });
}

/* =========================================================
   FONT / COLUMN MODES
   - 1–20 students  → 1 column, larger font
   - 21–32 students → 2 columns, slightly smaller font
========================================================= */

function applyDynamicFontSizing(count) {
  const root = document.documentElement;
  const singleColumn = count <= 20;

  if (singleColumn) {
    // SINGLE COLUMN (1–20 students)
    // Slightly smaller so 20 rows + gaps fit above the burnline on IWBs
    root.style.setProperty('--lb-font', 'min(2.0vh, 20px)');
    root.style.setProperty('--lb-score-font', 'min(1.8vh, 18px)');
  } else {
    // COMPACT MODE (21–32 students, two columns)
    // Already fairly tight, but we nudge it a bit smaller as well
    root.style.setProperty('--lb-font', 'min(1.6vh, 16px)');
    root.style.setProperty('--lb-score-font', 'min(1.4vh, 14px)');
  }
}


// =========================================================
//  PART A – CANONICAL NAME RULE ENGINE (Normal + Compact)
// =========================================================
// entries: [{ id, name, active, score }]
// compact: boolean (true = >20 students)
function generateDisplayNames(entries, compact) {
  // 1) Build map first → last
  const parsed = entries.map(e => {
    const parts = e.name.trim().split(/\s+/);
    const first = (parts[0] || "").toUpperCase();
    const last  = (parts[1] || "").toUpperCase();
    return { ...e, first, last };
  });

  // 2) Compute base label per Part A
  parsed.forEach(p => {
    if (!compact) {
      // NORMAL MODE
      p.base = p.first.slice(0, 6);         // first 6 letters
    } else {
      // COMPACT MODE
      p.base = p.first.slice(0, 4);         // first 4 letters
    }
  });

  // 3) Detect collisions
  const countMap = {};
  parsed.forEach(p => {
    countMap[p.base] = (countMap[p.base] || 0) + 1;
  });

  // 4) Resolve collisions by surname expansion
  parsed.forEach(p => {
    if (countMap[p.base] === 1) {
      // No collision → use base
      p.display = p.base;
      return;
    }

    // COLLISION RULES:

    if (!compact) {
      // =========================
      // NORMAL MODE COLLISION
      // FIRSTNAME[0:6] + SURNAME[0:1]
      // =========================
      if (p.last) {
        let alt = p.base + " " + p.last.slice(0, 1);
        p.display = alt;
      } else {
        // no surname → just use base as fallback
        p.display = p.base;
      }

    } else {
      // =========================
      // COMPACT MODE COLLISION
      // FIRSTNAME[0:3] + SURNAME INITIAL
      // =========================
      const prefix = p.first.slice(0, 3);
      if (p.last) {
        p.display = prefix + " " + p.last.slice(0, 1);
      } else {
        p.display = prefix;
      }
    }
  });

  // 5) Resolve second-level collisions (surname 2 letters)
  const secondMap = {};
  parsed.forEach(p => {
    secondMap[p.display] = (secondMap[p.display] || 0) + 1;
  });

  parsed.forEach(p => {
    if (secondMap[p.display] > 1) {
      // Need second surname letter
      const parts = p.display.split(" ");
      const root = parts[0];
      if (p.last && p.last.length >= 2) {
        p.display = root + " " + p.last.slice(0, 2);
      }
    }
  });

  // 6) Final uppercase (already uppercase but guaranteed)
  parsed.forEach(p => {
    p.display = p.display.toUpperCase();
  });

  // 7) Return mapping by ID
  const byId = {};
  parsed.forEach(p => { byId[p.id] = p.display; });
  return byId;
}


/* =========================================================
   RENDER
========================================================= */

function render() {
  if (!_host) return;
  ensureStyle();

  const entries = buildEntries();
  const purchasePhase = isPurchasePhase();
  const count   = entries.length;
  const compact = count > 20;
  // Compute Part A canonical display names
  const displayNameMap = generateDisplayNames(entries, compact);


  applyDynamicFontSizing(count);

  const box = document.createElement('div');
  box.className = compact ? 'lb lb--compact' : 'lb';

  const list = document.createElement('ol');
  list.className = 'lb-list';

  entries.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'lb-item';
    if (!entry.active) li.classList.add('is-inactive');
    if (purchasePhase) li.classList.add('lb-item--purchase');
    li.dataset.studentId = String(entry.id);
    li.dataset.studentName = String(entry.name || '');

    // These attributes are what PC#062 expects to bind tiles
    li.dataset.studentId = entry.id;
    li.dataset.studentName = entry.name;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'lb-name';
    // ==============================
    //  PART A – DISPLAY NAME (CANON)
    // ==============================
    const label = displayNameMap[entry.id] || entry.name.toUpperCase();
    nameSpan.textContent = label;

    if (purchasePhase) {
      const bankedSpan = document.createElement('span');
      bankedSpan.className = 'lb-banked';
      bankedSpan.textContent = String(entry.banked ?? 0);
      li.appendChild(nameSpan);
      li.appendChild(bankedSpan);
    } else {
      li.appendChild(nameSpan);
    }


    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'lb-score';
    scoreSpan.textContent = String(entry.score ?? 0);


    li.appendChild(scoreSpan);
    list.appendChild(li);
  });

  box.appendChild(list);
  _host.innerHTML = '';
  _host.appendChild(box);
}

/* =========================================================
   WIRING – events that should refresh the rail
========================================================= */

function wireEvents() {
  try {
    const EVT_SCORE  = E.SCORES_UPDATED || 'scores:updated';
    const EVT_ROSTER = 'roster:updated';
    const EVT_AWARD  = E.DASHBOARD_AWARD_APPLIED || 'dashboard:award:applied';
    const EVT_UNDO   = E.HISTORY_UNDO || 'history:undo';
    const EVT_REDO   = E.HISTORY_REDO || 'history:redo';
    const EVT_PHASE  = E.LESSON_PHASE_CHANGE || E.LESSON_PHASE_CHANGED || 'lesson:phaseChange';

    on(EVT_SCORE,  render);
    on(EVT_ROSTER, render);
    on(EVT_AWARD,  render);
    on(EVT_UNDO,   render);
    on(EVT_REDO,   render);
    on(EVT_PHASE,  render);
  } catch (e) {
    console.warn('[PC#051] Failed to wire events', e);
  }
}

/* =========================================================
   PUBLIC API – used by main.js
========================================================= */

function mount(selector = '#leaderboard') {
  const host = document.querySelector(selector);
  if (!host) {
    console.warn('[PC#051] No leaderboard host found for selector', selector);
    return false;
  }

  _host = host;
  _host.classList.add('leaderboard'); // PC#062 expects this

  render();
  wireEvents();

  console.log('[PC#051] Leaderboard mounted');
  return true;
}

window.__CE_LB = Object.freeze({ mount, render });
export default window.__CE_LB;
