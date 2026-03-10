/* =========================================================
   PC#097 – Phase 5 Bingo Activity (hub-controlled)
   Purpose:
     - Optional Phase 5 activity
     - Owns ONLY the activity canvas while active
     - Session-only state; full reset on unmount (spec)
   Guardrails:
     - No lesson:phaseChange emits
     - No burnline interaction
     - No persistence
     - No global hotkeys
     - Must NOT modify leaderboard/tile behaviour
========================================================= */

(() => {
   // Static assets (served from: mvp-offline/assets/...)
   const PRINT_CARDS_URL = './assets/bingo/bingo_maths_gate_cards.pdf';

  const MOD = {
    active: false,
    host: null,
    root: null,

    // --- bingo state ---
    poolSize: 36,
    remaining: [],
    drawn: [],
    lastDrawn: null,

    mathsGate: {
      on: false,
      pendingNumber: null,
      questionText: '',
      answer: null,
      revealed: false,
    },

    // --- awarding ---
    prizeIndex: 0,
    prizes: [
      { label: '1st – 10', points: 10 },
      { label: '2nd – 6',  points: 6  },
      { label: '3rd – 4',  points: 4  },
      { label: '4th – 3',  points: 3  },
      { label: '5th – 2',  points: 2  },
      { label: 'Next – 2', points: 2  },
    ],
    winners: [], // {id,name,points,ts}
    awardCooldownUntil: 0,

    // --- cards / economy ---
    maxCardsTotal: 32,
    perStudentMaxCards: 3,
    extraCardCost: 5,
    cardsByStudent: new Map(), // studentId -> count (includes free)
    totalCards: 0,

    // --- listeners ---
    lbClickHandler: null,



    // --- draw animation (hopper/ball) ---
    ballSpin: false,
    ballPop: false,
    ballSpinTimer: null,
    ballPopTimer: null,

    // --- delayed draw commit (2s spin) ---
    pendingDrawNumber: null,
  };

  // -----------------------------
  // Helpers
  // -----------------------------
  const now = () => Date.now();
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function ensureStyles() {
    let s = document.getElementById('ce-bingo-styles');
    if (!s) {
      s = document.createElement('style');
      s.id = 'ce-bingo-styles';
      document.head.appendChild(s);
    }
    s.textContent = `
      .ce-bingo-root{
        position:absolute; inset:0; padding:12px;
        display:flex; flex-direction:column; gap:12px;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        height:100%;
        min-height:0;
      }

      /* === PRIMARY LAYOUT (grid) ===
         left  = draw box (top-left)
         mid   = misc boxes (top-middle)
         right = drawn numbers (full height, can be up to half screen)
         question = sits under draw, spans left+mid up to right column
      */
      .ce-bingo-row{
        display:grid;
        gap:12px;
        align-items:stretch;
        /* shrink-safe: columns can contract so layout never runs off-screen */
        /* right column only needs room for ~3 tile columns */
        grid-template-columns: minmax(320px, 38vw) minmax(280px, 1fr) minmax(260px, 340px);
        grid-template-rows: auto 1fr;
        grid-template-areas:
          "left mid right"
          "question question right";
        height:100%;
        min-height:0; /* critical: gives the right column a real height to fill */
      }
      .ce-bingo-col{ display:flex; flex-direction:column; gap:12px; min-height:0; }
      .ce-bingo-col.left{ grid-area:left; }
      .ce-bingo-col.mid{ grid-area:mid; min-width:0; }
      .ce-bingo-col.right{ grid-area:right; min-height:0; }
      .ce-question-panel{ grid-area:question; position:relative; }
      .ce-question-toggle{
        position:absolute;
        top:10px;
        right:10px;
        z-index:5;
      }

      /* Stack on smaller screens */
      @media (max-width: 1100px){
        .ce-bingo-row{
          grid-template-columns: 1fr;
          grid-template-rows: auto auto auto auto;
          grid-template-areas:
            "left"
            "question"
            "mid"
            "right";
        }
        .ce-bingo-col.mid{ min-width:0; }
      }

     /* Stack columns on smaller screens */
      @media (max-width: 1100px){
        .ce-bingo-col.left,
        .ce-bingo-col.mid,
        .ce-bingo-col.right{ flex: 1 1 100%; min-width: 0; }
        }
      /* Question panel (now sits under draw and spans left+mid) */
      .ce-question-panel{
        min-height: clamp(120px, 18vh, 260px);
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
      }
      .ce-maths-q{
        /* responsive question text */
        font-size: clamp(22px, 3.6vw, 64px);
        font-weight:900;
        letter-spacing:-0.5px;
        line-height:1.15;
        opacity:0.95;
      }
      .ce-maths-ans{
        color:#ffe08a;
        font-weight:900;
        margin-left:6px;
      }

      .ce-card{ background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10); border-radius:14px; padding:12px; }
      .ce-card.grow{ flex:1 1 auto; min-height: 240px; min-width:0; min-height:0; }
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

      /* Wider button (longer, not taller) */
      .ce-btn.wide{
        padding-left:22px;
        padding-right:22px;
        min-width: 180px;
      }

      /* Award column: stack actions vertically */
      .ce-award-actions{
        display:flex;
        flex-direction:column;
        gap:10px;
        align-items:stretch;
      }
      .ce-award-actions .ce-btn{ width:100%; }
      .ce-award-meta{ margin-top:10px; }

      .ce-pill{
        display:inline-flex; align-items:center; gap:8px;
        padding:8px 10px; border-radius:999px;
        background:rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.10);
        font-size:13px; font-weight:750; color:#fff;
      }

        .ce-big{
          font-size:56px; font-weight:900; letter-spacing:-1px;
          /* Larger + responsive (aims ~1/4 of canvas height on typical layouts) */
          min-height: clamp(260px, 45vh, 560px);
          display:flex; align-items:stretch; justify-content:center;
          border-radius:14px;
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.10);
          position: relative;
        }
 
      /* --- NEW Draw Box (clean-room) --- */
      .ce-drawstage{
        position:relative;
        isolation:isolate;
        overflow:hidden;
        width:100%;
        height:100%;
        min-height: inherit; /* follows .ce-big min-height */
        border-radius:14px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.10);

        /* Ball sizing scales with viewport */
        --ballSize: clamp(300px, 30vmin, 560px);
      }
       .ce-drawstage::before{
         content:'';
         position:absolute;
         inset:0;
         background: radial-gradient(circle at 50% 35%,
           rgba(255,255,255,0.10),
           rgba(255,255,255,0.00) 65%);
         z-index:0;
         pointer-events:none;
       }
       .ce-drawstage::after{
         /* optional glass sheen (kept behind ball) */
         content:'';
         position:absolute;
         inset:0;
         background: linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.00));
         opacity:0.25;
         z-index:1;
         pointer-events:none;
       }
      /* --- Hopper / gumball draw --- */
      .ce-hopper{
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        position:relative;
        overflow:hidden;
      }
      .ce-hopper::before{
        content:'';
        position:absolute;
        width:210px;
        height:210px;
        border-radius:999px;
        background:rgba(0,0,0,0.20);
        border:1px solid rgba(255,255,255,0.10);
        box-shadow: inset 0 0 0 6px rgba(255,255,255,0.03);
        z-index: 1;
        pointer-events:none;
      }
      .ce-hopper::after{
        /* glass highlight */
        content:'';
        position:absolute;
        width:210px;
        height:210px;
        border-radius:999px;
        background: linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02));
        opacity:0.55;
        transform: translate(-10px, -12px);
        pointer-events:none;
        z-index: 2;        
      }
      /* chute / exit slot so motion is readable */
      .ce-hopper .ce-chute{
        position:absolute;
        bottom:28px;
        width:120px;
        height:10px;
        border-radius:999px;
        background:rgba(0,0,0,0.35);
        border:1px solid rgba(255,255,255,0.08);
        box-shadow: inset 0 0 0 4px rgba(255,255,255,0.02);
      }
      .ce-ball{
        position:absolute;
        width:250px;
        height:250px;
        border-radius:999px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:900;
        font-size:84px;
        color: #0f172a;
        background: radial-gradient(circle at 30% 30%,
        rgba(255,255,255,0.95) 0%,
        rgba(241,245,249,0.95) 55%,
        rgba(203,213,225,0.95) 100%);
        border: 8px solid rgba(15,23,42,0.9);
        box-shadow: 0 18px 40px rgba(0,0,0,0.55);
        transform: translateY(18px);
        will-change: transform, filter;
        z-index: 5; /* above hopper ::after glass highlight (z=2) */
        text-shadow: 0 2px 0 rgba(255,255,255,0.35);
      }
       /* When the ball is inside the NEW draw box, enforce centering + winning stack */
      .ce-drawstage .ce-ball{
        left:50%;
        top:50%;
        width: var(--ballSize);
        height: var(--ballSize);
        font-size: calc(var(--ballSize) * 0.34);
        transform: translate(-50%, calc(-50% + (var(--ballSize) * 0.07)));
        z-index:5;
        pointer-events:auto;
      }
      .ce-ball.spin{
        animation: ceBallSpin 2000ms ease-in-out both;
      }
      @keyframes ceBallSpin{
        0%   { transform: translate(-50%, calc(-50% + (var(--ballSize) * 0.07))) translateY(0px) scale(0.92) rotate(0deg);    filter: brightness(1.00) blur(0px); }
        20%  { transform: translate(-50%, calc(-50% + (var(--ballSize) * 0.07))) translateY(calc(var(--ballSize) * -0.14)) scale(1.06) rotate(220deg); filter: brightness(1.12) blur(0.3px); }
        45%  { transform: translate(-50%, calc(-50% + (var(--ballSize) * 0.07))) translateY(calc(var(--ballSize) * 0.16))  scale(0.94) rotate(520deg);  filter: brightness(1.00) blur(0.6px); }
        70%  { transform: translate(-50%, calc(-50% + (var(--ballSize) * 0.07))) translateY(calc(var(--ballSize) * -0.10)) scale(1.05) rotate(820deg); filter: brightness(1.14) blur(0.3px); }
        100% { transform: translate(-50%, calc(-50% + (var(--ballSize) * 0.07))) translateY(0px) scale(1.00) rotate(1080deg); filter: brightness(1.00) blur(0px); }
      }
      .ce-ball.pop{
        animation: ceBallPop 520ms ease-out both;
      }
      @keyframes ceBallPop{
        0%   { transform: translate(-50%, calc(-50% + (var(--ballSize) * 0.07))) translateY(0px) scale(0.92); }
        45%  { transform: translate(-50%, calc(-50% + (var(--ballSize) * 0.07))) translateY(calc(var(--ballSize) * -0.08)) scale(1.10); }
        100% { transform: translate(-50%, calc(-50% + (var(--ballSize) * 0.07))) translateY(calc(var(--ballSize) * 0.02)) scale(1.00); }
      }

      .ce-numlist{ display:flex; flex-wrap:wrap; gap:8px; max-height:240px; overflow:auto; padding-right:4px; }

      /* Drawn numbers: VERTICAL flow (down the column, then next column) */
      .ce-numlist.side{
        --tile: 64px;                 /* make tiles a bit larger */
        height:100%;
        display:block;
        padding: 4px;
        box-sizing:border-box;
        max-height:none;
        overflow: visible;            /* no clipping */

        /* Column-major layout */
        column-fill: auto;
        column-gap: 12px;
        column-width: calc(var(--tile) + 8px); /* target tile width + gutter */
      }
      .ce-numlist.side .ce-num{
        display:inline-flex;
        width: var(--tile);
        height: var(--tile);
        margin: 0 0 10px 0;           /* vertical spacing */
        break-inside: avoid;
        border-radius:10px;
        font-size:22px;
        font-weight:900;
        align-items:center;
        justify-content:center;
      }
      .ce-num{
        width:44px; height:34px; border-radius:10px;
        display:flex; align-items:center; justify-content:center;
        background:rgba(255,255,255,0.06);
        border:2px solid rgba(255,255,255,0.22);
        box-shadow: 0 1px 0 rgba(0,0,0,0.25);
        font-weight:850;
      }
      .ce-num.last{
        background:rgba(80,255,160,0.22);
        border-color:rgba(80,255,160,0.35);
      }

      .ce-list{ display:flex; flex-direction:column; gap:6px; max-height:230px; overflow:auto; padding-right:4px; }
      .ce-listitem{
        display:flex; justify-content:space-between; gap:10px;
        padding:8px 10px; border-radius:12px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.10);
        font-size:13px;
      }
      .ce-listitem .name{ font-weight:800; }
      .ce-listitem .pts{ opacity:0.9; font-weight:800; }

      .ce-switch{ display:inline-flex; align-items:center; gap:8px; user-select:none; cursor:pointer; }
      .ce-switch input{ transform: translateY(1px); }
    `;

  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#039;");
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function sampleUnique(maxInclusive, n) {
    const arr = Array.from({ length: maxInclusive }, (_, i) => i + 1);
    shuffle(arr);
    return arr.slice(0, n);
  }

  // -----------------------------
  // Leaderboard selection + roster from DOM (safe, no API assumptions)
  // -----------------------------
  function getSelectedStudentFromDom() {
    // Selection class can vary across builds; accept common variants
    const el =
      qs('.lb-item.lb-item--selected') ||
      qs('.lb-item.is-selected') ||
      qs('.lb-item.selected') ||
      qs('.lb-item[data-selected="true"]');
    if (!el) return null;
    const id = el.dataset.studentId || '';
    const name = el.dataset.studentName || '';
    if (!id) return null;
    // don’t award to inactive tiles
    if (el.classList.contains('is-inactive')) return null;
    return { id: String(id), name: String(name || 'Student') };
  }

  function getActiveStudentsFromDom() {
    const rows = qsa('.lb-item');
    const out = [];
    for (const el of rows) {
      const id = el.dataset.studentId;
      if (!id) continue;
      if (el.classList.contains('is-inactive')) continue
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
  // Reset semantics (spec)
  // -----------------------------
  function hardReset() {
    MOD.ballSpin = false;
    MOD.ballPop = false;
    if (MOD.ballSpinTimer) {
      try { clearTimeout(MOD.ballSpinTimer); } catch {}
      MOD.ballSpinTimer = null;
    }
    if (MOD.ballPopTimer) {
      try { clearTimeout(MOD.ballPopTimer); } catch {}
      MOD.ballPopTimer = null;
    }
    MOD.ballSpin = false;
    MOD.ballPop = false;


    MOD.remaining = Array.from({ length: MOD.poolSize }, (_, i) => i + 1);
    MOD.drawn = [];
    MOD.lastDrawn = null;

    MOD.mathsGate.on = false;
    MOD.mathsGate.pendingNumber = null;
    MOD.mathsGate.questionText = '';
    MOD.mathsGate.answer = null;
    MOD.mathsGate.revealed = false;

    MOD.prizeIndex = 0;
    MOD.winners = [];
    MOD.awardCooldownUntil = 0;

    MOD.cardsByStudent = new Map();
    const actives = getActiveStudentsFromDom();
    for (const s of actives) MOD.cardsByStudent.set(s.id, 1);
    MOD.totalCards = actives.length;
  }

  // -----------------------------
  // Maths gate
  // -----------------------------

  function generateMathsQuestion(answerNumber) {
    // 75% multiply/divide, 25% addition
    const roll = Math.random();

    // --- Addition (25%) ---
    if (roll < 0.25) {
      const a = Math.floor(Math.random() * (answerNumber + 1));
      const b = answerNumber - a;
      return { text: `${a} + ${b} = ?`, answer: answerNumber };
    }

    // --- Multiplication / Division (75%) ---
    // NOTE: In Maths Gate, the REVEALED ANSWER must equal the drawn number (answerNumber).

    // 50/50 multiply vs divide
    const useMultiply = Math.random() < 0.5;

    if (useMultiply) {
      // Multiplication where product is the drawn number (avoid ×1)
      const pairs = [];
      for (let i = 2; i <= Math.sqrt(answerNumber); i++) {
        if (answerNumber % i === 0) {
          const a = i;
          const b = answerNumber / i;
          if (a !== 1 && b !== 1) pairs.push([a, b]);
        }
      }
      // Fallback to addition if prime / no non-trivial factors
      if (!pairs.length) {
        const a = Math.floor(Math.random() * (answerNumber + 1));
        const b = answerNumber - a;
        return { text: `${a} + ${b} = ?`, answer: answerNumber };
      }
      const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
      return { text: `${a} × ${b} = ?`, answer: answerNumber };
    }

    // Division where the QUOTIENT is the drawn number:
    // (answerNumber × d) ÷ d = ?  -> answer is answerNumber (avoid ÷1)
    const divisors = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const d = divisors[Math.floor(Math.random() * divisors.length)];
    const dividend = answerNumber * d;
    return { text: `${dividend} ÷ ${d} = ?`, answer: answerNumber };
  }

  // -----------------------------
  // Card generation + print
  // -----------------------------
  function makeCardBlocks() {
    // 25 unique numbers from 1..poolSize, split into 5 blocks of 5
    const picked = sampleUnique(MOD.poolSize, 25);
    const blocks = [];
    for (let i = 0; i < 5; i++) {
      blocks.push(picked.slice(i * 5, i * 5 + 5).sort((x, y) => x - y));
    }
    return blocks;
  }

  function buildPrintHtml(cards) {
    const cardHtml = cards.map((c) => `
      <div class="card">
        <div class="title">${escapeHtml(c.title)}</div>
        <div class="blocks">
          ${c.blocks.map(b => `
            <div class="block">
              ${b.map(n => `<div class="cell">${n}</div>`).join('')}
            </div>
          `).join('')}
        </div>
        <div class="hint">Win: complete any ONE block.</div>
      </div>
    `).join('');

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Bingo Sheets</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body{ font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
            .grid{ display:grid; grid-template-columns: 1fr 1fr; gap: 10mm; }
            .card{ border:2px solid #111; border-radius:10px; padding:10px; break-inside: avoid; }
            .title{ font-weight:900; font-size:14px; margin-bottom:8px; }
            .blocks{ display:flex; flex-direction:column; gap:8px; }
            .block{ display:grid; grid-template-columns: repeat(5, 1fr); gap:6px; }
            .cell{ border:1px solid #111; border-radius:8px; height:32px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; }
            .hint{ margin-top:8px; font-size:12px; font-weight:800; }
          </style>
        </head>
        <body>
          <div class="grid">${cardHtml}</div>
        </body>
      </html>
    `;
  }

  function onPrint() {
    // Open the fixed classroom PDF pack (no generation, no state coupling)
    window.open(PRINT_CARDS_URL, '_blank', 'noopener');
  }

  // -----------------------------
  // UI logic
  // -----------------------------
  function prizeNow() {
    if (MOD.prizeIndex < MOD.prizes.length - 1) return MOD.prizes[MOD.prizeIndex];
    return MOD.prizes[MOD.prizes.length - 1];
  }

  function canDraw() {
    if (!MOD.remaining.length) return false;
    // If maths gate is on and a pending number exists, block ONLY until reveal.
    // After reveal, allow Draw to proceed (it will clear the gate and draw a new number).
    if (MOD.mathsGate.on && MOD.mathsGate.pendingNumber != null && !MOD.mathsGate.revealed) return false;
    return true;
  }

  function canAward() {
    if (now() < MOD.awardCooldownUntil) return false;
    // Award winner must be usable BETWEEN spins, not during a spin animation
    if (MOD.ballSpin) return false;
    return !!getSelectedStudentFromDom();
  }

  function canPurchaseCard() {
    const sel = getSelectedStudentFromDom();
    if (!sel) return false;
    // Lock purchases after 5 numbers have been drawn
    if (MOD.drawn.length >= 5) return false;
    if (MOD.totalCards >= MOD.maxCardsTotal) return false;
    const cur = MOD.cardsByStudent.get(sel.id) || 1;
    return cur < MOD.perStudentMaxCards;
  }

  function render() {
    if (!MOD.root) return;

    const sel = getSelectedStudentFromDom();
    const prize = prizeNow();

    // ball display text (A2 rules)
    let ballText = '—';
    if (MOD.ballSpin && MOD.pendingDrawNumber != null && MOD.mathsGate.on) {
      // During the 2s spin (Maths Gate ON), keep ball hidden
      ballText = '?';
    } else if (MOD.mathsGate.on && MOD.mathsGate.pendingNumber != null) {
      // Maths gate active: hide number until revealed
      ballText = MOD.mathsGate.revealed
        ? String(MOD.mathsGate.answer)   // equals drawn number
        : '?';
    } else if (MOD.lastDrawn != null) {
      // Normal draw
      ballText = String(MOD.lastDrawn);
    }

    const drawnSorted = MOD.drawn.slice().sort((a, b) => a - b);

    MOD.root.innerHTML = `
      <div class="ce-bingo-root">
        <div class="ce-bingo-row">

          <div class="ce-bingo-col left">

            <div class="ce-card">
              <div class="ce-title">Draw</div>
              <div class="ce-big">
                 <div class="ce-drawstage">
                   <div class="ce-chute"></div>
                   <div class="ce-ball ${(MOD.pendingDrawNumber != null) ? 'spin' : ''} ${MOD.ballPop ? 'pop' : ''}">${escapeHtml(ballText)}</div>
                 </div>
              </div>
              <div style="margin-top:10px; display:flex; gap:8px; align-items:center;">
                <button class="ce-btn primary wide" data-act="draw" ${
                  (MOD.remaining.length === 0 || MOD.ballSpin) ? 'disabled' : ''
                }>${
                  (MOD.mathsGate.on && MOD.mathsGate.pendingNumber != null && !MOD.mathsGate.revealed) ? 'Reveal' : 'Draw'
                }</button>
                <span class="ce-pill">${MOD.remaining.length} remaining</span>
              </div>
            </div>

          </div>

          <div class="ce-bingo-col mid">

            <div class="ce-card">
              <div class="ce-award-actions">
                <button class="ce-btn primary" data-act="award" ${canAward() ? '' : 'disabled'}>Award winner ${prize.label}</button>
                <button class="ce-btn danger" data-act="purchase" ${canPurchaseCard() ? '' : 'disabled'}>
                  Purchase card (-${MOD.extraCardCost})
                </button>
                <button class="ce-btn" data-act="print">Print Cards</button>
              </div>
              <div class="ce-award-meta">
                <span class="ce-pill">Selected: ${sel ? escapeHtml(sel.name) : '—'}</span>
              </div>
            </div>

          </div>

          <div class="ce-card ce-question-panel">
            <div class="ce-question-toggle">
              <label class="ce-switch">
                <input type="checkbox" data-act="toggle-maths" ${MOD.mathsGate.on ? 'checked' : ''}/>
                <span style="font-weight:800;">Maths gate</span>
              </label>
            </div>
            <div class="ce-maths-q">
              ${
                (!MOD.mathsGate.on)
                  ? ''
                  : (MOD.mathsGate.pendingNumber == null
                      ? ' '
                      : (
                         MOD.mathsGate.revealed
                         ? escapeHtml(MOD.mathsGate.questionText)
                             .replace(
                                /\=\s*\?/,
                                `= <span class="ce-maths-ans">${escapeHtml(String(MOD.mathsGate.answer))}</span>`
                               )
                            : escapeHtml(MOD.mathsGate.questionText)
                        ))
              }
            </div>
          </div>

          <div class="ce-bingo-col right">

            <div class="ce-card grow">
              <div class="ce-title">Drawn Numbers</div>
              <div class="ce-numlist side">
                ${drawnSorted.map(n => `
                  <div class="ce-num ${n === MOD.lastDrawn ? 'last' : ''}">${n}</div>
                `).join('')}
              </div>
              <div class="ce-muted" style="margin-top:8px;">
                Ascending order. Last drawn highlighted.
              </div>
            </div>

          </div>

        </div>


      </div>
    `;

    // wire
    MOD.root.querySelector('[data-act="draw"]')?.addEventListener('click', onDraw);
    MOD.root.querySelector('[data-act="toggle-maths"]')?.addEventListener('change', onToggleMaths);
    MOD.root.querySelector('[data-act="award"]')?.addEventListener('click', onAward);
    MOD.root.querySelector('[data-act="purchase"]')?.addEventListener('click', onPurchaseCard);
    MOD.root.querySelector('[data-act="print"]')?.addEventListener('click', onPrint);
  }

  // -----------------------------
  // Actions
  // -----------------------------
  function commitDrawnNumber(n) {
    MOD.drawn.push(n);
    MOD.lastDrawn = n;

    // pop the ball briefly when a number becomes official
    MOD.ballPop = true;
    if (MOD.ballPopTimer) {
      try { clearTimeout(MOD.ballPopTimer); } catch {}
    }
    MOD.ballPopTimer = setTimeout(() => {
      MOD.ballPop = false;
      MOD.ballPopTimer = null;
      if (MOD.active) render();
    }, 520);

  }

  function clearMathsGate() {
    MOD.mathsGate.pendingNumber = null;
    MOD.mathsGate.questionText = '';
    MOD.mathsGate.answer = null;
    MOD.mathsGate.revealed = false;
  }

  function onToggleMaths(evt) {
    MOD.mathsGate.on = !!evt.target.checked;

    // Clear any pending gate state when toggling
    clearMathsGate();

    // If toggling ON while lastDrawn exists, leave history intact
    render();
  }

  function onDraw() {
    // If maths gate is waiting for reveal, Draw acts as Reveal (single-click flow).
    if (MOD.mathsGate.on && MOD.mathsGate.pendingNumber != null && !MOD.mathsGate.revealed) {
      onReveal();
      return;
    }

    if (!canDraw()) return;
    if (MOD.ballSpin) return; // spinning lock

    // If a gated question was revealed, keep the answer visible until the next Draw,
    // then clear the gate and proceed to a fresh draw.
    if (MOD.mathsGate.on && MOD.mathsGate.pendingNumber != null && MOD.mathsGate.revealed) {
      clearMathsGate();
    }

    // pick a number without replacement
    const idx = Math.floor(Math.random() * MOD.remaining.length);
    const n = MOD.remaining.splice(idx, 1)[0];

    // Start 2s spin, then commit (or show question) AFTER the spin finishes.
    MOD.pendingDrawNumber = n;
    MOD.ballSpin = true;
    if (MOD.ballSpinTimer) {
      try { clearTimeout(MOD.ballSpinTimer); } catch {}
    }
    render(); // immediately show spin state + disable button

    MOD.ballSpinTimer = setTimeout(() => {
      MOD.ballSpin = false;
      MOD.ballSpinTimer = null;

      const picked = MOD.pendingDrawNumber;


      if (picked == null) {
        if (MOD.active) render();
        return;
      }

      if (MOD.mathsGate.on) {
        // After spin: show question (number still hidden until reveal)
        const q = generateMathsQuestion(picked);
        MOD.mathsGate.pendingNumber = picked;
        MOD.mathsGate.questionText = q.text;
        MOD.mathsGate.answer = q.answer;
        MOD.mathsGate.revealed = false;
        // keep pendingDrawNumber set until after first post-spin render,
        // so the spin class stays visible for the transition frame
        if (MOD.active) render();
        MOD.pendingDrawNumber = null;    
        return;
      }

      // After spin: commit immediately when gate is OFF
      commitDrawnNumber(picked);
      if (MOD.active) render();
      MOD.pendingDrawNumber = null;
    }, 2000);
  }

  function onReveal() {
    if (!MOD.mathsGate.on) return;
    if (MOD.mathsGate.pendingNumber == null) return;
    if (MOD.mathsGate.revealed) return;

    // reveal answer + commit draw
    MOD.mathsGate.revealed = true;

    // Visual: quick pop when the answer is revealed
    MOD.ballPop = true;
    if (MOD.ballPopTimer) {
      try { clearTimeout(MOD.ballPopTimer); } catch {}
    }
    MOD.ballPopTimer = setTimeout(() => {
      MOD.ballPop = false;
      MOD.ballPopTimer = null;
      if (MOD.active) render();
    }, 520);

    const n = MOD.mathsGate.pendingNumber;
    commitDrawnNumber(n);

    // Do NOT clear gate here. Keep answer visible until the next Draw.
    render();
  }

  function onAward() {
    const sel = getSelectedStudentFromDom();
    if (!sel) return;
    if (now() < MOD.awardCooldownUntil) return;

    const prize = prizeNow();
    if (!applyAward(sel.id, prize.points)) return;

    MOD.winners.push({ id: sel.id, name: sel.name, points: prize.points, ts: now() });

    // advance ladder; last state persists at Next–2
    if (MOD.prizeIndex < MOD.prizes.length - 1) MOD.prizeIndex++;

    // global cooldown
    MOD.awardCooldownUntil = now() + 2000;

    render();
  }

  function onPurchaseCard() {
    const sel = getSelectedStudentFromDom();
    if (!sel) return;
    if (MOD.totalCards >= MOD.maxCardsTotal) return;

    const cur = MOD.cardsByStudent.get(sel.id) || 1;
    if (cur >= MOD.perStudentMaxCards) return;

    // charge tokens
    if (!applyAward(sel.id, -MOD.extraCardCost)) return;

    MOD.cardsByStudent.set(sel.id, cur + 1);
    MOD.totalCards += 1;

    render();
  }

  // -----------------------------
  // Mount / unmount (hub controlled)
  // -----------------------------
  function mountInto(hostEl) {
    ensureStyles();
    MOD.active = true;
    MOD.host = hostEl;

    // Full reset on entry (session-local, no persistence)
    hardReset();

    // Create root in canvas
    MOD.root = document.createElement('div');
    MOD.root.id = 'ce-bingo-root';
    MOD.root.style.position = 'absolute';
    MOD.root.style.inset = '0';
    MOD.root.style.zIndex = '10';
    MOD.root.style.pointerEvents = 'auto';

    // ensure host is positioning context
    if (MOD.host && getComputedStyle(MOD.host).position === 'static') {
      MOD.host.style.position = 'relative';
    }
    MOD.host.appendChild(MOD.root);

    // selection watcher: re-render when teacher clicks tiles
    const lb = qs('.leaderboard');
    if (lb) {
      MOD.lbClickHandler = () => { if (MOD.active) render(); };
      lb.addEventListener('click', MOD.lbClickHandler, true);
    }

    render();
    return true;
  }

  function unmount() {
    MOD.active = false;

    if (MOD.ballSpinTimer) {
      try { clearTimeout(MOD.ballSpinTimer); } catch {}
      MOD.ballSpinTimer = null;
    }
    if (MOD.ballPopTimer) {
      try { clearTimeout(MOD.ballPopTimer); } catch {}
      MOD.ballPopTimer = null;
    }
    MOD.ballSpin = false;
    MOD.ballPop = false;
    MOD.pendingDrawNumber = null;

    const lb = qs('.leaderboard');
    if (lb && MOD.lbClickHandler) {
      try { lb.removeEventListener('click', MOD.lbClickHandler, true); } catch {}
    }
    MOD.lbClickHandler = null;

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
      id: 'bingo',
      label: 'Bingo',
      mount: mountInto,
      unmount,
    });

    // Export debug handle (optional)
    window.__CE_BINGO = Object.assign({}, window.__CE_BINGO, { mountInto, unmount });

    return true;
  }

  // Hub should load first, but keep a short safety retry
  if (!registerWithHub()) {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (registerWithHub() || tries >= 20) clearInterval(t); // ~2 seconds max
    }, 100);
  }
})();
