/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC116-A2
   Module: challenge.duel.picklepong.pc116.js
   Purpose: Phase 6 Duel Activity – PicklePong
   Notes:
     - Additive-only duel module
     - No persistence
     - No phase changes
     - Hybrid input (touch + keyboard)
     - 2 minute match + sudden death
========================================================= */

(() => {
  const WIDTH = 1280;
  const HEIGHT = 720;
  const PADDLE_W = 18;
  const PADDLE_H = 110;
  const BALL_SIZE = 16;

  const PADDLE_MARGIN = 10;
  const BASELINE_FPS = 31;
  const BASE_PADDLE_SPEED = 11.2 * BASELINE_FPS;
  const ROUND_MS = 120000;
  const COUNTDOWN_MS = 3000;
  const RAMP_REBOUNDS = 12;
  const BASE_STEP_X = (6.4 * (WIDTH / 720)) * BASELINE_FPS;
  const BASE_STEP_Y = (6.4 * (HEIGHT / 420)) * BASELINE_FPS;
  const MAX_TOTAL_SCALE = 3.5;
  const SERVE_SETTLE_MS = 4500;

  const MOD = {
    mounted: false,
    root: null,
    host: null,
    frameId: null,
    pair: null,
    onComplete: null,
    lastTickTs: 0,

    phase: 'idle', // idle | countdown | live | suddenDeath | finished
    countdownUntil: 0,
    endsAt: 0,
    reboundCount: 0,
    serveStartedAt: 0,

    scoreA: 0,
    scoreB: 0,

    pA: { y: 0 },
    pB: { y: 0 },

    ball: { x: 0, y: 0, vx: 0, vy: 0 },

    input: {
      a: { up: false, down: false },
      b: { up: false, down: false }
    },
    gamepadInput: {
      a: { up: false, down: false },
      b: { up: false, down: false }
    },

    controls: {
      a: { y: 250 },
      b: { y: 250 }
    },

    dragSide: null,
    dragOffsetY: 0,

    canvas: null,
    ctx: null,
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

  function ensureStyles() {
    if (document.getElementById('ce-ch116-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-ch116-styles';
    s.textContent = `
      .ce-ch116 {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        background: #0b1220;
        color: #e2e8f0;
        display: flex;
        flex-direction: column;
        font-family: inherit;
        overflow: hidden;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
      }

      .ce-ch116-top {
        flex: 0 0 auto;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 12px;
        padding: 14px 20px;
        font-weight: 900;
        font-size: 22px;
        background: rgba(255,255,255,0.04);
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }

      .ce-ch116-top > :first-child {
        text-align: left;
      }

      .ce-ch116-top > :nth-child(2) {
        text-align: center;
      }

      .ce-ch116-top > :last-child {
        text-align: right;
      }

      .ce-ch116-canvas {
        flex: 1 1 auto;
        position: relative;
        overflow: hidden;
        min-height: 0;
      }

      .ce-ch116-side-label {
        position: absolute;
        top: 14px;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        opacity: 0.16;
        z-index: 2;
        pointer-events: none;
      }

      .ce-ch116-side-label--a { left: 16px; }
      .ce-ch116-side-label--b { right: 16px; }

      .ce-ch116-divider {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        width: 2px;
        transform: translateX(-50%);
        background: rgba(255,255,255,0.12);
        z-index: 2;
        pointer-events: none;
      }

      .ce-ch116-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 120px;
        font-weight: 900;
        z-index: 4;
        pointer-events: none;
        text-shadow: 0 8px 20px rgba(0,0,0,0.45);
      }

      .ce-ch116-overlay.is-hidden {
        display: none;
      }

      .ce-ch116-canvas-el {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
      }

      .ce-ch116-pod {
        position: absolute;
        width: 86px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 18px;
        z-index: 5;
        pointer-events: auto;
      }

      .ce-ch116-pod--a {
        left: 12px;
      }

      .ce-ch116-pod--b {
        right: 12px;
      }

      .ce-ch116-handle {
        width: 42px;
        height: 12px;
        border-radius: 999px;
        background: rgba(255,255,255,0.28);
        border: 1px solid rgba(255,255,255,0.16);
        cursor: grab;
        touch-action: none;
        margin-bottom: 8px;
      }

      .ce-ch116-btn {
        width: 86px;
        height: 86px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.08);
        color: #fff;
        font-size: 30px;
        font-weight: 900;
        cursor: pointer;
      }

      .ce-ch116-btn.is-active,
      .ce-ch116-btn:active {
        background: rgba(255,255,255,0.18);
      }
    `;
    document.head.appendChild(s);
  }

  function resetInputs() {
    MOD.input.a.up = false;
    MOD.input.a.down = false;
    MOD.input.b.up = false;
    MOD.input.b.down = false;
    MOD.gamepadInput.a.up = false;
    MOD.gamepadInput.a.down = false;
    MOD.gamepadInput.b.up = false;
    MOD.gamepadInput.b.down = false;
  }

  function timeSpeedScale() {
    const elapsed = Math.max(0, ROUND_MS - Math.max(0, MOD.endsAt - now()));
    const t = clamp(elapsed / ROUND_MS, 0, 1);
    const eased = t * t;
    return 1 + eased * 2.5;
  }

  function serveSpeedFactor() {
    const r = clamp(MOD.reboundCount, 0, RAMP_REBOUNDS);
    return 1 + 0.3 * (r / RAMP_REBOUNDS);
  }

  function totalSpeedScale() {
    const s = timeSpeedScale() * serveSpeedFactor();
    return Math.min(MAX_TOTAL_SCALE, s);
  }

  function serveSettleFactor() {
    const elapsed = Math.max(0, now() - MOD.serveStartedAt);
    const t = clamp(elapsed / SERVE_SETTLE_MS, 0, 1);

    // starts at 55% → ramps to 100% over 4.5s
    return 0.55 + (0.45 * t);
  }

  function serve(dir = 1) {
    MOD.ball.x = WIDTH / 2 - BALL_SIZE / 2;
    MOD.ball.y = HEIGHT / 2 - BALL_SIZE / 2;
    MOD.ball.vx = dir >= 0 ? BASE_STEP_X : -BASE_STEP_X;
    MOD.ball.vy = BASE_STEP_Y * ((Math.random() * 2 - 1) * 0.5);
    MOD.reboundCount = 0;
    MOD.serveStartedAt = now();
  }

  function getPodBounds() {
    const top = 84;
    const podHeight = 12 + 12 + 86 + 86;
    const bottom = HEIGHT - podHeight - 18;
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

    const podA = MOD.root.querySelector('.ce-ch116-pod--a');
    const podB = MOD.root.querySelector('.ce-ch116-pod--b');

    if (podA) podA.style.top = `${MOD.controls.a.y}px`;
    if (podB) podB.style.top = `${MOD.controls.b.y}px`;
  }

  function syncButtonVisuals() {
    if (!MOD.root) return;
    MOD.root.querySelector('[data-btn="a-up"]')?.classList.toggle('is-active', !!(MOD.input.a.up || MOD.gamepadInput.a.up));
    MOD.root.querySelector('[data-btn="a-down"]')?.classList.toggle('is-active', !!(MOD.input.a.down || MOD.gamepadInput.a.down));
    MOD.root.querySelector('[data-btn="b-up"]')?.classList.toggle('is-active', !!(MOD.input.b.up || MOD.gamepadInput.b.up));
    MOD.root.querySelector('[data-btn="b-down"]')?.classList.toggle('is-active', !!(MOD.input.b.down || MOD.gamepadInput.b.down));
  }

  function applyGamepadInput() {
    const input = window.CE_INPUT;
    if (!input?.getPlayerState) {
      MOD.gamepadInput.a.up = false;
      MOD.gamepadInput.a.down = false;
      MOD.gamepadInput.b.up = false;
      MOD.gamepadInput.b.down = false;
      return;
    }

    const padA = input.getPlayerState('a');
    const padB = input.getPlayerState('b');

    MOD.gamepadInput.a.up = !!padA.up;
    MOD.gamepadInput.a.down = !!padA.down;
    MOD.gamepadInput.b.up = !!padB.up;
    MOD.gamepadInput.b.down = !!padB.down;
  }

  function updateOverlay() {
    const overlay = MOD.root?.querySelector('.ce-ch116-overlay');
    if (!overlay) return;

    if (MOD.phase === 'countdown') {
      const left = Math.max(0, Math.ceil((MOD.countdownUntil - now()) / 1000));
      overlay.classList.remove('is-hidden');
      overlay.textContent = left > 0 ? String(left) : 'GO';
      return;
    }

    if (MOD.phase === 'suddenDeath') {
      overlay.classList.remove('is-hidden');
      overlay.textContent = 'SD';
      return;
    }

    overlay.classList.add('is-hidden');
    overlay.textContent = '';
  }

  function updateTopbar() {
    if (!MOD.root) return;

    const scoreAEl = MOD.root.querySelector('[data-ch116-score="a"]');
    const scoreBEl = MOD.root.querySelector('[data-ch116-score="b"]');
    const timerEl = MOD.root.querySelector('[data-ch116-timer]');

    if (scoreAEl) scoreAEl.textContent = String(MOD.scoreA);
    if (scoreBEl) scoreBEl.textContent = String(MOD.scoreB);

    if (timerEl) {
      if (MOD.phase === 'live') {
        const leftMs = Math.max(0, MOD.endsAt - now());
        const total = Math.ceil(leftMs / 1000);
        const mins = Math.floor(total / 60);
        const secs = total % 60;
        timerEl.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
      } else if (MOD.phase === 'countdown') {
        timerEl.textContent = '2:00';
      } else if (MOD.phase === 'suddenDeath') {
        timerEl.textContent = 'SD';
      } else {
        timerEl.textContent = '0:00';
      }
    }
  }

  function updatePaddles(dt) {
    const aUp = MOD.input.a.up || MOD.gamepadInput.a.up;
    const aDown = MOD.input.a.down || MOD.gamepadInput.a.down;
    const bUp = MOD.input.b.up || MOD.gamepadInput.b.up;
    const bDown = MOD.input.b.down || MOD.gamepadInput.b.down;

    if (aUp) MOD.pA.y -= BASE_PADDLE_SPEED * dt;
    if (aDown) MOD.pA.y += BASE_PADDLE_SPEED * dt;
    if (bUp) MOD.pB.y -= BASE_PADDLE_SPEED * dt;
    if (bDown) MOD.pB.y += BASE_PADDLE_SPEED * dt;

    MOD.pA.y = clamp(MOD.pA.y, 0, HEIGHT - PADDLE_H);
    MOD.pB.y = clamp(MOD.pB.y, 0, HEIGHT - PADDLE_H);
  }

  function updateBall(dt) {
    const speedScale = MOD.phase === 'suddenDeath'
      ? Math.min(MAX_TOTAL_SCALE, totalSpeedScale() * 1.08)
      : (totalSpeedScale() * serveSettleFactor());
    const ball = MOD.ball;

    ball.x += ball.vx * speedScale * dt;
    ball.y += ball.vy * speedScale * dt;

    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      MOD.reboundCount += 1;
    }

    if (ball.y >= HEIGHT - BALL_SIZE) {
      ball.y = HEIGHT - BALL_SIZE;
      ball.vy = -Math.abs(ball.vy);
      MOD.reboundCount += 1;
    }

    const leftPaddleX = PADDLE_MARGIN;
    const rightPaddleX = WIDTH - PADDLE_MARGIN - PADDLE_W;

    if (
      ball.vx < 0 &&
      ball.x <= leftPaddleX + PADDLE_W &&
      ball.x + BALL_SIZE >= leftPaddleX &&
      ball.y + BALL_SIZE >= MOD.pA.y &&
      ball.y <= MOD.pA.y + PADDLE_H
    ) {
      ball.x = leftPaddleX + PADDLE_W;
      ball.vx = Math.abs(ball.vx);

      const rel = clamp(
        ((ball.y + BALL_SIZE / 2) - (MOD.pA.y + PADDLE_H / 2)) / (PADDLE_H / 2),
        -1,
        1
      );
      ball.vy = Math.abs(rel) < 0.08 ? 0 : rel * (BASE_STEP_Y * 0.92);
      MOD.reboundCount += 1;
    }

    if (
      ball.vx > 0 &&
      ball.x + BALL_SIZE >= rightPaddleX &&
      ball.x <= rightPaddleX + PADDLE_W &&
      ball.y + BALL_SIZE >= MOD.pB.y &&
      ball.y <= MOD.pB.y + PADDLE_H
    ) {
      ball.x = rightPaddleX - BALL_SIZE;
      ball.vx = -Math.abs(ball.vx);

      const rel = clamp(
        ((ball.y + BALL_SIZE / 2) - (MOD.pB.y + PADDLE_H / 2)) / (PADDLE_H / 2),
        -1,
        1
      );
      ball.vy = Math.abs(rel) < 0.08 ? 0 : rel * (BASE_STEP_Y * 0.92);
      MOD.reboundCount += 1;
    }

    if (ball.x < -BALL_SIZE) {
      MOD.scoreB += 1;
      serve(1);
    }

    if (ball.x > WIDTH + BALL_SIZE) {
      MOD.scoreA += 1;
      serve(-1);
    }
  }

  function draw() {
    if (!MOD.ctx) return;

    const ctx = MOD.ctx;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = '#2e3b55';
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#98c1ff';
    ctx.fillRect(PADDLE_MARGIN, MOD.pA.y, PADDLE_W, PADDLE_H);
    ctx.fillRect(WIDTH - PADDLE_MARGIN - PADDLE_W, MOD.pB.y, PADDLE_W, PADDLE_H);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(MOD.ball.x, MOD.ball.y, BALL_SIZE, BALL_SIZE);
  }

  function finish() {
    MOD.phase = 'finished';

    const winner = MOD.scoreA > MOD.scoreB ? MOD.pair.a : MOD.pair.b;
    const loser = MOD.scoreA > MOD.scoreB ? MOD.pair.b : MOD.pair.a;

    MOD.onComplete({
      winnerId: winner.id,
      winnerName: winner.name,
      loserId: loser.id,
      loserName: loser.name
    });
  }

  function render() {
    draw();
    updateTopbar();
    updateOverlay();
    positionPods();
    syncButtonVisuals();
  }

  function tick(ts) {
    if (!MOD.mounted) return;

    if (!MOD.lastTickTs) MOD.lastTickTs = ts;
    let dt = (ts - MOD.lastTickTs) / 1000;
    MOD.lastTickTs = ts;
    if (dt > 0.05) dt = 0.05;

    applyGamepadInput();    

    if (MOD.phase === 'countdown') {
      if (ts >= MOD.countdownUntil) {
        MOD.phase = 'live';
        MOD.endsAt = ts + ROUND_MS;
      }
    } else if (MOD.phase === 'live') {
      updatePaddles(dt);
      updateBall(dt);

      if (ts >= MOD.endsAt) {
        if (MOD.scoreA === MOD.scoreB) {
          MOD.phase = 'suddenDeath';
        } else {
          finish();
          return;
        }
      }
    } else if (MOD.phase === 'suddenDeath') {
      updatePaddles(dt);
      updateBall(dt);

      if (MOD.scoreA !== MOD.scoreB) {
        finish();
        return;
      }
    }

    render();
    MOD.frameId = requestAnimationFrame(tick);
  }

  function bindInputs(root) {
    root.querySelectorAll('[data-btn]').forEach((btn) => {
      const spec = String(btn.getAttribute('data-btn') || '');
      const [side, dir] = spec.split('-');
      if (!side || !dir) return;

      const press = (e) => {
        e.preventDefault();
        MOD.input[side][dir] = true;
        syncButtonVisuals();
      };

      const release = (e) => {
        e?.preventDefault?.();
        MOD.input[side][dir] = false;
        syncButtonVisuals();
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    });

    root.querySelectorAll('.ce-ch116-handle').forEach((handle) => {
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();


        const pod = handle.closest('.ce-ch116-pod');
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

    window.addEventListener('pointermove', MOD.pointerMoveHandler);
    window.addEventListener('pointerup', MOD.pointerUpHandler);
    window.addEventListener('pointercancel', MOD.pointerUpHandler);

    MOD.keydownHandler = (e) => {
      if (e.key === 'w' || e.key === 'W') MOD.input.a.up = true;
      if (e.key === 's' || e.key === 'S') MOD.input.a.down = true;
      if (e.key === 'ArrowUp') MOD.input.b.up = true;
      if (e.key === 'ArrowDown') MOD.input.b.down = true;
      syncButtonVisuals();
    };

    MOD.keyupHandler = (e) => {
      if (e.key === 'w' || e.key === 'W') MOD.input.a.up = false;
      if (e.key === 's' || e.key === 'S') MOD.input.a.down = false;
      if (e.key === 'ArrowUp') MOD.input.b.up = false;
      if (e.key === 'ArrowDown') MOD.input.b.down = false;
      syncButtonVisuals();
    };

    window.addEventListener('keydown', MOD.keydownHandler);
    window.addEventListener('keyup', MOD.keyupHandler);
  }

  function mount({ host, pair, onComplete }) {
    unmount();

    if (!host) return false;

    MOD.mounted = true;
    MOD.host = host;
    MOD.pair = pair;
    MOD.onComplete = onComplete;

    ensureStyles();

    host.style.position = 'absolute';
    host.style.inset = '0';
    host.style.width = '100%';
    host.style.height = '100%';

    MOD.root = document.createElement('div');
    MOD.root.className = 'ce-ch116';

    MOD.root.innerHTML = `
      <div class="ce-ch116-top">
        <div>${pair?.a?.name || 'Player A'} — <span data-ch116-score="a">0</span></div>
        <div>PicklePong • <span data-ch116-timer>2:00</span></div>
        <div><span data-ch116-score="b">0</span> — ${pair?.b?.name || 'Player B'}</div>
      </div>
      <div class="ce-ch116-canvas">
        <canvas class="ce-ch116-canvas-el" width="${WIDTH}" height="${HEIGHT}"></canvas>
        <div class="ce-ch116-side-label ce-ch116-side-label--a">Player A</div>
        <div class="ce-ch116-side-label ce-ch116-side-label--b">Player B</div>
        <div class="ce-ch116-divider"></div>
        
        <div class="ce-ch116-pod ce-ch116-pod--a" data-side="a">
          <div class="ce-ch116-handle"></div>
          <button class="ce-ch116-btn" data-btn="a-up">▲</button>
          <button class="ce-ch116-btn" data-btn="a-down">▼</button>
        </div>

        <div class="ce-ch116-pod ce-ch116-pod--b" data-side="b">
          <div class="ce-ch116-handle"></div>
          <button class="ce-ch116-btn" data-btn="b-up">▲</button>
          <button class="ce-ch116-btn" data-btn="b-down">▼</button>
        </div>
        <div class="ce-ch116-overlay"></div>
      </div>
    `;

    MOD.canvas = MOD.root.querySelector('canvas');
    MOD.ctx = MOD.canvas ? MOD.canvas.getContext('2d') : null;

    bindInputs(MOD.root);

    MOD.pA.y = (HEIGHT - PADDLE_H) / 2;
    MOD.pB.y = (HEIGHT - PADDLE_H) / 2;
    MOD.controls.a.y = 250;
    MOD.controls.b.y = 250;
    MOD.scoreA = 0;
    MOD.scoreB = 0;
    MOD.lastTickTs = 0;
    resetInputs();
    try { window.CE_INPUT?.start?.(); } catch {}
    serve(Math.random() < 0.5 ? -1 : 1);

    host.appendChild(MOD.root);

    MOD.phase = 'countdown';
    MOD.countdownUntil = now() + COUNTDOWN_MS;

    render();
    MOD.frameId = requestAnimationFrame(tick);
    return true;
  }

  function unmount() {
    if (MOD.frameId) cancelAnimationFrame(MOD.frameId);
    MOD.frameId = null;

    if (MOD.keydownHandler) window.removeEventListener('keydown', MOD.keydownHandler);
    if (MOD.keyupHandler) window.removeEventListener('keyup', MOD.keyupHandler);
    if (MOD.pointerMoveHandler) window.removeEventListener('pointermove', MOD.pointerMoveHandler);
    if (MOD.pointerUpHandler) window.removeEventListener('pointerup', MOD.pointerUpHandler);
    if (MOD.pointerUpHandler) window.removeEventListener('pointercancel', MOD.pointerUpHandler);
    MOD.keydownHandler = null;
    MOD.keyupHandler = null;
    MOD.pointerMoveHandler = null;
    MOD.pointerUpHandler = null;
    MOD.dragSide = null;
    MOD.dragOffsetY = 0;

    resetInputs();
    syncButtonVisuals();

    MOD.mounted = false;
    MOD.host = null;
    MOD.lastTickTs = 0;
    MOD.canvas = null;
    MOD.ctx = null;

    try { MOD.root?.remove(); } catch {}
    MOD.root = null;
  }

  MOD.mount = mount;
  MOD.unmount = unmount;

  window.__CE_CHALLENGE_DUEL_PICKLEPONG = MOD;
})();