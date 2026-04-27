/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC117-A1
   Module: challenge.duel.wizardduel.pc117.js
   Purpose: Phase 6 Challenge Duel Activity – Wizard Duel
   Notes:
     - Additive-only duel activity module.
     - Must not emit lesson:phaseChange.
     - Must not persist state directly.
     - Full-screen duel gameplay renderer.
     - Returns winner/loser via callback.
     - PC117 scope:
     -   * 3 second countdown
     -   * 120 second duel
     -   * keyboard-first controls
     -   * 2D wizard movement + spell casting
     -   * sudden death on tie
   ========================================================= */

(() => {
  const WIDTH = 1280;
  const HEIGHT = 720;
  const ROUND_MS = 120000;
  const COUNTDOWN_MS = 3000;

  const WIZ_W = 40;
  const WIZ_H = 96;
  const HALF = WIDTH / 2;
  const BUFFER = 34;

  const BASELINE_FPS = 31;
  const SPEED_TUNE = 1.16;
  const SPELL_TUNE = 1.22;
  const PARTICLE_TUNE = 1.18;
  const ACCEL = 1.4 * BASELINE_FPS * SPEED_TUNE;
  const FRICTION = 0.86;
  const MAX_VX = (4.2 * (WIDTH / 960)) * BASELINE_FPS * SPEED_TUNE;
  const MAX_VY = (5.0 * (HEIGHT / 474)) * BASELINE_FPS * SPEED_TUNE;
  const SPELL_SPEED = (9.2 * (WIDTH / 960)) * BASELINE_FPS * SPELL_TUNE;
  const RELOAD_MS = 320;
  const RICOCHET_MAX = 3;

  const MAX_PARTICLES = 420;

  const COLORS = {
    bg: '#0b1220',
    bg2: '#0a1222',
    fg: '#e2e8f0',
    muted: '#9aa6bf',
    accent: '#a78bfa',
    danger: '#ff595e',
    p1: '#34d399',
    p2: '#60a5fa',
    glow1: '#86efac',
    glow2: '#93c5fd',
    obelisk: '#7c3aed'
  };

  const FORKS = [
    {
      baseX: HALF - 22,
      baseY: HEIGHT * 0.30,
      w: 28,
      h: HEIGHT * 0.34,
      pts: [
        { x: 0, y: 0 }, { x: 6, y: 20 }, { x: 4, y: 60 }, { x: 10, y: 95 },
        { x: 2, y: 130 }, { x: 6, y: 155 }, { x: -2, y: 170 }, { x: -10, y: 130 },
        { x: -8, y: 95 }, { x: -10, y: 60 }, { x: -6, y: 34 }
      ]
    },
    {
      baseX: HALF + 22,
      baseY: HEIGHT * 0.34,
      w: 28,
      h: HEIGHT * 0.40,
      pts: [
        { x: 0, y: 0 }, { x: 8, y: 26 }, { x: 6, y: 60 }, { x: 10, y: 92 },
        { x: 4, y: 126 }, { x: 8, y: 150 }, { x: 0, y: 168 }, { x: -12, y: 138 },
        { x: -8, y: 100 }, { x: -10, y: 70 }, { x: -6, y: 38 }
      ]
    }
  ];

  const MOD = {
    mounted: false,
    root: null,
    host: null,
    frameId: null,
    pair: null,
    onComplete: null,

    phase: 'idle', // idle | countdown | live | suddenDeath | finished
    countdownUntil: 0,
    endsAt: 0,

    canvas: null,
    ctx: null,

    p1: null,
    p2: null,
    particles: [],
    keys: new Set(),
    gamepadMove: {
      aVX: 0,
      aVY: 0,
      bVX: 0,
      bVY: 0
    },
    gamepadPrev: {
      aConfirm: false,
      bConfirm: false
    },
    lastTickTs: 0,
    dt: 0,

    scoreA: 0,
    scoreB: 0,

    shake: 0,
    shakeDecay: 0.92,

    keydownHandler: null,
    keyupHandler: null
  };

  function now() {
    return performance.now();
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function ensureStyles() {
    if (document.getElementById('ce-ch117-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-ch117-styles';
    s.textContent = `
      .ce-ch117-shell{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        background:#0b1220;
        overflow:hidden;
        touch-action:none;
        user-select:none;
        -webkit-user-select:none;
      }

      .ce-ch117-canvas{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        display:block;
      }
    `;
    document.head.appendChild(s);
  }

  function createWizard(x, y) {
    return {
      x,
      y,
      vx: 0,
      vy: 0,
      wantVX: 0,
      wantVY: 0,
      lastCast: 0,
      spell: null,
      bob: 0,
      castGlow: 0,
      hitFlash: 0
    };
  }

  function resetState() {
    MOD.scoreA = 0;
    MOD.scoreB = 0;
    MOD.p1 = createWizard(80, HEIGHT / 2 - WIZ_H / 2);
    MOD.p2 = createWizard(WIDTH - 80 - WIZ_W, HEIGHT / 2 - WIZ_H / 2);
    MOD.particles = [];
    MOD.shake = 0;
    MOD.keys.clear();
    MOD.gamepadMove.aVX = 0;
    MOD.gamepadMove.aVY = 0;
    MOD.gamepadMove.bVX = 0;
    MOD.gamepadMove.bVY = 0;
  }

  function rr(ctx, x, y, w, h, r) {
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

  function hatPath(ctx, cx, cy, tall = 34, tilt = 0) {
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 1);
    ctx.quadraticCurveTo(cx, cy + 6, cx + 20, cy - 1);
    ctx.lineTo(cx + 8 + tilt, cy - tall * 0.24);
    ctx.quadraticCurveTo(cx + 3 + tilt, cy - tall * 0.84, cx + tilt, cy - tall);
    ctx.quadraticCurveTo(cx - 12 + tilt, cy - tall * 0.66, cx - 8 + tilt, cy - tall * 0.22);
    ctx.closePath();
  }

  function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 0.000001) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function addParticle(x, y, vx, vy, life, size, color, glow = false) {
    if (MOD.particles.length > MAX_PARTICLES) MOD.particles.shift();
    MOD.particles.push({ x, y, vx, vy, life, max: life, size, color, glow });
  }

  function circleRectOverlap(cx, cy, r, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) <= (r * r);
  }

  function updateControlTargets() {
    const keys = MOD.keys;

    const keyAVY =
      (keys.has('w') || keys.has('W') ? -MAX_VY : 0) +
      (keys.has('s') || keys.has('S') ? MAX_VY : 0);

    const keyAVX =
      (keys.has('a') || keys.has('A') ? -MAX_VX : 0) +
      (keys.has('d') || keys.has('D') ? MAX_VX : 0);

    const keyBVY =
      (keys.has('ArrowUp') ? -MAX_VY : 0) +
      (keys.has('ArrowDown') ? MAX_VY : 0);

    const keyBVX =
      (keys.has('ArrowLeft') ? -MAX_VX : 0) +
      (keys.has('ArrowRight') ? MAX_VX : 0);

    MOD.p1.wantVX = keyAVX + MOD.gamepadMove.aVX;
    MOD.p1.wantVY = keyAVY + MOD.gamepadMove.aVY;
    MOD.p2.wantVX = keyBVX + MOD.gamepadMove.bVX;
    MOD.p2.wantVY = keyBVY + MOD.gamepadMove.bVY;

  }

  function applyGamepadInput() {
    const input = window.CE_INPUT;
    if (!input?.getPlayerState) {
      MOD.gamepadMove.aVX = 0;
      MOD.gamepadMove.aVY = 0;
      MOD.gamepadMove.bVX = 0;
      MOD.gamepadMove.bVY = 0;
      updateControlTargets();
      return;
    }

    const padA = input.getPlayerState('a');
    const padB = input.getPlayerState('b');

    MOD.gamepadMove.aVY =
      (padA.up ? -MAX_VY : 0) +
      (padA.down ? MAX_VY : 0);

    MOD.gamepadMove.aVX =
      (padA.left ? -MAX_VX : 0) +
      (padA.right ? MAX_VX : 0);

    MOD.gamepadMove.bVY =
      (padB.up ? -MAX_VY : 0) +
      (padB.down ? MAX_VY : 0);

    MOD.gamepadMove.bVX =
      (padB.left ? -MAX_VX : 0) +
      (padB.right ? MAX_VX : 0);

    updateControlTargets();

    const aConfirm = !!padA.lane3; // R1
    const bConfirm = !!padB.lane3; // R1

    if ((MOD.phase === 'live' || MOD.phase === 'suddenDeath') && aConfirm && !MOD.gamepadPrev.aConfirm) {
      cast(MOD.p1, 1);
    }

    if ((MOD.phase === 'live' || MOD.phase === 'suddenDeath') && bConfirm && !MOD.gamepadPrev.bConfirm) {
      cast(MOD.p2, 2);
    }

    MOD.gamepadPrev.aConfirm = aConfirm;
    MOD.gamepadPrev.bConfirm = bConfirm;
  }

  function drawWizard(ctx, wiz, hue) {
    wiz.bob += 0.08 * BASELINE_FPS * MOD.dt;
    const bobY = Math.sin(wiz.bob) * 1.2;

    ctx.fillStyle = 'rgba(15,23,42,0.9)';
    rr(ctx, wiz.x, wiz.y + bobY, WIZ_W, WIZ_H, 12);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.18 + Math.max(0, wiz.castGlow) * 0.35;
    ctx.fillStyle = hue;
    rr(ctx, wiz.x - 3, wiz.y + bobY + 6, WIZ_W + 6, WIZ_H - 12, 14);
    ctx.fill();
    ctx.restore();

    const cx = wiz.x + WIZ_W / 2;
    const hy = wiz.y + bobY - 16;

    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.arc(cx, hy, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hue;
    hatPath(ctx, cx, hy - 2, 46, Math.sin(wiz.bob * 1.3) * 2);
    ctx.fill();

    if (wiz.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.6, wiz.hitFlash);
      ctx.fillStyle = '#ffffff';
      rr(ctx, wiz.x - 2, wiz.y + bobY - 2, WIZ_W + 4, WIZ_H + 4, 14);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#8b6b3a';
    ctx.fillRect(wiz.x + (wiz === MOD.p1 ? -8 : WIZ_W + 4), wiz.y + bobY + 12, 4, WIZ_H - 14);

    if (wiz.castGlow > 0) {
      const gx = wiz.x + (wiz === MOD.p1 ? -6 : WIZ_W + 6);
      const gy = wiz.y + bobY + 14;
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = hue;
      ctx.fillStyle = hue;
      ctx.beginPath();
      ctx.arc(gx, gy, 5 + wiz.castGlow * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawForkedCrystal(ctx, t) {
    const pulse = (Math.sin(t * 0.003) + 1) / 2;

    for (const shard of FORKS) {
      const scaleY = shard.h / 210;
      const scaleX = shard.w / 26;

      ctx.save();
      const sx = (Math.random() - 0.5) * MOD.shake * 0.8;
      const sy = (Math.random() - 0.5) * MOD.shake * 0.8;
      ctx.translate(sx, sy);

      ctx.beginPath();
      shard.pts.forEach((p, i) => {
        const X = shard.baseX + p.x * scaleX;
        const Y = shard.baseY + p.y * scaleY;
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      });
      ctx.closePath();

      const g = ctx.createLinearGradient(shard.baseX - 10, shard.baseY, shard.baseX + 10, shard.baseY + shard.h);
      g.addColorStop(0, COLORS.obelisk);
      g.addColorStop(1, '#5b21b6');
      ctx.fillStyle = g;
      ctx.fill();

      ctx.globalAlpha = 0.25 + 0.15 * pulse;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const y1 = shard.baseY + (shard.h * 0.2 + k * shard.h * 0.18);
        ctx.moveTo(shard.baseX - 6, y1);
        ctx.lineTo(shard.baseX + 6, y1 + 5);
      }
      ctx.stroke();

      ctx.restore();
    }
  }

  function drawParticles(ctx) {
    for (let i = MOD.particles.length - 1; i >= 0; i--) {
      const p = MOD.particles[i];
      p.x += p.vx * MOD.dt * BASELINE_FPS * PARTICLE_TUNE;
      p.y += p.vy * MOD.dt * BASELINE_FPS * PARTICLE_TUNE;
      p.life -= MOD.dt * BASELINE_FPS * PARTICLE_TUNE;

      const a = Math.max(0, p.life / p.max);

      if (p.glow) {
        ctx.save();
        ctx.shadowBlur = 12 * a * 2;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = 0.7 * a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = 0.6 * a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (p.life <= 0) MOD.particles.splice(i, 1);
    }
  }

  function drawSpell(ctx, s, glow) {
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = glow;
    ctx.fillStyle = '#f3f4f6';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    addParticle(
      s.x + (Math.random() - 0.5) * 4,
      s.y + (Math.random() - 0.5) * 4,
      -s.dx * 0.015 + (Math.random() - 0.5) * 0.35,
      -s.dy * 0.015 + (Math.random() - 0.5) * 0.35,
      18,
      3,
      glow,
      true
    );
  }

  function scorePoint(player, victim) {
    if (player === 1) MOD.scoreA += 1;
    else MOD.scoreB += 1;

    MOD.p1.spell = null;
    MOD.p2.spell = null;

    const hue = player === 1 ? COLORS.glow1 : COLORS.glow2;
    const vx = player === 1 ? +3.0 : -3.0;

    victim.vx += vx;
    victim.hitFlash = 0.8;
    MOD.shake = Math.min(5, MOD.shake + 3.5);

    const cx = victim.x + WIZ_W / 2;
    const cy = victim.y + WIZ_H / 2;

    for (let k = 0; k < 22; k++) {
      const ang = (Math.PI * 2) * (k / 22);
      const sp = 1.5 + Math.random() * 2.5;
      addParticle(cx, cy, Math.cos(ang) * sp, Math.sin(ang) * sp, 26 + Math.random() * 16, 3.5, hue, true);
    }

    for (let k = 0; k < 18; k++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 3.2;
      addParticle(cx, cy, Math.cos(ang) * sp, Math.sin(ang) * sp, 20 + Math.random() * 14, 3, '#ffffff', false);
    }
  }

  function updateWizard(wiz, isP1) {
    const blend = clamp(ACCEL * 0.1 * MOD.dt, 0, 1);
    wiz.vx = clamp(wiz.vx + (wiz.wantVX - wiz.vx) * blend, -MAX_VX, MAX_VX);
    wiz.vy = clamp(wiz.vy + (wiz.wantVY - wiz.vy) * blend, -MAX_VY, MAX_VY);

    const frictionPow = Math.pow(FRICTION, MOD.dt * BASELINE_FPS);
    if (wiz.wantVX === 0) wiz.vx *= frictionPow;
    if (wiz.wantVY === 0) wiz.vy *= frictionPow;

    wiz.x += wiz.vx * MOD.dt;
    wiz.y += wiz.vy * MOD.dt;

    if (isP1) wiz.x = clamp(wiz.x, 20, HALF - BUFFER - WIZ_W);
    else wiz.x = clamp(wiz.x, HALF + BUFFER, WIDTH - 20 - WIZ_W);

    wiz.y = clamp(wiz.y, 56, HEIGHT - WIZ_H - 18);

    wiz.castGlow = Math.max(0, wiz.castGlow - 0.05 * BASELINE_FPS * MOD.dt);
    wiz.hitFlash = Math.max(0, wiz.hitFlash - 0.06 * BASELINE_FPS * MOD.dt);
  }

  function stepSpell(s, owner) {
    if (!s) return null;

    s.x += s.dx * MOD.dt;
    s.y += s.dy * MOD.dt;

    if (s.y < 8) {
      s.y = 8;
      s.dy = Math.abs(s.dy);
      s.bounces++;
    }

    if (s.y > HEIGHT - 8) {
      s.y = HEIGHT - 8;
      s.dy = -Math.abs(s.dy);
      s.bounces++;
    }

    if (s.bounces > RICOCHET_MAX) return null;

    for (const shard of FORKS) {
      const scaleY = shard.h / 210;
      const scaleX = shard.w / 26;
      const poly = shard.pts.map((p) => ({
        x: shard.baseX + p.x * scaleX,
        y: shard.baseY + p.y * scaleY
      }));

      const hitCrystal =
        pointInPolygon(s.x, s.y, poly) ||
        pointInPolygon(s.x - 9, s.y, poly) ||
        pointInPolygon(s.x + 9, s.y, poly) ||
        pointInPolygon(s.x, s.y - 9, poly) ||
        pointInPolygon(s.x, s.y + 9, poly);

      if (hitCrystal) {
        const hue = owner === 1 ? COLORS.glow1 : COLORS.glow2;
        for (let k = 0; k < 12; k++) {
          addParticle(
            s.x,
            s.y,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            16 + Math.random() * 10,
            3,
            hue,
            true
          );
        }
        return null;
      }
    }

    if (owner === 1) {
      if (circleRectOverlap(s.x, s.y, 9, MOD.p2.x, MOD.p2.y, WIZ_W, WIZ_H)) {
        scorePoint(1, MOD.p2);
        return null;
      }
    } else {
      if (circleRectOverlap(s.x, s.y, 9, MOD.p1.x, MOD.p1.y, WIZ_W, WIZ_H)) {
        scorePoint(2, MOD.p1);
        return null;
      }
    }

    if (s.x < -20 || s.x > WIDTH + 20) return null;
    return s;
  }

  function cast(wiz, owner) {
    const t = now();
    if (wiz.spell) return;
    if (t - wiz.lastCast < RELOAD_MS) return;

    wiz.lastCast = t;

    let dx = owner === 1 ? +SPELL_SPEED : -SPELL_SPEED;
    let dy = 0;

    if (Math.abs(wiz.wantVY) > 0.1) {
      dy = (wiz.wantVY > 0 ? 1 : -1) * (SPELL_SPEED * 0.45);
      const m = Math.hypot(dx, dy);
      dx = dx * (SPELL_SPEED / m);
      dy = dy * (SPELL_SPEED / m);
    }

    const sx = owner === 1 ? wiz.x + WIZ_W + 8 : wiz.x - 8;
    const sy = wiz.y + WIZ_H / 2;

    wiz.spell = { x: sx, y: sy, dx, dy, bounces: 0 };
    wiz.castGlow = 1.0;

    const hue = owner === 1 ? COLORS.glow1 : COLORS.glow2;
    for (let k = 0; k < 9; k++) {
      addParticle(sx, sy, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, 16 + Math.random() * 8, 2.5, hue, true);
    }
  }

  function updateGame() {
    updateWizard(MOD.p1, true);
    updateWizard(MOD.p2, false);
    MOD.p1.spell = stepSpell(MOD.p1.spell, 1);
    MOD.p2.spell = stepSpell(MOD.p2.spell, 2);
    MOD.shake *= Math.pow(MOD.shakeDecay, MOD.dt * BASELINE_FPS);
  }

  function drawBackground(ctx) {
    const grd = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grd.addColorStop(0, COLORS.bg);
    grd.addColorStop(1, COLORS.bg2);

    const sx = (Math.random() - 0.5) * MOD.shake;
    const sy = (Math.random() - 0.5) * MOD.shake;

    ctx.save();
    ctx.translate(sx, sy);

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (MOD.phase === 'live') {
      const leftMs = Math.max(0, MOD.endsAt - now());
      const leftSec = Math.ceil(leftMs / 1000);
      if (leftSec <= 10 && leftSec % 2 === 0) {
        ctx.fillStyle = 'rgba(120,20,40,0.22)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }
    }

    ctx.strokeStyle = '#1f2b46';
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(HALF, 0);
    ctx.lineTo(HALF, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(226,232,240,0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, WIDTH - 16, HEIGHT - 16);

    ctx.restore();
  }

  function drawHud(ctx) {
    ctx.fillStyle = COLORS.fg;
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${MOD.pair?.a?.name || 'Player A'}: ${MOD.scoreA}`, 28, 44);

    ctx.textAlign = 'right';
    ctx.fillText(`${MOD.scoreB} :${MOD.pair?.b?.name || 'Player B'}`, WIDTH - 28, 44);

    ctx.textAlign = 'center';
    ctx.font = '700 26px system-ui, sans-serif';

    if (MOD.phase === 'live') {
      const leftMs = Math.max(0, MOD.endsAt - now());
      const total = Math.ceil(leftMs / 1000);
      const mins = Math.floor(total / 60);
      const secs = total % 60;
      ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, HALF, 42);

      if (total <= 5 && total > 0) {
        ctx.fillStyle = COLORS.danger;
        ctx.font = '900 110px system-ui, sans-serif';
        ctx.fillText(String(total), HALF, HEIGHT / 2 + 36);
      }
    } else if (MOD.phase === 'countdown') {
      ctx.fillText('2:00', HALF, 42);
    } else if (MOD.phase === 'suddenDeath') {
      ctx.fillText('SD', HALF, 42);
    } else {
      ctx.fillText('0:00', HALF, 42);
    }

    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'center';
    ctx.fillText('P1: W/S/A/D + F or Z   •   P2: Arrows + ; or Right Ctrl', HALF, HEIGHT - 18);
  }

  function drawOverlay(ctx) {
    if (MOD.phase === 'countdown') {
      const left = Math.max(0, Math.ceil((MOD.countdownUntil - now()) / 1000));

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = COLORS.accent;
      ctx.font = '900 150px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(left > 0 ? String(left) : 'GO', HALF, HEIGHT / 2);
      return;
    }

    if (MOD.phase === 'suddenDeath') {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = COLORS.accent;
      ctx.font = '900 72px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SUDDEN DEATH', HALF, 98);
    }
  }

  function drawFrame(t) {
    if (!MOD.ctx) return;
    const ctx = MOD.ctx;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    drawBackground(ctx);
    drawForkedCrystal(ctx, t);
    drawWizard(ctx, MOD.p1, COLORS.p1);
    drawWizard(ctx, MOD.p2, COLORS.p2);

    if (MOD.p1.spell) drawSpell(ctx, MOD.p1.spell, COLORS.glow1);
    if (MOD.p2.spell) drawSpell(ctx, MOD.p2.spell, COLORS.glow2);

    drawParticles(ctx);
    drawHud(ctx);
    drawOverlay(ctx);
  }

  function finishWithWinner(winner, loser) {
    MOD.phase = 'finished';

    if (typeof MOD.onComplete === 'function') {
      MOD.onComplete({
        winnerId: String(winner.id),
        winnerName: String(winner.name || winner.id),
        loserId: String(loser.id),
        loserName: String(loser.name || loser.id)
      });
    }
  }

  function finishRound() {
    if (MOD.scoreA > MOD.scoreB) {
      finishWithWinner(MOD.pair.a, MOD.pair.b);
    } else if (MOD.scoreB > MOD.scoreA) {
      finishWithWinner(MOD.pair.b, MOD.pair.a);
    } else {
      MOD.phase = 'suddenDeath';
    }
  }

  function tick(ts) {
    if (!MOD.mounted) return;

    if (!MOD.lastTickTs) MOD.lastTickTs = ts;
    let dt = (ts - MOD.lastTickTs) / 1000;
    MOD.lastTickTs = ts;
    if (dt > 0.05) dt = 0.05;
    MOD.dt = dt;

    applyGamepadInput();

    if (MOD.phase === 'countdown') {
      if (ts >= MOD.countdownUntil) {
        MOD.phase = 'live';
        MOD.endsAt = ts + ROUND_MS;
      }
    } else if (MOD.phase === 'live') {
      updateGame();
      if (ts >= MOD.endsAt) {
        finishRound();
      }
    } else if (MOD.phase === 'suddenDeath') {
      const beforeA = MOD.scoreA;
      const beforeB = MOD.scoreB;
      updateGame();
      if (MOD.scoreA !== beforeA || MOD.scoreB !== beforeB) {
        finishRound();
      }
    }

    drawFrame(ts);
    if (MOD.phase !== 'finished') {
      MOD.frameId = requestAnimationFrame(tick);
    }
  }

  function bindInputs() {
    MOD.keydownHandler = (e) => {
      if (!MOD.mounted) return;

      MOD.keys.add(e.key);
      updateControlTargets();

      const key = (e.key === 'Control' && e.location === 2) ? 'RightControl' : e.key;

      if (MOD.phase === 'live' || MOD.phase === 'suddenDeath') {
        if (key === 'f' || key === 'F' || key === 'z' || key === 'Z') {
          cast(MOD.p1, 1);
        }
        if (key === ';' || key === 'RightControl') {
          cast(MOD.p2, 2);
        }
      }
    };

    MOD.keyupHandler = (e) => {
      if (!MOD.mounted) return;
      MOD.keys.delete(e.key);
      updateControlTargets();
    };

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
    MOD.root.className = 'ce-ch117-shell';
    MOD.root.innerHTML = `<canvas class="ce-ch117-canvas" width="${WIDTH}" height="${HEIGHT}"></canvas>`;

    MOD.canvas = MOD.root.querySelector('canvas');
    MOD.ctx = MOD.canvas?.getContext?.('2d') || null;

    host.appendChild(MOD.root);

    resetState();
    MOD.gamepadPrev.aConfirm = false;
    MOD.gamepadPrev.bConfirm = false;
    MOD.lastTickTs = 0;
    MOD.dt = 0;
    bindInputs();
    try { window.CE_INPUT?.start?.(); } catch {}

    MOD.phase = 'countdown';
    MOD.countdownUntil = now() + COUNTDOWN_MS;
    MOD.matchEndsAt = MOD.countdownUntil + ROUND_MS;
    drawFrame(now());

    MOD.frameId = requestAnimationFrame(tick);
    return true;
  }

  function unmount() {
    if (MOD.frameId) cancelAnimationFrame(MOD.frameId);
    MOD.frameId = null;

    if (MOD.keydownHandler) window.removeEventListener('keydown', MOD.keydownHandler);
    if (MOD.keyupHandler) window.removeEventListener('keyup', MOD.keyupHandler);

    MOD.keydownHandler = null;
    MOD.keyupHandler = null;

    MOD.keys.clear();
    MOD.gamepadMove.aVX = 0;
    MOD.gamepadMove.aVY = 0;
    MOD.gamepadMove.bVX = 0;
    MOD.gamepadMove.bVY = 0;
    MOD.gamepadPrev.aConfirm = false;
    MOD.gamepadPrev.bConfirm = false;
    MOD.lastTickTs = 0;
    MOD.dt = 0;
    MOD.mounted = false;
    MOD.phase = 'idle';
    MOD.host = null;
    MOD.canvas = null;
    MOD.ctx = null;
    MOD.p1 = null;
    MOD.p2 = null;
    MOD.particles = [];

    try { MOD.root?.remove(); } catch {}
    MOD.root = null;
  }

  MOD.mount = mount;
  MOD.unmount = unmount;

  window.__CE_CHALLENGE_DUEL_WIZARDDUEL = MOD;
})();