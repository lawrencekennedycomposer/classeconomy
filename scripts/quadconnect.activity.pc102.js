/* =========================================================
   PC#102 – Phase 5 Activity: Quad Connect (hub-controlled)
   Purpose:
     - Collaborative Phase 5 mini-game
     - Owns ONLY the activity canvas while active
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
    lineTallyByTeam: new Map(),
    rawLinesByTeam: new Map(),
    teamByStudentId: new Map(),
    currentTeamIndex: 0,
    currentTeamKey: '',
    currentStudent: null,
    turnState: 'idle', // idle | awaitingQuestion | awaitingPlacement | resolved
    statusText: 'Select or advance to the next turn.',
    board: new Map(), // cell -> teamKey
    riskBoostByTeam: new Map(),

    qbBuiltIn: null,
    qbUploaded: null,
    qbLoadedSingle: null,
    qbSource: 'builtin',
    qb: null,
    cat: '',
    sub: '',
    focus: '',

    modalEl: null,
    modalKeyHandler: null,
    qStarted: false,
    qDifficulty: 1,
    qObj: null,
    timerId: null,
    endsAt: 0,

    elHeaderRow: null,
    elTurnMeta: null,
    elStatus: null,
    elCat: null,
    elSub: null,
    elFocus: null,
    elBtnSelect: null,

    _qcExitHooked: false,
    _phaseExitHandler: null,    
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

  function ensureStyles() {
    if (document.getElementById('ce-quadconnect-styles')) return;
    const s = document.createElement('style');
    s.id = 'ce-quadconnect-styles';
    s.textContent = `
      #ce-quadconnect-root .ce-qc-root{
        position:absolute; inset:0;
        padding:12px;
        display:flex;
        flex-direction:column;
        gap:12px;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        height:100%;
        min-height:0;
        box-sizing:border-box;
      }
      #ce-quadconnect-root .ce-qc-headerrow{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        align-items:center;
        margin-top:10px;
      }
      #ce-quadconnect-root .ce-qc-headerrow > *{
        min-width:0;
      }
      #ce-quadconnect-root .ce-qc-card{
        background:rgba(255,255,255,0.05);
        border:1px solid rgba(255,255,255,0.10);
        border-radius:14px;
        padding:16px;
      }
      #ce-quadconnect-root .ce-qc-title{
        font-size:18px;
        font-weight:900;
        margin:0 0 8px 0;
      }

      #ce-quadconnect-root .ce-qc-teambar{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:0;
      }
      #ce-quadconnect-root .ce-qc-teampill{
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:8px 10px;
        border-radius:999px;
        background:rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.10);
        font-weight:850;
      }
      #ce-quadconnect-root .ce-qc-turnbox{
        margin-top:10px;
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        align-items:center;
      }
      #ce-quadconnect-root .ce-qc-turnstatus{
        font-weight:800;
        opacity:0.9;
      }
      #ce-quadconnect-root .ce-qc-turnmeta{
        display:flex;
        align-items:center;
        gap:10px;
        padding:10px 12px;
        border-radius:14px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.10);
        font-weight:850;
      }
      #ce-quadconnect-root .ce-qc-turnmeta .ce-qc-label{
        opacity:0.78;
        font-weight:800;
      }
      #ce-quadconnect-root .ce-qc-btn{
        appearance:none;
        border:0;
        cursor:pointer;
        padding:10px 12px;
        border-radius:12px;
        background:rgba(80,140,255,0.35);
        color:#fff;
        font-weight:900;
      }
      #ce-quadconnect-root .ce-qc-btn:hover{ background:rgba(80,140,255,0.45); }
      #ce-quadconnect-root .ce-qc-btn:active{ transform:translateY(1px); }
      #ce-quadconnect-root .ce-qc-btn[disabled]{
        opacity:0.45;
        cursor:not-allowed;
      }
      #ce-quadconnect-root .ce-qc-dot{
        width:12px;
        height:12px;
        border-radius:999px;
        flex:0 0 12px;
      }

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

      #ce-quadconnect-root .ce-qc-dot.red{ background:rgba(255,90,90,0.95); }
      #ce-quadconnect-root .ce-qc-dot.blue{ background:rgba(80,140,255,0.95); }
      #ce-quadconnect-root .ce-qc-dot.green{ background:rgba(70,200,120,0.95); }
      #ce-quadconnect-root .ce-qc-dot.yellow{ background:rgba(255,210,70,0.95); }
      #ce-quadconnect-root .ce-qc-turnmeta[data-qc-team="red"]{
        background:rgba(255,90,90,0.14);
        border-color:rgba(255,90,90,0.30);
      }
      #ce-quadconnect-root .ce-qc-turnmeta[data-qc-team="blue"]{
        background:rgba(80,140,255,0.14);
        border-color:rgba(80,140,255,0.30);
      }
      #ce-quadconnect-root .ce-qc-turnmeta[data-qc-team="green"]{
        background:rgba(70,200,120,0.14);
        border-color:rgba(70,200,120,0.30);
      }
      #ce-quadconnect-root .ce-qc-turnmeta[data-qc-team="yellow"]{
        background:rgba(255,210,70,0.14);
        border-color:rgba(255,210,70,0.30);
      }
      #ce-quadconnect-root .ce-qc-dot.purple{ background:rgba(180,110,255,0.95); }
      #ce-quadconnect-root .ce-qc-dot.orange{ background:rgba(255,155,70,0.95); }
      #ce-quadconnect-root .ce-qc-dot.cyan{ background:rgba(70,220,255,0.95); }
      #ce-quadconnect-root .ce-qc-dot.pink{ background:rgba(255,120,190,0.95); }
      #ce-quadconnect-root .ce-qc-controls{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        align-items:center;
        margin-left:auto;
      }
      #ce-quadconnect-root .ce-qc-field{
        display:flex;
        align-items:center;
        gap:5px;
        min-width:0;
      }
      #ce-quadconnect-root .ce-qc-fieldlabel{
        font-size:11px;
        opacity:0.72;
        font-weight:900;
        letter-spacing:0.4px;
        text-transform:uppercase;
        white-space:nowrap;
      }
      #ce-quadconnect-root .ce-qc-select{
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
      #ce-quadconnect-root .ce-qc-btn.qc-open{
        padding:10px 16px;
        font-size:14px;
        font-weight:950;
        white-space:nowrap;
      }
      #ce-quadconnect-root .ce-qc-status{
        margin-top:10px;
        padding:10px 12px;
        border-radius:12px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.10);
        font-weight:800;
      }
      #ce-quadconnect-root .qc-modal{
        position:absolute;
        inset:0;
        background:rgba(0,0,0,0.45);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:50;
      }
      #ce-quadconnect-root .qc-modal-card{
        width:min(1100px, 94vw);
        background:#e8f0ff;
        color:#0f172a;
        border-radius:14px;
        padding:22px;
        box-shadow:0 12px 28px rgba(15,23,42,0.25);
      }
      #ce-quadconnect-root .qc-modal-h{
        position:relative;
        display:flex;
        justify-content:center;
        align-items:center;
        margin-bottom:8px;
      }
      #ce-quadconnect-root .qc-modal-title{
        width:100%;
        text-align:center;
        color:#0b3c8a;
        font-size:44px;
        font-weight:900;
        letter-spacing:-0.6px;
      }
      #ce-quadconnect-root .qc-x{
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
      #ce-quadconnect-root .qc-x:hover{ background:rgba(15,23,42,0.08); }
      #ce-quadconnect-root .qc-row{ margin-top:10px; }
      #ce-quadconnect-root .qc-mono{ font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      #ce-quadconnect-root .qc-label{ font-size:12px; opacity:0.8; font-weight:900; letter-spacing:0.6px; text-transform:uppercase; color:#0f172a; }
      #ce-quadconnect-root .qc-q{ font-size:38px; line-height:1.25; font-weight:900; letter-spacing:-0.6px; margin-top:6px; color:#0f172a; }
      #ce-quadconnect-root .qc-a{ font-size:34px; line-height:1.25; font-weight:900; letter-spacing:-0.4px; margin-top:6px; color:#1e293b; }
      #ce-quadconnect-root .qc-diffGroup{ display:flex; gap:0; align-items:center; flex-wrap:wrap; margin-top:6px; }
      #ce-quadconnect-root .qc-diffBtn{ min-width:64px; height:44px; border-radius:0; border:2px solid #93c5fd; background:#e0e7ff; color:#0f172a; font-weight:900; cursor:pointer; }
      #ce-quadconnect-root .qc-diffBtn:first-child{ border-top-left-radius:12px; border-bottom-left-radius:12px; }
      #ce-quadconnect-root .qc-diffBtn:last-child{ border-top-right-radius:12px; border-bottom-right-radius:12px; }
      #ce-quadconnect-root .qc-diffBtn:hover{ background:#dbeafe; }
      #ce-quadconnect-root .qc-footer{
        margin-top:14px;
        display:flex;
        gap:10px;
        justify-content:flex-end;
        flex-wrap:wrap;
      }
      #ce-quadconnect-root .qc-footer .ce-qc-btn{
        background:#e0e7ff;
        color:#0f172a;
        border:2px solid #93c5fd;
      }
      #ce-quadconnect-root .qc-footer .ce-qc-btn:hover{ background:#dbeafe; }
      #ce-quadconnect-root .qc-ok{
        background:#bbf7d0 !important;
        border-color:#22c55e !important;
        color:#065f46 !important;
      }
      #ce-quadconnect-root .qc-timer{
        margin-top:8px;
        font-weight:900;
      }
      #ce-quadconnect-root .qc-timer [data-qc-t]{
        font-size:34px;
        font-weight:900;
        color:#ca8a04;
        letter-spacing:0.5px;
      }
      #ce-quadconnect-root .ce-qc-board{
        flex:1 1 auto;
        min-height:0;
        display:grid;
        grid-template-columns: 40px repeat(8, minmax(0, 1fr));
        grid-template-rows: 32px repeat(8, minmax(0, 1fr));
        gap:8px;
        background:#f3f4f6;
        border-radius:14px;
        padding:6px;
      }
      #ce-quadconnect-root .ce-qc-axis,
      #ce-quadconnect-root .ce-qc-cell{
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:12px;
        font-weight:900;
      }
      #ce-quadconnect-root .ce-qc-axis{
        background:#e5e7eb;
        border:1px solid #d1d5db;
        color:#111827;
        font-weight:900;
      }
      #ce-quadconnect-root .ce-qc-cell{
        min-height:56px;
        background:#e5e7eb;
        border:1px solid #d1d5db;
        position:relative;
        color:#e5e7eb;
      }

      #ce-quadconnect-root .ce-qc-cell.is-red::before,
      #ce-quadconnect-root .ce-qc-cell.is-blue::before,
      #ce-quadconnect-root .ce-qc-cell.is-green::before,
      #ce-quadconnect-root .ce-qc-cell.is-yellow::before{
        content:'';
        position:absolute;
        inset:0;
        border-radius:12px;
        pointer-events:none;
      }

      #ce-quadconnect-root .ce-qc-cell.is-red::before{
        background:radial-gradient(circle at center,
          rgba(255,90,90,0.55) 0%,
          rgba(255,90,90,0.28) 40%,
          rgba(255,90,90,0.08) 70%,
          rgba(255,90,90,0) 100%);
      }

      #ce-quadconnect-root .ce-qc-cell.is-blue::before{
        background:radial-gradient(circle at center,
          rgba(80,140,255,0.55) 0%,
          rgba(80,140,255,0.28) 40%,
          rgba(80,140,255,0.08) 70%,
          rgba(80,140,255,0) 100%);
      }

      #ce-quadconnect-root .ce-qc-cell.is-green::before{
        background:radial-gradient(circle at center,
          rgba(70,200,120,0.55) 0%,
          rgba(70,200,120,0.28) 40%,
          rgba(70,200,120,0.08) 70%,
          rgba(70,200,120,0) 100%);
      }

      #ce-quadconnect-root .ce-qc-cell.is-yellow::before{
        background:radial-gradient(circle at center,
          rgba(255,210,70,0.55) 0%,
          rgba(255,210,70,0.28) 40%,
          rgba(255,210,70,0.08) 70%,
          rgba(255,210,70,0) 100%);
      }

      #ce-quadconnect-root .ce-qc-cell.is-armed{
        background:#dbeafe;
        border-color:#93c5fd;
      }
      #ce-quadconnect-root .ce-qc-cell.is-red::after,
      #ce-quadconnect-root .ce-qc-cell.is-blue::after,
      #ce-quadconnect-root .ce-qc-cell.is-green::after,
      #ce-quadconnect-root .ce-qc-cell.is-yellow::after{
        content:'';
        width:34px;
        height:34px;
        border-radius:999px;
        border:1px solid rgba(255,255,255,0.28);
      }
      #ce-quadconnect-root .ce-qc-cell.is-red::after{
        background:rgba(255,90,90,0.98);
        box-shadow:0 0 18px rgba(255,90,90,0.35);
      }
      #ce-quadconnect-root .ce-qc-cell.is-blue::after{
        background:rgba(80,140,255,0.98);
        box-shadow:0 0 18px rgba(80,140,255,0.35);
      }
      #ce-quadconnect-root .ce-qc-cell.is-green::after{
        background:rgba(70,200,120,0.98);
        box-shadow:0 0 18px rgba(70,200,120,0.35);
      }
      #ce-quadconnect-root .ce-qc-cell.is-yellow::after{
        background:rgba(255,210,70,0.98);
        box-shadow:0 0 18px rgba(255,210,70,0.35);
      }
      #ce-quadconnect-root .ce-qc-cell:disabled{
        opacity:1;
        cursor:default;
      }
    `;
    document.head.appendChild(s);
  }
  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#039;");
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
    return { q: String(q.q ?? q.question ?? '—'), a: String(q.a ?? q.answer ?? '—') };
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
    return { q: String(q.q ?? q.question ?? '—'), a: String(q.a ?? q.answer ?? '—') };
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
    const active = getActiveStudentsFromDom();
    MOD.activeAtMount = active.slice();
    MOD.teamCount = getTeamCount(active.length);
    MOD.teamOrder = getTeamPalette(MOD.teamCount);
    MOD.teams = new Map();
    MOD.lineTallyByTeam = new Map();
    MOD.teamByStudentId = new Map();
    MOD.currentTeamIndex = 0;
    MOD.currentTeamKey = '';
    MOD.currentStudent = null;

    for (const team of MOD.teamOrder) MOD.teams.set(team.key, []);
    for (const team of MOD.teamOrder) MOD.lineTallyByTeam.set(team.key, 0);
    for (const team of MOD.teamOrder) MOD.rawLinesByTeam.set(team.key, 0);   
    for (const team of MOD.teamOrder) MOD.riskBoostByTeam.set(team.key, false);

    const shuffled = shuffle(active.slice());
    shuffled.forEach((student, i) => {
      const team = MOD.teamOrder[i % MOD.teamOrder.length];
      MOD.teams.get(team.key).push(student);
      MOD.teamByStudentId.set(student.id, team.key);
    });
  }

  function clearTeamMarkers() {
    qsa('.lb-item[data-qc-team]').forEach((el) => {
      delete el.dataset.qcTeam;
      el.removeAttribute('data-qc-team');
    });
  }

  function applyTeamMarkers() {
    clearTeamMarkers();
    qsa('.lb-item').forEach((el) => {
      const id = String(el.dataset.studentId || '').trim();
      const teamKey = MOD.teamByStudentId.get(id);
      if (teamKey) el.setAttribute('data-qc-team', teamKey);
    });
  }
  function flashStudent(studentId, type = 'bonus') {
    try { window.__CE_FLASH?.flashLeaderboardStudent?.(studentId, type); } catch {}
  }

  function highlightCurrentStudent() {
    const student = MOD.currentStudent;
    if (!student?.id) return;

    qsa('.lb-item[data-qc-turn="true"]').forEach((el) => {
      el.removeAttribute('data-qc-turn');
    }); 

    qsa('.lb-item.lb-item--selected').forEach((el) => {
      el.classList.remove('lb-item--selected');
    });

    const el = qs(`.lb-item[data-student-id="${student.id}"]`);
    if (!el) return;
    el.classList.add('lb-item--selected');
    el.setAttribute('data-qc-turn', 'true');

    try {
      window.Dashboard?.setActiveStudent?.(student.id, student.name || '');
    } catch {}

    flashStudent(student.id, 'turn');
  }

  function setStatus(text) {
    MOD.statusText = String(text || '');
    if (MOD.elStatus) MOD.elStatus.textContent = MOD.statusText;
  }

  function recomputeTallies() {
    for (const team of MOD.teamOrder) {
      MOD.lineTallyByTeam.set(team.key, 0);
      MOD.rawLinesByTeam.set(team.key, 0);
    }

    const cols = ['A','B','C','D','E','F','G','H'];
    const maxY = 8;
    const dirs = [
      [1, 0],   // horizontal
      [0, 1],   // vertical
      [1, 1],   // diag down-right
      [1,-1],   // diag up-right
    ];

    function getAt(x, y) {
      if (x < 0 || x >= cols.length || y < 1 || y > maxY) return '';
      return MOD.board.get(cols[x] + String(y)) || '';
    }

    for (let x = 0; x < cols.length; x++) {
      for (let y = 1; y <= maxY; y++) {
        const teamKey = getAt(x, y);
        if (!teamKey) continue;

        for (const [dx, dy] of dirs) {
          const prev = getAt(x - dx, y - dy);
          if (prev === teamKey) continue;

          let len = 1;
          let nx = x + dx;
          let ny = y + dy;
          while (getAt(nx, ny) === teamKey) {
            len++;
            nx += dx;
            ny += dy;
          }

          if (len >= 4) {
            const boosted = !!MOD.riskBoostByTeam.get(teamKey);
            const value = boosted ? 2 : 1;
 
            MOD.rawLinesByTeam.set(
              teamKey,
              Number(MOD.rawLinesByTeam.get(teamKey) || 0) + 1
            );

            MOD.lineTallyByTeam.set(
              teamKey,
              Number(MOD.lineTallyByTeam.get(teamKey) || 0) + value
            );
          }
        }
      }
    }
  }

  function handleBoardCellClick(cell) {
    if (MOD.turnState !== 'awaitingPlacement') return;
    if (!MOD.currentTeamKey) return;
    if (!cell) return;
    if (MOD.board.has(cell)) return;

    MOD.board.set(cell, MOD.currentTeamKey);
    MOD.turnState = 'resolved';
    recomputeTallies();
    setStatus(`Placed ${MOD.currentTeamKey} at ${cell}. Click Next Turn when ready.`);
    render();
  }


  function syncUi() {
    if (MOD.elStatus) MOD.elStatus.textContent = MOD.statusText;
    if (MOD.elBtnSelect) {
      MOD.elBtnSelect.disabled = (MOD.turnState === 'awaitingQuestion' || MOD.turnState === 'awaitingPlacement');
    }
  }


  function stopModalTimers() {
    if (MOD.timerId) {
      try { clearInterval(MOD.timerId); } catch {}
      MOD.timerId = null;
    }
  }

  function closeQuestionModal() {
    stopModalTimers();
    if (MOD.modalKeyHandler) {
      try { window.removeEventListener('keydown', MOD.modalKeyHandler, true); } catch {}
      MOD.modalKeyHandler = null;
    }
    try { MOD.modalEl?.remove?.(); } catch {}
    MOD.modalEl = null;
    MOD.qStarted = false;
    MOD.qObj = null;
  }

  function openQuestionModal(student) {
    if (!MOD.root || !student) return;
    if (MOD.qbSource === 'uploaded' && MOD.qbLoadedSingle) {
      // loaded single-bank mode bypasses selectors
    } else if (!MOD.qb) {
      setStatus('Question bank not ready.');
      syncUi();
      return;
    }
    if (MOD.qbSource !== 'uploaded' && (!MOD.cat || !MOD.sub || !MOD.focus)) {
      setStatus('Select a category, subcategory, and focus.');
      syncUi();
      return;
    }

    closeQuestionModal();
    MOD.qStarted = false;
    MOD.qDifficulty = 1;
    MOD.qObj = null;

    const modal = document.createElement('div');
    modal.className = 'qc-modal';
    modal.innerHTML = `
      <div class="qc-modal-card" role="dialog" aria-modal="true" aria-label="Quad Connect Question">
        <div class="qc-modal-h">
          <div class="qc-modal-title">${escapeHtml(student.name)}</div>
          <button class="qc-x" data-qc-close aria-label="Close">×</button>
        </div>
        <div class="qc-row qc-mono" style="opacity:0.85;">
          Category: <span data-qc-catlbl>—</span> &nbsp;•&nbsp; Sub: <span data-qc-sublbl>—</span> &nbsp;•&nbsp; Focus: <span data-qc-focuslbl>—</span>
        </div>
        <div class="qc-row">
          <div class="qc-label qc-mono">Summon question</div>
          <div class="qc-diffGroup" aria-label="Difficulty (hotkeys 1/2/3)">
            <button class="qc-diffBtn" data-qc-summon="1">1</button>
            <button class="qc-diffBtn" data-qc-summon="2">2</button>
            <button class="qc-diffBtn" data-qc-summon="3">3</button>
            <button class="qc-diffBtn" data-qc-reveal disabled>Reveal</button>

            <span class="qc-mono" style="opacity:0.7; font-weight:900;"> • Hotkeys: 1 / 2 / 3 • Reveal: 4</span>
          </div>
        </div>
        <div class="qc-row">
          <div class="qc-label qc-mono">Question</div>
          <div class="qc-q" data-qc-q>—</div>
        </div>
        <div class="qc-row" data-qc-awrap style="display:none;">
          <div class="qc-label qc-mono">Answer</div>
          <div class="qc-a" data-qc-a>—</div>
        </div>
        <div class="qc-row qc-mono qc-timer">
          Timer: <span data-qc-t>10.0s</span>
        </div>
        <div class="qc-footer">
          <button class="ce-qc-btn" data-qc-incorrect disabled>❌ Incorrect</button>
          <button class="ce-qc-btn qc-ok" data-qc-correct disabled>✅ Correct</button>
        </div>
      </div>
    `;

    MOD.root.appendChild(modal);
    MOD.modalEl = modal;

    const catLbl = (MOD.qbSource === 'uploaded' && MOD.qbLoadedSingle)
      ? (MOD.qbLoadedSingle?.stage?.label || MOD.qbLoadedSingle?.stage?.key || '—')
      : (getCatOptions(MOD.qb).find((x) => x.key === MOD.cat)?.label || MOD.cat);
    const subLbl = (MOD.qbSource === 'uploaded' && MOD.qbLoadedSingle)
      ? (MOD.qbLoadedSingle?.unit?.label || MOD.qbLoadedSingle?.unit?.key || '—')
      : (getSubOptions(MOD.qb, MOD.cat).find((x) => x.key === MOD.sub)?.label || MOD.sub);
    const focusLbl = (MOD.qbSource === 'uploaded' && MOD.qbLoadedSingle)
      ? (MOD.qbLoadedSingle?.focus?.label || MOD.qbLoadedSingle?.focus?.key || '—')
      : (getFocusOptions(MOD.qb, MOD.cat, MOD.sub).find((x) => x.key === MOD.focus)?.label || MOD.focus);
    qs('[data-qc-catlbl]', modal).textContent = String(catLbl);
    qs('[data-qc-sublbl]', modal).textContent = String(subLbl);
    qs('[data-qc-focuslbl]', modal).textContent = String(focusLbl);

    const qEl = qs('[data-qc-q]', modal);
    const aEl = qs('[data-qc-a]', modal);
    const aWrap = qs('[data-qc-awrap]', modal);
    const tEl = qs('[data-qc-t]', modal);
    const okBtn = qs('[data-qc-correct]', modal);
    const noBtn = qs('[data-qc-incorrect]', modal);
    const revealBtn = qs('[data-qc-reveal]', modal);

    function summon(diff) {
      stopModalTimers();
      if (aWrap) aWrap.style.display = 'none';
      if (tEl) tEl.textContent = '10.0s';

      const q = (MOD.qbSource === 'uploaded' && MOD.qbLoadedSingle)
        ? pickRandomQuestionLoaded(MOD.qbLoadedSingle, diff)
        : pickRandomQuestion(MOD.qb, MOD.cat, MOD.sub, MOD.focus, diff);
      if (!q) {
        qEl.textContent = 'No questions found for this selection.';
        aEl.textContent = '—';
        okBtn.disabled = true;
        noBtn.disabled = true;
        return;
      }

      MOD.qStarted = true;
      MOD.qDifficulty = Number(diff) || 1;
      MOD.qObj = q;
      qEl.textContent = q.q;
      aEl.textContent = q.a;
      okBtn.disabled = false;
      noBtn.disabled = false;
      if (revealBtn) revealBtn.disabled = false;

      const timerMs = 10000;
      MOD.endsAt = Date.now() + timerMs;
      MOD.timerId = setInterval(() => {
        const left = Math.max(0, MOD.endsAt - Date.now());
        if (tEl) tEl.textContent = (left / 1000).toFixed(1) + 's';
        if (left <= 0) {
          if (aWrap) aWrap.style.display = '';
          stopModalTimers();
        }
      }, 100);
    }

    modal.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      if (t.matches('[data-qc-close]')) {
        closeQuestionModal();
        return;
      }
      if (t.matches('[data-qc-summon]')) {
        summon(t.getAttribute('data-qc-summon'));
        return;
      }
       if (t.matches('[data-qc-reveal]')) {
       if (!MOD.qStarted) return;
       if (aWrap) aWrap.style.display = '';
       stopModalTimers();
       return;
      }

      if (t.matches('[data-qc-correct]')) {
        if (!MOD.qStarted) return;
        closeQuestionModal();
        MOD.turnState = 'awaitingPlacement';
        setStatus(`Correct. ${MOD.currentStudent?.name || 'Student'} may now call a coordinate.`);
        syncUi();
        return;
      }
      if (t.matches('[data-qc-incorrect]')) {
        closeQuestionModal();
        MOD.turnState = 'resolved';
        setStatus(`Incorrect. No placement for ${MOD.currentStudent?.name || 'this turn'}. Click Next Turn when ready.`);
        syncUi();
        return;
      }
    });

    MOD.modalKeyHandler = (e) => {
      if (!MOD.modalEl) return;
      const k = e.key;
      if (k === '1' || k === '2' || k === '3') {
        e.preventDefault();
        summon(k);
        return;
      }
      if (k === '4') {
        if (!MOD.qStarted) return;
        e.preventDefault();
        if (aWrap) aWrap.style.display = '';
        stopModalTimers();
      }
    };
    window.addEventListener('keydown', MOD.modalKeyHandler, true);
  }


  function selectNextTurn() {
    if (!MOD.teamOrder.length) return;

    const team = MOD.teamOrder[MOD.currentTeamIndex % MOD.teamOrder.length];
    const members = MOD.teams.get(team.key) || [];
    if (!members.length) return;

    let used = MOD.pickedByTeam.get(team.key) || new Set();
    let eligible = members.filter((s) => !used.has(s.id));
    if (!eligible.length) {
      used = new Set();
      MOD.pickedByTeam.set(team.key, used);
      eligible = members.slice();
    }

    const picked = eligible[Math.floor(Math.random() * eligible.length)];
    used.add(picked.id);
    MOD.pickedByTeam.set(team.key, used);

    MOD.currentTeamKey = team.key;
    MOD.currentStudent = picked;
    MOD.currentTeamIndex = (MOD.currentTeamIndex + 1) % MOD.teamOrder.length;
    MOD.turnState = 'awaitingQuestion';
    setStatus(`Opening question for ${picked.name}...`);

    highlightCurrentStudent();
    updateTurnMeta();
    syncUi();

    setTimeout(() => {
      if (
        MOD.currentStudent?.id === picked.id &&
        MOD.currentTeamKey === team.key &&
        MOD.turnState === 'awaitingQuestion'
      ) {
        openQuestionModal(MOD.currentStudent);
      }
    }, 1000);
  }

  window.__QC_SHOW_RESULTS = () => renderResultsModal();  

  function updateTurnMeta() {
    if (!MOD.elTurnMeta) return;
    const team = MOD.teamOrder.find((t) => t.key === MOD.currentTeamKey);
    MOD.elTurnMeta.setAttribute('data-qc-team', MOD.currentTeamKey || '');
    MOD.elTurnMeta.innerHTML = `
      <span class="ce-qc-dot ${MOD.currentTeamKey || ''}"></span>
      <span><span class="ce-qc-label">Turn:</span> ${team?.label || '—'} · ${MOD.currentStudent?.name || '—'}</span>
    `;
  }



  function buildBoardHtml() {
    const cols = ['A','B','C','D','E','F','G','H'];
    const rows = ['1','2','3','4','5','6','7','8'];
    let html = `<div class="ce-qc-board"><div></div>`;

    cols.forEach(c => {
      html += `<div class="ce-qc-axis">${c}</div>`;
    });

    rows.forEach(r => {
      html += `<div class="ce-qc-axis">${r}</div>`;
      cols.forEach(c => {
        const cell = `${c}${r}`;
        const teamKey = MOD.board.get(cell) || '';
        const cls = [
          'ce-qc-cell',
          teamKey ? `is-${teamKey}` : '',
          (!teamKey && MOD.turnState === 'awaitingPlacement') ? 'is-armed' : ''
        ].filter(Boolean).join(' ');

        html += `<button type="button" class="${cls}" data-qc-cell="${cell}" ${teamKey ? 'disabled' : ''}>${
          teamKey ? '' : cell
        }</button>`;

      });
    });

    html += `</div>`;
    return html;
  }

  function buildTeamBarHtml() {
    if (!MOD.teamOrder.length) return '';
    const parts = MOD.teamOrder.map((team) => {
      const members = MOD.teams.get(team.key) || [];
      const tally = Number(MOD.lineTallyByTeam.get(team.key) || 0);
      const boosted = !!MOD.riskBoostByTeam.get(team.key);
      const locked = tally > 0;
      return `
        <div class="ce-qc-teampill" data-qc-team-pill="${team.key}" title="${locked ? 'Boost locked after first completed line' : 'Click to toggle boost'}">
          <span class="ce-qc-dot ${team.key}"></span>
          <span>${team.label}: ${members.length} · ${tally}${boosted ? ' 🔥' : ''}</span>
        </div>
      `;
    });
    return `<div class="ce-qc-teambar">${parts.join('')}</div>`;
  }

  function buildControlsHtml() {
    const catOpts = getCatOptions(MOD.qb).map((opt) => (
      `<option value="${escapeHtml(opt.key)}"${opt.key === MOD.cat ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`
    )).join('');
    const subOpts = getSubOptions(MOD.qb, MOD.cat).map((opt) => (
      `<option value="${escapeHtml(opt.key)}"${opt.key === MOD.sub ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`
    )).join('');
    const focusOpts = getFocusOptions(MOD.qb, MOD.cat, MOD.sub).map((opt) => (
      `<option value="${escapeHtml(opt.key)}"${opt.key === MOD.focus ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`
    )).join('');

    return `
      <div class="ce-qc-controls">
        <label class="ce-qc-field">
          <button type="button" class="ce-qc-btn" data-qc-load-qb>Load QB</button>
          <button type="button" class="ce-qc-btn" data-qc-use-built-in>Use built-in</button>
          <input type="file" data-qc-qbfile style="display:none" accept=".json,.js,.txt" />
        </label>
        <label class="ce-qc-field">
          <span class="ce-qc-fieldlabel">Category</span>
          <select class="ce-qc-select" data-qc-cat>${catOpts}</select>
        </label>
        <label class="ce-qc-field">
          <span class="ce-qc-fieldlabel">Subcategory</span>
          <select class="ce-qc-select" data-qc-sub>${subOpts}</select>
        </label>
        <label class="ce-qc-field">
          <span class="ce-qc-fieldlabel">Focus</span>
          <select class="ce-qc-select" data-qc-focus>${focusOpts}</select>
        </label>

      </div>
    `;
  }


  function bindUi() {
    MOD.elHeaderRow = qs('[data-qc-headerrow]', MOD.root);
    MOD.elTurnMeta = qs('[data-qc-turnmeta]', MOD.root);
    MOD.elStatus = qs('[data-qc-status]', MOD.root);
    MOD.elCat = qs('[data-qc-cat]', MOD.root);
    MOD.elSub = qs('[data-qc-sub]', MOD.root);
    MOD.elFocus = qs('[data-qc-focus]', MOD.root);
    MOD.elBtnSelect = qs('[data-qc-select-student]', MOD.root);
    MOD.elBtnLoadQB = qs('[data-qc-load-qb]', MOD.root);
    MOD.elBtnUseBuiltInQB = qs('[data-qc-use-built-in]', MOD.root);
    MOD.elQbFile = qs('[data-qc-qbfile]', MOD.root);

    qsa('[data-qc-team-pill]', MOD.root).forEach((pill) => {
      pill.addEventListener('click', () => {
        const key = String(pill.getAttribute('data-qc-team-pill') || '');
        if (!key) return;

        const tally = Number(MOD.lineTallyByTeam.get(key) || 0);
        if (tally > 0) return;

        const current = !!MOD.riskBoostByTeam.get(key);
        MOD.riskBoostByTeam.set(key, !current);
        render();
      });
    });

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

    qsa('[data-qc-cell]', MOD.root).forEach((btn) => {
      btn.addEventListener('click', () => {
        handleBoardCellClick(String(btn.getAttribute('data-qc-cell') || ''));
      });
    });

    updateTurnMeta();
    setQBSelectorMode(MOD.qbSource === 'uploaded');
    syncUi();
  }


  function render() {
    if (!MOD.root) return;
    MOD.root.innerHTML = `
      <div class="ce-qc-root">
        <div class="ce-qc-card">
          <div class="ce-qc-title">Quad Connect</div>
          <div class="ce-qc-headerrow" data-qc-headerrow>
            ${buildTeamBarHtml()}
            ${buildControlsHtml()}
          </div>
          <div class="ce-qc-turnbox">
            <div class="ce-qc-turnmeta" data-qc-turnmeta data-qc-team="">
              <span class="ce-qc-label">Turn:</span> —
            </div>
            <div class="ce-qc-turnstatus" data-qc-status>${escapeHtml(MOD.statusText)}</div>
            <button type="button" class="ce-qc-btn qc-open" data-qc-select-student>Select Student</button>
          </div>
        </div>
        ${buildBoardHtml()}
      </div>
    `;
    bindUi();
  }


  function awardStudentsFromResults() {
    for (const team of MOD.teamOrder) {
      const key = team.key;
      const raw = Number(MOD.rawLinesByTeam.get(key) || 0);
      const boosted = !!MOD.riskBoostByTeam.get(key);

      const reward = boosted ? (raw * 2 - 2) : raw;

      const members = MOD.teams.get(key) || [];

      for (const student of members) {
        try {
          window.Dashboard?.awardStudent?.(student.id, reward);
        } catch {}
      }
    }
  }  

  function continuePendingHubExit() {
    try { window.__CE_PHASE5?.exit?.(); } catch {}
  }

  function requestResultsBeforeUnmount() {
    if (MOD._allowImmediateUnmount) {
      MOD._allowImmediateUnmount = false;
      return true;
    }
    if (!MOD.active) return true;
    // If already showing results, allow unmount
    if (MOD._resultsShowing) return true;

    MOD.turnState = 'resolved';
    MOD._resultsShowing = true;
    renderResultsModal();
    return false;
  }

  function interceptPhaseGateExit() {
    const Ev = window.__CE_BOOT?.modules?.Events;
    if (!Ev || typeof Ev.on !== 'function') return;
    if (MOD._qcExitHooked) return;

    MOD._phaseExitHandler = (payload) => {
      const id = payload?.detail?.id ?? payload?.id ?? '';
      if (!MOD.active) return;
      if (id !== 'phaseGateExit') return;

      requestResultsBeforeUnmount();
    };

    Ev.on('ui:openWindow', MOD._phaseExitHandler);
    MOD._qcExitHooked = true;
  }

  function renderResultsModal() {
    if (!MOD.root) return;

    const existing = MOD.root.querySelector('[data-qc-results-modal]');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'qc-modal';
    modal.setAttribute('data-qc-results-modal', 'true');

    const rows = MOD.teamOrder.map(team => {
      const key = team.key;
      const raw = Number(MOD.rawLinesByTeam.get(key) || 0);
      const boosted = !!MOD.riskBoostByTeam.get(key);

      let reward = 0;
      let equation = '';

      if (boosted) {
        reward = raw * 2 - 2;
        equation = `${raw} × 2 − 2 = ${reward}`;
      } else {
        reward = raw;
        equation = `${raw}`;
      }

      return `
        <div class="qc-row">
          <strong>${team.label}</strong><br>
          Lines: ${raw}${boosted ? ' 🔥' : ''}<br>
          Score: ${equation}
        </div>
      `;
    }).join('');

    modal.innerHTML = `
      <div class="qc-modal-card">
        <div class="qc-modal-title">Quad Connect Results</div>
        ${rows}
        <div class="qc-footer">
          <button class="ce-qc-btn" data-qc-award>🏆 Award & Close</button>
          <button class="ce-qc-btn" data-qc-close-results>Close</button>
        </div>
      </div>
    `;

    MOD.root.appendChild(modal);

    const awardBtn = modal.querySelector('[data-qc-award]');
    const closeBtn = modal.querySelector('[data-qc-close-results]');

    awardBtn?.addEventListener('click', () => {
      awardStudentsFromResults();
      MOD._resultsShowing = false;
      MOD._allowImmediateUnmount = true;
      const m = MOD.root?.querySelector('[data-qc-results-modal]');
      if (m) m.remove();
      continuePendingHubExit();
    });

    closeBtn?.addEventListener('click', () => {
      MOD._resultsShowing = false;
      MOD._allowImmediateUnmount = true;
      const m = MOD.root?.querySelector('[data-qc-results-modal]');
      if (m) m.remove();
      continuePendingHubExit();
    });
  }  

  function beforeUnmount() {
    return requestResultsBeforeUnmount();
  }
  
  function hardReset() {
    // state to be added in next diff
    closeQuestionModal();
    qsa('.lb-item[data-qc-turn="true"]').forEach((el) => {
      el.removeAttribute('data-qc-turn');
    });
    clearTeamMarkers();
    qsa('.lb-item.lb-item--selected').forEach((el) => {
      el.classList.remove('lb-item--selected');
    });
    MOD.activeAtMount = [];
    MOD.teamCount = 0;
    MOD.teamOrder = [];
    MOD.teams = new Map();
    MOD.pickedByTeam = new Map();
    MOD.lineTallyByTeam = new Map();
    MOD.teamByStudentId = new Map();
    MOD.currentTeamIndex = 0;
    MOD.currentTeamKey = '';
    MOD.currentStudent = null;
    MOD.turnState = 'idle';
    MOD.statusText = 'Select or advance to the next turn.';
    MOD.board = new Map();
    MOD.riskBoostByTeam = new Map();
    MOD.qbBuiltIn = null;
    MOD.qbUploaded = null;
    MOD.qbLoadedSingle = null;
    MOD.qbSource = 'builtin';
    MOD.qb = null;
    MOD.cat = '';
    MOD.sub = '';
    MOD.focus = '';
    MOD.modalEl = null;
    MOD.modalKeyHandler = null;
    MOD.qStarted = false;
    MOD.qDifficulty = 1;
    MOD.qObj = null;
    MOD.timerId = null;
    MOD.endsAt = 0;

    MOD.elHeaderRow = null;
    MOD.elTurnMeta = null;
    MOD.elStatus = null;
    MOD.elCat = null;
    MOD.elSub = null;
    MOD.elFocus = null;
    MOD.elBtnSelect = null;
    MOD.elBtnLoadQB = null;
    MOD.elBtnUseBuiltInQB = null;
    MOD.elQbFile = null;
    MOD._qcExitHooked = false;
    MOD._phaseExitHandler = null;
    MOD._resultsShowing = false;
    MOD._allowImmediateUnmount = false;
  }

  function mountInto(hostEl) {
    if (!hostEl || MOD.active) return false;
    MOD.active = true;
    MOD.host = hostEl;


    ensureStyles();
    assignTeams();
    applyTeamMarkers();
    initBuiltInQB();


    MOD.root = document.createElement('div');
    MOD.root.id = 'ce-quadconnect-root';

    if (MOD.host && getComputedStyle(MOD.host).position === 'static') {
      MOD.host.style.position = 'relative';
    }
    MOD.host.appendChild(MOD.root);
    render();
    interceptPhaseGateExit();
    return true;
  }

  function unmount() {
    if (!MOD.active) return false;

    const Ev = window.__CE_BOOT?.modules?.Events;
    if (MOD._phaseExitHandler && typeof Ev?.off === 'function') {
      try { Ev.off('ui:openWindow', MOD._phaseExitHandler); } catch {}
    }
    MOD._phaseExitHandler = null;
    MOD._qcExitHooked = false;

    MOD.active = false;
    hardReset();
    try { MOD.root?.remove?.(); } catch {}
    MOD.root = null;
    MOD.host = null;
    return true;
  }

  function registerWithHub() {
    const hub = window.__CE_PHASE5;
    if (!hub || typeof hub.register !== 'function') return false;
    hub.register({ id: 'quadconnect', label: 'Quad Connect', mount: mountInto, unmount, beforeUnmount });
    window.__CE_QUADCONNECT = Object.assign({}, window.__CE_QUADCONNECT, { mountInto, unmount });
    return true;
  }

  if (!registerWithHub()) {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (registerWithHub() || tries >= 20) clearInterval(t);
    }, 100);
  }
})();