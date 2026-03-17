/* =========================================================
   PC#099 – Phase 5 Activity: Pick the Brick (hub-controlled)
   Purpose:
     - Brick-wall, Deal/No-Deal inspired reward pick
     - Bricks count = N(active students at mount) + 4
     - Random student selection: WITHOUT replacement until teacher resets selector
     - STW-style question modal:
         - Summon diff via 1 / 2 / 3 (or click)
         - 10s countdown
         - Hotkey 4 reveals answer early (stops timer)
     - If correct:
         - Student calls brick number; teacher clicks brick
         - Brick "crush" animation + value reveal
         - Auto-award after 2s (same flash mechanism as other awards)
     - If incorrect: no brick pick
     - Optional "Offer 10":
         - Converts a RANDOM unopened brick to value 10
         - Costs -1 token from every ACTIVE student EXCEPT those who already had their turn
         - Disabled when remaining-eligible (active & unpicked) < 10
   Guardrails:
     - No lesson:phaseChange emits
     - No burnline interaction
     - No persistence
     - No global hotkeys EXCEPT while modal is open
     - Must NOT modify leaderboard/tile behaviour
========================================================= */

(() => {
  const MOD = {
    active: false,
    host: null,
    root: null,

    // roster + turn state
    activeAtMount: [], // [{id,name}]
    picked: new Set(), // studentIds who already had their turn
    current: null, // {id,name}
    turnState: 'idle', // idle | awaitingQuestion | awaitingBrick | resolved

    // bricks
    brickCount: 0,
    bricks: [], // [{num,value,isTen,opened}]
    pendingAward: null, // { studentId, points, t }

    // question bank
    qbBuiltIn: null,
    qbUploaded: null,
    qbSource: 'builtin', // builtin | uploaded
    qb: null,
    cat: null,
    sub: null,

    // modal
    modalEl: null,
    modalKeyHandler: null,
    qStarted: false,
    qDifficulty: 1,
    qObj: null, // {q,a}
    timerId: null,
    endsAt: 0,

    // UI refs
    elStudentName: null,
    elStatus: null,
    elBrickGrid: null,
    elCat: null,
    elSub: null,
    elBtnSelect: null,
    elBtnQuestion: null,
    elBtnResetSelector: null,
    elBtnResetBricks: null,
    elBtnOffer10: null,
    elBtnUploadQB: null,
    elBtnUseBuiltInQB: null,

    // select-student safety: after selection, require a re-arm click before selecting again
    selectNeedsRearm: false,


    // listeners
    lbClickHandler: null,

    // resize safety (burnline overlay + fit-to-canvas grid)
    onResize: null,
    _raf: 0,
  };

  // -----------------------------
  // Helpers
  // -----------------------------
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function computeBottomOverlayOverlap(hostEl) {
    if (!hostEl?.getBoundingClientRect) return 0;
    const host = hostEl.getBoundingClientRect();
    if (!host.width || !host.height) return 0;

    const x = host.left + host.width / 2;
    const y = Math.min(window.innerHeight - 2, host.bottom - 2);
    let el = document.elementFromPoint(x, y);
    if (!el) return 0;

    // If the element is inside OUR activity root, it's not an overlay.
    // Burnline/phase bars may be inside hostEl but still overlay our activity.
    if (MOD.root && MOD.root.contains(el)) return 0;

    // Walk up a few parents to find a meaningful overlay container
    for (let i = 0; i < 6 && el; i++) {
      const r = el.getBoundingClientRect?.();
      if (r && r.height >= 16) {
        const overlap = host.bottom - r.top;
        // overlay must sit on/near bottom edge
        if (overlap > 0 && r.top < host.bottom && r.bottom >= host.bottom - 1) {
          return Math.max(0, Math.round(overlap));
        }
      }
      el = el.parentElement;
    }
    return 0;
  }

  function applySafeBottom() {
    if (!MOD.host || !MOD.root) return;
    // Fixed reserve = stable behaviour. Guarantees bricks never sit behind burnline/overlays.
    const SAFE_BOTTOM = 110; // adjust if your burnline is taller
    MOD.root.style.paddingBottom = `${SAFE_BOTTOM}px`;
  }

  function layoutBrickGrid(count) {
    if (!MOD.elBrickGrid) return;

    const rect = MOD.elBrickGrid.getBoundingClientRect();
    const w = Math.max(0, rect.width);
    const h = Math.max(0, rect.height);

    // Best-fit search over ROWS (2..6 ideal) to utilise rectangle shape.
    // Picks the configuration that yields the largest square cell that fits.
    // Adds hysteresis to avoid sudden jumps on tiny resizes.
    const GAP = 10; // must match .ce-pb-grid gap
    const MAX_CELL = 260;
    const MIN_CELL = 12; // allow very small windows to still "fit" without hiding

    const n = Math.max(1, Number(count) || 1);
    const minRows = 2;
    const maxRows = Math.min(6, n);


    let best = { rows: maxRows, cols: Math.ceil(n / maxRows), cell: 0 };

    for (let rows = minRows; rows <= maxRows; rows++) {
      const cols = Math.ceil(n / rows);
      const availW = w - GAP * Math.max(0, cols - 1);
      const availH = h - GAP * Math.max(0, rows - 1);
      const raw = Math.floor(Math.min(availW / cols, availH / rows));
      const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, raw || 0));
      if (!cell) continue;

      if (cell > best.cell) {
        best = { rows, cols, cell };
      } else if (cell === best.cell) {
        // Tie-break: prefer configuration whose grid aspect is closer to container aspect
        const containerAR = (h > 0) ? (w / h) : 1;
        const arBest = best.cols / best.rows;
        const arThis = cols / rows;
        const dBest = Math.abs(arBest - containerAR);
        const dThis = Math.abs(arThis - containerAR);
        if (dThis < dBest) best = { rows, cols, cell };
      }
    }

    MOD._pbRows = best.rows;
    MOD._pbCols = best.cols;
    MOD._pbCell = best.cell;

    MOD.elBrickGrid.style.setProperty('--pb-cols', String(best.cols));
    MOD.elBrickGrid.style.setProperty('--pb-rows', String(best.rows));
    MOD.elBrickGrid.style.setProperty('--pb-cell', `${best.cell}px`);
  }


  function ensureStyles() {
    if (document.getElementById('ce-pickbrick-styles')) return;
    const s = document.createElement('style');
    s.id = 'ce-pickbrick-styles';
    s.textContent = `
      .ce-pb-root{
        position:absolute; inset:0;
        /* bottom padding prevents content sitting under the burnline bar */
        padding:12px;
        padding-bottom: 64px;
        display:flex; flex-direction:column; gap:12px;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        height:100%; min-height:0;
        box-sizing:border-box;
        overflow:hidden;
      }

      .ce-pb-layout{
        display:grid;
        grid-template-columns: minmax(280px, 360px) 1fr;
        gap:12px;
        height:100%;
        min-height:0;
      }

      @media (max-width: 1100px){
        .ce-pb-layout{ grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
      }

      .ce-card{ background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10); border-radius:14px; padding:12px; }
      .ce-title{ font-weight:800; font-size:14px; margin:0 0 10px 0; opacity:0.95; }
      .ce-muted{ opacity:0.75; font-size:12px; line-height:1.35; }

      .ce-btn{
        appearance:none; border:0; cursor:pointer;
        padding:10px 12px; border-radius:12px;
        background:rgba(255,255,255,0.10);
        color:#fff; font-weight:800;
      }
      .ce-btn:hover{ background:rgba(255,255,255,0.14); }
      .ce-btn:active{ transform: translateY(1px); }
      .ce-btn[disabled]{ opacity:0.45; cursor:not-allowed; }
      .ce-btn.primary{ background: rgba(80,140,255,0.35); }
      .ce-btn.primary:hover{ background: rgba(80,140,255,0.45); }
      .ce-btn.danger{ background: rgba(255,80,80,0.30); }
      .ce-btn.danger:hover{ background: rgba(255,80,80,0.40); }
      .ce-btn.warn{ background: rgba(255,190,80,0.25); }
      .ce-btn.warn:hover{ background: rgba(255,190,80,0.35); }

      /* "Disengaged" look for Select student during awaitingQuestion */
      .ce-btn.pb-disengaged{
        background: rgba(255,255,255,0.08) !important;
        opacity: 0.55;
      }

      .ce-btn.pb-big{
        padding: 14px 14px;
        border-radius: 14px;
        font-size: 15px;
        font-weight: 950;
        min-height: 54px;
      }

      .ce-pb-stack{ display:flex; flex-direction:column; gap:10px; }
      .ce-row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
      .ce-grow{ flex:1 1 auto; min-width:0; }

      .ce-pill{
        display:inline-flex; align-items:center; gap:8px;
        padding:8px 10px; border-radius:999px;
        background:rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.10);
        font-size:13px; font-weight:750; color:#fff;
      }

      .ce-pb-student{
        font-size: clamp(22px, 2.4vw, 40px);
        font-weight: 950;
        letter-spacing: -0.6px;
        line-height: 1.1;
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(0,0,0,0.18);
        border: 1px solid rgba(255,255,255,0.10);
        min-height: 62px;
        display:flex; align-items:center;
        overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      }

      .ce-pb-pop{
        animation: cePbPop 520ms cubic-bezier(.2,1.2,.2,1);
      }
      @keyframes cePbPop{
        0%{ transform: translateY(18px) scale(0.92); opacity:0.0; }
        60%{ transform: translateY(-6px) scale(1.03); opacity:1; }
        100%{ transform: translateY(0) scale(1); opacity:1; }
      }

      .ce-pb-bricks{
        position:relative;
        height:100%; min-height:0;
        display:flex; flex-direction:column;
      }

      .ce-pb-grid{
        flex:1 1 auto;
        min-height:0;
        display:grid;
        gap:10px;
        padding: 6px;
        overflow:hidden; /* no scroll */
        /* Fixed cell sizing so bricks don't stretch to fill height */
        grid-template-columns: repeat(var(--pb-cols, 6), var(--pb-cell, 96px));
        grid-template-rows: repeat(var(--pb-rows, 4), var(--pb-cell, 96px));
        justify-content:center;
        align-content:start;
      }

      .ce-brick{
        position:relative;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.10);
        background:
          linear-gradient(135deg, rgba(150,60,40,0.55), rgba(90,35,25,0.55)),
          repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 6px, rgba(0,0,0,0.02) 6px, rgba(0,0,0,0.02) 12px);
        box-shadow:
          inset 0 0 0 2px rgba(255,255,255,0.03),
          0 10px 24px rgba(0,0,0,0.28);
        cursor:pointer;
        user-select:none;
        display:flex;
        align-items:center;
        justify-content:center;
        padding: 10px;
        transition: transform 120ms ease, filter 120ms ease;
      }
      .ce-brick:hover{ transform: translateY(-2px); filter: brightness(1.06); }
      .ce-brick:active{ transform: translateY(0px) scale(0.99); }
      .ce-brick[aria-disabled="true"]{ opacity:0.45; cursor:not-allowed; }

      .ce-brick-num{
        position:absolute;
        top:10px; left:10px;
        font-size: clamp(14px, calc(var(--pb-cell, 96px) * 0.34), 72px);
        font-weight: 1000;
        letter-spacing: -0.6px;
        line-height: 1;
        color: rgba(255,255,255,0.92);
        text-shadow: 0 8px 18px rgba(0,0,0,0.45);
        background: rgba(0,0,0,0.18);
        border: 1px solid rgba(255,255,255,0.10);
        padding: clamp(3px, calc(var(--pb-cell, 96px) * 0.06), 10px)
                 clamp(5px, calc(var(--pb-cell, 96px) * 0.10), 14px);
        border-radius: 999px;
        pointer-events:none;
        z-index: 1;
      }

      .ce-brick-val{
        font-size: clamp(18px, calc(var(--pb-cell, 96px) * 0.60), 130px);
        font-weight: 1100;
        letter-spacing: -1.2px;
        color: rgba(110, 255, 140, 0.96);
        text-shadow: 0 10px 22px rgba(0,0,0,0.35);
        z-index: 2;
      }

      .ce-brick.closed .ce-brick-val{ opacity:0.0; transform: scale(0.95); }
      .ce-brick.open .ce-brick-val{ opacity:1; transform: scale(1); }

      .ce-brick.crush{
        animation: cePbCrush 420ms cubic-bezier(.2,1.2,.2,1);
      }
      @keyframes cePbCrush{
        0%{ transform: scale(1) rotate(0deg); }
        40%{ transform: scale(1.05) rotate(-1.6deg); }
        100%{ transform: scale(0.98) rotate(0deg); }
      }

      .ce-brick.opened{
        background:
          linear-gradient(135deg, rgba(40,40,40,0.55), rgba(20,20,20,0.55)),
          repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 8px, rgba(0,0,0,0.02) 8px, rgba(0,0,0,0.02) 16px);
      }
      .ce-brick.opened .ce-brick-num{ opacity:0.85; }


      /* Modal (STW-inspired) */
      .pb-modal{
        position:absolute;
        inset:0;
        background: rgba(0,0,0,0.45);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index: 50;
      }
      .pb-modal-card{
        width: min(1100px, 94vw);
        background: #e8f0ff; /* STW90 / coinflip light surface */
        color: #0f172a;      /* dark text */
        border-radius: 14px;
        padding: 22px;
        box-shadow: 0 12px 28px rgba(15,23,42,0.25);
        border: 0;
      }
      .pb-modal-h{
        position: relative;
        display:flex;
        justify-content:center;
        align-items:center;
        margin-bottom: 8px;
      }
      .pb-modal-title{
        width:100%;
        text-align:center;
        color: #0b3c8a; /* header blue */
      }
      .pb-modal-title [data-pb-who]{
        font-size: 44px;
        font-weight: 900;
        letter-spacing: -0.6px;
      }
      .pb-x{
        position:absolute;
        right: 0;
        top: 0;
        width: 42px; height: 42px;
        border-radius: 12px;
        border: 0;
        cursor:pointer;
        background: transparent;
        color:#0f172a;
        font-size: 22px;
        font-weight: 900;
      }
      .pb-x:hover{ background: rgba(15,23,42,0.08); }

      .pb-row{ margin-top: 10px; }
      .pb-mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      .pb-label{ font-size: 12px; opacity:0.7; font-weight: 900; letter-spacing: 0.6px; text-transform: uppercase; }
      .pb-label{ font-size: 12px; opacity:0.8; font-weight: 900; letter-spacing: 0.6px; text-transform: uppercase; color:#0f172a; }
      .pb-q{ font-size: 38px; line-height: 1.25; font-weight: 900; letter-spacing:-0.6px; margin-top: 6px; color:#0f172a; }
      .pb-a{ font-size: 34px; line-height: 1.25; font-weight: 900; letter-spacing:-0.4px; margin-top: 6px; color: #1e293b; }

      .pb-diffGroup{ display:flex; gap:0; align-items:center; flex-wrap:wrap; margin-top: 6px; }
      .pb-diffBtn{
        min-width: 64px;
        height: 44px;
        border-radius: 0;
        border: 2px solid #93c5fd;
        background: #e0e7ff;
        color:#0f172a;
        font-weight: 900;
        cursor:pointer;
      }
      .pb-diffBtn:first-child{ border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
      .pb-diffBtn:last-child{ border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
      .pb-diffBtn:hover{ background: #dbeafe; }

      .pb-footer{ margin-top: 14px; display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap; }
      .pb-footer .ce-btn{ background:#e0e7ff; color:#0f172a; border: 2px solid #93c5fd; }
      .pb-footer .ce-btn:hover{ background:#dbeafe; }
      .pb-ok{ background:#bbf7d0 !important; border-color:#22c55e !important; color:#065f46 !important; }
      .pb-no{ }

      .pb-timer{ margin-top: 8px; font-weight: 900; }
      .pb-timer [data-pb-t]{ font-size: 34px; font-weight: 900; color: #ca8a04; letter-spacing: 0.5px; }
      select.ce-select{
        width:100%;
        border-radius: 12px;
        border: 2px solid #93c5fd;
        background: #e0e7ff;
        color: #0f172a;
        padding: 7px 10px;
        font-size: 13px;
        font-weight: 800;
        outline: none;
      }
      select.ce-select option{ color:#111; }
    `;
    document.head.appendChild(s);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // -----------------------------
  // Leaderboard roster (DOM-based)
  // -----------------------------
  function getActiveStudentsFromDom() {
    const rows = qsa('.lb-item');
    const out = [];
    for (const el of rows) {
      const id = el.dataset.studentId;
      if (!id) continue;
      if (el.classList.contains('is-inactive')) continue;
      out.push({ id: String(id), name: String(el.dataset.studentName || 'Student') });
    }
    return out;
  }

  function flashStudent(studentId, type = 'bonus') {
    try { window.__CE_FLASH?.flashLeaderboardStudent?.(studentId, type); } catch {}
  }

  function applyAward(studentId, points) {
    try {
      const ok = window.Dashboard?.applyAward?.({ studentId, points });
      if (ok !== false) flashStudent(studentId, points >= 0 ? 'bonus' : 'penalty');
      return ok !== false;
    } catch {
      return false;
    }
  }

  // -----------------------------
  // QB utilities
  // -----------------------------
  function getCatOptions(qb) {
    if (!qb || typeof qb !== 'object') return [];
    return Object.keys(qb).map(k => ({ key: k, label: String(qb[k]?.label || k) }));
  }

  function getSubOptions(qb, catKey) {
    const subs = qb?.[catKey]?.subs;
    if (!subs || typeof subs !== 'object') return [];
    return Object.keys(subs).map(k => ({ key: k, label: String(subs[k]?.label || k) }));
  }

  function pickRandomQuestion(qb, catKey, subKey, diff) {
    const d = Number(diff);
    const chosen = (d === 1 || d === 2 || d === 3) ? d : 1;
    const arr = qb?.[catKey]?.subs?.[subKey]?.d?.[chosen];
    if (!Array.isArray(arr) || !arr.length) return null;
    const q = arr[Math.floor(Math.random() * arr.length)];
    if (!q) return null;
    return { q: String(q.q ?? q.question ?? '—'), a: String(q.a ?? q.answer ?? '—') };
  }

  function normalizeUploadedQB(raw) {
    // Accept either {STW_QB: {...}} or {...}
    const qb = raw?.STW_QB && typeof raw.STW_QB === 'object' ? raw.STW_QB : raw;
    if (!qb || typeof qb !== 'object') return null;
    // minimal sanity check
    const keys = Object.keys(qb);
    if (!keys.length) return null;
    return qb;
  }

  function parseQBFileText(text) {
    // JSON first
    try {
      const j = JSON.parse(text);
      const qb = normalizeUploadedQB(j);
      if (qb) return qb;
    } catch {}

    // JS fallback: strip ES module exports, evaluate in Function scope
    try {
      let code = String(text);
      // remove leading BOM
      code = code.replace(/^\uFEFF/, '');
      // strip "export" keywords in common forms
      code = code.replace(/\bexport\s+const\s+/g, 'const ');
      code = code.replace(/\bexport\s+let\s+/g, 'let ');
      code = code.replace(/\bexport\s+var\s+/g, 'var ');
      code = code.replace(/\bexport\s+default\s+/g, '');
      // If file uses "export { STW_QB }" at end
      code = code.replace(/\bexport\s*\{[^}]*\}\s*;?/g, '');

      const fn = new Function(`${code}\n; return (typeof STW_QB !== 'undefined') ? STW_QB : (typeof exports !== 'undefined' ? (exports.STW_QB||exports.default) : null);`);
      const out = fn();
      const qb = normalizeUploadedQB(out);
      if (qb) return qb;
    } catch {}

    return null;
  }

  function tryAutoLoadQB() {
    // If your environment already exposes the bank globally, grab it.
    // (We do NOT assume it exists.)
    const candidates = [
      window.STW_QB,
      window.__STW_QB,
      window.__CE_STW_QB,
      window.__CE_BOOT?.STW_QB,
      window.__CE_BOOT?.modules?.STW_QB,
      window.__CE_BOOT?.modules?.STW?.QB,
    ];
    for (const c of candidates) {
      const qb = normalizeUploadedQB(c);
      if (qb) return qb;
    }
    return null;
  }

  // -----------------------------
  // Brick generation
  // -----------------------------
  function makeBrickValues(count) {
    // Weighted pool:
    // 1 token = 4 parts
    // 2 tokens = 3 parts
    // 4 tokens = 2 parts
    // 5 tokens = 1 part
    const weights = [
      { v: 1, w: 4 },
      { v: 2, w: 3 },
      { v: 4, w: 2 },
      { v: 5, w: 1 },
    ];

    // Build a big enough pool then shuffle and slice.
    const pool = [];
    const totalW = weights.reduce((a, x) => a + x.w, 0);
    const reps = Math.max(1, Math.ceil(count / totalW));

    for (let r = 0; r < reps; r++) {
      for (const it of weights) {
        for (let i = 0; i < it.w; i++) pool.push(it.v);
      }
    }

    shuffle(pool);

    // If still short (edge cases), top up with 1s
    while (pool.length < count) pool.push(1);

    return pool.slice(0, count);
  }

  function resetBricks() {
    const values = makeBrickValues(MOD.brickCount);
    MOD.bricks = Array.from({ length: MOD.brickCount }, (_, i) => ({
      num: i + 1,
      value: values[i],
      isTen: false,
      opened: false,
    }));
    MOD.turnState = MOD.current ? 'awaitingQuestion' : 'idle';
    MOD.pendingAward = null;
    layoutBrickGrid(MOD.brickCount);
    applySafeBottom();
    renderBricks();
    syncUI();
  }

  function resetSelector() {
    MOD.picked.clear();
    MOD.current = null;
    MOD.turnState = 'idle';
    MOD.pendingAward = null;
    MOD.selectNeedsRearm = false;
    setSelectButtonDisengaged(false);
    setStudentName('—');
    syncUI();
  }

  function pickNextStudent() {
    const actives = getActiveStudentsFromDom();
    const eligible = actives.filter(s => !MOD.picked.has(s.id));
    if (!eligible.length) {
      MOD.current = null;
      MOD.turnState = 'idle';
      setStatus('No eligible students left (use Reset Selector).');
      setStudentName('—');
      MOD.selectNeedsRearm = false;
      setSelectButtonDisengaged(false);      
      syncUI();
      return null;
    }
    const s = eligible[Math.floor(Math.random() * eligible.length)];
    MOD.current = s;
    MOD.picked.add(s.id);
    MOD.turnState = 'awaitingQuestion';
    setStudentName(s.name);
    popStudentName();
    setStatus('Opening question...');

    setTimeout(() => {
      if (MOD.current && MOD.turnState === 'awaitingQuestion') {
        openQuestionModal(MOD.current);
      }
    }, 1000);
    MOD.selectNeedsRearm = true;
    setSelectButtonDisengaged(true);
    syncUI();
    return s;
  }

  function remainingEligibleCount() {
    const actives = getActiveStudentsFromDom();
    return actives.filter(s => !MOD.picked.has(s.id)).length;
  }

  function offerTenBrick() {
    // Only if remaining eligible >= 10
    if (remainingEligibleCount() < 10) return false;

    const unopened = MOD.bricks.filter(b => !b.opened);
    if (!unopened.length) return false;

    // Sacrifice: -1 from every ACTIVE student except those already had their turn
    const actives = getActiveStudentsFromDom();
    const targets = actives.filter(s => !MOD.picked.has(s.id));

    // Apply penalties (best-effort) then defer flash so DOM updates don't wipe earlier glows
    const flashed = [];
    for (const s of targets) {
      try {
        const ok = window.Dashboard?.applyAward?.({ studentId: s.id, points: -1 });
        if (ok !== false) flashed.push(s.id);
      } catch {}
    }
    if (flashed.length) {
      setTimeout(() => {
        for (const sid of flashed) flashStudent(sid, 'penalty');
      }, 0);
    }

    // Convert random unopened brick to 10
    const chosen = unopened[Math.floor(Math.random() * unopened.length)];
    const b = MOD.bricks.find(x => x.num === chosen.num);
    if (!b) return false;
    b.value = 10;
    b.isTen = true;

    setStatus(`10-brick placed (random). Sacrifice applied to ${targets.length} students.`);
    renderBricks();
    syncUI();
    return true;
  }

  // -----------------------------
  // UI construction
  // -----------------------------
  function buildUI() {
    ensureStyles();

    MOD.root = document.createElement('div');
    MOD.root.className = 'ce-pb-root';

    MOD.root.innerHTML = `
      <div class="ce-pb-layout">
        <div class="ce-pb-left ce-card">
          <div class="ce-title">Pick the Brick</div>

          <div class="ce-pb-stack">
            <div>
              <div class="ce-muted" style="margin-bottom:8px;">Current student</div>
              <div class="ce-pb-student" data-pb-student>—</div>
            </div>

            <div class="ce-row">
              <button class="ce-btn primary ce-grow pb-big" data-pb-select>Select student</button>
             </div>


            <div class="ce-card" style="padding:10px;">
              <div class="ce-title" style="margin-bottom:8px;">Question bank</div>
              <div class="ce-row" style="margin-bottom:8px;">
                <button class="ce-btn ce-grow" data-pb-uploadQB>Upload QB (replace)</button>
                <button class="ce-btn" data-pb-useBuiltInQB>Use built-in</button>
                <input type="file" data-pb-qbfile style="display:none" accept=".json,.js,.txt" />
              </div>
              <div class="ce-muted" style="margin-bottom:8px;">Category</div>
              <select class="ce-select" data-pb-cat></select>
              <div class="ce-muted" style="margin:10px 0 8px;">Subcategory</div>
              <select class="ce-select" data-pb-sub></select>

            </div>

            <div class="ce-row">
              <button class="ce-btn danger ce-grow" data-pb-resetSel>Reset selector</button>
              <button class="ce-btn danger" data-pb-resetBricks>Reset bricks</button>
            </div>

            <div class="ce-row">
              <button class="ce-btn warn ce-grow" data-pb-offer10>Offer 10 (−1 each)</button>
            </div>

            <div class="ce-pill" data-pb-status>Ready.</div>

          </div>
        </div>

        <div class="ce-pb-bricks ce-card">
          <div class="ce-title">Brick wall</div>
          <div class="ce-pb-grid" data-pb-grid></div>
        </div>
      </div>
    `;

    MOD.host.appendChild(MOD.root);

    // bind refs
    MOD.elStudentName = qs('[data-pb-student]', MOD.root);
    MOD.elStatus = qs('[data-pb-status]', MOD.root);
    MOD.elBrickGrid = qs('[data-pb-grid]', MOD.root);

    MOD.elCat = qs('[data-pb-cat]', MOD.root);
    MOD.elSub = qs('[data-pb-sub]', MOD.root);

    MOD.elBtnSelect = qs('[data-pb-select]', MOD.root);
    MOD.elBtnResetSelector = qs('[data-pb-resetSel]', MOD.root);
    MOD.elBtnResetBricks = qs('[data-pb-resetBricks]', MOD.root);
    MOD.elBtnOffer10 = qs('[data-pb-offer10]', MOD.root);
    MOD.elBtnUploadQB = qs('[data-pb-uploadQB]', MOD.root);
    MOD.elBtnUseBuiltInQB = qs('[data-pb-useBuiltInQB]', MOD.root);

    // actions
    MOD.elBtnSelect.addEventListener('click', () => {
      // If a student is selected and we're waiting on a question, require a "re-arm" click first
      if (MOD.current && MOD.turnState === 'awaitingQuestion' && MOD.selectNeedsRearm) {
        MOD.selectNeedsRearm = false;
        setSelectButtonDisengaged(false);
        setStatus('Select student re-armed. Click again to select a new student.');
        syncUI();
        return;
      }
      pickNextStudent();
    });
    MOD.elBtnResetSelector.addEventListener('click', () => resetSelector());
    MOD.elBtnResetBricks.addEventListener('click', () => resetBricks());


    MOD.elBtnOffer10.addEventListener('click', () => {
      offerTenBrick();
    });

    // QB selection
    MOD.elCat.addEventListener('change', () => {
      MOD.cat = MOD.elCat.value || null;
      rebuildSubOptions();
      syncUI();
    });
    MOD.elSub.addEventListener('change', () => {
      MOD.sub = MOD.elSub.value || null;
      syncUI();
    });

    // QB upload
    const fileInput = qs('[data-pb-qbfile]', MOD.root);
    MOD.elBtnUploadQB.addEventListener('click', () => fileInput.click());
    MOD.elBtnUseBuiltInQB.addEventListener('click', () => {
      if (!MOD.qbBuiltIn) {
        setStatus('No built-in question bank available.');
        syncUI();
        return;
      }
      MOD.qbSource = 'builtin';
      MOD.qb = MOD.qbBuiltIn;
      const cats = getCatOptions(MOD.qb);
      MOD.cat = cats[0]?.key || null;
      MOD.sub = null;
      rebuildCatOptions();
      rebuildSubOptions();
      setStatus('Using built-in question bank.');
      syncUI();
    });
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files?.[0];
      fileInput.value = '';
      if (!f) return;

      try {
        const text = await f.text();
        const qb = parseQBFileText(text);
        if (!qb) {
          setStatus('Upload failed: could not parse QB.');
          return;
        }
        MOD.qbUploaded = qb;
        MOD.qbSource = 'uploaded';
        MOD.qb = MOD.qbUploaded;
        // reset selection to first items
        const cats = getCatOptions(MOD.qb);
        MOD.cat = cats[0]?.key || null;
        rebuildCatOptions();
        rebuildSubOptions();
        setStatus('Question bank loaded (uploaded).');
      } catch {
        setStatus('Upload failed.');
      }

      syncUI();
    });

    // Brick click
    MOD.elBrickGrid.addEventListener('click', (e) => {
      const el = e.target instanceof Element ? e.target.closest?.('[data-brick]') : null;
      if (!el) return;
      const n = Number(el.getAttribute('data-brick'));
      if (!Number.isFinite(n) || n < 1) return;
      onBrickClick(n);
    });

    // Fit-to-canvas (no scroll) + keep clear of burnline overlay
    applySafeBottom();
    layoutBrickGrid(MOD.brickCount);
    if (!MOD.onResize) {
      MOD.onResize = () => {
        if (MOD._raf) return;
        MOD._raf = requestAnimationFrame(() => {
          MOD._raf = 0;
          applySafeBottom();
          layoutBrickGrid(MOD.brickCount);
        });
      };
      window.addEventListener('resize', MOD.onResize);
    }
  }

  function setStudentName(name) {
    if (!MOD.elStudentName) return;
    MOD.elStudentName.textContent = String(name ?? '—');
  }

  function popStudentName() {
    if (!MOD.elStudentName) return;
    MOD.elStudentName.classList.remove('ce-pb-pop');
    // force reflow
    void MOD.elStudentName.offsetWidth;
    MOD.elStudentName.classList.add('ce-pb-pop');
  }

  function setStatus(txt) {
    if (MOD.elStatus) MOD.elStatus.textContent = String(txt || '');
  }

  function setSelectButtonDisengaged(disengaged) {
    if (!MOD.elBtnSelect) return;
    // When disengaged: remove the blue "primary" highlight + apply dim styling
    MOD.elBtnSelect.classList.toggle('primary', !disengaged);
    MOD.elBtnSelect.classList.toggle('pb-disengaged', !!disengaged);
  }


  function rebuildCatOptions() {
    if (!MOD.elCat) return;
    const cats = getCatOptions(MOD.qb);
    MOD.elCat.innerHTML = cats.map(c => `<option value="${escapeHtmlAttr(c.key)}">${escapeHtml(c.label)}</option>`).join('');
    if (MOD.cat && cats.some(c => c.key === MOD.cat)) MOD.elCat.value = MOD.cat;
    else {
      MOD.cat = cats[0]?.key || null;
      if (MOD.cat) MOD.elCat.value = MOD.cat;
    }
  }

  function rebuildSubOptions() {
    if (!MOD.elSub) return;
    const subs = getSubOptions(MOD.qb, MOD.cat);
    MOD.elSub.innerHTML = subs.map(s => `<option value="${escapeHtmlAttr(s.key)}">${escapeHtml(s.label)}</option>`).join('');
    if (MOD.sub && subs.some(s => s.key === MOD.sub)) MOD.elSub.value = MOD.sub;
    else {
      MOD.sub = subs[0]?.key || null;
      if (MOD.sub) MOD.elSub.value = MOD.sub;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeHtmlAttr(str) {
    return escapeHtml(str).replace(/\s+/g, ' ');
  }

  // -----------------------------
  // Bricks render + click
  // -----------------------------

  function renderBricks() {
    if (!MOD.elBrickGrid) return;

    // Fit-to-canvas grid driven by CSS variables (no scroll)
    layoutBrickGrid(MOD.brickCount);

    const html = MOD.bricks.map(b => {
      const stateClass = b.opened ? 'opened open' : 'closed';
      const tenClass = '';
      const ariaDisabled = b.opened ? 'true' : 'false';
      const val = b.opened ? String(b.value) : '•';
      return `
        <div class="ce-brick ${stateClass}${tenClass}" data-brick="${b.num}" aria-disabled="${ariaDisabled}">
          <div class="ce-brick-num">${b.num}</div>
          <div class="ce-brick-val">${escapeHtml(val)}</div>
        </div>
      `;
    }).join('');

    MOD.elBrickGrid.innerHTML = html;

    // small affordance: disable hover when not eligible to pick
    const canPick = (MOD.turnState === 'awaitingBrick');
    for (const el of qsa('.ce-brick', MOD.elBrickGrid)) {
      const opened = el.classList.contains('opened');
      el.style.pointerEvents = (!canPick || opened) ? 'auto' : 'auto';
      // we still allow click to show status; onBrickClick gates behaviour
    }

    // stats
    const unopened = MOD.bricks.filter(b => !b.opened).length;
    const elCount = qs('[data-pb-brickCount]', MOD.root);
    const elUnopened = qs('[data-pb-unopened]', MOD.root);
    if (elCount) elCount.textContent = String(MOD.brickCount);
    if (elUnopened) elUnopened.textContent = String(unopened);
  }

  function onBrickClick(num) {
    const b = MOD.bricks.find(x => x.num === num);
    if (!b) return;

    if (b.opened) {
      setStatus(`Brick ${num} already opened (value ${b.value}).`);
      return;
    }

    if (MOD.turnState !== 'awaitingBrick' || !MOD.current) {
      setStatus('Not ready to pick a brick yet (need a correct answer).');
      return;
    }

    // Open it
    b.opened = true;
    renderBricks();

    // Animate crush
    const el = qs(`[data-brick="${num}"]`, MOD.elBrickGrid);
    if (el) {
      el.classList.add('crush');
      setTimeout(() => { try { el.classList.remove('crush'); } catch {} }, 480);
    }

    setStatus(`Brick ${num} opened → ${b.value}. Awarding in 2s...`);
    MOD.turnState = 'resolved';

    // Delay award 2s
    const studentId = MOD.current.id;
    const points = b.value;

    if (MOD.pendingAward?.t) {
      try { clearTimeout(MOD.pendingAward.t); } catch {}
    }

    MOD.pendingAward = {
      studentId,
      points,
      t: setTimeout(() => {
        MOD.pendingAward = null;
        applyAward(studentId, points);
        setStatus(`Awarded ${points} to ${MOD.current?.name || 'student'}. Select next student.`);
        MOD.current = null;
        setStudentName('—');
        MOD.turnState = 'idle';
        syncUI();
      }, 2000)
    };

    syncUI();
  }

  // -----------------------------
  // Question modal (STW-like)
  // -----------------------------
  function stopModalTimers() {
    if (MOD.timerId) {
      try { clearInterval(MOD.timerId); } catch {}
      MOD.timerId = null;
    }
    MOD.endsAt = 0;
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
    if (!MOD.qb) {
      setStatus('Load a question bank first (Upload QB).');
      return;
    }
    if (!MOD.cat || !MOD.sub) {
      setStatus('Select a category + subcategory.');
      return;
    }

    closeQuestionModal();

    MOD.qStarted = false;
    MOD.qDifficulty = 1;
    MOD.qObj = null;

    const modal = document.createElement('div');
    modal.className = 'pb-modal';
    modal.innerHTML = `
      <div class="pb-modal-card" role="dialog" aria-modal="true" aria-label="Pick the Brick Question">
        <div class="pb-modal-h">
          <div class="pb-modal-title"><span data-pb-who>${escapeHtml(student.name)}</span></div>
          <button class="pb-x" data-pb-close aria-label="Close">×</button>
        </div>

        <div class="pb-row pb-mono" style="opacity:0.85;">
          Category: <span data-pb-catlbl>—</span> &nbsp;•&nbsp; Sub: <span data-pb-sublbl>—</span>
        </div>

        <div class="pb-row">
          <div class="pb-label pb-mono">Summon question</div>
          <div class="pb-diffGroup" aria-label="Difficulty (hotkeys 1/2/3)">
            <button class="pb-diffBtn" data-pb-summon="1">1</button>
            <button class="pb-diffBtn" data-pb-summon="2">2</button>
            <button class="pb-diffBtn" data-pb-summon="3">3</button>
            <button class="pb-diffBtn" data-pb-reveal="1">Reveal</button>
            <span class="pb-mono" style="opacity:0.7; font-weight:900;"> • Hotkeys: 1 / 2 / 3 • Reveal: 4</span>
          </div>
        </div>

        <div class="pb-row" data-pb-qwrap>
          <div class="pb-label pb-mono">Question</div>
          <div class="pb-q" data-pb-q>—</div>
        </div>

        <div class="pb-row pb-hidden" data-pb-awrap>
          <div class="pb-label pb-mono">Answer</div>
          <div class="pb-a" data-pb-a>—</div>
        </div>

        <div class="pb-row pb-hidden pb-mono pb-timer" data-pb-twrap>
          Timer: <span data-pb-t>10.0s</span>
        </div>

        <div class="pb-footer">
          <button class="ce-btn pb-no" data-pb-incorrect disabled>❌ Incorrect</button>
          <button class="ce-btn pb-ok" data-pb-correct disabled>✅ Correct</button>
        </div>
      </div>
    `;

    MOD.root.appendChild(modal);
    MOD.modalEl = modal;

    // labels
    const catLbl = getCatOptions(MOD.qb).find(x => x.key === MOD.cat)?.label || MOD.cat;
    const subLbl = getSubOptions(MOD.qb, MOD.cat).find(x => x.key === MOD.sub)?.label || MOD.sub;
    qs('[data-pb-catlbl]', modal).textContent = String(catLbl);
    qs('[data-pb-sublbl]', modal).textContent = String(subLbl);

    const qWrap = qs('[data-pb-qwrap]', modal);
    const aWrap = qs('[data-pb-awrap]', modal);
    const tWrap = qs('[data-pb-twrap]', modal);
    const qEl = qs('[data-pb-q]', modal);
    const aEl = qs('[data-pb-a]', modal);
    const tEl = qs('[data-pb-t]', modal);
    const okBtn = qs('[data-pb-correct]', modal);
    const noBtn = qs('[data-pb-incorrect]', modal);
 
     // Hard-hide answer region until timer ends or reveal is triggered
     if (aWrap) aWrap.style.display = 'none';
    

    function summon(diff) {
      stopModalTimers();
      aWrap.classList.add('pb-hidden');
       aWrap.style.display = 'none';
      tWrap.classList.remove('pb-hidden');
      if (tEl) tEl.textContent = '10.0s';

      const q = pickRandomQuestion(MOD.qb, MOD.cat, MOD.sub, diff);
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

      // Start 10s timer; reveal answer on finish
      const timerMs = 10000;
      MOD.endsAt = Date.now() + timerMs;
      MOD.timerId = setInterval(() => {
        const left = Math.max(0, MOD.endsAt - Date.now());
        if (tEl) tEl.textContent = (left / 1000).toFixed(1) + 's';
        if (left <= 0) {
          aWrap.classList.remove('pb-hidden');
           aWrap.style.display = '';
          stopModalTimers();
        }
      }, 100);
    }

    modal.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      if (t.matches('[data-pb-close]')) {
        closeQuestionModal();
        return;
      }

      if (t.matches('[data-pb-summon]')) {
        summon(t.getAttribute('data-pb-summon'));
        return;
      }


      if (t.matches('[data-pb-reveal]')) {
        if (!MOD.qStarted) return;
        aWrap.classList.remove('pb-hidden');
        aWrap.style.display = '';
        stopModalTimers();
        return;
      }


      if (t.matches('[data-pb-correct]')) {
        if (!MOD.qStarted) return;
        closeQuestionModal();
        MOD.turnState = 'awaitingBrick';
        setStatus('Correct. Student may call a brick number — click the brick to open.');
        syncUI();
        return;
      }

      if (t.matches('[data-pb-incorrect]')) {
        closeQuestionModal();
        // Turn ends: no brick pick
        MOD.current = null;
        setStudentName('—');
        MOD.turnState = 'idle';
        MOD.selectNeedsRearm = false;
        setSelectButtonDisengaged(false);
        setStatus('Incorrect. No brick pick. Select next student.');
        syncUI();
        return;
      }
    });

    // Hotkeys 1/2/3 summon, 4 reveal early
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
        aWrap.classList.remove('pb-hidden');
         aWrap.style.display = '';
        stopModalTimers();
        return;
      }
    };
    window.addEventListener('keydown', MOD.modalKeyHandler, true);
  }

  // -----------------------------
  // Sync UI enable/disable
  // -----------------------------
  function syncUI() {
    if (!MOD.root) return;

    const hasStudent = !!MOD.current;
    const qbReady = !!MOD.qb;

    if (MOD.elBtnQuestion) MOD.elBtnQuestion.disabled = !(hasStudent && qbReady && MOD.cat && MOD.sub);
    if (MOD.elBtnSelect) MOD.elBtnSelect.disabled = false;
    if (MOD.elBtnUseBuiltInQB) MOD.elBtnUseBuiltInQB.disabled = !MOD.qbBuiltIn || MOD.qbSource === 'builtin';

    // Select button disengaged only while waiting on a question after selection (until re-armed)
    const disengageSelect = !!(MOD.current && MOD.turnState === 'awaitingQuestion' && MOD.selectNeedsRearm);
    setSelectButtonDisengaged(disengageSelect);

    // Offer10 enabled if eligible >= 10 and there is unopened brick
    const canOffer = remainingEligibleCount() >= 10 && MOD.bricks.some(b => !b.opened);
    if (MOD.elBtnOffer10) MOD.elBtnOffer10.disabled = !canOffer;

    // stats
    const elEligible = qs('[data-pb-eligible]', MOD.root);
    if (elEligible) elEligible.textContent = String(remainingEligibleCount());

    // keep dropdown states
    if (MOD.elCat && MOD.cat) MOD.elCat.value = MOD.cat;
    if (MOD.elSub && MOD.sub) MOD.elSub.value = MOD.sub;
  }

  // -----------------------------
  // Lifecycle
  // -----------------------------
  function hardReset() {
    closeQuestionModal();

    if (MOD.pendingAward?.t) {
      try { clearTimeout(MOD.pendingAward.t); } catch {}
    }
    MOD.pendingAward = null;

    MOD.activeAtMount = [];
    MOD.picked = new Set();
    MOD.current = null;
    MOD.turnState = 'idle';

    MOD.brickCount = 0;
    MOD.bricks = [];

    MOD.qbBuiltIn = null;
    MOD.qbUploaded = null;
    MOD.qbSource = 'builtin';
    MOD.qb = null;
    MOD.cat = null;
    MOD.sub = null;
  }

  function mountInto(hostEl) {
    if (!hostEl || MOD.active) return false;
    MOD.active = true;
    MOD.host = hostEl;

    // Determine N at mount (no live updates to brick count)
    MOD.activeAtMount = getActiveStudentsFromDom();
    const N = MOD.activeAtMount.length;
    MOD.brickCount = Math.max(4, N + 4);

    // Try auto-load QB if available, else teacher uploads
    MOD.qbBuiltIn = tryAutoLoadQB();
    MOD.qb = MOD.qbBuiltIn;
    MOD.qbSource = MOD.qbBuiltIn ? 'builtin' : 'builtin';
    if (MOD.qb) {
      const cats = getCatOptions(MOD.qb);
      MOD.cat = cats[0]?.key || null;
    }

    buildUI();

    // populate selects
    rebuildCatOptions();
    rebuildSubOptions();

    // init bricks
    resetBricks();

    setStatus(MOD.qb ? 'Ready. Select student.' : 'Ready. Upload QB, then select student.');
    syncUI();
    return true;
  }

  function unmount() {
    if (!MOD.active) return false;
    MOD.active = false;

    closeQuestionModal();

    if (MOD.pendingAward?.t) {
      try { clearTimeout(MOD.pendingAward.t); } catch {}
    }
    MOD.pendingAward = null;

    // remove resize hook
    if (MOD._raf) {
      try { cancelAnimationFrame(MOD._raf); } catch {}
      MOD._raf = 0;
    }
    if (MOD.onResize) {
      try { window.removeEventListener('resize', MOD.onResize); } catch {}
      MOD.onResize = null;
    }

    try { MOD.root?.remove?.(); } catch {}
    MOD.root = null;
    MOD.host = null;

    // Full reset on exit (spec)
    hardReset();
    return true;
  }

  // -----------------------------
  // Register with Phase 5 hub (PC098)
  // -----------------------------
  function registerWithHub() {
    const hub = window.__CE_PHASE5;
    if (!hub || typeof hub.register !== 'function') return false;

    hub.register({
      id: 'pickbrick',
      label: 'Pick the Brick',
      mount: mountInto,
      unmount,
    });

    window.__CE_PICKBRICK = Object.assign({}, window.__CE_PICKBRICK, { mountInto, unmount });
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
