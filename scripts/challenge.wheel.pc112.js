/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC112-A0
   Module: challenge.wheel.pc112.js
   Purpose: Phase 6 Challenge Duel Selector Wheel
   Notes:
     - Additive-only wheel layer for Challenge Phase.
     - Must not emit lesson:phaseChange.
     - Must not persist state directly.
     - Mounts into the wheel panel created by PC111.
     - Session-only state.
     - Supports exactly 4 wheel slots.
     - Duplicate activities are allowed.
     - PC112 scope:
     -   * render wheel shell in Challenge wheel panel
     -   * support manual entry assignment via API
     -   * support spin + land-on-slot via API
   ========================================================= */

(() => {
  const MOD = {
    mounted: false,
    host: null,
    root: null,
    tickId: null,
    slots: [null, null, null, null],
    lastResultIndex: null,
    rotDeg: 0,
    spinning: false,
  };

  function getCommitApi() {
    return window.__CE_CHALLENGE_COMMIT || null;
  }

  function getNominationApi() {
    return window.__CE_CHALLENGE_NOMINATION || null;
  }

  function getDashboard() {
    return window.__CE_BOOT?.modules?.Dashboard ||
      window.__CE_BOOT?.CE?.modules?.Dashboard ||
      window.Dashboard ||
      null;
  }

  function getCommitApi() {
    return window.__CE_CHALLENGE_COMMIT || null;
  }

  function getPhaseNow() {
    return String(
      window.__CE_BOOT?.phaseGateState?.currentPhase ??
      window.__CE_BOOT?.phase?.current ??
      getDashboard()?.session?.phase ??
      ''
    );
  }

  function isPhase6(phase) {
    return String(phase) === '6';
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function ensureStyles() {
    if (document.getElementById('ce-challenge112-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-challenge112-styles';
    s.textContent = `
      .ce-ch112-root{
        position:relative;
        width:100%;
        height:100%;
        display:grid;
        grid-template-rows: minmax(0, 1fr) auto auto;
        gap:8px;
        align-items:center;
        justify-items:center;
        overflow:hidden;
        box-sizing:border-box;
        padding:0;
      }

      .ce-ch112-wheelwrap{
        position:relative;
        width:min(100%, calc(100vh - 370px));
        aspect-ratio:1 / 1;
        justify-self:center;
        align-self:center;
        max-height:100%;
        overflow:hidden;
      }

      .ce-ch112-pointer{
        position:absolute;
        top:-6px;
        left:50%;
        transform:translateX(-50%) rotate(180deg);
        width:0;
        height:0;
        border-left:14px solid transparent;
        border-right:14px solid transparent;
        border-bottom:24px solid #0b3c8a;
        filter:drop-shadow(0 6px 10px rgba(0,0,0,.55));
        z-index:3;
        pointer-events:none;
      }

      .ce-ch112-wheel{
        position:absolute;
        inset:0;
        border-radius:50%;
        background:transparent;
        border:0;
        box-shadow:none;
        transform:rotate(var(--ce-ch112-rot, 0deg));
        transition:transform 8.4s cubic-bezier(.12,.78,.10,1);
        will-change:transform;
        overflow:hidden;
        width:100%;
        height:100%;
      }

      .ce-ch112-wheel svg{
        width:100%;
        height:100%;
        display:block;
      }

      .ce-ch112-wheel.is-spinning{
        transition:transform 8.4s cubic-bezier(.12,.78,.10,1);
      }

      .ce-ch112-wheel.is-snapping{
        transition:transform 0.001s linear;
      }

      .ce-ch112-center{
        position:absolute;
        left:50%;
        top:50%;
        transform:translate(-50%,-50%);
        width:24%;
        height:24%;
        border-radius:50%;
        background:#eff6ff;
        border:2px solid #93c5fd;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding:10px;
        z-index:2;
        box-sizing:border-box;
      }

      .ce-ch112-centertext{
        font-size:12px;
        line-height:1.2;
        font-weight:800;
        color:#0f172a;
      }

      .ce-ch112-status{
        font-size:13px;
        line-height:1.35;
        text-align:center;
        opacity:0.88;
        max-width:320px;
        min-height:18px;
      }

      .ce-ch112-statusRow{
        width:min(100%, 720px);
        display:grid;
        grid-template-columns:minmax(0, 1fr) auto;
        gap:12px;
        align-items:center;
      }

      .ce-ch112-statusRow .ce-ch112-status{
        max-width:none;
        text-align:left;
      }

      .ce-ch112-utility{
        display:flex;
        align-items:center;
        gap:10px;
        justify-content:flex-end;
        min-width:0;
      }

      .ce-ch112-utilityCopy{
        font-size:12px;
        line-height:1.3;
        opacity:0.82;
        white-space:nowrap;
      }

      .ce-ch112-utilityBtn{
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(255,255,255,0.08);
        color:#fff;
        padding:10px 12px;
        border-radius:12px;
        font-weight:900;
        cursor:pointer;
        white-space:nowrap;
      }

      .ce-ch112-utilityBtn:hover{
        background:rgba(255,255,255,0.12);
      }
      .ce-ch112-actions{
        display:flex;
        justify-content:center;
        width:min(100%, 360px);
      }

      .ce-ch112-btn{
        width:100%;
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(80,140,255,0.32);
        border-color:rgba(80,140,255,0.42);
        color:#fff;
        padding:10px 12px;
        border-radius:12px;
        font-weight:900;
        cursor:pointer;
      }

      .ce-ch112-btn:hover{
        background:rgba(80,140,255,0.42);
      }

      .ce-ch112-btn[disabled]{
        opacity:0.45;
        cursor:not-allowed;
      }

      .ce-ch112-slots{
        display:grid;
        grid-template-columns:repeat(2, minmax(0, 1fr));
        gap:8px;
        width:min(100%, 360px);
        flex:0 0 auto;
        margin-bottom:2px;
      }

      .ce-ch112-slot{
        display:flex;
        flex-direction:column;
        gap:6px;
        padding:8px 10px;
        border-radius:10px;
        background:rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.10);
        min-height:54px;
        box-sizing:border-box;
      }

      .ce-ch112-slot.is-empty{
        opacity:0.55;
      }

      .ce-ch112-slotlabel{
        font-size:11px;
        text-transform:uppercase;
        opacity:0.74;
        font-weight:900;
        color:#e8eef2;
      }

      .ce-ch112-select{
        width:100%;
        border-radius:8px;
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(255,255,255,0.07);
        color:#fff;
        padding:8px 10px;
        box-sizing:border-box;
        font-size:12px;
        font-weight:800;
      }

    `;
    document.head.appendChild(s);
  }

  function getWheelHost() {
    return document.querySelector('.ce-ch111-wheel');
  }

  function getStatusText() {
    if (!isPhase6(getPhaseNow())) return 'Wheel idle';
    if (!getCommitApi()?.isCommitted?.()) return 'Commit duel lineup first';
    if (MOD.spinning) return 'Spinning…';
    if (MOD.lastResultIndex != null && MOD.slots[MOD.lastResultIndex]) {
      return `Selected: ${MOD.slots[MOD.lastResultIndex]}`;
    }
    if (MOD.slots.some(Boolean)) return 'Wheel ready';
    return 'Awaiting activity nominations';
  }

  function renderWheelSvg() {
    const entries = MOD.slots.map((x, i) => String(x || `Slot ${i + 1}`));
    const n = 4;
    const cx = 260;
    const cy = 260;
    const r = 245;
    const slice = 360 / n;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const fills = ['#dbeafe', '#bfdbfe', '#c7d2fe', '#a5b4fc'];

    const paths = [];
    const labels = [];

    for (let i = 0; i < n; i++) {
      const a0 = -90 + i * slice;
      const a1 = -90 + (i + 1) * slice;
      const x0 = cx + r * Math.cos(toRad(a0));
      const y0 = cy + r * Math.sin(toRad(a0));
      const x1 = cx + r * Math.cos(toRad(a1));
      const y1 = cy + r * Math.sin(toRad(a1));
      const mid = a0 + slice / 2;
      const lx = cx + (r * 0.63) * Math.cos(toRad(mid));
      const ly = cy + (r * 0.63) * Math.sin(toRad(mid));
      const rot = mid + 90;

      paths.push(
        `<path d="M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z" fill="${fills[i % fills.length]}" stroke="#93c5fd" stroke-width="2" />`
      );

      labels.push(
        `<text x="${lx}" y="${ly}" fill="#0f172a" font-size="18" font-weight="800" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rot} ${lx} ${ly})">${escapeHtml(entries[i])}</text>`
      );
    }


    return `
      <svg viewBox="0 0 520 520" aria-label="Challenge Activity Wheel">
        ${paths.join('')}
        ${labels.join('')}
      </svg>
    `;
  }

  function buildNominationSelect(field, label, selected, activities) {
    const id = `ce-ch112-${field}`;
    return `
      <label class="ce-ch112-slotlabel" for="${id}">${escapeHtml(label)}</label>
      <select id="${id}" name="${id}" class="ce-ch112-select" data-ch112-field="${escapeHtml(field)}">
        <option value="">Select activity</option>
        ${activities.map((name) => `
          <option value="${escapeHtml(name)}" ${selected === name ? 'selected' : ''}>${escapeHtml(name)}</option>
        `).join('')}
      </select>
    `;
  }

  function areAllSlotsFilled(state) {
    return !!(state?.a1 && state?.a2 && state?.b1 && state?.b2);
  }

  function render() {
    if (!MOD.root) return;
    const nomination = getNominationApi();
    const state = nomination?.getCurrentNominationState?.() || { a1:'', a2:'', b1:'', b2:'' };
    const activities = nomination?.getActivities?.() || [];
    const canSpin = areAllSlotsFilled(state) && !MOD.spinning;

    MOD.root.innerHTML = `
      <div class="ce-ch112-wheelwrap">
        <div class="ce-ch112-pointer"></div>
        <div class="ce-ch112-wheel" data-ch112-wheel style="--ce-ch112-rot:${MOD.rotDeg}deg">
          ${renderWheelSvg()}
        </div>
        <div class="ce-ch112-center"></div>
      </div>
      <div class="ce-ch112-statusRow">
        <div class="ce-ch112-status" data-ch112-status>${escapeHtml(getStatusText())}</div>
        <div class="ce-ch112-utility">
          <div class="ce-ch112-utilityCopy">Turn on control pads and test before gameplay.</div>
          <button type="button" class="ce-ch112-utilityBtn" data-ch123-open>Test Pads</button>
        </div>
      </div>
      <div class="ce-ch112-slots">
        <div class="ce-ch112-slot ${state.a1 ? '' : 'is-empty'}">
          ${buildNominationSelect('a1', 'Player A • 1', state.a1 || '', activities)}
        </div>
        <div class="ce-ch112-slot ${state.a2 ? '' : 'is-empty'}">
          ${buildNominationSelect('a2', 'Player A • 2', state.a2 || '', activities)}
        </div>
        <div class="ce-ch112-slot ${state.b1 ? '' : 'is-empty'}">
          ${buildNominationSelect('b1', 'Player B • 1', state.b1 || '', activities)}
        </div>
        <div class="ce-ch112-slot ${state.b2 ? '' : 'is-empty'}">
          ${buildNominationSelect('b2', 'Player B • 2', state.b2 || '', activities)}
        </div>
      </div>
      <div class="ce-ch112-actions">
        <button type="button" class="ce-ch112-btn" data-ch112-spin ${canSpin ? '' : 'disabled'}>Spin Wheel</button>
      </div>
    `;

    MOD.root.querySelectorAll('[data-ch112-field]').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const field = String(e.currentTarget?.getAttribute('data-ch112-field') || '');
        nomination?.setNomination?.(field, e.currentTarget?.value || '');
        render();
      });
    });

    MOD.root.querySelector('[data-ch112-spin]')?.addEventListener('click', () => {
      const wheel = window.__CE_CHALLENGE_WHEEL;
      const nominationApi = getNominationApi();

      if (!wheel || !nominationApi || MOD.spinning) return;

      wheel.spinRandom?.().then(() => {
        const idx = wheel.getLastResultIndex?.();
        const slots = wheel.getSlots?.() || [];
        const selected = idx == null ? null : slots[idx];

        if (selected) {
          nominationApi._setSelectedActivity?.(selected);
        }
        render();
      });
    });
  }

  function mountIntoHost() {

    if (!MOD.root) {
      MOD.root = document.createElement('div');
      MOD.root.className = 'ce-ch112-root';
    }

    const host = getWheelHost();
    if (!host) return false;

    if (!host.contains(MOD.root)) {
      host.innerHTML = '';
      host.appendChild(MOD.root);
    }

    render();
    const wheel = qs('[data-ch112-wheel]', MOD.root);
    if (wheel) {
      wheel.style.setProperty('--ce-ch112-rot', `${MOD.rotDeg}deg`);
    }

    return true;
  }

  function startTick() {
    stopTick();
    MOD.tickId = window.setInterval(() => {
      if (!MOD.mounted) return;
      const host = getWheelHost();
      if (!host) return;
      if (!MOD.root || !host.contains(MOD.root)) {
        mountIntoHost();
      }
    }, 500);
  }

  function stopTick() {
    if (MOD.tickId) {
      clearInterval(MOD.tickId);
      MOD.tickId = null;
    }
  }

  function setSlots(entries = []) {
    const next = Array.isArray(entries) ? entries.slice(0, 4) : [];
    while (next.length < 4) next.push(null);
    MOD.slots = next.map((x) => x == null ? null : String(x));
    MOD.lastResultIndex = null;
    if (!MOD.spinning) MOD.rotDeg = 0;
    mountIntoHost();
    render();
    return MOD.slots.slice();
  }

  function clearSlots() {
    MOD.slots = [null, null, null, null];
    MOD.lastResultIndex = null;
    MOD.rotDeg = 0;
    MOD.spinning = false;
    mountIntoHost();
    render();
    return true;
  }

  function spinToIndex(index) {
    mountIntoHost();
    const wheel = qs('[data-ch112-wheel]', MOD.root);
    if (!wheel) return Promise.resolve(false);
    if (MOD.spinning) return Promise.resolve(false);

    const idx = clamp(Number(index || 0), 0, 3);
    const slice = 360 / 4;
    const targetCenterDeg = idx * slice + slice / 2;
    const extraTurns = 3 + Math.floor(Math.random() * 3);
    const cur = Number.isFinite(Number(MOD.rotDeg)) ? Number(MOD.rotDeg) : 0;
    const align = -targetCenterDeg;
    const final = cur + extraTurns * 360 + align;

    MOD.spinning = true;
    MOD.lastResultIndex = null;

    wheel.classList.remove('is-snapping');
    wheel.classList.add('is-spinning');
    wheel.style.transition = `transform ${(2.8 + extraTurns * 0.25) * 3}s cubic-bezier(.12,.78,.10,1)`;

    void wheel.offsetWidth;

    MOD.rotDeg = final;
    wheel.style.setProperty('--ce-ch112-rot', `${MOD.rotDeg}deg`);

    return new Promise((resolve) => {
      let settled = false;
      let fallbackId = null;

      const finish = () => {
        if (settled) return;
        settled = true;
        if (fallbackId) clearTimeout(fallbackId);

        const snapped = align;
        wheel.classList.add('is-snapping');
        MOD.rotDeg = snapped;
        wheel.style.setProperty('--ce-ch112-rot', `${MOD.rotDeg}deg`);
        void wheel.offsetWidth;
        wheel.classList.remove('is-snapping');

        MOD.spinning = false;
        MOD.lastResultIndex = idx;
        render();
        resolve(true);
      };

      const onEnd = (e) => {
        if (e?.target !== wheel) return;
        wheel.removeEventListener('transitionend', onEnd);
        finish();
      };

      wheel.addEventListener('transitionend', onEnd);

      fallbackId = setTimeout(finish, 12600);
    });
  }

  function spinRandom() {
    const filled = MOD.slots
      .map((x, i) => ({ value: x, index: i }))
      .filter((x) => !!x.value);

    if (!filled.length) return Promise.resolve(false);
    const picked = filled[Math.floor(Math.random() * filled.length)];
    return spinToIndex(picked.index);
  }

  function mount() {
    if (MOD.mounted) return;
    MOD.mounted = true;

    ensureStyles();
    mountIntoHost();
    startTick();
  }

  function unmount() {
    if (!MOD.mounted) return;
    MOD.mounted = false;
    stopTick();

    try { MOD.root?.remove?.(); } catch {}
    MOD.root = null;
    MOD.host = null;
    MOD.lastResultIndex = null;
    MOD.spinning = false;
  }

  MOD.mount = mount;
  MOD.unmount = unmount;
  MOD.setSlots = setSlots;
  MOD.clearSlots = clearSlots;
  MOD.spinToIndex = spinToIndex;
  MOD.spinRandom = spinRandom;
  MOD.getSlots = () => MOD.slots.slice();
  MOD.getLastResultIndex = () => MOD.lastResultIndex;

  window.__CE_CHALLENGE_WHEEL = MOD;
})();
