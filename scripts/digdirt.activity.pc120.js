/* =========================================================
   PC#120 – Phase 5 Activity: Dig Dirt (hub-controlled)
   Purpose:
     - Collaborative Phase 5 mini-game
     - Teams earn a dig by answering correctly
     - Team chooses SAFE or DIG DEEP
     - Team then reveals one dirt tile
     - Positive finds add to the team's running total
     - DIG DEEP may trigger a hazard and wipe only the current chain
     - Session-only state; full reset on unmount
   Guardrails:
     - No lesson:phaseChange emits
     - No burnline interaction
     - No persistence
     - Must NOT modify leaderboard/tile behaviour
========================================================= */

(() => {
  const MOD = {
    active: false,
    host: null,
    root: null,

    activeAtMount: [],
    teamCount: 0,
    teamOrder: [],
    teams: new Map(),
    pickedByTeam: new Map(),
    teamByStudentId: new Map(),

    currentTeamIndex: 0,
    currentTeamKey: '',
    currentStudent: null,

    turnState: 'idle',
    // idle | awaitingQuestion | awaitingDigType | awaitingTile | chainingDecision | resolved
    statusText: 'Select student to begin.',

    // scoring
    teamScores: new Map(),      // teamKey -> banked score
    currentTurnGain: 0,         // unbanked chain gain for the active team
    lastReveal: null,           // { type:'safe'|'deep'|'hazard', value:number, tile:number }

    // board
    tileCount: 36,
    tiles: [],                  // [{ num, safeValue, safeHazard, deepValue, deepHazard, opened, revealedType, revealedFace }]
    currentDigType: '',         // safe | deep

    // question bank
    qbBuiltIn: null,
    qbUploaded: null,
    qbLoadedSingle: null,
    qbSource: 'builtin',
    qb: null,
    cat: '',
    sub: '',
    focus: '',

    // modal
    modalEl: null,
    modalKeyHandler: null,
    qStarted: false,
    qDifficulty: 1,
    qObj: null,
    timerId: null,
    endsAt: 0,

    // UI refs
    elTurnMeta: null,
    elStatus: null,
    elCat: null,
    elSub: null,
    elFocus: null,
    elBtnSelect: null,
    elBoard: null,

    // fit / overlay
    onResize: null,
    _raf: 0,
    _ddExitHooked: false,
    _pendingHubAction: null,
    _resultsShowing: false,
  _allowImmediateUnmount: false,
  };

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const QB_STORAGE_KEY = 'ce.qb.lastSelection';

  function saveQBSelection() {
    if (MOD.qbSource !== 'builtin') return;
    try {
      localStorage.setItem(QB_STORAGE_KEY, JSON.stringify({
        cat: MOD.cat,
        sub: MOD.sub,
        focus: MOD.focus
      }));
    } catch {}
  }

  function loadQBSelection() {
    try {
      const raw = localStorage.getItem(QB_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data?.cat) MOD.cat = String(data.cat);
      if (data?.sub) MOD.sub = String(data.sub);
      if (data?.focus) MOD.focus = String(data.focus);
    } catch {}
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeHtmlAttr(str) {
    return escapeHtml(str).replace(/\s+/g, ' ');
  }

  function getCatOptions(qb) {
    if (!qb || typeof qb !== 'object') return [];
    const ORDER = ['quickmath', 'support', 'year7', 'year8', 'year9', 'year10'];
    const keys = [
      ...ORDER.filter((k) => qb[k]),
      ...Object.keys(qb).filter((k) => !ORDER.includes(k))
    ];
    return keys.map((k) => ({ key: k, label: String(qb[k]?.label || k) }));
  }

  function getSubOptions(qb, catKey) {
    const subs = qb?.[catKey]?.subs;
    if (!subs || typeof subs !== 'object') return [];
    return Object.keys(subs).map((k) => ({ key: k, label: String(subs[k]?.label || k) }));
  }

  function getFocusOptions(qb, catKey, subKey) {
    const subs = qb?.[catKey]?.subs?.[subKey]?.subs;
    if (!subs || typeof subs !== 'object') return [];
    return Object.keys(subs).map((k) => ({ key: k, label: String(subs[k]?.label || k) }));
  }

  function pickRandomQuestion(qb, catKey, subKey, focusKey, diff) {
    const d = Number(diff);
    const chosen = (d === 1 || d === 2 || d === 3) ? d : 1;
    const arr = qb?.[catKey]?.subs?.[subKey]?.subs?.[focusKey]?.d?.[chosen];
    if (!Array.isArray(arr) || !arr.length) return null;
    const q = arr[Math.floor(Math.random() * arr.length)];
    if (!q) return null;
    return {
      q: String(q.q ?? q.question ?? '—'),
      a: String(q.a ?? q.answer ?? '—')
    };
  }

  function normalizeUploadedQB(raw) {
    const obj = raw && typeof raw === 'object' ? raw : null;
    if (!obj) return null;

    if (obj.default && typeof obj.default === 'object') {
      return normalizeUploadedQB(obj.default);
    }
    if (obj.__QB_DEFAULT__ && typeof obj.__QB_DEFAULT__ === 'object') {
      return normalizeUploadedQB(obj.__QB_DEFAULT__);
    }

    const ensureD = (d) => ({
      1: Array.isArray(d?.[1]) ? d[1] : [],
      2: Array.isArray(d?.[2]) ? d[2] : [],
      3: Array.isArray(d?.[3]) ? d[3] : []
    });

    if (obj.STW_QB && typeof obj.STW_QB === 'object' && Object.keys(obj.STW_QB).length) {
      return obj.STW_QB;
    }

    if (obj?.stage?.key && obj?.unit?.key && obj?.focus?.key) {
      return {
        stage: {
          key: String(obj.stage.key),
          label: String(obj.stage.label || obj.stage.key)
        },
        unit: {
          key: String(obj.unit.key),
          label: String(obj.unit.label || obj.unit.key)
        },
        focus: {
          key: String(obj.focus.key),
          label: String(obj.focus.label || obj.focus.key)
        },
        d: ensureD(obj.d)
      };
    }

    if (Object.keys(obj).length) return obj;
    return null;
  }

  function parseQBFileText(text) {
    if (!text || typeof text !== 'string') return null;

    try {
      return normalizeUploadedQB(JSON.parse(text));
    } catch {}

    try {
      let src = String(text);
      src = src.replace(/^\uFEFF/, '');
      src = src.replace(/\bexport\s+const\s+/g, 'const ');
      src = src.replace(/\bexport\s+let\s+/g, 'let ');
      src = src.replace(/\bexport\s+var\s+/g, 'var ');
      src = src.replace(/\bexport\s+default\s+/g, 'const __QB_DEFAULT__ = ');
      src = src.replace(/\bexport\s*\{[^}]*\}\s*;?/g, '');

      const fn = new Function(
        'exports',
        `let STW_QB;
         ${src};
         return (typeof __QB_DEFAULT__ !== 'undefined'
           ? __QB_DEFAULT__
           : (typeof STW_QB !== 'undefined' && STW_QB
               ? STW_QB
               : (typeof exports !== 'undefined' ? (exports.STW_QB || exports.default) : null)
             )
         );`
      );
      const out = fn({});
      return normalizeUploadedQB(out);
    } catch {}

    return null;
  }

  function isLoadedSingleQB(obj) {
    return !!(obj?.stage?.key && obj?.unit?.key && obj?.focus?.key && obj?.d);
  }

  function pickRandomQuestionLoaded(singleQb, diff) {
    const d = Number(diff);
    const chosen = (d === 1 || d === 2 || d === 3) ? d : 1;
    const arr = singleQb?.d?.[chosen] || singleQb?.d?.[String(chosen)] || [];
    if (!Array.isArray(arr) || !arr.length) return null;
    const q = arr[Math.floor(Math.random() * arr.length)];
    if (!q) return null;
    return {
      q: String(q.q ?? q.question ?? '—'),
      a: String(q.a ?? q.answer ?? '—')
    };
  }

  function setQBSelectorMode(loadedMode) {
    const sels = [MOD.elCat, MOD.elSub, MOD.elFocus].filter(Boolean);
    for (const el of sels) {
      el.disabled = !!loadedMode;
      el.style.opacity = loadedMode ? '0.55' : '';
      el.style.pointerEvents = loadedMode ? 'none' : '';
    }
  }

  function initBuiltInQB() {
    MOD.qbBuiltIn = window.QM_QB || window.STW_QB || null;
    MOD.qbUploaded = null;
    MOD.qbLoadedSingle = null;
    MOD.qbSource = 'builtin';
    MOD.qb = MOD.qbBuiltIn || null;
    loadQBSelection();

    const cats = getCatOptions(MOD.qb);
    if (!MOD.cat || !cats.find(c => c.key === MOD.cat)) {
      MOD.cat = cats.find(c => c.key === 'quickmath')?.key || cats[0]?.key || '';
    }

    const subs = getSubOptions(MOD.qb, MOD.cat);
    if (!MOD.sub || !subs.find(s => s.key === MOD.sub)) {
      MOD.sub = subs[0]?.key || '';
    }

    const focuses = getFocusOptions(MOD.qb, MOD.cat, MOD.sub);
    if (!MOD.focus || !focuses.find(f => f.key === MOD.focus)) {
      MOD.focus = focuses[0]?.key || '';
    }
  }

  function getActiveStudentsFromDom() {
    const rows = qsa('.lb-item');
    const out = [];
    for (const el of rows) {
      const id = String(el.dataset.studentId || '').trim();
      if (!id) continue;
      if (el.classList.contains('is-inactive')) continue;
      out.push({
        id,
        name: String(el.dataset.studentName || 'Student'),
      });
    }
    return out;
  }

  function flashStudent(studentId, type = 'bonus') {
    try { window.__CE_FLASH?.flashLeaderboardStudent?.(studentId, type); } catch {}
  }

  function applyAward(studentId, points) {
    try {
      return window.Dashboard?.applyAward?.({ studentId, points });
    } catch {
      return false;
    }
  }

  function getTeamCount(n) {
    if (n <= 8) return 2;
    if (n <= 16) return 3;
    return 4;
  }

  function getTeamPalette(count) {
    const palette = [
      { key: 'red', label: 'Red Team' },
      { key: 'blue', label: 'Blue Team' },
      { key: 'green', label: 'Green Team' },
      { key: 'yellow', label: 'Yellow Team' },
    ];
    return palette.slice(0, Math.max(2, Math.min(4, count)));
  }

  function assignTeams() {
    const students = shuffle(getActiveStudentsFromDom().slice());
    MOD.activeAtMount = students.slice();
    MOD.tileCount = Math.max(8, students.length * 2);
    MOD.teamCount = getTeamCount(students.length);
    MOD.teamOrder = getTeamPalette(MOD.teamCount);
    MOD.teams = new Map();
    MOD.pickedByTeam = new Map();
    MOD.teamByStudentId = new Map();
    MOD.teamScores = new Map();

    for (const team of MOD.teamOrder) {
      MOD.teams.set(team.key, []);
      MOD.pickedByTeam.set(team.key, new Set());
      MOD.teamScores.set(team.key, 0);
    }

    students.forEach((student, i) => {
      const team = MOD.teamOrder[i % MOD.teamOrder.length];
      MOD.teams.get(team.key).push(student);
      MOD.teamByStudentId.set(student.id, team.key);
    });
  }

  function clearTeamMarkers() {
    qsa('.lb-item[data-qc-team]').forEach((el) => el.removeAttribute('data-qc-team'));
    qsa('.lb-item[data-qc-turn="true"]').forEach((el) => el.removeAttribute('data-qc-turn'));
  }

  function applyTeamMarkers() {
    clearTeamMarkers();
    qsa('.lb-item').forEach((el) => {
      const id = String(el.dataset.studentId || '').trim();
      const teamKey = MOD.teamByStudentId.get(id) || '';
      if (teamKey) el.setAttribute('data-qc-team', teamKey);
    });
  }

  function highlightCurrentStudent() {
    qsa('.lb-item[data-qc-turn="true"]').forEach((el) => el.removeAttribute('data-qc-turn'));
    if (!MOD.currentStudent?.id) return;
    const row = qs(`.lb-item[data-student-id="${CSS.escape(MOD.currentStudent.id)}"]`);
    if (row) row.setAttribute('data-qc-turn', 'true');
  }

  function setStatus(txt) {
    MOD.statusText = String(txt || '');
    if (MOD.elStatus) MOD.elStatus.textContent = MOD.statusText;
  }

  function ensureStyles() {
    if (document.getElementById('ce-digdirt-styles')) return;
    const s = document.createElement('style');
    s.id = 'ce-digdirt-styles';
    s.textContent = `
      #ce-digdirt-root .ce-dd-root{
        position:absolute;
        top:0;
        right:0;
        left:0;
        bottom:0;
        padding:12px;
        display:flex;
        flex-direction:column;
        gap:12px;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        min-height:0;
        box-sizing:border-box;
        overflow:hidden;        
      }
      #ce-digdirt-root .ce-dd-card{
        background:rgba(255,255,255,0.05);
        border:1px solid rgba(255,255,255,0.10);
        border-radius:14px;
        padding:16px;
      }
      #ce-digdirt-root .ce-dd-title{
        font-size:18px;
        font-weight:900;
        margin:0 0 8px 0;
      }
      #ce-digdirt-root .ce-dd-headerrow{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        align-items:center;
        margin-top:10px;
      }
      #ce-digdirt-root .ce-dd-headerrow > *{
        min-width:0;
      }
      #ce-digdirt-root .ce-dd-teambar{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
      }
      #ce-digdirt-root .ce-dd-teampill{
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:8px 10px;
        border-radius:999px;
        background:rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.10);
        font-weight:850;
      }
      #ce-digdirt-root .ce-dd-dot{
        width:12px;
        height:12px;
        border-radius:999px;
        flex:0 0 12px;
      }
      #ce-digdirt-root .ce-dd-dot.red{ background:rgba(255,90,90,0.95); }
      #ce-digdirt-root .ce-dd-dot.blue{ background:rgba(80,140,255,0.95); }
      #ce-digdirt-root .ce-dd-dot.green{ background:rgba(70,200,120,0.95); }
      #ce-digdirt-root .ce-dd-dot.yellow{ background:rgba(255,210,70,0.95); }

      .lb-item[data-qc-team]{
        box-shadow: inset 8px 0 0 rgba(255,255,255,0.18);
      }
      .lb-item[data-qc-team="red"]{ box-shadow: inset 8px 0 0 rgba(255,90,90,0.95); }
      .lb-item[data-qc-team="blue"]{ box-shadow: inset 8px 0 0 rgba(80,140,255,0.95); }
      .lb-item[data-qc-team="green"]{ box-shadow: inset 8px 0 0 rgba(70,200,120,0.95); }
      .lb-item[data-qc-team="yellow"]{ box-shadow: inset 8px 0 0 rgba(255,210,70,0.95); }
      .lb-item[data-qc-turn="true"]{
        background: linear-gradient(90deg, rgba(255,165,0,0.18), rgba(255,165,0,0.05)) !important;
      }
      .lb-item.lb-item--selected[data-qc-turn="true"]{
        background: linear-gradient(90deg, rgba(255,165,0,0.20), rgba(255,165,0,0.06)) !important;
      }

      #ce-digdirt-root .ce-dd-controls{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        align-items:center;
        margin-left:auto;
      }
      #ce-digdirt-root .ce-dd-field{
        display:flex;
        align-items:center;
        gap:5px;
        min-width:0;
      }
      #ce-digdirt-root .ce-dd-fieldlabel{
        font-size:11px;
        opacity:0.72;
        font-weight:900;
        letter-spacing:0.4px;
        text-transform:uppercase;
        white-space:nowrap;
      }
      #ce-digdirt-root .ce-dd-select{
        width:auto;
        min-width:118px;
        max-width:158px;
        border-radius:10px;
        border:1px solid #93c5fd;
        background:#e0e7ff;
        color:#0f172a;
        padding:5px 8px;
        font-size:12px;
        font-weight:800;
        line-height:1.15;
        outline:none;
      }

      #ce-digdirt-root .ce-dd-turnbox{
        margin-top:10px;
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        align-items:center;
      }
      #ce-digdirt-root .ce-dd-turnmeta{
        display:flex;
        align-items:center;
        gap:10px;
        padding:10px 12px;
        border-radius:14px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.10);
        font-weight:850;
      }
      #ce-digdirt-root .ce-dd-turnmeta .ce-dd-label{
        opacity:0.78;
        font-weight:800;
      }
      #ce-digdirt-root .ce-dd-turnmeta[data-dd-team="red"]{
        background:rgba(255,90,90,0.14);
        border-color:rgba(255,90,90,0.30);
      }
      #ce-digdirt-root .ce-dd-turnmeta[data-dd-team="blue"]{
        background:rgba(80,140,255,0.14);
        border-color:rgba(80,140,255,0.30);
      }
      #ce-digdirt-root .ce-dd-turnmeta[data-dd-team="green"]{
        background:rgba(70,200,120,0.14);
        border-color:rgba(70,200,120,0.30);
      }
      #ce-digdirt-root .ce-dd-turnmeta[data-dd-team="yellow"]{
        background:rgba(255,210,70,0.14);
        border-color:rgba(255,210,70,0.30);
      }

      #ce-digdirt-root .ce-dd-status{
        margin-top:10px;
        padding:10px 12px;
        border-radius:12px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.10);
        font-weight:800;
      }

      #ce-digdirt-root .ce-dd-btn{
        appearance:none;
        border:0;
        cursor:pointer;
        padding:10px 12px;
        border-radius:12px;
        background:rgba(80,140,255,0.35);
        color:#fff;
        font-weight:900;
      }
      #ce-digdirt-root .ce-dd-btn:hover{ background:rgba(80,140,255,0.45); }
      #ce-digdirt-root .ce-dd-btn:active{ transform:translateY(1px); }
      #ce-digdirt-root .ce-dd-btn[disabled]{
        opacity:0.45;
        cursor:not-allowed;
      }
      #ce-digdirt-root .ce-dd-btn.dd-open{
        padding:10px 16px;
        font-size:14px;
        font-weight:950;
        white-space:nowrap;
      }
      #ce-digdirt-root .ce-dd-btn.dd-active{
        padding:10px 28px;
        font-size:16px;
        font-weight:1000;
        border-radius:12px;
        min-width:220px;
        min-height:0;
      }
      #ce-digdirt-root .ce-dd-btn.dd-safe{
        background:rgba(70,200,120,0.35);
      }
      #ce-digdirt-root .ce-dd-btn.dd-safe:hover{
        background:rgba(70,200,120,0.45);
      }
      #ce-digdirt-root .ce-dd-btn.dd-deep{
        background:rgba(180,110,255,0.35);
      }
      #ce-digdirt-root .ce-dd-btn.dd-deep:hover{
        background:rgba(180,110,255,0.45);
      }
      #ce-digdirt-root .ce-dd-btn.dd-bank{
        background:rgba(255,210,70,0.30);
        color:#fff;
      }
      #ce-digdirt-root .ce-dd-btn.dd-bank:hover{
        background:rgba(255,210,70,0.40);
      }
      #ce-digdirt-root .ce-dd-btn.dd-chain{
        background:rgba(255,155,70,0.30);
        color:#fff;
      }
      #ce-digdirt-root .ce-dd-btn.dd-chain:hover{
        background:rgba(255,155,70,0.40);
      }

      #ce-digdirt-root .ce-dd-boardwrap{
        flex:1 1 auto;
        min-height:0;
        display:flex;
        flex-direction:column;
        overflow:hidden;
      }
      #ce-digdirt-root .ce-dd-stats{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin-bottom:10px;
        align-items:center;
      }
      #ce-digdirt-root .ce-dd-actionrow{
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin-left:auto;
      }
      #ce-digdirt-root .ce-dd-pill{
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:8px 10px;
        border-radius:999px;
        background:rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.10);
        font-size:13px;
        font-weight:750;
        color:#fff;
      }
      #ce-digdirt-root .ce-dd-grid{
        flex:1 1 auto;
        min-height:0;
        display:grid;
        gap:10px;
        padding:6px;
        overflow:auto;
        grid-template-columns:repeat(var(--dd-cols, 6), var(--dd-cell, 96px));
        grid-template-rows:repeat(var(--dd-rows, 6), var(--dd-cell, 96px));
        justify-content:center;
        align-content:start;
      }
      #ce-digdirt-root .ce-dd-tile{
        position:relative;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.10);
        cursor:pointer;
        user-select:none;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:10px;
        transition:transform 120ms ease, filter 120ms ease;
        background:
          radial-gradient(circle at 30% 25%, rgba(255,255,255,0.05), transparent 42%),
          linear-gradient(135deg, rgba(92,64,51,0.95), rgba(73,50,38,0.95));
        box-shadow:
          inset 0 0 0 2px rgba(255,255,255,0.03),
          0 10px 24px rgba(0,0,0,0.28);
      }
      #ce-digdirt-root .ce-dd-tile:hover{ transform:translateY(-2px); filter:brightness(1.05); }
      #ce-digdirt-root .ce-dd-tile:active{ transform:translateY(0) scale(0.99); }
      #ce-digdirt-root .ce-dd-tile[disabled]{
        opacity:1;
        cursor:default;
      }
      #ce-digdirt-root .ce-dd-tile.is-armed{
        box-shadow:
          inset 0 0 0 2px rgba(255,255,255,0.04),
          0 0 0 2px rgba(255,210,70,0.18),
          0 10px 24px rgba(0,0,0,0.28);
      }
      #ce-digdirt-root .ce-dd-tile.open{
        background:
          radial-gradient(circle at 30% 25%, rgba(255,255,255,0.06), transparent 42%),
          linear-gradient(135deg, rgba(55,40,34,0.96), rgba(35,27,23,0.96));
      }
      #ce-digdirt-root .ce-dd-tile.hazard{
        background:
          radial-gradient(circle at 30% 25%, rgba(255,255,255,0.04), transparent 42%),
          linear-gradient(135deg, rgba(110,40,40,0.96), rgba(70,20,20,0.96));
      }
      #ce-digdirt-root .ce-dd-num{
        position:absolute;
        top:8px; left:8px;
        font-size:clamp(12px, calc(var(--dd-cell, 96px) * 0.16), 22px);
        font-weight:1000;
        color:rgba(255,255,255,0.86);
        background:rgba(0,0,0,0.18);
        border:1px solid rgba(255,255,255,0.10);
        padding:4px 8px;
        border-radius:999px;
        line-height:1;
      }
      #ce-digdirt-root .ce-dd-face{
        font-size:clamp(18px, calc(var(--dd-cell, 96px) * 0.34), 50px);
        font-weight:1100;
        letter-spacing:-1px;
        color:rgba(255,255,255,0.96);
        text-shadow:0 10px 22px rgba(0,0,0,0.35);
      }

      #ce-digdirt-root .qc-modal{
        position:absolute;
        inset:0;
        background:rgba(0,0,0,0.45);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:50;
      }
      #ce-digdirt-root .qc-modal-card{
        width:min(1100px, 94vw);
        background:#e8f0ff;
        color:#0f172a;
        border-radius:14px;
        padding:22px;
        box-shadow:0 12px 28px rgba(15,23,42,0.25);
      }
      #ce-digdirt-root .qc-modal-h{
        position:relative;
        display:flex;
        justify-content:center;
        align-items:center;
        margin-bottom:8px;
      }
      #ce-digdirt-root .qc-modal-title{
        width:100%;
        text-align:center;
        color:#0b3c8a;
        font-size:44px;
        font-weight:900;
        letter-spacing:-0.6px;
      }
      #ce-digdirt-root .qc-x{
        position:absolute;
        right:0;
        top:0;
        width:42px; height:42px;
        border-radius:12px;
        border:0;
        cursor:pointer;
        background:transparent;
        color:#0f172a;
        font-size:22px;
        font-weight:900;
      }
      #ce-digdirt-root .qc-x:hover{ background:rgba(15,23,42,0.08); }
      #ce-digdirt-root .qc-row{ margin-top:10px; }
      #ce-digdirt-root .qc-mono{ font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      #ce-digdirt-root .qc-label{ font-size:12px; opacity:0.8; font-weight:900; letter-spacing:0.6px; text-transform:uppercase; color:#0f172a; }
      #ce-digdirt-root .qc-q{ font-size:38px; line-height:1.25; font-weight:900; letter-spacing:-0.6px; margin-top:6px; color:#0f172a; }
      #ce-digdirt-root .qc-a{ font-size:34px; line-height:1.25; font-weight:900; letter-spacing:-0.4px; margin-top:6px; color:#1e293b; }
      #ce-digdirt-root .qc-diffGroup{ display:flex; gap:0; align-items:center; flex-wrap:wrap; margin-top:6px; }
      #ce-digdirt-root .qc-diffBtn{ min-width:64px; height:44px; border-radius:0; border:2px solid #93c5fd; background:#e0e7ff; color:#0f172a; font-weight:900; cursor:pointer; }
      #ce-digdirt-root .qc-diffBtn:first-child{ border-top-left-radius:12px; border-bottom-left-radius:12px; }
      #ce-digdirt-root .qc-diffBtn:last-child{ border-top-right-radius:12px; border-bottom-right-radius:12px; }
      #ce-digdirt-root .qc-diffBtn:hover{ background:#dbeafe; }
      #ce-digdirt-root .qc-footer{
        margin-top:14px;
        display:flex;
        gap:10px;
        justify-content:flex-end;
        flex-wrap:wrap;
      }
      #ce-digdirt-root .qc-footer .ce-dd-btn{
        background:#e0e7ff;
        color:#0f172a;
        border:2px solid #93c5fd;
      }
      #ce-digdirt-root .qc-footer .ce-dd-btn:hover{ background:#dbeafe; }
      #ce-digdirt-root .qc-ok{
        background:#bbf7d0 !important;
        border-color:#22c55e !important;
        color:#065f46 !important;
      }
      #ce-digdirt-root .qc-timer{
        margin-top:8px;
        font-weight:900;
      }
      #ce-digdirt-root .qc-timer [data-qc-t]{
        font-size:34px;
        font-weight:900;
        color:#ca8a04;
        letter-spacing:0.5px;
      }
    `;
    document.head.appendChild(s);
  }

  function applySafeBottom() {
    if (!MOD.host || !MOD.root) return;
    const SAFE_BOTTOM = 110;
    const inner = qs('.ce-dd-root', MOD.root);
    if (!inner) return;
    inner.style.bottom = `${SAFE_BOTTOM}px`;
  }

  function fitBoardToCanvas() {
    applySafeBottom();
    layoutTileGrid();
  }

  function layoutTileGrid() {
    if (!MOD.elBoard) return;

    const rect = MOD.elBoard.getBoundingClientRect();
    const w = Math.max(0, rect.width);
    const h = Math.max(0, rect.height);
  const GAP = 10;
  const MAX_CELL = 220;
  const MIN_CELL = 12;
  const n = Math.max(1, Number(MOD.tileCount) || 1);
  const minRows = 2;
  const maxRows = Math.min(6, n);

  let best = { rows: maxRows, cols: Math.ceil(n / maxRows), cell: 0 };

  for (let rows = minRows; rows <= maxRows; rows++) {
    const cols = Math.ceil(n / rows);
    const availW = w - GAP * Math.max(0, cols - 1);
    const availH = h - GAP * Math.max(0, rows - 1) - 0; // small safety buffer
    const raw = Math.floor(Math.min(availW / cols, availH / rows));

    const maxHeightCell = Math.floor(
      (h - GAP * (rows - 1)) / rows
    );

    const cell = Math.min(
      MAX_CELL,
      raw || 0,
      maxHeightCell
    );

    
    if (!cell) continue;

    // 🔴 CRITICAL: ensure the full grid actually fits vertically
    const totalHeight = rows * cell + GAP * (rows - 1);
    if (totalHeight > h) continue;

    if (cell > best.cell) {
      best = { rows, cols, cell };
    } else if (cell === best.cell) {
      const containerAR = (h > 0) ? (w / h) : 1;
      const arBest = best.cols / best.rows;
      const arThis = cols / rows;
      const dBest = Math.abs(arBest - containerAR);
      const dThis = Math.abs(arThis - containerAR);
      if (dThis < dBest) best = { rows, cols, cell };
    }
  }

    MOD.elBoard.style.setProperty('--dd-cols', String(best.cols));
    MOD.elBoard.style.setProperty('--dd-rows', String(best.rows));
    MOD.elBoard.style.setProperty('--dd-cell', `${best.cell}px`);
  }

  function makeTiles() {
    const total = Math.max(1, MOD.tileCount);

    const safeHazardCount = Math.round(total * 0.125);
    const safeMinusOneCount = Math.round(total * 0.125);
    const safeZeroCount = Math.round(total * 0.25);
    const safePlusOneCount = Math.round(total * 0.25);
    const safePlusTwoCount = total - safeHazardCount - safeMinusOneCount - safeZeroCount - safePlusOneCount;

    const deepHazardCount = Math.round(total * 0.25);
    const deepMinusTwoCount = Math.round(total * 0.25);
    const deepPlusThreeCount = Math.round(total * 0.25);
    const deepPlusFiveCount = total - deepHazardCount - deepMinusTwoCount - deepPlusThreeCount;

    const safePool = shuffle([
      ...Array(safeHazardCount).fill({ safeHazard: true, safeValue: 0 }),
      ...Array(safeMinusOneCount).fill({ safeHazard: false, safeValue: -1 }),
      ...Array(safeZeroCount).fill({ safeHazard: false, safeValue: 0 }),
      ...Array(safePlusOneCount).fill({ safeHazard: false, safeValue: 1 }),
      ...Array(safePlusTwoCount).fill({ safeHazard: false, safeValue: 2 }),
    ]);

    const deepPool = shuffle([
      ...Array(deepHazardCount).fill({ deepHazard: true, deepValue: 0 }),
      ...Array(deepMinusTwoCount).fill({ deepHazard: false, deepValue: -2 }),
      ...Array(deepPlusThreeCount).fill({ deepHazard: false, deepValue: 3 }),
      ...Array(deepPlusFiveCount).fill({ deepHazard: false, deepValue: 5 }),
    ]);

    MOD.tiles = Array.from({ length: MOD.tileCount }, (_, i) => ({
      num: i + 1,
      safeValue: Number(safePool[i]?.safeValue ?? 0),
      safeHazard: !!safePool[i]?.safeHazard,
      deepValue: Number(deepPool[i]?.deepValue ?? 0),
      deepHazard: !!deepPool[i]?.deepHazard,
      opened: false,
      revealedType: '',
      revealedFace: '',
    }));
  }

  function buildTeamBarHtml() {
    return `
      <div class="ce-dd-teambar">
        ${MOD.teamOrder.map((team) => {
          const score = Number(MOD.teamScores.get(team.key) || 0);
          const count = (MOD.teams.get(team.key) || []).length;
          return `
            <div class="ce-dd-teampill">
              <span class="ce-dd-dot ${team.key}"></span>
              <span>${escapeHtml(team.label)}</span>
              <span>•</span>
              <span>${score}</span>
              <span>•</span>
              <span>${count}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function buildControlsHtml() {
    const cats = getCatOptions(MOD.qb);
    const subs = getSubOptions(MOD.qb, MOD.cat);

    return `
      <div class="ce-dd-controls">
        <div class="ce-dd-field">
          <button type="button" class="ce-dd-btn" data-dd-load-qb>Load QB</button>
          <button type="button" class="ce-dd-btn" data-dd-use-built-in>Use built-in</button>
          <input type="file" data-dd-qbfile style="display:none" accept=".json,.js,.txt" />
        </div>
        <div class="ce-dd-field">
          <span class="ce-dd-fieldlabel">Category</span>
          <select class="ce-dd-select" data-dd-cat>
            ${cats.map(c => `<option value="${escapeHtmlAttr(c.key)}"${c.key === MOD.cat ? ' selected' : ''}>${escapeHtml(c.label)}</option>`).join('')}
          </select>
        </div>
        <div class="ce-dd-field">
          <span class="ce-dd-fieldlabel">Sub</span>
          <select class="ce-dd-select" data-dd-sub>
            ${subs.map(s => `<option value="${escapeHtmlAttr(s.key)}"${s.key === MOD.sub ? ' selected' : ''}>${escapeHtml(s.label)}</option>`).join('')}
          </select>
        </div>
        <div class="ce-dd-field">
          <span class="ce-dd-fieldlabel">Focus</span>
          <select class="ce-dd-select" data-dd-focus>
            ${getFocusOptions(MOD.qb, MOD.cat, MOD.sub).map(f => `<option value="${escapeHtmlAttr(f.key)}"${f.key === MOD.focus ? ' selected' : ''}>${escapeHtml(f.label)}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
  }

  function buildActionButtonsHtml() {
    const state = MOD.turnState;

    let actionHtml = '';

    if (state === 'idle') {
      actionHtml = `
        <button type="button" class="ce-dd-btn dd-open" data-dd-select-student>Select Student</button>
      `;
    } else if (state === 'awaitingDigType') {
      actionHtml = `
        <button type="button" class="ce-dd-btn dd-safe dd-active" data-dd-safe>SAFE</button>
        <button type="button" class="ce-dd-btn dd-deep dd-active" data-dd-deep>DIG DEEP</button>
      `;
    } else if (state === 'chainingDecision') {
      actionHtml = `
        <button type="button" class="ce-dd-btn dd-bank dd-active" data-dd-bank>BANK TURN</button>
        <button type="button" class="ce-dd-btn dd-chain dd-active" data-dd-chain>DIG AGAIN</button>
      `;
    }

    return `
      <div class="ce-dd-turnbox">
        <div class="ce-dd-turnmeta" data-dd-turnmeta data-dd-team="">
          <span class="ce-dd-label">Turn:</span> —
        </div>
      </div>
      <div class="ce-dd-status" data-dd-status>${escapeHtml(MOD.statusText)}</div>
      <div class="ce-dd-stats">
        <span class="ce-dd-pill">Current chain: ${Number(MOD.currentTurnGain || 0)}</span>
        <span class="ce-dd-pill">Mode: ${MOD.currentDigType ? escapeHtml(MOD.currentDigType.toUpperCase()) : '—'}</span>
        <span class="ce-dd-pill">Remaining tiles: ${MOD.tiles.filter(t => !t.opened).length}</span>
        <span class="ce-dd-pill">Last: ${buildLastRevealText()}</span>
        ${actionHtml ? `<span class="ce-dd-actionrow">${actionHtml}</span>` : ''}
      </div>
    `;
  }

  function buildLastRevealText() {
    const r = MOD.lastReveal;
    if (!r) return '—';
    if (r.type === 'hazard') return `Hazard at ${r.tile}`;
    if (r.type === 'safeHazard') return `Safe hazard at ${r.tile}`;
    if (r.type === 'safe') return `Safe +${r.value} at ${r.tile}`;
    if (r.type === 'deep') return `Deep +${r.value} at ${r.tile}`;
    return '—';
  }

  function buildBoardHtml() {
    return `
      <div class="ce-dd-boardwrap">
        <div class="ce-dd-grid" data-dd-board>
          ${MOD.tiles.map((tile) => {
            const armed = !tile.opened && MOD.turnState === 'awaitingTile';
            const openedClass = tile.opened ? 'open' : '';
            const hazardClass = tile.opened && (tile.revealedType === 'hazard' || tile.revealedType === 'safeHazard')
              ? 'hazard'
              : '';
            const cls = ['ce-dd-tile', openedClass, hazardClass, armed ? 'is-armed' : ''].filter(Boolean).join(' ');
            let face = '';
            if (tile.opened) {
              face = String(tile.revealedFace || '');
            }
            return `
              <button type="button" class="${cls}" data-dd-tile="${tile.num}" ${tile.opened ? 'disabled' : ''}>
                <span class="ce-dd-num">${tile.num}</span>
                <span class="ce-dd-face">${escapeHtml(face)}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function bindUi() {
    MOD.elTurnMeta = qs('[data-dd-turnmeta]', MOD.root);
    MOD.elStatus = qs('[data-dd-status]', MOD.root);
    MOD.elCat = qs('[data-dd-cat]', MOD.root);
    MOD.elSub = qs('[data-dd-sub]', MOD.root);
    MOD.elFocus = qs('[data-dd-focus]', MOD.root);
    MOD.elBtnSelect = qs('[data-dd-select-student]', MOD.root);
    MOD.elBoard = qs('[data-dd-board]', MOD.root);
    MOD.elBtnLoadQB = qs('[data-dd-load-qb]', MOD.root);
    MOD.elBtnUseBuiltInQB = qs('[data-dd-use-built-in]', MOD.root);
    MOD.elQbFile = qs('[data-dd-qbfile]', MOD.root);

    if (MOD.elBtnSelect) {
      MOD.elBtnSelect.addEventListener('click', () => {
        selectNextTurn();
      });
    }
    MOD.elBtnLoadQB?.addEventListener('click', () => {
      MOD.elQbFile?.click();
    });
    MOD.elBtnUseBuiltInQB?.addEventListener('click', () => {
      if (!MOD.qbBuiltIn) {
        setStatus('No built-in question bank available.');
        syncUi();
        return;
      }
      MOD.qbLoadedSingle = null;
      MOD.qbUploaded = null;
      MOD.qbSource = 'builtin';
      MOD.qb = MOD.qbBuiltIn;
      loadQBSelection();

      const cats = getCatOptions(MOD.qb);
      if (!MOD.cat || !cats.find(c => c.key === MOD.cat)) {
        MOD.cat = cats.find(c => c.key === 'quickmath')?.key || cats[0]?.key || '';
      }
      const subs = getSubOptions(MOD.qb, MOD.cat);
      if (!MOD.sub || !subs.find(s => s.key === MOD.sub)) {
        MOD.sub = subs[0]?.key || '';
      }
      const focuses = getFocusOptions(MOD.qb, MOD.cat, MOD.sub);
      if (!MOD.focus || !focuses.find(f => f.key === MOD.focus)) {
        MOD.focus = focuses[0]?.key || '';
      }

      setQBSelectorMode(false);
      setStatus('Using built-in question bank.');
      render();
    });
    MOD.elQbFile?.addEventListener('change', async () => {
      const f = MOD.elQbFile.files?.[0];
      MOD.elQbFile.value = '';
      if (!f) return;

      try {
        const text = await f.text();
        const qb = parseQBFileText(text);
        if (!qb) {
          setStatus('Load QB failed: could not parse file.');
          return;
        }

        MOD.qbSource = 'uploaded';

        if (isLoadedSingleQB(qb)) {
          MOD.qbLoadedSingle = qb;
          MOD.qbUploaded = null;
          MOD.qb = MOD.qbBuiltIn;
        } else {
          MOD.qbLoadedSingle = null;
          MOD.qbUploaded = qb;
          MOD.qb = MOD.qbUploaded;

          const cats = getCatOptions(MOD.qb);
          MOD.cat = cats[0]?.key || '';
          MOD.sub = getSubOptions(MOD.qb, MOD.cat)[0]?.key || '';
          MOD.focus = getFocusOptions(MOD.qb, MOD.cat, MOD.sub)[0]?.key || '';
        }

        setQBSelectorMode(true);
        setStatus('Loaded temporary question bank.');
        render();
      } catch {
        setStatus('Load QB failed.');
      }
    });

    qs('[data-dd-safe]', MOD.root)?.addEventListener('click', () => chooseDigType('safe'));
    qs('[data-dd-deep]', MOD.root)?.addEventListener('click', () => chooseDigType('deep'));
    qs('[data-dd-bank]', MOD.root)?.addEventListener('click', () => bankTurn());
    qs('[data-dd-chain]', MOD.root)?.addEventListener('click', () => digAgain());

    if (MOD.elCat) {
      MOD.elCat.addEventListener('change', () => {
        MOD.cat = String(MOD.elCat.value || '');
        MOD.sub = getSubOptions(MOD.qb, MOD.cat)[0]?.key || '';
        MOD.focus = getFocusOptions(MOD.qb, MOD.cat, MOD.sub)[0]?.key || '';
        saveQBSelection();
        render();
      });
    }

    if (MOD.elSub) {
      MOD.elSub.addEventListener('change', () => {
        MOD.sub = String(MOD.elSub.value || '');
        MOD.focus = getFocusOptions(MOD.qb, MOD.cat, MOD.sub)[0]?.key || '';
        saveQBSelection();
        render();
      });
    }

    if (MOD.elFocus) {
      MOD.elFocus.addEventListener('change', () => {
        MOD.focus = String(MOD.elFocus.value || '');
        saveQBSelection();
        syncUi();
      });
    }

    qsa('[data-dd-tile]', MOD.root).forEach((btn) => {
      btn.addEventListener('click', () => {
        const n = Number(btn.getAttribute('data-dd-tile'));
        handleTileClick(n);
      });
    });

    applySafeBottom();
    layoutTileGrid();
    updateTurnMeta();
    setQBSelectorMode(MOD.qbSource === 'uploaded');
    syncUi();

    if (!MOD.onResize) {
      MOD.onResize = () => {
        if (MOD._raf) return;
        MOD._raf = requestAnimationFrame(() => {
          MOD._raf = 0;
          applySafeBottom();
          layoutTileGrid();
        });
      };
      window.addEventListener('resize', MOD.onResize);
    }
  }

  function updateTurnMeta() {
    if (!MOD.elTurnMeta) return;
    const team = MOD.teamOrder.find((t) => t.key === MOD.currentTeamKey);
    MOD.elTurnMeta.setAttribute('data-dd-team', MOD.currentTeamKey || '');
    MOD.elTurnMeta.innerHTML = `
      <span class="ce-dd-dot ${MOD.currentTeamKey || ''}"></span>
      <span><span class="ce-dd-label">Turn:</span> ${team?.label || '—'} · ${MOD.currentStudent?.name || '—'}</span>
    `;
  }

  function syncUi() {
    if (!MOD.root) return;

    const canChooseDigType = MOD.turnState === 'awaitingDigType';
    const canChooseTile = MOD.turnState === 'awaitingTile';
    const canChain = MOD.turnState === 'chainingDecision';

    // buttons now conditionally rendered

    qsa('[data-dd-tile]', MOD.root).forEach((btn) => {
      const n = Number(btn.getAttribute('data-dd-tile'));
      const tile = MOD.tiles.find(t => t.num === n);
      if (!tile) return;
      btn.disabled = !!tile.opened || !canChooseTile;
    });

    if (MOD.elCat && MOD.cat) MOD.elCat.value = MOD.cat;
    if (MOD.elSub && MOD.sub) MOD.elSub.value = MOD.sub;
    if (MOD.elFocus && MOD.focus) MOD.elFocus.value = MOD.focus;
    setStatus(MOD.statusText);
    updateTurnMeta();
  }

function render() {
  if (!MOD.root) return;
  MOD.root.innerHTML = `
    <div class="ce-dd-root">
      <div class="ce-dd-card">
        <div class="ce-dd-title">Dig Dirt</div>
        <div class="ce-dd-headerrow">
          ${buildTeamBarHtml()}
          ${buildControlsHtml()}
        </div>
        ${buildActionButtonsHtml()}
      </div>
      <div class="ce-dd-card" style="flex:1 1 auto; min-height:0; overflow:hidden;">
        ${buildBoardHtml()}
      </div>
    </div>
  `;
  bindUi();
  fitBoardToCanvas();
}


function awardStudentsFromResults() {
  const flashed = [];

  for (const team of MOD.teamOrder) {
    const key = team.key;
    const reward = Number(MOD.teamScores.get(key) || 0);
    const members = MOD.teams.get(key) || [];

    for (const student of members) {
      applyAward(student.id, reward);
      if (reward !== 0) {
        flashed.push({ id: student.id, type: reward > 0 ? 'bonus' : 'penalty' });
      }
    }
  }

  if (flashed.length) {
    setTimeout(() => {
      for (const item of flashed) flashStudent(item.id, item.type);
    }, 0);
  }
}

function continuePendingHubAction() {
  const action = MOD._pendingHubAction;
  MOD._pendingHubAction = null;
  if (!action) return;

  if (action.type === 'exit') {
    try { window.__CE_PHASE5?.exit?.(); } catch {}
    return;
  }

  if (action.type === 'switch' && action.id) {
    try { window.__CE_PHASE5?.switchTo?.(action.id); } catch {}
  }
}

function requestResultsBeforeUnmount(nextAction = { type: 'exit' }) {
  if (MOD._allowImmediateUnmount) {
    MOD._allowImmediateUnmount = false;
    return true;
  }
  if (!MOD.active) return true;
  if (MOD._resultsShowing) return false;

  MOD.turnState = 'resolved';
  MOD._pendingHubAction = nextAction;
  MOD._resultsShowing = true;
  renderResultsModal();
  return false;
}

function renderResultsModal() {
  if (!MOD.root) return;

  const existing = qs('[data-dd-results-modal]', MOD.root);
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'qc-modal';
  modal.setAttribute('data-dd-results-modal', 'true');

  const rows = MOD.teamOrder.map(team => {
    const key = team.key;
    const reward = Number(MOD.teamScores.get(key) || 0);

    return `
      <div class="qc-row">
        <strong>${escapeHtml(team.label)}</strong><br>
        Team score: ${reward}<br>
        Award per student: ${reward}
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="qc-modal-card">
      <div class="qc-modal-title">Dig Dirt Results</div>
      ${rows}
      <div class="qc-footer">
        <button class="ce-dd-btn" data-dd-award-results>🏆 Award & Close</button>
        <button class="ce-dd-btn" data-dd-close-results>Close</button>
      </div>
    </div>
  `;

  MOD.root.appendChild(modal);

  qs('[data-dd-award-results]', modal)?.addEventListener('click', () => {
    awardStudentsFromResults();
    MOD._resultsShowing = false;
    MOD._allowImmediateUnmount = true;    
    const m = qs('[data-dd-results-modal]', MOD.root);
    if (m) m.remove();
    continuePendingHubAction();
  });

  qs('[data-dd-close-results]', modal)?.addEventListener('click', () => {
    MOD._resultsShowing = false;
    MOD._allowImmediateUnmount = true;
    const m = qs('[data-dd-results-modal]', MOD.root);
    if (m) m.remove();
    continuePendingHubAction();
  });
}

function interceptPhaseGateExit() {
  const Ev = window.__CE_BOOT?.modules?.Events;
  if (!Ev || typeof Ev.on !== 'function') return;
  if (MOD._ddExitHooked) return;

  MOD._ddExitHooked = true;

  Ev.on('ui:openWindow', (payload) => {
    const id = payload?.detail?.id ?? payload?.id ?? '';
    if (!MOD.active) return;
    if (id !== 'phaseGateExit') return;

    requestResultsBeforeUnmount({ type: 'exit' });
  });
}

function getNextStudentForTeam(teamKey) {
  const students = MOD.teams.get(teamKey) || [];
  const picked = MOD.pickedByTeam.get(teamKey) || new Set();
  if (!students.length) return null;

  let available = students.filter((s) => !picked.has(s.id));
  if (!available.length) {
    picked.clear();
    available = students.slice();
  }

  const student = available[0] || null;
  if (student) picked.add(student.id);
  return student;
}

function selectNextTurn() {
  if (!MOD.teamOrder.length) return;
  if (MOD.turnState !== 'idle' && MOD.turnState !== 'resolved') return;

  const team = MOD.teamOrder[MOD.currentTeamIndex];
  if (!team) return;

  MOD.currentTeamKey = team.key;
  MOD.currentStudent = getNextStudentForTeam(team.key);
  MOD.currentTurnGain = 0;
  MOD.currentDigType = '';
  MOD.lastReveal = null;
  MOD.turnState = 'awaitingQuestion';

  highlightCurrentStudent();
  setStatus(`Open a question for ${team.label} · ${MOD.currentStudent?.name || '—'}.`);
  render();
  openQuestionModal();

  if (!MOD.cat || !MOD.sub || !MOD.focus) {
    setStatus('Select a category, subcategory, and focus.');
    syncUi();
    return;
  }

  render();
  openQuestionModal();

}

function advanceToNextTeam() {
  if (!MOD.teamOrder.length) return;
  MOD.currentTeamIndex = (MOD.currentTeamIndex + 1) % MOD.teamOrder.length;
  MOD.currentTeamKey = '';
  MOD.currentStudent = null;
  MOD.currentTurnGain = 0;
  MOD.currentDigType = '';
  MOD.turnState = 'idle';
  MOD.lastReveal = null;

  highlightCurrentStudent();
  setStatus('Select student to begin.');
  render();
}

function chooseDigType(type) {
  if (MOD.turnState !== 'awaitingDigType') return;
  if (type !== 'safe' && type !== 'deep') return;

  MOD.currentDigType = type;
  MOD.turnState = 'awaitingTile';
  setStatus(`${type === 'safe' ? 'SAFE' : 'DIG DEEP'} selected. Choose a dirt tile.`);
  render();
}

function handleTileClick(tileNum) {
  if (MOD.turnState !== 'awaitingTile') return;
  if (!MOD.currentDigType) return;

  const tile = MOD.tiles.find((t) => t.num === tileNum);
  if (!tile || tile.opened) return;

  tile.opened = true;

  if (MOD.currentDigType === 'safe') {
    if (tile.safeHazard) {
      tile.revealedType = 'safeHazard';
      tile.revealedFace = '💥';
      MOD.lastReveal = { type: 'safeHazard', value: 0, tile: tile.num };
      MOD.currentTurnGain = 0;
      MOD.currentDigType = '';
      MOD.turnState = 'resolved';
      setStatus(`Hazard hit at tile ${tile.num}. Chain lost.`);

      render();

      window.setTimeout(() => {
        advanceToNextTeam();
        render();
      }, 900);
      return;
    }

    const value = Number(tile.safeValue || 0);
    tile.revealedType = 'safe';
    tile.revealedFace = `${value > 0 ? '+' : ''}${value}`;
    MOD.currentTurnGain += value;
    MOD.lastReveal = { type: 'safe', value, tile: tile.num };
    MOD.turnState = 'chainingDecision';
    setStatus(`Safe dig found ${value > 0 ? '+' : ''}${value}. Bank turn or dig again.`);
    render();
    return;
  }

  if (tile.deepHazard) {
    tile.revealedType = 'hazard';
    tile.revealedFace = '💥';
    MOD.lastReveal = { type: 'hazard', value: 0, tile: tile.num };
    MOD.currentTurnGain = 0;
    MOD.currentDigType = '';
    MOD.turnState = 'resolved';
    setStatus(`Hazard hit at tile ${tile.num}. Chain lost.`);

    render();

    window.setTimeout(() => {
      advanceToNextTeam();
      render();
    }, 900);
    return;
  }

  const value = Number(tile.deepValue || 0);
  tile.revealedType = 'deep';
  tile.revealedFace = `${value > 0 ? '+' : ''}${value}`;
  MOD.currentTurnGain += value;
  MOD.lastReveal = { type: 'deep', value, tile: tile.num };
  MOD.turnState = 'chainingDecision';
  setStatus(`Deep dig found ${value > 0 ? '+' : ''}${value}. Bank turn or dig again.`);
  render();
}

function bankTurn() {
  if (MOD.turnState !== 'chainingDecision') return;
  const prev = Number(MOD.teamScores.get(MOD.currentTeamKey) || 0);
  MOD.teamScores.set(MOD.currentTeamKey, prev + Number(MOD.currentTurnGain || 0));

  const banked = Number(MOD.currentTurnGain || 0);
  MOD.currentTurnGain = 0;
  MOD.currentDigType = '';
  MOD.turnState = 'resolved';
  setStatus(`${MOD.currentTeamKey ? MOD.currentTeamKey.toUpperCase() : 'Team'} banked +${banked}.`);

  render();

  window.setTimeout(() => {
    advanceToNextTeam();
    render();
  }, 700);
}

function digAgain() {
  if (MOD.turnState !== 'chainingDecision') return;
  MOD.currentDigType = '';
  MOD.turnState = 'awaitingDigType';
  setStatus('Choose SAFE or DIG DEEP.');
  render();
}

function closeModal() {
  if (MOD.timerId) {
    clearInterval(MOD.timerId);
    MOD.timerId = null;
  }
  if (MOD.modalKeyHandler) {
    window.removeEventListener('keydown', MOD.modalKeyHandler, true);
    MOD.modalKeyHandler = null;
  }
  MOD.modalEl?.remove();
  MOD.modalEl = null;
  MOD.qStarted = false;
  MOD.qObj = null;
}

function openQuestionModal() {
  closeModal();

  const student = MOD.currentStudent || { name: 'Student' };  
  const catLbl = (MOD.qbSource === 'uploaded' && MOD.qbLoadedSingle)
    ? (MOD.qbLoadedSingle?.stage?.label || MOD.qbLoadedSingle?.stage?.key || '—')
    : (getCatOptions(MOD.qb).find((x) => x.key === MOD.cat)?.label || MOD.cat);
  const subLbl = (MOD.qbSource === 'uploaded' && MOD.qbLoadedSingle)
    ? (MOD.qbLoadedSingle?.unit?.label || MOD.qbLoadedSingle?.unit?.key || '—')
    : (getSubOptions(MOD.qb, MOD.cat).find((x) => x.key === MOD.sub)?.label || MOD.sub);
  const focusLbl = (MOD.qbSource === 'uploaded' && MOD.qbLoadedSingle)
    ? (MOD.qbLoadedSingle?.focus?.label || MOD.qbLoadedSingle?.focus?.key || '—')
    : (getFocusOptions(MOD.qb, MOD.cat, MOD.sub).find((x) => x.key === MOD.focus)?.label || MOD.focus);

  const modal = document.createElement('div');
  modal.className = 'qc-modal';
  modal.innerHTML = `
    <div class="qc-modal-card" role="dialog" aria-modal="true" aria-label="Dig Dirt Question">
      <div class="qc-modal-h">
        <div class="qc-modal-title">${escapeHtml(student.name)}</div>
        <button type="button" class="qc-x" data-dd-close>×</button>
      </div>

      <div class="qc-row">
      <div class="qc-row qc-mono" style="opacity:0.85;">
        Category: <span data-dd-catlbl>—</span> &nbsp;•&nbsp; Sub: <span data-dd-sublbl>—</span> &nbsp;•&nbsp; Focus: <span data-dd-focuslbl>—</span>
      </div>
      <div class="qc-row">
        <div class="qc-label qc-mono">Summon question</div>
        <div class="qc-diffGroup" aria-label="Difficulty (hotkeys 1/2/3)">
          <button type="button" class="qc-diffBtn" data-dd-diff="1">1</button>
          <button type="button" class="qc-diffBtn" data-dd-diff="2">2</button>
          <button type="button" class="qc-diffBtn" data-dd-diff="3">3</button>
          <button type="button" class="qc-diffBtn" data-dd-reveal-answer disabled>Reveal</button>
          <span class="qc-mono" style="opacity:0.7; font-weight:900;"> • Hotkeys: 1 / 2 / 3 • Reveal: 4</span>
        </div>
      </div>
      <div class="qc-row">
        <div class="qc-label qc-mono">Question</div>
        <div class="qc-q" data-dd-q></div>
      </div>
      <div class="qc-row" data-dd-awrap style="display:none;">
        <div class="qc-label qc-mono">Answer</div>
        <div class="qc-a" data-dd-a>—</div>
      </div>
      <div class="qc-row qc-mono qc-timer">
        Timer: <span data-qc-t>10.0s</span>
      </div>
      <div class="qc-footer">
        <button type="button" class="ce-dd-btn" data-dd-incorrect disabled>❌ Incorrect</button>
        <button type="button" class="ce-dd-btn qc-ok" data-dd-correct disabled>✅ Correct</button>
      </div>
    </div>
  `;

  MOD.root.appendChild(modal);
  MOD.modalEl = modal;

  qs('[data-dd-catlbl]', modal).textContent = String(catLbl);
  qs('[data-dd-sublbl]', modal).textContent = String(subLbl);
  qs('[data-dd-focuslbl]', modal).textContent = String(focusLbl);

  const qEl = qs('[data-dd-q]', modal);
  const aEl = qs('[data-dd-a]', modal);
  const aWrap = qs('[data-dd-awrap]', modal);
  const tEl = qs('[data-qc-t]', modal);
  const correctBtn = qs('[data-dd-correct]', modal);
  const incorrectBtn = qs('[data-dd-incorrect]', modal);
  const revealBtn = qs('[data-dd-reveal-answer]', modal);

  function startQuestion(diff) {
    if (MOD.timerId) {
      clearInterval(MOD.timerId);
      MOD.timerId = null;
    }
    if (aWrap) aWrap.style.display = 'none';
    if (tEl) tEl.textContent = '10.0s';

    MOD.qDifficulty = Number(diff) || 1;
    MOD.qObj = (MOD.qbSource === 'uploaded' && MOD.qbLoadedSingle)
      ? pickRandomQuestionLoaded(MOD.qbLoadedSingle, MOD.qDifficulty)
      : pickRandomQuestion(MOD.qb, MOD.cat, MOD.sub, MOD.focus, MOD.qDifficulty);

    if (!MOD.qObj) {
      qEl.textContent = 'No question available.';
      aEl.textContent = '—';
      correctBtn.disabled = true;
      incorrectBtn.disabled = true;
      revealBtn.disabled = true;
      return;
    }

    MOD.qStarted = true;
    qEl.textContent = MOD.qObj.q;
    aEl.textContent = MOD.qObj.a;
    correctBtn.disabled = false;
    incorrectBtn.disabled = false;
    revealBtn.disabled = false;

    const timerMs = 10000;
    MOD.endsAt = Date.now() + timerMs;

    MOD.timerId = window.setInterval(() => {
      const left = Math.max(0, MOD.endsAt - Date.now());
      if (tEl) tEl.textContent = (left / 1000).toFixed(1) + 's';
      if (left <= 0) {
        if (aWrap) aWrap.style.display = '';
        clearInterval(MOD.timerId);
        MOD.timerId = null;
      }
    }, 100);
  }

  qs('[data-dd-close]', modal)?.addEventListener('click', () => {
    closeModal();
    MOD.turnState = 'idle';
    setStatus('Question closed.');
    syncUi();
  });

  qsa('[data-dd-diff]', modal).forEach((btn) => {
    btn.addEventListener('click', () => startQuestion(btn.getAttribute('data-dd-diff')));
  });

  revealBtn?.addEventListener('click', () => {
    if (!MOD.qStarted) return;
    if (aWrap) aWrap.style.display = '';
    if (MOD.timerId) {
      clearInterval(MOD.timerId);
      MOD.timerId = null;
    }
  });

  correctBtn?.addEventListener('click', () => {
    closeModal();
    MOD.turnState = 'awaitingDigType';
    setStatus('Correct. Choose SAFE or DIG DEEP.');
    render();
  });

  incorrectBtn?.addEventListener('click', () => {
    closeModal();
    MOD.turnState = 'resolved';
    MOD.currentTurnGain = 0;
    MOD.currentDigType = '';
    setStatus('Incorrect. Turn over.');
    render();

    window.setTimeout(() => {
      advanceToNextTeam();
      render();
    }, 700);
  });

  MOD.modalKeyHandler = (e) => {
    if (!MOD.modalEl) return;
    if (e.key === '1' || e.key === '2' || e.key === '3') {
      e.preventDefault();
      startQuestion(e.key);
      return;
    }
    if (e.key === '4') {
      e.preventDefault();
      if (!MOD.qStarted) return;
      if (aWrap) aWrap.style.display = '';
      if (MOD.timerId) {
        clearInterval(MOD.timerId);
        MOD.timerId = null;
      }
    }
  };

  window.addEventListener('keydown', MOD.modalKeyHandler, true);
}

function beforeUnmount() {
  return requestResultsBeforeUnmount({ type: 'exit' });
}

function mount(host) {
  if (!host) return;
  MOD.active = true;
  MOD.host = host;

  ensureStyles();
  initBuiltInQB();
  assignTeams();
  makeTiles();

  MOD.root = document.createElement('div');
  MOD.root.id = 'ce-digdirt-root';
  host.appendChild(MOD.root);

  MOD.currentTeamIndex = 0;
  MOD.currentTeamKey = '';
  MOD.currentStudent = null;
  MOD.turnState = 'idle';
  MOD.currentTurnGain = 0;
  MOD.currentDigType = '';
  MOD.lastReveal = null;

  applyTeamMarkers();
  render();
  fitBoardToCanvas();

  if (!MOD.onResize) {
    MOD.onResize = () => {
      if (MOD._raf) return;
      MOD._raf = requestAnimationFrame(() => {
        MOD._raf = 0;
        fitBoardToCanvas();
      });
    };
    window.addEventListener('resize', MOD.onResize);
  }

  interceptPhaseGateExit();
}

function unmount() {
  closeModal();

  if (MOD.onResize) {
    window.removeEventListener('resize', MOD.onResize);
    MOD.onResize = null;
  }
  if (MOD._raf) {
    cancelAnimationFrame(MOD._raf);
    MOD._raf = 0;
  }

  clearTeamMarkers();

  if (MOD.root?.parentNode) {
    MOD.root.parentNode.removeChild(MOD.root);
  }

  MOD.active = false;
  MOD.host = null;
  MOD.root = null;
  MOD.activeAtMount = [];
  MOD.teamCount = 0;
  MOD.teamOrder = [];
  MOD.teams = new Map();
  MOD.pickedByTeam = new Map();
  MOD.teamByStudentId = new Map();
  MOD.currentTeamIndex = 0;
  MOD.currentTeamKey = '';
  MOD.currentStudent = null;
  MOD.turnState = 'idle';
  MOD.statusText = 'Select student to begin.';
  MOD.teamScores = new Map();
  MOD.currentTurnGain = 0;
  MOD.lastReveal = null;
  MOD.tiles = [];
  MOD.currentDigType = '';
  MOD.modalEl = null;
  MOD.modalKeyHandler = null;
  MOD.qStarted = false;
  MOD.endsAt = 0;
  MOD.qDifficulty = 1;
  MOD.qObj = null;
  MOD.timerId = null;
  MOD.endsAt = 0;
  MOD.elTurnMeta = null;
  MOD.elStatus = null;
  MOD.elCat = null;
  MOD.elSub = null;
  MOD.elFocus = null;  
  MOD.elBtnSelect = null;
  MOD.elBtnLoadQB = null;
  MOD.elBtnUseBuiltInQB = null;
  MOD.elQbFile = null;
  MOD.elBoard = null;
  MOD._ddExitHooked = false;
  MOD._pendingHubAction = null;
  MOD._resultsShowing = false;
  MOD._allowImmediateUnmount = false;
}

function registerWithHub() {
  const hub = window.__CE_PHASE5;
  if (!hub || typeof hub.register !== 'function') return false;

  hub.register({
    id: 'digdirt',
    label: 'Dig Dirt',
    mount,
    unmount,
    beforeUnmount,
  });

  window.__CE_DIGDIRT = Object.assign({}, window.__CE_DIGDIRT, { mount, unmount });
  return true;
}

if (!registerWithHub()) {
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (registerWithHub() || tries >= 20) clearInterval(t);
  }, 100);
}

window.__CE_BOOT = window.__CE_BOOT || { modules: {} };
window.__CE_BOOT.modules = window.__CE_BOOT.modules || {};
window.__CE_BOOT.modules.digdirt = { mount, unmount };

})();