/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC119-A2
   Module: challenge.duel.rhythmstrike.pc119.js
   Purpose: Phase 6 Duel Activity – Rhythm Strike
   Notes:
     - Additive-only duel module
     - No persistence
     - No phase changes
     - 4 rounds total
     - 30 seconds per round
     - Players alternate turns each round
     - 4-lane 120 BPM note framework
     - Supports keyboard + touch now
     - Controller-ready triggerLane architecture
========================================================= */

(() => {
  const WIDTH = 1280;
  const HEIGHT = 720;

  const TOTAL_ROUNDS = 2;
  const ROUND_MS = 30000;
  const COUNTDOWN_MS = 2200;
  const BETWEEN_TURN_MS = 1200;
  const BETWEEN_ROUND_MS = 1800;
  const SUDDEN_DEATH_ROUND_MS = 18000;

  const BPM = 120;
  const BEAT_MS = 60000 / BPM; // 500ms
  const SUB_BEAT_MS = BEAT_MS / 2; // 250ms

  const LANE_COUNT = 4;
  const NOTE_TRAVEL_MS = 2200;
  const HIT_WINDOW_PERFECT = 70;
  const HIT_WINDOW_GOOD = 130;
  const HIT_WINDOW_BAD = 190;

  const COLORS = {
    bg: '#0b1220',
    bg2: '#09111d',
    fg: '#e2e8f0',
    muted: '#94a3b8',
    accent: '#a78bfa',
    p1: '#34d399',
    p2: '#60a5fa',
    perfect: '#22c55e',
    good: '#eab308',
    bad: '#f97316',
    miss: '#ef4444',
    lane: 'rgba(255,255,255,0.08)',
    laneEdge: 'rgba(255,255,255,0.14)',
    hitLine: 'rgba(255,255,255,0.65)',
    note: '#f8fafc'
  };

  const MOD = {
    mounted: false,
    root: null,
    host: null,
    canvas: null,
    ctx: null,
    frameId: null,
    pair: null,
    onComplete: null,

    phase: 'idle', // idle | countdown | live | turnResult | roundBreak | finished
    roundNumber: 1,
    currentSide: 'a',
    inSuddenDeath: false,
    currentChart: [],
    currentNoteIndex: 0,
    currentTurnScore: 0,

    scoreA: 0,
    scoreB: 0,

    phaseEndsAt: 0,
    turnStartedAt: 0,
    countdownLabel: '',

    notesHit: 0,
    notesMissed: 0,
    feedbackText: '',
    feedbackLane: -1,
    feedbackColor: COLORS.fg,
    feedbackUntil: 0,

    touch: {
      a: [false, false, false, false],
      b: [false, false, false, false]
    },
    controls: {
      a: { y: 470 },
      b: { y: 470 }
    },
    dragSide: null,
    dragOffsetY: 0,

    gamepadPrev: {
      a: [false, false, false, false],
      b: [false, false, false, false]
    },

    keydownHandler: null,
    keyupHandler: null,
    pointerMoveHandler: null,
    pointerUpHandler: null
  };

  function now() {
    return performance.now();
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function ensureStyles() {
    if (document.getElementById('ce-ch119-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-ch119-styles';
    s.textContent = `
      .ce-ch119-shell{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        background:${COLORS.bg};
        overflow:hidden;
        touch-action:none;
        user-select:none;
        -webkit-user-select:none;
      }

      .ce-ch119-canvas{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        display:block;
      }

      .ce-ch119-pod{
        position:absolute;
        width:390px;
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:14px;
        z-index:5;
        pointer-events:auto;
      }

      .ce-ch119-pod--a{ left:16px; }
      .ce-ch119-pod--b{ right:16px; }

      .ce-ch119-handle{
        width:42px;
        height:12px;
        border-radius:999px;
        background:rgba(255,255,255,0.28);
        border:1px solid rgba(255,255,255,0.16);
        cursor:grab;
        touch-action:none;
      }

      .ce-ch119-label{
        font:700 12px system-ui, sans-serif;
        color:${COLORS.muted};
        text-transform:uppercase;
        letter-spacing:0.06em;
        text-align:center;
      }

      .ce-ch119-row{
        display:grid;
        grid-template-columns:repeat(4, 1fr);
        gap:10px;
      }

      .ce-ch119-btn{
        width:88px;
        height:88px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.08);
        color:#fff;
        font-size:28px;
        font-weight:900;
        cursor:pointer;
        touch-action:none;
      }

      .ce-ch119-btn.is-active,
      .ce-ch119-btn:active{
        background:rgba(255,255,255,0.18);
      }
    `;
    document.head.appendChild(s);
  }

  function getLaneKeysForSide(side) {
    return side === 'a'
      ? ['a', 's', 'd', 'f']
      : ['j', 'k', 'l', ';'];
  }

  function getLaneLabelsForSide(side) {
    return side === 'a'
      ? ['A', 'S', 'D', 'F']
      : ['J', 'K', 'L', ';'];
  }

  function getTurnName() {
    return MOD.currentSide === 'a'
      ? (MOD.pair?.a?.name || 'Player A')
      : (MOD.pair?.b?.name || 'Player B');
  }

  function getOtherSide(side) {
    return side === 'a' ? 'b' : 'a';
  }

  function getPodBounds() {
    const top = 420;
    const podHeight = 12 + 14 + 18 + 88;
    const bottom = HEIGHT - podHeight - 20;
    return {
      minY: top,
      maxY: Math.max(top, bottom)
    };
  }

  function positionPods() {
    if (!MOD.root) return;

    const { minY, maxY } = getPodBounds();
    MOD.controls.a.y = clamp(MOD.controls.a.y, minY, maxY);
    MOD.controls.b.y = clamp(MOD.controls.b.y, minY, maxY);

    const podA = qs('.ce-ch119-pod--a', MOD.root);
    const podB = qs('.ce-ch119-pod--b', MOD.root);

    if (podA) podA.style.top = `${MOD.controls.a.y}px`;
    if (podB) podB.style.top = `${MOD.controls.b.y}px`;
  }

  function syncButtonVisuals() {
    if (!MOD.root) return;

    ['a', 'b'].forEach((side) => {
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        qs(`[data-btn="${side}-${lane}"]`, MOD.root)?.classList.toggle('is-active', !!MOD.touch[side][lane]);
      }
    });
  }

  function clearTouch() {
    MOD.touch.a = [false, false, false, false];
    MOD.touch.b = [false, false, false, false];
  }

  function createChart(roundNumber) {
    const chart = [];
    const roundMs = MOD.inSuddenDeath ? SUDDEN_DEATH_ROUND_MS : ROUND_MS;
    const leadIn = 3000;
    const tailPad = 400; // allow notes very close to end
    const startAt = leadIn;
    const noteCount = MOD.inSuddenDeath
      ? 26 + (roundNumber - 1) * 2
      : 30 + (roundNumber - 1) * 4;

    let t = startAt;
    let prevLane = -1;

    for (let i = 0; i < noteCount; i++) {
      let lane = Math.floor(Math.random() * LANE_COUNT);
      if (lane === prevLane && Math.random() < 0.55) {
        lane = (lane + 1 + Math.floor(Math.random() * 3)) % LANE_COUNT;
      }

      chart.push({
        lane,
        hitAt: t,
        judged: false,
        result: ''
      });

      prevLane = lane;

      const p = i / Math.max(1, noteCount - 1);

      // NEW CURVE:
      // very spaced early → gradually tighter → dense late
      const baseGap =
        1100 - p * 650;   // ~1100ms early → ~450ms late

      const jitter =
        (Math.random() - 0.5) * (p < 0.3 ? 400 : 160); // more chaos early

      const gap = Math.max(240, baseGap + jitter);

      t += gap;

      if (t > roundMs - tailPad) break; // natural stop, not forced
    }

    return chart;
  }

  function startRoundIntro() {
    MOD.phase = 'countdown';
    MOD.phaseEndsAt = now() + COUNTDOWN_MS;
    MOD.countdownLabel = `ROUND ${MOD.roundNumber}`;
  }

  function startTurn(side) {
    MOD.currentSide = side;
    MOD.currentChart = createChart(MOD.roundNumber);
    MOD.currentNoteIndex = 0;
    MOD.currentNoteIndex = 0;
    MOD.currentTurnScore = 0;
    MOD.notesHit = 0;
    MOD.notesMissed = 0;
    MOD.feedbackText = '';
    MOD.feedbackLane = -1;
    MOD.feedbackUntil = 0;
    clearTouch();

    MOD.phase = 'countdown';
    MOD.phaseEndsAt = now() + COUNTDOWN_MS;
    MOD.countdownLabel = getTurnName();
  }

  function beginLiveTurn() {
    MOD.phase = 'live';
    MOD.turnStartedAt = now();
    MOD.phaseEndsAt = MOD.turnStartedAt + (MOD.inSuddenDeath ? SUDDEN_DEATH_ROUND_MS : ROUND_MS);
    MOD.feedbackText = '';
    MOD.feedbackUntil = 0;
  }

  function finishTurn() {
    if (MOD.currentSide === 'a') MOD.scoreA += MOD.currentTurnScore;
    else MOD.scoreB += MOD.currentTurnScore;

    MOD.phase = 'turnResult';
    MOD.phaseEndsAt = now() + BETWEEN_TURN_MS;
  }

  function beginNextPhaseAfterTurn() {
    if (MOD.currentSide === 'a') {
      startTurn('b');
      return;
    }

    if (MOD.roundNumber >= TOTAL_ROUNDS) {
      finishMatch();
      return;
    }

    MOD.phase = 'roundBreak';
    MOD.phaseEndsAt = now() + BETWEEN_ROUND_MS;
  }

  function startNextRound() {
    MOD.roundNumber += 1;
    startTurn('a');
  }

  function finishMatch() {
    if (MOD.scoreA > MOD.scoreB) {
      return completeWithWinner(MOD.pair.a, MOD.pair.b);
    }
    if (MOD.scoreB > MOD.scoreA) {
      return completeWithWinner(MOD.pair.b, MOD.pair.a);
    }

    MOD.inSuddenDeath = true;
    MOD.roundNumber += 1;
    MOD.phase = 'roundBreak';
    MOD.phaseEndsAt = now() + BETWEEN_ROUND_MS;
  }

  function completeWithWinner(winner, loser) {
    MOD.phase = 'finished';
    MOD.onComplete?.({
      winnerId: String(winner.id),
      winnerName: String(winner.name || winner.id),
      loserId: String(loser.id),
      loserName: String(loser.name || loser.id)
    });
  }

  function lanePressed(side, lane) {
    return !!MOD.touch[side][lane];
  }

  function pollGamepadLaneEdges() {
    const input = window.CE_INPUT;
    if (!input?.getPlayerState) return;

    const padA = input.getPlayerState('a');
    const padB = input.getPlayerState('b');

    const nextA = [
      !!padA.lane1,
      !!padA.lane2,
      !!padA.lane3,
      !!padA.lane4
    ];

    const nextB = [
      !!padB.lane1,
      !!padB.lane2,
      !!padB.lane3,
      !!padB.lane4
    ];

    for (let lane = 0; lane < LANE_COUNT; lane++) {
      MOD.touch.a[lane] = nextA[lane];
      MOD.touch.b[lane] = nextB[lane];

      if (nextA[lane] && !MOD.gamepadPrev.a[lane]) {
        triggerLane('a', lane);
      }

      if (nextB[lane] && !MOD.gamepadPrev.b[lane]) {
        triggerLane('b', lane);
      }
    }

    MOD.gamepadPrev.a = nextA;
    MOD.gamepadPrev.b = nextB;
  }

  function triggerLane(side, lane) {
    if (MOD.phase !== 'live') return;
    if (side !== MOD.currentSide) return;

    const elapsed = now() - MOD.turnStartedAt;
    let best = null;
    let bestDist = Infinity;

    for (const note of MOD.currentChart) {
      if (note.judged || note.lane !== lane) continue;
      const dist = Math.abs(note.hitAt - elapsed);
      if (dist < bestDist) {
        best = note;
        bestDist = dist;
      }
    }

    if (!best) {
      setFeedback('MISS', COLORS.miss);
      return;
    }

    if (bestDist <= HIT_WINDOW_PERFECT) {
      best.judged = true;
      best.result = 'perfect';
      MOD.currentTurnScore += 3;
      MOD.notesHit += 1;
      setFeedback('PERFECT', COLORS.perfect, lane);
      return;
    }

    if (bestDist <= HIT_WINDOW_GOOD) {
      best.judged = true;
      best.result = 'good';
      MOD.currentTurnScore += 2;
      MOD.notesHit += 1;
      setFeedback('GOOD', COLORS.good, lane);
      return;
    }

    if (bestDist <= HIT_WINDOW_BAD) {
      best.judged = true;
      best.result = 'bad';
      MOD.currentTurnScore += 1;
      MOD.notesHit += 1;
      setFeedback('BAD', COLORS.bad, lane);
      return;
    }

    setFeedback('MISS', COLORS.miss);
  }

  function setFeedback(text, color, lane = -1) {
    MOD.feedbackText = text;
    MOD.feedbackColor = color;
    MOD.feedbackLane = lane;
    MOD.feedbackUntil = now() + 520;
  }

  function updateLiveTurn() {
    const elapsed = now() - MOD.turnStartedAt;

    for (const note of MOD.currentChart) {
      if (note.judged) continue;
      if (elapsed - note.hitAt > HIT_WINDOW_BAD) {
        note.judged = true;
        note.result = 'miss';
        MOD.notesMissed += 1;
      }
    }

    if (now() >= MOD.phaseEndsAt) {
      finishTurn();
    }
  }

  function drawBackground(ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    bg.addColorStop(0, COLORS.bg);
    bg.addColorStop(1, COLORS.bg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function drawHud(ctx) {
    const liveScoreA = MOD.currentSide === 'a' && (MOD.phase === 'live' || MOD.phase === 'turnResult')
      ? MOD.scoreA + MOD.currentTurnScore
      : MOD.scoreA;

    const liveScoreB = MOD.currentSide === 'b' && (MOD.phase === 'live' || MOD.phase === 'turnResult')
      ? MOD.scoreB + MOD.currentTurnScore
      : MOD.scoreB;

    ctx.fillStyle = COLORS.fg;
    ctx.font = '700 32px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${MOD.pair?.a?.name || 'Player A'}: ${liveScoreA}`, 28, 44);

    ctx.textAlign = 'right';
    ctx.fillText(`${liveScoreB} :${MOD.pair?.b?.name || 'Player B'}`, WIDTH - 28, 44);

    ctx.textAlign = 'center';
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`Round ${MOD.roundNumber} / ${TOTAL_ROUNDS}`, WIDTH / 2, 44);

    if (MOD.phase === 'live') {
      const leftMs = Math.max(0, MOD.phaseEndsAt - now());
      const total = Math.ceil(leftMs / 1000);
      ctx.fillStyle = COLORS.fg;
      ctx.font = '700 20px system-ui, sans-serif';
      ctx.fillText(`${total}s`, WIDTH / 2, 76);
    }

    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillStyle = MOD.currentSide === 'a' ? COLORS.p1 : COLORS.p2;
    ctx.fillText(`${getTurnName()} turn`, WIDTH / 2, 104);
  }

  function drawPlayfield(ctx) {
    const laneAreaW = 520;
    const laneAreaH = HEIGHT - 140;
    const laneX = (WIDTH - laneAreaW) / 2;
    const laneY = 92;
    const laneW = laneAreaW / LANE_COUNT;
    const hitLineY = laneY + laneAreaH - 86;

    ctx.save();

    for (let i = 0; i < LANE_COUNT; i++) {
      const isFeedbackLane =
        i === MOD.feedbackLane &&
        now() <= MOD.feedbackUntil &&
        MOD.feedbackText !== 'MISS';

      if (isFeedbackLane) {
        ctx.fillStyle = MOD.feedbackColor;
        ctx.globalAlpha = 0.28;
        ctx.fillRect(laneX + i * laneW + 6, laneY, laneW - 12, laneAreaH);
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = COLORS.lane;
      ctx.fillRect(laneX + i * laneW + 6, laneY, laneW - 12, laneAreaH);

      ctx.strokeStyle = COLORS.laneEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(laneX + i * laneW + 6, laneY, laneW - 12, laneAreaH);
    }

    ctx.strokeStyle = COLORS.hitLine;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(laneX + 8, hitLineY);
    ctx.lineTo(laneX + laneAreaW - 8, hitLineY);
    ctx.stroke();

    const labels = getLaneLabelsForSide(MOD.currentSide);
    ctx.textAlign = 'center';
    ctx.font = '700 24px system-ui, sans-serif';

    for (let i = 0; i < LANE_COUNT; i++) {
      ctx.fillStyle = COLORS.fg;
      ctx.fillText(labels[i], laneX + i * laneW + laneW / 2, hitLineY + 48);
    }

    const elapsed = MOD.phase === 'live'
      ? (now() - MOD.turnStartedAt)
      : 0;

    for (const note of MOD.currentChart) {
      if (note.judged && note.result !== 'miss') continue;

      const dt = note.hitAt - elapsed;
      const progress = 1 - (dt / NOTE_TRAVEL_MS);
      if (progress < -0.05 || progress > 1.15) continue;

      const noteY = laneY + progress * (hitLineY - laneY);
      const noteX = laneX + note.lane * laneW + 14;
      const noteW = laneW - 28;
      const noteH = 26;

      ctx.fillStyle = note.result === 'miss' ? 'rgba(239,68,68,0.35)' : COLORS.note;
      ctx.strokeStyle = note.result === 'miss' ? COLORS.miss : (MOD.currentSide === 'a' ? COLORS.p1 : COLORS.p2);
      ctx.lineWidth = 2;
      roundRect(ctx, noteX, noteY - noteH / 2, noteW, noteH, 8);
      ctx.fill();
      ctx.stroke();
    }

    if (MOD.feedbackText && now() <= MOD.feedbackUntil) {
      ctx.fillStyle = MOD.feedbackColor;
      ctx.font = '900 68px system-ui, sans-serif';
      ctx.fillText(MOD.feedbackText, WIDTH / 2, laneY + 60);
    }

    ctx.restore();
  }

  function drawOverlay(ctx) {
    if (MOD.phase === 'countdown') {
      const left = Math.max(0, Math.ceil((MOD.phaseEndsAt - now()) / 1000));
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = COLORS.accent;
      ctx.font = '900 120px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(left > 0 ? String(left) : 'GO', WIDTH / 2, HEIGHT / 2 - 30);

      ctx.font = '700 28px system-ui, sans-serif';
      ctx.fillStyle = COLORS.fg;
      ctx.fillText(MOD.countdownLabel, WIDTH / 2, HEIGHT / 2 + 70);
      return;
    }

    if (MOD.phase === 'turnResult') {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = COLORS.fg;
      ctx.font = '900 56px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${getTurnName()} scored ${MOD.currentTurnScore}`, WIDTH / 2, HEIGHT / 2 - 10);

      ctx.font = '700 24px system-ui, sans-serif';
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(`Hits ${MOD.notesHit} • Misses ${MOD.notesMissed}`, WIDTH / 2, HEIGHT / 2 + 50);
      return;
    }

    if (MOD.phase === 'roundBreak') {
      ctx.fillStyle = 'rgba(0,0,0,0.20)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = COLORS.fg;
      ctx.font = '900 52px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        MOD.inSuddenDeath ? `OVERTIME ROUND ${MOD.roundNumber}` : `ROUND ${MOD.roundNumber + 1}`,
        WIDTH / 2,
        HEIGHT / 2
      );
    }
  }

  function drawFrame() {
    if (!MOD.ctx) return;
    const ctx = MOD.ctx;

    drawBackground(ctx);
    positionPods();
    syncButtonVisuals();
    drawHud(ctx);
    drawPlayfield(ctx);
    drawOverlay(ctx);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function tick() {
    if (!MOD.mounted) return;

    pollGamepadLaneEdges();

    if (MOD.phase === 'countdown') {
      if (now() >= MOD.phaseEndsAt) beginLiveTurn();
    } else if (MOD.phase === 'live') {
      updateLiveTurn();
    } else if (MOD.phase === 'turnResult') {
      if (now() >= MOD.phaseEndsAt) beginNextPhaseAfterTurn();
    } else if (MOD.phase === 'roundBreak') {
      if (now() >= MOD.phaseEndsAt) startNextRound();
    }

    drawFrame();

    if (MOD.phase !== 'finished') {
      MOD.frameId = requestAnimationFrame(tick);
    }
  }

  function bindInputs() {
    MOD.root.querySelectorAll('[data-btn]').forEach((btn) => {
      const spec = String(btn.getAttribute('data-btn') || '');
      const [side, laneStr] = spec.split('-');
      const lane = Number(laneStr);

      const press = (e) => {
        e.preventDefault();
        MOD.touch[side][lane] = true;
        syncButtonVisuals();
        triggerLane(side, lane);
      };

      const release = (e) => {
        e?.preventDefault?.();
        MOD.touch[side][lane] = false;
        syncButtonVisuals();
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    });

    MOD.root.querySelectorAll('.ce-ch119-handle').forEach((handle) => {
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const pod = handle.closest('.ce-ch119-pod');
        const side = String(pod?.getAttribute('data-side') || '');
        if (!side) return;
        MOD.dragSide = side;
        MOD.dragOffsetY = e.clientY - MOD.controls[side].y;
      });
    });

    MOD.pointerMoveHandler = (e) => {
      if (!MOD.dragSide) return;
      const { minY, maxY } = getPodBounds();
      MOD.controls[MOD.dragSide].y = clamp(e.clientY - MOD.dragOffsetY, minY, maxY);
      positionPods();
    };

    MOD.pointerUpHandler = () => {
      MOD.dragSide = null;
    };

    MOD.keydownHandler = (e) => {
      if (!MOD.mounted) return;
      const key = String(e.key || '');

      const aKeys = getLaneKeysForSide('a');
      const bKeys = getLaneKeysForSide('b');

      const laneA = aKeys.findIndex((k) => k.toLowerCase() === key.toLowerCase());
      if (laneA >= 0) {
        triggerLane('a', laneA);
        return;
      }

      const laneB = bKeys.findIndex((k) => k.toLowerCase() === key.toLowerCase());
      if (laneB >= 0) {
        triggerLane('b', laneB);
      }
    };

    MOD.keyupHandler = () => {};

    window.addEventListener('pointermove', MOD.pointerMoveHandler);
    window.addEventListener('pointerup', MOD.pointerUpHandler);
    window.addEventListener('pointercancel', MOD.pointerUpHandler);
    window.addEventListener('keydown', MOD.keydownHandler);
    window.addEventListener('keyup', MOD.keyupHandler);
  }

  function mount({ host, pair, onComplete }) {
    unmount();

    if (!host) return false;

    MOD.mounted = true;
    MOD.host = host;
    MOD.pair = pair || null;
    MOD.onComplete = typeof onComplete === 'function' ? onComplete : null;

    ensureStyles();

    host.style.position = 'absolute';
    host.style.inset = '0';
    host.style.width = '100%';
    host.style.height = '100%';

    MOD.root = document.createElement('div');
    MOD.root.className = 'ce-ch119-shell';

    const labelsA = getLaneLabelsForSide('a');
    const labelsB = getLaneLabelsForSide('b');

    MOD.root.innerHTML = `
      <canvas class="ce-ch119-canvas" width="${WIDTH}" height="${HEIGHT}"></canvas>

      <div class="ce-ch119-pod ce-ch119-pod--a" data-side="a">
        <div class="ce-ch119-handle"></div>
        <div class="ce-ch119-label">Player A</div>
        <div class="ce-ch119-row">
          <button class="ce-ch119-btn" data-btn="a-0">${labelsA[0]}</button>
          <button class="ce-ch119-btn" data-btn="a-1">${labelsA[1]}</button>
          <button class="ce-ch119-btn" data-btn="a-2">${labelsA[2]}</button>
          <button class="ce-ch119-btn" data-btn="a-3">${labelsA[3]}</button>
        </div>
      </div>

      <div class="ce-ch119-pod ce-ch119-pod--b" data-side="b">
        <div class="ce-ch119-handle"></div>
        <div class="ce-ch119-label">Player B</div>
        <div class="ce-ch119-row">
          <button class="ce-ch119-btn" data-btn="b-0">${labelsB[0]}</button>
          <button class="ce-ch119-btn" data-btn="b-1">${labelsB[1]}</button>
          <button class="ce-ch119-btn" data-btn="b-2">${labelsB[2]}</button>
          <button class="ce-ch119-btn" data-btn="b-3">${labelsB[3]}</button>
        </div>
      </div>
    `;

    MOD.canvas = qs('.ce-ch119-canvas', MOD.root);
    MOD.ctx = MOD.canvas?.getContext?.('2d') || null;

    host.appendChild(MOD.root);

    MOD.controls.a.y = 470;
    MOD.controls.b.y = 470;
    clearTouch();
    MOD.gamepadPrev.a = [false, false, false, false];
    MOD.gamepadPrev.b = [false, false, false, false];
     bindInputs();

    try { window.CE_INPUT?.start?.(); } catch {}


    MOD.roundNumber = 1;
    MOD.inSuddenDeath = false;
    MOD.scoreA = 0;
    MOD.scoreB = 0;
    startTurn('a');
    drawFrame();

    MOD.frameId = requestAnimationFrame(tick);
    return true;
  }

  function unmount() {
    if (MOD.frameId) cancelAnimationFrame(MOD.frameId);
    MOD.frameId = null;

    if (MOD.pointerMoveHandler) window.removeEventListener('pointermove', MOD.pointerMoveHandler);
    if (MOD.pointerUpHandler) window.removeEventListener('pointerup', MOD.pointerUpHandler);
    if (MOD.pointerUpHandler) window.removeEventListener('pointercancel', MOD.pointerUpHandler);
    if (MOD.keydownHandler) window.removeEventListener('keydown', MOD.keydownHandler);
    if (MOD.keyupHandler) window.removeEventListener('keyup', MOD.keyupHandler);

    MOD.pointerMoveHandler = null;
    MOD.pointerUpHandler = null;
    MOD.keydownHandler = null;
    MOD.keyupHandler = null;

    clearTouch();
    MOD.gamepadPrev.a = [false, false, false, false];
    MOD.gamepadPrev.b = [false, false, false, false];
    MOD.feedbackLane = -1;
    MOD.dragSide = null;
    MOD.dragOffsetY = 0;
    MOD.mounted = false;
    MOD.phase = 'idle';
    MOD.inSuddenDeath = false;
    MOD.host = null;
    MOD.canvas = null;
    MOD.ctx = null;
    MOD.currentChart = [];

    try { MOD.root?.remove(); } catch {}
    MOD.root = null;
  }

  MOD.mount = mount;
  MOD.unmount = unmount;

  window.__CE_CHALLENGE_DUEL_RHYTHMSTRIKE = MOD;
})();