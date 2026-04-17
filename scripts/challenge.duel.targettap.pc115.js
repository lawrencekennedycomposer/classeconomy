/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC115-A1
   Module: challenge.duel.targettap.pc115.js
   Purpose: Phase 6 Challenge Duel Activity – Target Tap
   Notes:
     - Additive-only duel activity module.
     - Must not emit lesson:phaseChange.
     - Must not persist state directly.
     - Full-screen duel gameplay renderer.
     - Returns winner/loser via callback.
     - PC115 scope:
     -   * 3 second countdown
     -   * 120 second duel
     -   * left side = Player A, right side = Player B
     -   * animated targets
     -   * score by target hits
     -   * sudden death on tie
   ========================================================= */

(() => {
  const MOD = {
    mounted: false,
    root: null,
    host: null,
    frameId: null,
    lastCountdownDisplay: null,
    countdownUntil: 0,
    endsAt: 0,
    phase: 'idle', // idle | countdown | live | suddenDeath | finished
    pair: null,
    onComplete: null,
    scoreA: 0,
    scoreB: 0,
    targetA: null,
    targetB: null,
    suddenTarget: null,
    nextRelocateA: 0,
    nextRelocateB: 0,
    suddenRelocateAt: 0,
  };

  function ensureStyles() {
    if (document.getElementById('ce-challenge115-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-challenge115-styles';
    s.textContent = `
      .ce-ch115-shell{
        position:absolute;
        z-index:4;
        inset:0;
        background:linear-gradient(180deg, rgba(7,10,14,0.96), rgba(14,18,24,0.98));
        color:#e8eef2;
        display:grid;
        grid-template-rows:auto 1fr;
        border-radius:18px;
        overflow:hidden;
      }

      .ce-ch115-topbar{
        display:grid;
        grid-template-columns:1fr auto 1fr;
        align-items:center;
        gap:16px;
        padding:18px 22px;
        background:rgba(255,255,255,0.04);
        border-bottom:1px solid rgba(255,255,255,0.08);
      }

      .ce-ch115-side{
        display:flex;
        flex-direction:column;
        gap:4px;
      }

      .ce-ch115-side--right{
        align-items:flex-end;
        text-align:right;
      }

      .ce-ch115-name{
        font-size:20px;
        font-weight:900;
        line-height:1.2;
      }

      .ce-ch115-score{
        font-size:40px;
        font-weight:900;
        line-height:1;
        transition:transform 120ms ease;
       }

      .ce-ch115-score.flash{
        transform:scale(1.12);
      }


      .ce-ch115-center{
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:6px;
        min-width:180px;
      }

      .ce-ch115-title{
        font-size:13px;
        font-weight:900;
        letter-spacing:0.06em;
        text-transform:uppercase;
        opacity:0.8;
      }

      .ce-ch115-timer{
        font-size:36px;
        font-weight:900;
        line-height:1;
      }

      .ce-ch115-sub{
        font-size:13px;
        opacity:0.8;
        text-align:center;
      }

      .ce-ch115-arena{
        position:relative;
        min-height:0;
        overflow:hidden;
      }

      .ce-ch115-half{
        position:absolute;
        top:0;
        bottom:0;
        width:50%;
      }

      .ce-ch115-half--a{
        left:0;
      }

      .ce-ch115-half--b{
        right:0;
      }

      .ce-ch115-divider{
        position:absolute;
        top:0;
        bottom:0;
        left:50%;
        width:2px;
        transform:translateX(-50%);
        background:linear-gradient(180deg, rgba(255,255,255,0.08), rgba(245,158,11,0.22), rgba(255,255,255,0.08));
        z-index:2;
        pointer-events:none;
      }

      .ce-ch115-halfLabel{
        position:absolute;
        top:16px;
        left:18px;
        font-size:12px;
        font-weight:900;
        letter-spacing:0.06em;
        text-transform:uppercase;
        opacity:0.22;
        pointer-events:none;
      }

      .ce-ch115-half--b .ce-ch115-halfLabel{
        left:auto;
        right:18px;
      }

      .ce-ch115-overlay{
        position:absolute;
        inset:0;
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:5;
        pointer-events:none;
      }

      .ce-ch115-countdown{
        font-size:108px;
        font-weight:900;
        line-height:1;
        color:#f8fafc;
        text-shadow:0 8px 20px rgba(0,0,0,0.45);
        animation:ce-ch115-countPulse 0.55s ease;
      }

      .ce-ch115-banner{
        padding:18px 28px;
        border-radius:18px;
        background:rgba(17,21,26,0.9);
        border:1px solid rgba(255,255,255,0.10);
        box-shadow:0 18px 40px rgba(0,0,0,0.35);
        font-size:30px;
        font-weight:900;
        line-height:1.2;
        text-align:center;
      }

      .ce-ch115-target{
        position:absolute;
        border-radius:999px;
        border:3px solid rgba(255,255,255,0.55);
        background:
          radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95), rgba(255,255,255,0.18) 28%, rgba(59,130,246,0.95) 29%, rgba(37,99,235,0.98) 66%, rgba(15,23,42,0.95) 100%);
        box-shadow:
          0 12px 26px rgba(0,0,0,0.28),
          0 0 0 6px rgba(59,130,246,0.12);
        cursor:pointer;
        transform:translate(-50%, -50%) scale(1);
        animation:ce-ch115-popIn 180ms ease, ce-ch115-pulse 1150ms ease-in-out infinite;
        transition:transform 120ms ease, opacity 120ms ease;
        user-select:none;
        -webkit-tap-highlight-color: transparent;
      }

      .ce-ch115-target:hover{
        transform:translate(-50%, -50%) scale(1.06);
      }

      .ce-ch115-target.is-hit{
        opacity:0;
        transform:translate(-50%, -50%) scale(0.7);
      }

      .ce-ch115-target--sudden{
        background:
          radial-gradient(circle at 35% 35%, rgba(255,255,255,0.98), rgba(255,255,255,0.22) 26%, rgba(245,158,11,0.98) 27%, rgba(234,88,12,0.98) 66%, rgba(15,23,42,0.95) 100%);
        box-shadow:
          0 12px 26px rgba(0,0,0,0.28),
          0 0 0 8px rgba(245,158,11,0.20);
      }

      @keyframes ce-ch115-popIn{
        from{ transform:translate(-50%, -50%) scale(0.6); opacity:0; }
        to{ transform:translate(-50%, -50%) scale(1); opacity:1; }
      }

      @keyframes ce-ch115-pulse{
        0%, 100%{ box-shadow:0 12px 26px rgba(0,0,0,0.28), 0 0 0 6px rgba(59,130,246,0.12); }
        50%{ box-shadow:0 12px 26px rgba(0,0,0,0.28), 0 0 0 11px rgba(59,130,246,0.18); }
      }

      @keyframes ce-ch115-countPulse{
        from{ transform:scale(0.72); opacity:0; }
        to{ transform:scale(1); opacity:1; }
      }
    `;
    document.head.appendChild(s);
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function now() {
    return performance.now();
  }

  function phaseSettings(msElapsed) {
    if (msElapsed < 30000) {
      return { size: 72, relocateMs: 1200 };
    }
    if (msElapsed < 90000) {
      return { size: 64, relocateMs: 900 };
    }
    return { size: 56, relocateMs: 650 };
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function makeTarget(side, size, sudden = false) {
    const pad = size * 0.7;
    const arena = qs('.ce-ch115-arena', MOD.root);
    const halfWidth = (arena?.clientWidth || MOD.host?.clientWidth || 1200) / 2;
    const height = arena?.clientHeight || MOD.host?.clientHeight || 700;
    const midGap = 20;    
    const centerXMin = pad;
    const centerXMax = halfWidth - pad - midGap;
    const centerYMin = pad + 20;
    const centerYMax = height - pad - 20;

    return {
      side,
      x: rand(centerXMin, centerXMax),
      y: rand(centerYMin, Math.max(centerYMin + 1, centerYMax)),
      size,
      sudden,
      id: `${side}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    };
  }

  function clearTargets() {
    MOD.targetA = null;
    MOD.targetB = null;
    MOD.suddenTarget = null;
  }

  function spawnStandardTargets(ts) {
    const elapsed = Math.max(0, ts - (MOD.endsAt - 120000));
    const cfg = phaseSettings(elapsed);

    MOD.targetA = makeTarget('a', cfg.size, false);
    MOD.targetB = makeTarget('b', cfg.size, false);
    MOD.nextRelocateA = ts + cfg.relocateMs;
    MOD.nextRelocateB = ts + cfg.relocateMs;
  }

  function spawnSuddenTarget(ts) {
    const size = 74;
    const side = Math.random() < 0.5 ? 'a' : 'b';
    MOD.suddenTarget = makeTarget(side, size, true);
    MOD.suddenRelocateAt = ts + 1100;
  }

  function updateHud() {
    if (!MOD.root) return;
    const scoreAEl = qs('.ce-ch115-side .ce-ch115-score', MOD.root);
    const scoreBEl = qs('.ce-ch115-side--right .ce-ch115-score', MOD.root);
    const timerEl = qs('.ce-ch115-timer', MOD.root);

    if (scoreAEl) scoreAEl.textContent = String(MOD.scoreA);
    if (scoreBEl) scoreBEl.textContent = String(MOD.scoreB);

    if (timerEl) {
      if (MOD.phase === 'live') {
        timerEl.textContent = formatTime(Math.max(0, MOD.endsAt - now()));
      } else if (MOD.phase === 'countdown') {
        timerEl.textContent = '2:00';
      } else if (MOD.phase === 'suddenDeath') {
        timerEl.textContent = 'SD';
      } else {
        timerEl.textContent = '0:00';
      }
    }
  }

  function flashScore(side) {
    if (!MOD.root) return;
    const el = side === 'a'
      ? qs('.ce-ch115-side .ce-ch115-score', MOD.root)
      : qs('.ce-ch115-side--right .ce-ch115-score', MOD.root);
    if (!el) return;

    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');

    setTimeout(() => {
      try { el.classList.remove('flash'); } catch {}
    }, 120);
  }


  function render() {
    if (!MOD.root) return;

    const pair = MOD.pair;
    const timeLeftMs = MOD.phase === 'live'
      ? Math.max(0, MOD.endsAt - now())
      : 0;

    const countdownLeft = MOD.phase === 'countdown'
      ? Math.max(0, Math.ceil((MOD.countdownUntil - now()) / 1000))
      : 0;

    const overlayHtml = MOD.phase === 'countdown'
      ? `<div class="ce-ch115-overlay"><div class="ce-ch115-countdown">${countdownLeft > 0 ? countdownLeft : 'GO'}</div></div>`
      : MOD.phase === 'suddenDeath'
        ? `<div class="ce-ch115-overlay"><div class="ce-ch115-banner">Sudden Death</div></div>`
        : MOD.phase === 'finished'
          ? `<div class="ce-ch115-overlay"><div class="ce-ch115-banner">Complete</div></div>`
          : '';

    MOD.root.innerHTML = `
      <div class="ce-ch115-shell">
        <div class="ce-ch115-topbar">
          <div class="ce-ch115-side">
            <div class="ce-ch115-name">${escapeHtml(pair?.a?.name || pair?.a?.id || 'Player A')}</div>
            <div class="ce-ch115-score">${escapeHtml(String(MOD.scoreA))}</div>
          </div>

          <div class="ce-ch115-center">
            <div class="ce-ch115-title">Target Tap</div>
            <div class="ce-ch115-timer">${MOD.phase === 'live' ? escapeHtml(formatTime(timeLeftMs)) : MOD.phase === 'countdown' ? '2:00' : MOD.phase === 'suddenDeath' ? 'SD' : '0:00'}</div>
            <div class="ce-ch115-sub">Tap the targets in your half</div>
          </div>

          <div class="ce-ch115-side ce-ch115-side--right">
            <div class="ce-ch115-name">${escapeHtml(pair?.b?.name || pair?.b?.id || 'Player B')}</div>
            <div class="ce-ch115-score">${escapeHtml(String(MOD.scoreB))}</div>
          </div>
        </div>

        <div class="ce-ch115-arena">
          <div class="ce-ch115-half ce-ch115-half--a"><div class="ce-ch115-halfLabel">Player A</div></div>
          <div class="ce-ch115-half ce-ch115-half--b"><div class="ce-ch115-halfLabel">Player B</div></div>
          <div class="ce-ch115-divider"></div>
          ${overlayHtml}
        </div>
      </div>
    `;

    const arena = qs('.ce-ch115-arena', MOD.root);
    if (!arena) return;
    const halfA = qs('.ce-ch115-half--a', MOD.root);
    const halfB = qs('.ce-ch115-half--b', MOD.root);

    if (MOD.targetA && MOD.phase === 'live' && halfA) {
      halfA.appendChild(renderTargetNode(MOD.targetA));
    }
    if (MOD.targetB && MOD.phase === 'live' && halfB) {
      halfB.appendChild(renderTargetNode(MOD.targetB));
    }
    if (MOD.suddenTarget && MOD.phase === 'suddenDeath') {
      const suddenHost = MOD.suddenTarget.side === 'a' ? halfA : halfB;
      if (suddenHost) suddenHost.appendChild(renderTargetNode(MOD.suddenTarget));
    }

    updateHud();
  }

  function renderTargetNode(target) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `ce-ch115-target ${target.sudden ? 'ce-ch115-target--sudden' : ''}`;
    btn.style.left = `${target.x}px`;
    btn.style.top = `${target.y}px`;
    btn.style.width = `${target.size}px`;
    btn.style.height = `${target.size}px`;
    btn.setAttribute('data-ch115-side', target.side);
    btn.setAttribute('data-ch115-id', target.id);

    btn.addEventListener('click', () => {
      onTargetHit(target, btn);
    });

    return btn;
  }

  function onTargetHit(target, node) {
    if (MOD.phase !== 'live' && MOD.phase !== 'suddenDeath') return;
    if (!target) return;

    node?.classList?.add('is-hit');

    if (MOD.phase === 'live') {
      if (target.side === 'a') {
        MOD.scoreA += 1;
        flashScore('a');
      }
      if (target.side === 'b') {
        MOD.scoreB += 1;
        flashScore('b');
      }

      const ts = now();
      const cfg = phaseSettings(Math.max(0, ts - (MOD.endsAt - 120000)));

      setTimeout(() => {
        if (target.side === 'a') {
          MOD.targetA = makeTarget('a', cfg.size, false);
          MOD.nextRelocateA = now() + cfg.relocateMs;
        } else if (target.side === 'b') {
          MOD.targetB = makeTarget('b', cfg.size, false);
          MOD.nextRelocateB = now() + cfg.relocateMs;
        }
        render();
      }, 90);
      return;
    }

    if (MOD.phase === 'suddenDeath') {
      const winner = target.side === 'a' ? MOD.pair?.a : MOD.pair?.b;
      const loser = target.side === 'a' ? MOD.pair?.b : MOD.pair?.a;
      finishWithWinner(winner, loser);
    }
  }

  function finishWithWinner(winner, loser) {
    MOD.phase = 'finished';
    clearTargets();
    render();

    if (typeof MOD.onComplete === 'function' && winner?.id && loser?.id) {
      MOD.onComplete({
        winnerId: String(winner.id),
        winnerName: String(winner.name || winner.id),
        loserId: String(loser.id),
        loserName: String(loser.name || loser.id),
      });
    }
  }

  function formatTime(ms) {
    const total = Math.ceil(ms / 1000);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function tick() {
    if (!MOD.mounted) return;

    const ts = now();

    if (MOD.phase === 'countdown') {
      if (ts >= MOD.countdownUntil) {
        MOD.phase = 'live';
        MOD.lastCountdownDisplay = null;
        MOD.endsAt = ts + 120000;
        spawnStandardTargets(ts);
        render();
      } else {
        const countdownLeft = Math.max(0, Math.ceil((MOD.countdownUntil - ts) / 1000));
        if (countdownLeft !== MOD.lastCountdownDisplay) {
          MOD.lastCountdownDisplay = countdownLeft;
          render();
        } else {
          updateHud();
        }
      }
    } else if (MOD.phase === 'live') {
      const elapsed = Math.max(0, ts - (MOD.endsAt - 120000));
      const cfg = phaseSettings(elapsed);

      if (ts >= MOD.nextRelocateA && MOD.targetA) {
        MOD.targetA = makeTarget('a', cfg.size, false);
        MOD.nextRelocateA = ts + cfg.relocateMs;
        render();
      }
      if (ts >= MOD.nextRelocateB && MOD.targetB) {
        MOD.targetB = makeTarget('b', cfg.size, false);
        MOD.nextRelocateB = ts + cfg.relocateMs;
        render();
      }

      if (ts >= MOD.endsAt) {
        if (MOD.scoreA > MOD.scoreB) {
          finishWithWinner(MOD.pair?.a, MOD.pair?.b);
        } else if (MOD.scoreB > MOD.scoreA) {
          finishWithWinner(MOD.pair?.b, MOD.pair?.a);
        } else {
          MOD.phase = 'suddenDeath';
          clearTargets();
          spawnSuddenTarget(ts);
          render();
        }
      } else {
        updateHud();
      }
    } else if (MOD.phase === 'suddenDeath') {
      if (ts >= MOD.suddenRelocateAt) {
        spawnSuddenTarget(ts);
        render();
      }
    }

    MOD.frameId = requestAnimationFrame(tick);
  }

  function mount({ host, pair, onComplete }) {
    unmount();

    MOD.mounted = true;
    MOD.host = host || null;
    MOD.pair = pair || null;
    MOD.onComplete = typeof onComplete === 'function' ? onComplete : null;
    MOD.scoreA = 0;
    MOD.scoreB = 0;
    MOD.lastCountdownDisplay = null;
    MOD.phase = 'countdown';
    MOD.countdownUntil = now() + 3000;
    MOD.endsAt = 0;
    MOD.nextRelocateA = 0;
    MOD.nextRelocateB = 0;
    MOD.suddenRelocateAt = 0;
    clearTargets();

    if (!MOD.host) return false;

    ensureStyles();

    MOD.root = document.createElement('div');
    MOD.root.id = 'ce-ch115-root';
    MOD.host.appendChild(MOD.root);

    render();
    MOD.frameId = requestAnimationFrame(tick);
    return true;
  }

  function unmount() {
    if (MOD.frameId) {
      cancelAnimationFrame(MOD.frameId);
      MOD.frameId = null;
    }

    MOD.mounted = false;
    MOD.phase = 'idle';
    MOD.pair = null;
    MOD.onComplete = null;
    MOD.scoreA = 0;
    MOD.scoreB = 0;
    clearTargets();

    try { MOD.root?.remove?.(); } catch {}
    MOD.root = null;
    MOD.host = null;
  }

  MOD.mount = mount;
  MOD.unmount = unmount;

  window.__CE_CHALLENGE_DUEL_TARGETTAP = MOD;
})();