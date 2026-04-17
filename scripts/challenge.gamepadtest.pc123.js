/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC123-A1
   Module: challenge.gamepadtest.pc123.js
   Purpose: Challenge Phase Gamepad Test Button + Modal
   Notes:
     - Additive-only module
     - UI only; reads from CE_INPUT
     - Mounts inside Challenge Base action row
     - No persistence
     - No phase changes
========================================================= */

(() => {
  const MOD = {
    mounted: false,
    buttonEl: null,
    modalEl: null,
    pollId: null,
    attachId: null,
    clickHandler: null,
    closeHandler: null
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function ensureStyles() {
    if (document.getElementById('ce-ch123-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-ch123-styles';
    s.textContent = `
      .ce-ch123-btn{
        border:1px solid rgba(255,255,255,0.16);
        background:rgba(255,255,255,0.10);
        color:#fff;
        padding:10px 12px;
        border-radius:12px;
        font-weight:900;
        cursor:pointer;
        opacity:1;
      }

      .ce-ch123-btn:hover{
        background:rgba(255,255,255,0.16);
      }

      .ce-ch123-backdrop{
        position:fixed;
        inset:0;
        z-index:9998;
        background:rgba(5,8,12,0.64);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:24px;
      }

      .ce-ch123-modal{
        width:min(920px, calc(100vw - 40px));
        max-height:min(82vh, 760px);
        overflow:auto;
        background:rgba(17,21,26,0.98);
        border:1px solid rgba(255,255,255,0.12);
        border-radius:18px;
        box-shadow:0 18px 40px rgba(0,0,0,0.38);
        color:#e8eef2;
      }

      .ce-ch123-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:16px;
        padding:16px 18px;
        border-bottom:1px solid rgba(255,255,255,0.08);
      }

      .ce-ch123-title{
        font-size:16px;
        font-weight:950;
        letter-spacing:0.03em;
        text-transform:uppercase;
      }

      .ce-ch123-close{
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(255,255,255,0.08);
        color:#fff;
        padding:8px 10px;
        border-radius:10px;
        font-weight:900;
        cursor:pointer;
      }

      .ce-ch123-body{
        padding:16px 18px 18px;
        display:flex;
        flex-direction:column;
        gap:14px;
      }

      .ce-ch123-copy{
        font-size:14px;
        line-height:1.45;
        opacity:0.92;
      }

      .ce-ch123-grid{
        display:grid;
        grid-template-columns:repeat(2, minmax(0, 1fr));
        gap:12px;
      }

      .ce-ch123-card{
        padding:14px;
        border-radius:14px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.08);
      }

      .ce-ch123-cardTitle{
        font-size:13px;
        font-weight:950;
        letter-spacing:0.04em;
        text-transform:uppercase;
        margin-bottom:10px;
      }

      .ce-ch123-meta{
        display:grid;
        grid-template-columns:110px 1fr;
        gap:6px 10px;
        font-size:13px;
        line-height:1.35;
      }

      .ce-ch123-key{
        opacity:0.72;
      }

      .ce-ch123-val{
        word-break:break-word;
      }

      .ce-ch123-status{
        display:inline-flex;
        align-items:center;
        gap:8px;
        font-weight:900;
      }

      .ce-ch123-dot{
        width:10px;
        height:10px;
        border-radius:999px;
        background:#64748b;
      }

      .ce-ch123-dot.is-on{
        background:#22c55e;
        box-shadow:0 0 0 6px rgba(34,197,94,0.16);
      }

      .ce-ch123-row{
        display:grid;
        grid-template-columns:repeat(4, 1fr);
        gap:10px;
        margin-top:12px;
      }

      .ce-ch123-row--five{
        grid-template-columns:repeat(5, 1fr);
      }

      .ce-ch123-lane{
        border-radius:12px;
        padding:12px 10px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.10);
        text-align:center;
      }

      .ce-ch123-lane.is-active{
        background:rgba(167,139,250,0.20);
        border-color:rgba(167,139,250,0.62);
        box-shadow:0 0 0 6px rgba(167,139,250,0.10);
      }

      .ce-ch123-laneLabel{
        font-size:11px;
        text-transform:uppercase;
        letter-spacing:0.05em;
        opacity:0.7;
        margin-bottom:4px;
      }

      .ce-ch123-laneValue{
        font-size:14px;
        font-weight:950;
      }

      .ce-ch123-note{
        padding:12px;
        border-radius:12px;
        background:rgba(80,140,255,0.14);
        border:1px solid rgba(80,140,255,0.24);
        color:#dbeafe;
        font-size:13px;
        line-height:1.4;
      }

      @media (max-width: 760px){
        .ce-ch123-grid{
          grid-template-columns:1fr;
        }
      }
    `;
    document.head.appendChild(s);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getInput() {
    return window.CE_INPUT || null;
  }

  function getOpenButton() {
    return document.querySelector('[data-ch123-open]');
  }

  function getPadMetaSafe() {
    const input = getInput();
    if (!input?.getPadMeta) return [];
    try { return input.getPadMeta() || []; } catch { return []; }
  }

  function getPlayerStateSafe(side) {
    const input = getInput();
    if (!input?.getPlayerState) {
      return {
        confirm:false,
        left:false,
        right:false,
        up:false,
        down:false,
        lane1:false,
        lane2:false,
        lane3:false,
        lane4:false
      };
    }
    try {
      return input.getPlayerState(side) || {
        confirm:false,
        left:false,
        right:false,
        up:false,
        down:false,
        lane1:false,
        lane2:false,
        lane3:false,
        lane4:false
      };
    } catch {
      return {
        confirm:false,
        left:false,
        right:false,
        up:false,
        down:false,
        lane1:false,
        lane2:false,
        lane3:false,
        lane4:false
      };
    }
  }

  function laneHtml(label, active) {
    return `
      <div class="ce-ch123-lane ${active ? 'is-active' : ''}">
        <div class="ce-ch123-laneLabel">${escapeHtml(label)}</div>
        <div class="ce-ch123-laneValue">${active ? 'Pressed' : 'Idle'}</div>
      </div>
    `;
  }

  function cardHtml(playerLabel, playerSide, meta) {
    const state = getPlayerStateSafe(playerSide);
    const connected = !!meta?.connected;
    const padIndex = Number.isFinite(Number(meta?.index)) ? Number(meta.index) : '—';
    const id = meta?.id ? String(meta.id) : 'Not detected';
    const mapping = meta?.mapping ? String(meta.mapping) : '—';

    return `
      <div class="ce-ch123-card">
        <div class="ce-ch123-cardTitle">${escapeHtml(playerLabel)}</div>
        <div class="ce-ch123-meta">
          <div class="ce-ch123-key">Pad index</div>
          <div class="ce-ch123-val">${escapeHtml(String(padIndex))}</div>

          <div class="ce-ch123-key">Status</div>
          <div class="ce-ch123-val">
            <span class="ce-ch123-status">
              <span class="ce-ch123-dot ${connected ? 'is-on' : ''}"></span>
              ${connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <div class="ce-ch123-key">Mapping</div>
          <div class="ce-ch123-val">${escapeHtml(mapping)}</div>

          <div class="ce-ch123-key">Controller</div>
          <div class="ce-ch123-val">${escapeHtml(id)}</div>
        </div>

        <div class="ce-ch123-row">
          ${laneHtml('Up', !!state.up)}
          ${laneHtml('Down', !!state.down)}
          ${laneHtml('Left', !!state.left)}
          ${laneHtml('Right', !!state.right)}
        </div>

        <div class="ce-ch123-row ce-ch123-row--five">
          ${laneHtml('Confirm', !!state.confirm)}
          ${laneHtml('L2', !!state.lane1)}
          ${laneHtml('L1', !!state.lane2)}
          ${laneHtml('R1', !!state.lane3)}
          ${laneHtml('R2', !!state.lane4)}
        </div>
      </div>
    `;
  }

  function renderModalBody() {
    if (!MOD.modalEl) return;

    const metas = getPadMetaSafe();
    const metaA = metas[0] || { index: 0, connected: false, id: '', mapping: '' };
    const metaB = metas[1] || { index: 1, connected: false, id: '', mapping: '' };

    const body = qs('[data-ch123-body]', MOD.modalEl);
    if (!body) return;

    body.innerHTML = `
      <div class="ce-ch123-copy">
        Use this panel before gameplay to confirm both controllers are visible,
        assigned in the expected order, and that Rhythm Strike lane buttons are
        responding live.
      </div>

      <div class="ce-ch123-grid">
        ${cardHtml('Player A • Pad 0', 'a', metaA)}
        ${cardHtml('Player B • Pad 1', 'b', metaB)}
      </div>

      <div class="ce-ch123-note">
        Recommended startup: use Chrome or Edge, plug both controllers in before the duel,
        then press buttons once on each pad if a controller does not appear immediately.
      </div>
    `;
  }

  function stopPolling() {
    if (MOD.pollId) {
      clearInterval(MOD.pollId);
      MOD.pollId = null;
    }
  }

  function openModal() {
    if (MOD.modalEl) return;

    try { getInput()?.start?.(); } catch {}

    const backdrop = document.createElement('div');
    backdrop.className = 'ce-ch123-backdrop';
    backdrop.innerHTML = `
      <div class="ce-ch123-modal" role="dialog" aria-modal="true" aria-label="Controller Test">
        <div class="ce-ch123-head">
          <div class="ce-ch123-title">Controller Test</div>
          <button type="button" class="ce-ch123-close" data-ch123-close>Close</button>
        </div>
        <div class="ce-ch123-body" data-ch123-body></div>
      </div>
    `;

    MOD.closeHandler = (e) => {
      if (e.target === backdrop || e.target.closest('[data-ch123-close]')) {
        closeModal();
      }
    };

    backdrop.addEventListener('click', MOD.closeHandler);
    document.body.appendChild(backdrop);
    MOD.modalEl = backdrop;

    renderModalBody();
    stopPolling();
    MOD.pollId = window.setInterval(renderModalBody, 100);
  }

  function closeModal() {
    stopPolling();
    if (MOD.modalEl && MOD.closeHandler) {
      try { MOD.modalEl.removeEventListener('click', MOD.closeHandler); } catch {}
    }
    MOD.closeHandler = null;
    try { MOD.modalEl?.remove?.(); } catch {}
    MOD.modalEl = null;
  }

  function bindButton() {
    const btn = getOpenButton();
    if (!btn) return false;
    if (MOD.buttonEl === btn) return true;

    if (MOD.buttonEl && MOD.clickHandler) {
      try { MOD.buttonEl.removeEventListener('click', MOD.clickHandler); } catch {}
    }

    MOD.buttonEl = btn;
    MOD.clickHandler = () => openModal();
    MOD.buttonEl.addEventListener('click', MOD.clickHandler);
    return true;
  }

  function startAttachLoop() {
    stopAttachLoop();
    MOD.attachId = window.setInterval(() => {
      bindButton();
    }, 400);
  }

  function stopAttachLoop() {
    if (MOD.attachId) {
      clearInterval(MOD.attachId);
      MOD.attachId = null;
    }
  }

  function mount() {
    if (MOD.mounted) return true;
    MOD.mounted = true;
    ensureStyles();
    startAttachLoop();
    bindButton();
    return true;
  }

  function unmount() {
    MOD.mounted = false;
    stopAttachLoop();
    stopPolling();
    closeModal();

    if (MOD.buttonEl && MOD.clickHandler) {
      try { MOD.buttonEl.removeEventListener('click', MOD.clickHandler); } catch {}
    }
    MOD.clickHandler = null;
    MOD.buttonEl = null;
  }

  MOD.mount = mount;
  MOD.unmount = unmount;

  window.__CE_CHALLENGE_GAMEPADTEST = MOD;
})();