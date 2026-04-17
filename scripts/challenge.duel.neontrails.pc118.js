/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC118-A1
   Module: challenge.duel.tron.pc118.js
   Purpose: Phase 6 Duel Activity – Neon Trails
   Notes:
     - Additive-only duel activity module.
     - Must not emit lesson:phaseChange.
     - Must not persist state directly.
     - Full-screen duel gameplay renderer.
     - Returns winner/loser via callback.
     - PC118 scope:
     -   * best-of-5 rounds
     -   * first to 3 round wins
     -   * hard 2 minute duel cap
     -   * smooth turning, constant forward motion
     -   * wall or trail collision loses round
   ========================================================= */

(() => {
  const WIDTH = 1280;
  const HEIGHT = 720;

  const MATCH_MS = 120000;
  const COUNTDOWN_MS = 2200;
  const ROUND_RESET_MS = 1600;

  const BIKE_RADIUS = 8;
  const TRAIL_WIDTH = 8;
  const START_SPEED = 3.2;
  const TURN_RATE = 0.055;
  const ROUND_SPEED_STEP = 0.18;
  const MAX_SPEED = 4.4;
  const INROUND_RAMP_MS = 30000; // 45s to reach 2x

  const GRID_GAP = 40;

  const COLORS = {
    bg: '#0b1220',
    bg2: '#09111d',
    fg: '#e2e8f0',
    muted: '#94a3b8',
    accent: '#a78bfa',
    p1: '#34d399',
    p2: '#60a5fa',
    trail1: '#86efac',
    trail2: '#93c5fd',
    danger: '#ff595e'
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

    phase: 'idle', // idle | countdown | live | roundOver | finished
    matchEndsAt: 0,
    phaseEndsAt: 0,
    roundStartedAt: 0,
    roundNumber: 0,

    roundWinsA: 0,
    roundWinsB: 0,

    playerA: null,
    playerB: null,

    keys: new Set(),
    touch: {
      aLeft: false,
      aRight: false,
      bLeft: false,
      bRight: false
    },
    controls: {
      a: { y: 250 },
      b: { y: 250 }
    },
    dragSide: null,
    dragOffsetY: 0,
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

  function getPodBounds() {
    const top = 110;
    const podHeight = 12 + 16 + 20 + 86;
    const bottom = HEIGHT - podHeight - 24;
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

    const podA = MOD.root.querySelector('.ce-ch118-pod--a');
    const podB = MOD.root.querySelector('.ce-ch118-pod--b');

    if (podA) podA.style.top = `${MOD.controls.a.y}px`;
    if (podB) podB.style.top = `${MOD.controls.b.y}px`;
  }

  function syncButtonVisuals() {
    if (!MOD.root) return;
    MOD.root.querySelector('[data-btn="a-left"]')?.classList.toggle('is-active', !!MOD.touch.aLeft);
    MOD.root.querySelector('[data-btn="a-right"]')?.classList.toggle('is-active', !!MOD.touch.aRight);
    MOD.root.querySelector('[data-btn="b-left"]')?.classList.toggle('is-active', !!MOD.touch.bLeft);
    MOD.root.querySelector('[data-btn="b-right"]')?.classList.toggle('is-active', !!MOD.touch.bRight);
  }

  function resetTouchControls() {
    MOD.touch.aLeft = MOD.touch.aRight = MOD.touch.bLeft = MOD.touch.bRight = false;
  }

  function applyGamepadInput() {
    const input = window.CE_INPUT;
    if (!input?.getPlayerState) return;

    const padA = input.getPlayerState('a');
    const padB = input.getPlayerState('b');

    MOD.touch.aLeft = !!padA.left;
    MOD.touch.aRight = !!padA.right;
    MOD.touch.bLeft = !!padB.left;
    MOD.touch.bRight = !!padB.right;
  }

  function ensureStyles() {
    if (document.getElementById('ce-ch118-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-ch118-styles';
    s.textContent = `
      .ce-ch118-shell{
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

      .ce-ch118-canvas{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        display:block;
      }

      .ce-ch118-pod{
        position:absolute;
        width:186px;
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:16px;
        z-index:5;
        pointer-events:auto;
      }

      .ce-ch118-pod--a{
        left:12px;
      }

      .ce-ch118-pod--b{
        right:12px;
      }

      .ce-ch118-handle{
        width:42px;
        height:12px;
        border-radius:999px;
        background:rgba(255,255,255,0.28);
        border:1px solid rgba(255,255,255,0.16);
        cursor:grab;
        touch-action:none;
      }

      .ce-ch118-row{
        display:flex;
        align-items:center;
        justify-content:center;
        gap:14px;
      }

      .ce-ch118-btn{
        width:86px;
        height:86px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.08);
        color:#fff;
        font-size:30px;
        font-weight:900;
        cursor:pointer;
        touch-action:none;
      }

      .ce-ch118-btn.is-active,
      .ce-ch118-btn:active{
        background:rgba(255,255,255,0.18);
      }

      .ce-ch118-label{
        font:600 12px system-ui, sans-serif;
        color:${COLORS.muted};
        text-transform:uppercase;
        letter-spacing:0.06em;
        text-align:center;
      }
    `;
    document.head.appendChild(s);
  }

  function createPlayer(side) {
    const isA = side === 'a';
    const startX = isA ? WIDTH * 0.28 : WIDTH * 0.72;
    const startY = HEIGHT * 0.5;
    const angle = isA ? 0 : Math.PI;

    return {
      side,
      x: startX,
      y: startY,
      angle,
      alive: true,
      speed: clamp(START_SPEED + (MOD.roundNumber - 1) * ROUND_SPEED_STEP, START_SPEED, MAX_SPEED),
      trail: [{ x: startX, y: startY }]
    };
  }

  function resetRoundState() {
    MOD.playerA = createPlayer('a');
    MOD.playerB = createPlayer('b');
  }

  function startMatch() {
    MOD.roundWinsA = 0;
    MOD.roundWinsB = 0;
    MOD.roundNumber = 1;
    MOD.matchEndsAt = now() + MATCH_MS;
    resetRoundState();
    MOD.phase = 'countdown';
    MOD.phaseEndsAt = now() + COUNTDOWN_MS;
  }

  function startNextRound() {
    MOD.roundNumber += 1;
    resetRoundState();
    MOD.phase = 'countdown';
    MOD.phaseEndsAt = now() + COUNTDOWN_MS;
  }

  function segmentsFromTrail(trail) {
    const segs = [];
    for (let i = 1; i < trail.length; i++) {
      segs.push({
        x1: trail[i - 1].x,
        y1: trail[i - 1].y,
        x2: trail[i].x,
        y2: trail[i].y
      });
    }
    return segs;
  }

  function pointSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);

    const t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
    const sx = x1 + t * dx;
    const sy = y1 + t * dy;
    return Math.hypot(px - sx, py - sy);
  }

  function hitsTrail(player, ownSkipCount = 10) {
    const px = player.x;
    const py = player.y;
    const hitRadius = BIKE_RADIUS + TRAIL_WIDTH * 0.5 - 1;

    const ownSegs = segmentsFromTrail(player.trail);
    for (let i = 0; i < Math.max(0, ownSegs.length - ownSkipCount); i++) {
      const s = ownSegs[i];
      if (pointSegmentDistance(px, py, s.x1, s.y1, s.x2, s.y2) <= hitRadius) {
        return true;
      }
    }

    const other = player.side === 'a' ? MOD.playerB : MOD.playerA;
    if (!other) return false;

    const otherSegs = segmentsFromTrail(other.trail);
    for (const s of otherSegs) {
      if (pointSegmentDistance(px, py, s.x1, s.y1, s.x2, s.y2) <= hitRadius) {
        return true;
      }
    }

    return false;
  }

  function updateControls() {
    if (MOD.keys.has('a') || MOD.keys.has('A') || MOD.touch.aLeft) MOD.playerA.angle -= TURN_RATE;
    if (MOD.keys.has('d') || MOD.keys.has('D') || MOD.touch.aRight) MOD.playerA.angle += TURN_RATE;

    if (MOD.keys.has('ArrowLeft') || MOD.touch.bLeft) MOD.playerB.angle -= TURN_RATE;
    if (MOD.keys.has('ArrowRight') || MOD.touch.bRight) MOD.playerB.angle += TURN_RATE;
  }

  function movePlayer(player) {
    const elapsed = Math.max(0, now() - MOD.roundStartedAt);
    const t = clamp(elapsed / INROUND_RAMP_MS, 0, 1);

    const speed = player.speed * (1 + t); // 1x → 2x

    player.x += Math.cos(player.angle) * speed;
    player.y += Math.sin(player.angle) * speed;
    player.trail.push({ x: player.x, y: player.y });
  }

  function checkWallCrash(player) {
    return (
      player.x <= 10 ||
      player.x >= WIDTH - 10 ||
      player.y <= 10 ||
      player.y >= HEIGHT - 10
    );
  }

  function endRound(winnerSide) {
    if (winnerSide === 'a') MOD.roundWinsA += 1;
    if (winnerSide === 'b') MOD.roundWinsB += 1;

    if (MOD.roundWinsA >= 3) {
      return finishMatch('a');
    }
    if (MOD.roundWinsB >= 3) {
      return finishMatch('b');
    }

    MOD.phase = 'roundOver';
    MOD.phaseEndsAt = now() + ROUND_RESET_MS;
  }

  function finishMatch(winnerSide) {
    MOD.phase = 'finished';

    const winner = winnerSide === 'a' ? MOD.pair.a : MOD.pair.b;
    const loser = winnerSide === 'a' ? MOD.pair.b : MOD.pair.a;

    MOD.onComplete?.({
      winnerId: String(winner.id),
      winnerName: String(winner.name || winner.id),
      loserId: String(loser.id),
      loserName: String(loser.name || loser.id)
    });
  }

  function decideByRoundsOrPosition() {
    if (MOD.roundWinsA > MOD.roundWinsB) return finishMatch('a');
    if (MOD.roundWinsB > MOD.roundWinsA) return finishMatch('b');

    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const da = Math.hypot(MOD.playerA.x - cx, MOD.playerA.y - cy);
    const db = Math.hypot(MOD.playerB.x - cx, MOD.playerB.y - cy);

    if (da <= db) return finishMatch('a');
    return finishMatch('b');
  }

  function updateLive() {
    updateControls();

    movePlayer(MOD.playerA);
    movePlayer(MOD.playerB);

    const aWall = checkWallCrash(MOD.playerA);
    const bWall = checkWallCrash(MOD.playerB);

    const aTrail = hitsTrail(MOD.playerA);
    const bTrail = hitsTrail(MOD.playerB);

    const aCrash = aWall || aTrail;
    const bCrash = bWall || bTrail;

    if (aCrash && bCrash) {
      MOD.phase = 'roundOver';
      MOD.phaseEndsAt = now() + ROUND_RESET_MS;
      return;
    }

    if (aCrash) return endRound('b');
    if (bCrash) return endRound('a');
  }

  function drawGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;

    for (let x = GRID_GAP; x < WIDTH; x += GRID_GAP) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }

    for (let y = GRID_GAP; y < HEIGHT; y += GRID_GAP) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawTrail(ctx, player, color) {
    if (!player?.trail?.length) return;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = TRAIL_WIDTH;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(player.trail[0].x, player.trail[0].y);
    for (let i = 1; i < player.trail.length; i++) {
      ctx.lineTo(player.trail[i].x, player.trail[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawBike(ctx, player, color) {
    if (!player) return;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;

    ctx.fillRect(-10, -6, 20, 12);
    ctx.fillRect(4, -4, 10, 8);

    ctx.restore();
  }

  function drawHud(ctx) {
    ctx.fillStyle = COLORS.fg;
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${MOD.pair?.a?.name || 'Player A'}: ${MOD.roundWinsA}`, 28, 44);

    ctx.textAlign = 'right';
    ctx.fillText(`${MOD.roundWinsB} :${MOD.pair?.b?.name || 'Player B'}`, WIDTH - 28, 44);

    ctx.textAlign = 'center';
    ctx.font = '700 24px system-ui, sans-serif';

    if (MOD.phase === 'live' || MOD.phase === 'roundOver') {
      const leftMs = Math.max(0, MOD.matchEndsAt - now());
      const total = Math.ceil(leftMs / 1000);
      const mins = Math.floor(total / 60);
      const secs = total % 60;
      ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, WIDTH / 2, 42);
    } else if (MOD.phase === 'countdown') {
      ctx.fillText('2:00', WIDTH / 2, 42);
    }

    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`Round ${MOD.roundNumber} • First to 3`, WIDTH / 2, 72);

    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText('P1: A / D   •   P2: ← / →', WIDTH / 2, HEIGHT - 18);
  }

  function drawOverlay(ctx) {
    if (MOD.phase === 'countdown') {
      const left = Math.max(0, Math.ceil((MOD.phaseEndsAt - now()) / 1000));

      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = COLORS.accent;
      ctx.font = '900 150px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(left > 0 ? String(left) : 'GO', WIDTH / 2, HEIGHT / 2);
      return;
    }

    if (MOD.phase === 'roundOver') {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = COLORS.fg;
      ctx.font = '900 64px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NEXT ROUND', WIDTH / 2, HEIGHT / 2);
    }
  }

  function drawFrame() {
    if (!MOD.ctx) return;
    const ctx = MOD.ctx;

    const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    bg.addColorStop(0, COLORS.bg);
    bg.addColorStop(1, COLORS.bg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    drawGrid(ctx);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, WIDTH - 16, HEIGHT - 16);

    drawTrail(ctx, MOD.playerA, COLORS.trail1);
    drawTrail(ctx, MOD.playerB, COLORS.trail2);

    drawBike(ctx, MOD.playerA, COLORS.p1);
    drawBike(ctx, MOD.playerB, COLORS.p2);

    positionPods();
    syncButtonVisuals();
    drawHud(ctx);
    drawOverlay(ctx);
  }

  function tick(ts) {
    if (!MOD.mounted) return;
    
    applyGamepadInput();

    if (ts >= MOD.matchEndsAt && MOD.phase !== 'finished') {
      decideByRoundsOrPosition();
      return;
    }

    if (MOD.phase === 'countdown') {
      if (ts >= MOD.phaseEndsAt) {
        MOD.phase = 'live';
        MOD.roundStartedAt = ts;
      }
    } else if (MOD.phase === 'live') {
      updateLive();
    } else if (MOD.phase === 'roundOver') {
      if (ts >= MOD.phaseEndsAt) {
        startNextRound();
      }
    }

    drawFrame();

    if (MOD.phase !== 'finished') {
      MOD.frameId = requestAnimationFrame(tick);
    }
  }

  function bindInputs() {
    MOD.root.querySelectorAll('[data-btn]').forEach((btn) => {
      const spec = String(btn.getAttribute('data-btn') || '');

      const press = (e) => {
        e.preventDefault();
        if (spec === 'a-left') MOD.touch.aLeft = true;
        if (spec === 'a-right') MOD.touch.aRight = true;
        if (spec === 'b-left') MOD.touch.bLeft = true;
        if (spec === 'b-right') MOD.touch.bRight = true;
        syncButtonVisuals();
      };

      const release = (e) => {
        e?.preventDefault?.();
        if (spec === 'a-left') MOD.touch.aLeft = false;
        if (spec === 'a-right') MOD.touch.aRight = false;
        if (spec === 'b-left') MOD.touch.bLeft = false;
        if (spec === 'b-right') MOD.touch.bRight = false;
        syncButtonVisuals();
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    });

    MOD.root.querySelectorAll('.ce-ch118-handle').forEach((handle) => {
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const pod = handle.closest('.ce-ch118-pod');
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
      MOD.keys.add(e.key);
    };

    MOD.keyupHandler = (e) => {
      if (!MOD.mounted) return;
      MOD.keys.delete(e.key);
    };

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
    MOD.root.className = 'ce-ch118-shell';
    MOD.root.innerHTML = `
      <canvas class="ce-ch118-canvas" width="${WIDTH}" height="${HEIGHT}"></canvas>

      <div class="ce-ch118-pod ce-ch118-pod--a" data-side="a">
        <div class="ce-ch118-handle"></div>
        <div class="ce-ch118-label">Player A</div>
        <div class="ce-ch118-row">
          <button class="ce-ch118-btn" data-btn="a-left">⟲</button>
          <button class="ce-ch118-btn" data-btn="a-right">⟳</button>
        </div>
      </div>

      <div class="ce-ch118-pod ce-ch118-pod--b" data-side="b">
        <div class="ce-ch118-handle"></div>
        <div class="ce-ch118-label">Player B</div>
        <div class="ce-ch118-row">
          <button class="ce-ch118-btn" data-btn="b-left">⟲</button>
          <button class="ce-ch118-btn" data-btn="b-right">⟳</button>
        </div>
      </div>`;

    MOD.canvas = MOD.root.querySelector('canvas');
    MOD.ctx = MOD.canvas?.getContext?.('2d') || null;

    host.appendChild(MOD.root);

    bindInputs();
    try { window.CE_INPUT?.start?.(); } catch {}
    MOD.controls.a.y = 250;
    MOD.controls.b.y = 250;
    startMatch();
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

    MOD.keys.clear();
    resetTouchControls();
    syncButtonVisuals();
    MOD.dragSide = null;
    MOD.dragOffsetY = 0;
    MOD.mounted = false;
    MOD.phase = 'idle';
    MOD.host = null;
    MOD.canvas = null;
    MOD.ctx = null;
    MOD.playerA = null;
    MOD.playerB = null;

    try { MOD.root?.remove(); } catch {}
    MOD.root = null;
  }

  MOD.mount = mount;
  MOD.unmount = unmount;

 window.__CE_CHALLENGE_DUEL_NEONTRAILS = MOD;
})();