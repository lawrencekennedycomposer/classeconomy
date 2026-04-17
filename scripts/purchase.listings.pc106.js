/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC106-A2
   Module: purchase.listings.pc106.js
   Purpose: Purchase Listings Editor (Editable + Per-Class Persistence)
========================================================= */

(() => {
  const API = {
    backdrop: null
  };

  const STORAGE_KEY_PREFIX = 'ce:purchaseListings:v1';

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function ensureStyle() {
    if (document.getElementById('ce-purchase-listings-pc106-style')) return;

    const s = document.createElement('style');
    s.id = 'ce-purchase-listings-pc106-style';
    s.textContent = `
      .ce-pl106-backdrop{
        position:absolute;
        inset:0;
        z-index:60;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(0,0,0,0.46);
      }

      .ce-pl106-modal{
        width:min(980px, calc(100vw - 48px));
        height:min(80vh, 820px);
        display:grid;
        grid-template-rows:auto 1fr auto;
        background:#11151a;
        color:#e8eef2;
        border:1px solid rgba(255,255,255,0.12);
        border-radius:18px;
        box-shadow:0 24px 60px rgba(0,0,0,0.35);
        overflow:hidden;
      }

      .ce-pl106-head,
      .ce-pl106-foot{
        padding:12px 14px;
        border-bottom:1px solid rgba(255,255,255,0.08);
      }

      .ce-pl106-foot{
        border-top:1px solid rgba(255,255,255,0.08);
        border-bottom:none;
        display:flex;
        justify-content:space-between;
        gap:8px;
      }

      .ce-pl106-body{
        padding:14px;
        overflow:auto;
      }

      .ce-pl106-list{
        display:flex;
        flex-direction:column;
        gap:10px;
      }

      .ce-pl106-row{
        border:1px solid rgba(255,255,255,0.10);
        background:rgba(255,255,255,0.05);
        border-radius:14px;
        padding:12px;
        display:grid;
        grid-template-columns:1fr 120px 140px 120px;
        gap:10px;
      }

      .ce-pl106-input,
      .ce-pl106-textarea,
      .ce-pl106-select{
        width:100%;
        border-radius:10px;
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(255,255,255,0.07);
        color:#fff;
        padding:10px;
        box-sizing:border-box;
      }

      .ce-pl106-textarea{
        min-height:60px;
        resize:vertical;
      }

      .ce-pl106-field{
        display:flex;
        flex-direction:column;
        gap:6px;
      }

      .ce-pl106-label{
        font-size:11px;
        text-transform:uppercase;
        opacity:0.72;
        font-weight:800;
      }

      .ce-pl106-btn{
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(255,255,255,0.08);
        color:#fff;
        padding:10px 12px;
        border-radius:12px;
        font-weight:900;
        cursor:pointer;
      }

      .ce-pl106-btn:hover{
        background:rgba(255,255,255,0.12);
      }
    `;
    document.head.appendChild(s);
  }

  function getPurchaseBase() {
    return window.__CE_PURCHASE_BASE || null;
  }

  function getStorage() {
    return window.__CE_BOOT?.modules?.Storage ||
      window.__CE_BOOT?.CE?.modules?.Storage ||
      window.Storage ||
      null;
  }

  function getEvents() {
    return window.__CE_BOOT?.modules?.Events ||
      window.__CE_BOOT?.CE?.modules?.Events ||
      window.Events ||
      null;
  }

  function makeId() {
    return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
  }

  function normaliseListing(item = {}, idx = 0) {
    return {
      id: String(item.id || `pl_${idx + 1}`),
      title: String(item.title || '').trim() || `Listing ${idx + 1}`,
      note: String(item.note || ''),
      cost: Math.max(0, Math.floor(Number(item.cost || 0))),
      active: item.active !== false,
      effect: item.effect === 'plus' ? 'plus' : 'minus',
      pointsType: item.pointsType === 'banked' ? 'banked' : 'unbanked'
    };
  }

  function getSessionKey() {
    const Storage = getStorage();

    try {
      const sess = Storage?.getSession?.() || {};
      const userId = String(sess.userId || 'u1').trim() || 'u1';
      const classId = String(sess.classId || 'default').trim() || 'default';
      return `${STORAGE_KEY_PREFIX}:${userId}:${classId}`;
    } catch {
      return `${STORAGE_KEY_PREFIX}:u1:default`;
    }
  }

  function getListingsFromBase() {
    const base = getPurchaseBase();
    const raw = Array.isArray(base?.listings) ? base.listings : [];
    return raw.map((x, idx) => normaliseListing(x, idx));
  }

  function saveListingsToStorage(items) {
    try {
      const key = getSessionKey();
      const payload = {
        items: (Array.isArray(items) ? items : []).map((x, idx) => normaliseListing(x, idx))
      };
      window.localStorage.setItem(key, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  function loadListingsFromStorage() {
    try {
      const raw = window.localStorage.getItem(getSessionKey());
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.items)) return null;

      return parsed.items.map((x, idx) => normaliseListing(x, idx));
    } catch {
      return null;
    }
  }

  function applyListingsToBase(items) {
    const cleaned = (Array.isArray(items) ? items : [])
      .map((x, idx) => normaliseListing(x, idx))
      .filter((x) => String(x.title || '').trim());

    const base = getPurchaseBase();
    if (!base) return false;

    if (typeof base.setListings === 'function') {
      base.setListings(cleaned);
    } else {
      base.listings = cleaned;
    }

    return true;
  }

  function syncBaseFromStorage() {
    const stored = loadListingsFromStorage();
    if (!stored) return false;
    return applyListingsToBase(stored);
  }

  function closeEditor() {
    API.backdrop?.remove();
    API.backdrop = null;
  }

  function renderEditor(modal, draft) {
    modal.innerHTML = `
      <div class="ce-pl106-head">
        <strong>Edit Purchase Listings</strong>
      </div>

      <div class="ce-pl106-body">
        <div class="ce-pl106-list">
          ${draft.map((item, i) => `
            <div class="ce-pl106-row">
              <div class="ce-pl106-field">
                <label class="ce-pl106-label">Title</label>
                <input class="ce-pl106-input" data-i="${i}" data-f="title" value="${escapeAttr(item.title)}"/>
                <label class="ce-pl106-label">Note</label>
                <textarea class="ce-pl106-textarea" data-i="${i}" data-f="note">${escapeHtml(item.note)}</textarea>
              </div>
              <div class="ce-pl106-field">
                <label class="ce-pl106-label">Cost</label>
                <input type="number" class="ce-pl106-input" data-i="${i}" data-f="cost" value="${item.cost || 0}"/>
              </div>
              <div class="ce-pl106-field">
                <label class="ce-pl106-label">Type</label>
                <select class="ce-pl106-select" data-i="${i}" data-f="effect">
                  <option value="minus" ${item.effect === 'minus' ? 'selected' : ''}>- Points</option>
                  <option value="plus" ${item.effect === 'plus' ? 'selected' : ''}>+ Points</option>
                </select>
                <select class="ce-pl106-select" data-i="${i}" data-f="pointsType">
                  <option value="unbanked" ${item.pointsType === 'unbanked' ? 'selected' : ''}>Unbanked</option>
                  <option value="banked" ${item.pointsType === 'banked' ? 'selected' : ''}>Banked</option>
                </select>
              </div>
              <div class="ce-pl106-field">
                <label class="ce-pl106-label">Actions</label>
                <button class="ce-pl106-btn" data-del="${i}">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="ce-pl106-foot">
        <button class="ce-pl106-btn" data-add>Add</button>
        <div>
          <button class="ce-pl106-btn" data-cancel>Cancel</button>
          <button class="ce-pl106-btn" data-save>Save</button>
        </div>
      </div>
    `;

    qsa('[data-f]', modal).forEach((el) => {
      el.oninput = () => {
        const i = Number(el.dataset.i);
        const f = el.dataset.f;
        if (!Number.isFinite(i) || !draft[i]) return;
        draft[i][f] = f === 'cost' ? Math.max(0, Math.floor(Number(el.value || 0))) : el.value;
      };
    });

    qsa('[data-del]', modal).forEach((btn) => {
      btn.onclick = () => {
        const i = Number(btn.dataset.del);
        if (!Number.isFinite(i)) return;
        draft.splice(i, 1);
        renderEditor(modal, draft);
      };
    });

    const btnAdd = qs('[data-add]', modal);
    const btnCancel = qs('[data-cancel]', modal);
    const btnSave = qs('[data-save]', modal);

    if (btnAdd) {
      btnAdd.onclick = () => {
        draft.push({ id: makeId(), title: 'New', note: '', cost: 0, active: true });
        draft[draft.length - 1].effect = 'minus';
        draft[draft.length - 1].pointsType = 'unbanked';
        renderEditor(modal, draft);
      };
    }

    if (btnCancel) {
      btnCancel.onclick = closeEditor;
    }

    if (btnSave) {
      btnSave.onclick = () => {
        const cleaned = draft
          .map((item, idx) => normaliseListing(item, idx))
          .filter((item) => item.title);

        applyListingsToBase(cleaned);
        saveListingsToStorage(cleaned);
        closeEditor();
      };
    }
  }

  function openEditor() {
    closeEditor();
    ensureStyle();

    syncBaseFromStorage();

    const backdrop = document.createElement('div');
    backdrop.className = 'ce-pl106-backdrop';

    const modal = document.createElement('div');
    modal.className = 'ce-pl106-modal';

    const draft = getListingsFromBase();
    renderEditor(modal, draft);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeEditor();
    };

    API.backdrop = backdrop;
  }

  function bindPhaseHydration() {
    const Events = getEvents();
    const on = Events?.on;
    const E = Events?.EVENTS_V3 || Events?.EVENTS_V2 || Events?.EVENTS || {};

    if (typeof on !== 'function') return;

    const EVT_PHASE =
      E.LESSON_PHASE_CHANGE ||
      E.LESSON_PHASE_CHANGED ||
      'lesson:phaseChange';

    on(EVT_PHASE, (e) => {
      const to = String(e?.detail?.to ?? '');
      if (to === '7') {
        syncBaseFromStorage();
      }
    });
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replaceAll('"', '&quot;');
  }

  bindPhaseHydration();

  window.__CE_PURCHASE_LISTINGS = {
    openEditor,
    closeEditor,
    syncBaseFromStorage
  };
})();