/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC105-A0
   Module: purchase.base.pc105.js
   Purpose: Phase 7 Purchase Base
   Notes:
     - Text-only auction listings (seeded in code for PC105)
     - Seat swap uses selected leaderboard student as subject
     - Cost = ceil(avg active unbanked * 1.2), minimum 1
     - Uses canonical Dashboard / Storage / Events surfaces
   ========================================================= */

(() => {
  const PURCHASE = {
    el: null,
    mounted: false,
    host: null,
    root: null,
    lbClickHandler: null,
    offScores: null,
    offRoster: null,
    offSeating: null,
    offPhase: null,
    modalTargetId: null,
    purchaseModalItemId: null,
    phaseEntrySeatSwapCost: null,
    originalSeatingSnapshot: null,
    listings: [
      { id: 'a1', title: 'Homework Submission', cost: 5, effect: 'plus', pointsType: 'unbanked', note: 'Adds unbanked points.' },
      { id: 'a2', title: 'Canteen Voucher', cost: 35, effect: 'minus', pointsType: 'unbanked', note: 'Costs unbanked points.' },
      { id: 'a3', title: 'Mystery Prize', cost: 50, effect: 'minus', pointsType: 'banked', note: 'Costs banked points.' }
    ]
  };

  const CANON_SEATING_KEY = 'ce:seatingLayout:v1';

  function getBus() {
    return window.__CE_BOOT?.modules?.Events ||
      window.__CE_BOOT?.CE?.modules?.Events ||
      null;
  }

  function getStorage() {
    return window.__CE_BOOT?.modules?.Storage ||
      window.__CE_BOOT?.CE?.modules?.Storage ||
      null;
  }

  function getDashboard() {
    return window.__CE_BOOT?.modules?.Dashboard ||
      window.__CE_BOOT?.CE?.modules?.Dashboard ||
      window.Dashboard ||
      null;
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function ensureStyles() {
    if (document.getElementById('ce-purchase105-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-purchase105-styles';
    s.textContent = `
      #ce-purchase-root{
        position:absolute; inset:0; z-index:2; pointer-events:none;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      .ce-purchase-shell{
        position:absolute; inset:12px 12px 12px 12px;
        display:grid;
        grid-template-columns: minmax(320px, 430px) 1fr;
        grid-template-columns: 360px 1fr;        
        gap:12px;
        pointer-events:none;
      }

      .ce-export-fab{
        position:absolute;
        right:16px;
        bottom:16px;
        z-index:50;
        pointer-events:auto;
        padding:16px 22px;
        font-size:16px;
        font-weight:900;
        border-radius:16px;
        background:rgba(80,140,255,0.9);
        color:#fff;
        border:1px solid rgba(255,255,255,0.2);
        box-shadow:0 12px 30px rgba(0,0,0,0.35);
        cursor:pointer;
      }

      .ce-export-fab:hover{
        background:rgba(80,140,255,1);
      }
      .ce-bank-fab{
        position:absolute;
        right:240px;
        bottom:16px;
        z-index:50;
        pointer-events:auto;
        padding:16px 22px;
        font-size:16px;
        font-weight:900;
        border-radius:16px;
        background:rgba(255,121,198,0.9);
        color:#fff;
        border:1px solid rgba(255,255,255,0.2);
        box-shadow:0 12px 30px rgba(0,0,0,0.35);
        cursor:pointer;
      }
      .ce-bank-fab:hover{
        background:rgba(255,121,198,1);
      }
      .ce-purchase-panel{
        pointer-events:auto;
        background:rgba(17,21,26,0.94);
        border:1px solid rgba(255,255,255,0.10);
        border-radius:16px;
        box-shadow:0 12px 30px rgba(0,0,0,0.25);
        color:#e8eef2;
      }
      .ce-purchase-left{
        display:flex;
        flex-direction:column;
        gap:12px;
        min-height:0;
      }
      .ce-purchase-right{
        display:flex;
        flex-direction:column;
        min-height:0;
      }
      .ce-purchase-card{
        padding:12px;
      }
      .ce-purchase-title{
        font-size:14px;
        font-weight:900;
        letter-spacing:0.04em;
        text-transform:uppercase;
        opacity:0.9;
        margin-bottom:8px;
      }
      .ce-purchase-summary{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
      }
      .ce-kpi{
        padding:10px;
        border-radius:12px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.08);
      }
      .ce-kpi-label{
        font-size:11px;
        text-transform:uppercase;
        opacity:0.72;
        margin-bottom:4px;
      }
      .ce-kpi-value{
        font-size:22px;
        font-weight:900;
      }
      .ce-selected-name{
        font-size:20px;
        font-weight:900;
      }
      .ce-selected-name .ce-swapped-badge{
        margin-left: 8px;
        color: #ffd166;
        font-size: 12px;
        font-weight: 900;
        vertical-align: middle;
      }
      .ce-selected-meta{
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin-top:6px;
        font-size:13px;
        opacity:0.92;
      }
      .ce-actions{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:10px;
      }
      .ce-btn{
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(255,255,255,0.08);
        color:#fff;
        padding:10px 12px;
        border-radius:12px;
        font-weight:900;
        cursor:pointer;
      }
      .ce-btn:hover{ background:rgba(255,255,255,0.12); }
      .ce-btn[disabled]{ opacity:0.45; cursor:not-allowed; }
      .ce-btn--primary{
        background:rgba(80,140,255,0.32);
        border-color:rgba(80,140,255,0.42);
      }
      .ce-auctions{
        display:flex;
        flex-direction:column;
        gap:8px;
        max-height:100%;
        flex:1 1 auto;
        overflow:auto;
      }
      .ce-auction-row{
        padding:16px 18px;
        border-radius:12px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.08);
        display:grid;
        grid-template-columns:1fr auto;
        gap:8px 14px;
        align-items:start;
        cursor:pointer;
      }
      .ce-auction-row:hover{
        background:rgba(255,255,255,0.09);
      }
      .ce-auction-row.is-disabled{
        opacity:0.45;
        cursor:not-allowed;
      }
      .ce-auction-title{
        font-size:18px;
        font-weight:900;
      }
      .ce-auction-cost{
        font-size:20px
        font-weight:900;
        color:#fff;
      }
      .ce-auction-cost--banked{
        color:#ff79c6;
      }
      .ce-auction-cost--unbanked{
        color:#fff;
      }
      .ce-auction-note{
        grid-column:1 / -1;
        font-size:14px;
        opacity:0.82;
      }

      .ce-phase7-bank{
        color:#ff79c6;
        font-weight:900;
      }
      .ce-hint{
        margin-top:8px;
        font-size:12px;
        opacity:0.75;
      }

      .ce-seat-modal-backdrop{
        position:absolute; inset:0;
        background:rgba(0,0,0,0.46);
        display:flex;
        align-items:center;
        justify-content:center;
        pointer-events:auto;
        z-index:30;
      }
      .ce-seat-modal{
        width:min(920px, calc(100vw - 48px));
        height:min(78vh, 760px);
        background:#11151a;
        color:#e8eef2;
        border:1px solid rgba(255,255,255,0.12);
        border-radius:18px;
        box-shadow:0 24px 60px rgba(0,0,0,0.35);
        display:grid;
        grid-template-rows:auto 1fr auto;
        overflow:hidden;
      }
      .ce-seat-head,
      .ce-seat-foot{
        padding:12px 14px;
        border-bottom:1px solid rgba(255,255,255,0.08);
      }
      .ce-seat-foot{
        border-bottom:none;
        border-top:1px solid rgba(255,255,255,0.08);
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
      }
      .ce-seat-body{
        padding:14px;
        overflow:auto;
      }
      .ce-seat-grid{
        display:grid;
        grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));
        gap:10px;
      }
      .ce-seat-card{
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.10);
        background:rgba(255,255,255,0.05);
        padding:12px;
        text-align:left;
        color:#fff;
        cursor:pointer;
      }
      .ce-seat-card:hover{
        background:rgba(255,255,255,0.09);
      }
      .ce-seat-card[disabled]{
        opacity:0.45;
        cursor:not-allowed;
      }
      .ce-seat-card.is-target{
        outline:2px solid rgba(255,121,198,0.55);
        background:rgba(255,121,198,0.10);
      }
      .ce-seat-card.is-subject{
        outline:2px solid rgba(80,140,255,0.45);
      }
      .ce-seat-card.is-inactive{
        opacity: 0.6;
      }
      .ce-seat-desk{
        font-size:11px;
        text-transform:uppercase;
        opacity:0.70;
        margin-bottom:6px;
      }
      .ce-seat-name{
        font-size:17px;
        font-weight:900;
      }
      .ce-seat-empty{
        opacity:0.55;
      }
      .ce-seat-meta{
        margin-top:6px;
        font-size:12px;
        opacity:0.78;
      }
      .ce-seat-flag{
        display:inline-block;
        margin-top:6px;
        padding:2px 6px;
        border-radius:999px;
        font-size:11px;
        font-weight:900;
        color:#11151a;
        background:#ffd166;
      }    
      .ce-seat-inline{
        display:flex;
        gap:12px;
        flex-wrap:wrap;
        margin-top:6px;
        font-size:13px;
        opacity:0.92;
      }
      .ce-purchase-confirm-backdrop{
        position:absolute; inset:0;
        background:rgba(0,0,0,0.46);
        display:flex;
        align-items:center;
        justify-content:center;
        pointer-events:auto;
        z-index:32;
      }
      .ce-purchase-confirm{
        width:min(520px, calc(100vw - 48px));
        background:#11151a;
        color:#e8eef2;
        border:1px solid rgba(255,255,255,0.12);
        border-radius:18px;
        box-shadow:0 24px 60px rgba(0,0,0,0.35);
        display:grid;
        grid-template-rows:auto 1fr auto;
        overflow:hidden;
      }
      .ce-purchase-confirm-head,
      .ce-purchase-confirm-foot{
        padding:12px 14px;
        border-bottom:1px solid rgba(255,255,255,0.08);
      }
      .ce-purchase-confirm-foot{
        border-bottom:none;
        border-top:1px solid rgba(255,255,255,0.08);
        display:flex;
        justify-content:flex-end;
        gap:8px;
      }
      .ce-purchase-confirm-body{
        padding:14px;
      }
    `;
    document.head.appendChild(s);
  }

  function getRoster() {
    try {
      return getDashboard()?.getRosterSnapshot?.()?.students || [];
    } catch {
      return [];
    }
  }

  function getScoresById() {
    try {
      return getDashboard()?.getScoresSnapshot?.()?.byId || {};
    } catch {
      return {};
    }
  }

  function getSelectedStudentFromDom() {
    const el =
      qs('.lb-item.lb-item--selected') ||
      qs('.lb-item.is-selected') ||
      qs('.lb-item.selected') ||
      qs('.lb-item[data-selected="true"]');

    if (!el) return null;
    if (el.classList.contains('is-inactive')) return null;

    const id = String(el.dataset.studentId || '').trim();
    const name = String(el.dataset.studentName || '').trim();
    if (!id) return null;

    return { id, name: name || 'Student' };
  }

  function getSeatLayout() {
    const boot = window.__CE_BOOT || {};
    const desks = Array.isArray(boot?.SeatingLayout?.desks) ? boot.SeatingLayout.desks : [];
    return desks.map((d) => ({ ...d }));
  }

  function writeSeatLayout(desks) {
    const Storage = getStorage();
    const Bus = getBus();
    const payload = { desks: desks.map((d) => ({ ...d })) };

    const boot = window.__CE_BOOT || (window.__CE_BOOT = {});
    boot.SeatingLayout = payload;

    try {
      if (Storage?.writeJSON) {
        const key = Storage?.KEYS?.SEATING_LAYOUT_V1 || CANON_SEATING_KEY;
        Storage.writeJSON(key, payload);
      }
    } catch {}

    try {
      window.localStorage?.setItem(CANON_SEATING_KEY, JSON.stringify(payload));
    } catch {}

    try {
      Bus?.emit?.('seating:layout:updated', { source: 'pc105', layout: payload, ts: Date.now() });
    } catch {}
  }

  function getStudentById(studentId) {
    return getRoster().find((s) => String(s.id) === String(studentId)) || null;
  }

  function getAverageUnbankedActive() {
    const roster = getRoster();
    const byId = getScoresById();

    let total = 0;
    let count = 0;

    for (const s of roster) {
      if (s?.active === false) continue;
      const rec = byId[String(s.id)] || {};
      total += Number(rec.unbanked || 0);
      count += 1;
    }

    if (!count) return 0;
    return total / count;
  }

  function getSeatSwapCost() {
    if (Number.isFinite(PURCHASE.phaseEntrySeatSwapCost) && PURCHASE.phaseEntrySeatSwapCost > 0) {
      return PURCHASE.phaseEntrySeatSwapCost;
    }
    return Math.max(1, Math.ceil(getAverageUnbankedActive() * 1.2));
  }

  function canAfford(studentId) {
    const byId = getScoresById();
    const rec = byId[String(studentId)] || {};
    return Number(rec.unbanked || 0) >= getSeatSwapCost();
  }

  function getSelectedDeskByOccupant(studentId) {
    const desks = getSeatLayout();
    return desks.find((d) => String(d.defaultOccupantId || '') === String(studentId)) || null;
  }

  function getListingCost(item) {
    return Math.max(
      0,
      Math.floor(
        Number(
          item?.cost ??
          item?.unbankedCost ??
          item?.bankedCost ??
          0
        ) || 0
      )
    );
  }

  function getListingEffect(item) {
    return item?.effect === 'plus' ? 'plus' : 'minus';
  }

  function getListingPointsType(item) {
    return item?.pointsType === 'banked' ? 'banked' : 'unbanked';
  }

  function getListingSignedValue(item) {
    const cost = getListingCost(item);
    return getListingEffect(item) === 'plus' ? cost : -cost;
  }

  function getStudentPointsValue(studentId, pointsType = 'unbanked') {
    const byId = getScoresById();
    const rec = byId[String(studentId)] || {};
    return Number(pointsType === 'banked' ? rec.banked || 0 : rec.unbanked || 0);
  }


  function canAffordListing(studentId, item) {
    if (getListingEffect(item) === 'plus') return true;
    return getStudentPointsValue(studentId, getListingPointsType(item)) >= getListingCost(item);
  }

  function applyBankedDelta(studentId, delta) {
    const Storage = getStorage();
    const Dashboard = getDashboard();
    const Bus = getBus();
    const scores = Dashboard?.getScoresSnapshot?.()?.byId || {};
    const byId = {};

    for (const [id, rec] of Object.entries(scores)) {
      byId[id] = {
        unbanked: Math.max(0, Number(rec?.unbanked || 0)),
        banked: Math.max(0, Number(rec?.banked || 0))
      };
    }

    const id = String(studentId);
    if (!byId[id]) byId[id] = { unbanked: 0, banked: 0 };
    byId[id].banked = Math.max(0, Number(byId[id].banked || 0) + Number(delta || 0));

    try {
      Storage?.writeJSON?.(Storage?.KEYS?.SCORES_V1, { byId });
      Dashboard?.loadScores?.();
      Bus?.emit?.('scores:updated', { byIdSnapshot: byId, ts: Date.now(), source: 'pc105-banked' });
      return true;
    } catch {
      return false;
    }
  }

  function closePurchaseConfirm() {
    const backdrop = qs('.ce-purchase-confirm-backdrop', PURCHASE.root);
    try { backdrop?.remove?.(); } catch {}
    PURCHASE.purchaseModalItemId = null;
  }

  function commitInstantPurchase(studentId, itemId) {
    const item = (PURCHASE.listings || []).find((x) => String(x.id) === String(itemId));
    if (!item || item.active === false) return false;
    if (!canAffordListing(studentId, item)) return false;

    const Dashboard = getDashboard();
    const pointsType = getListingPointsType(item);
    const delta = getListingSignedValue(item);
    let ok = false;

    if (pointsType === 'banked') {
      ok = applyBankedDelta(String(studentId), delta);
    } else {
      ok = Dashboard?.applyAward?.({
        studentId: String(studentId),
        value: delta,
        reason: `purchase:${String(item.title || item.id || 'item')}`,
        phase: '7'
      });
    }

    if (ok === false) return false;

    render();
    return true;
  }

  function openPurchaseConfirm(studentId, itemId) {
    closePurchaseConfirm();

    const student = getStudentById(studentId);
    const item = (PURCHASE.listings || []).find((x) => String(x.id) === String(itemId));
    if (!student || !item || item.active === false) return;

    const pointsType = getListingPointsType(item);
    const effect = getListingEffect(item);
    const poolLabel = pointsType === 'banked' ? 'banked' : 'unbanked';
    const verb = effect === 'plus' ? 'Award' : 'Spend';
    const current = getStudentPointsValue(studentId, pointsType);
    const cost = getListingCost(item);
    const remaining = current + getListingSignedValue(item);

    PURCHASE.purchaseModalItemId = String(itemId);

    const backdrop = document.createElement('div');
    backdrop.className = 'ce-purchase-confirm-backdrop';

    const modal = document.createElement('div');
    modal.className = 'ce-purchase-confirm';
    modal.innerHTML = `
      <div class="ce-purchase-confirm-head">
        <div style="font-size:18px;font-weight:900;">Confirm Purchase</div>
      </div>
      <div class="ce-purchase-confirm-body">
        <div style="font-size:16px; line-height:1.45;">
          ${verb} <strong>${cost}</strong> ${poolLabel} points
          ${effect === 'plus' ? 'for' : 'on'}
          <strong>${escapeHtml(String(item.title || 'Item'))}</strong>
          ${effect === 'plus' ? 'to' : 'for'} <strong>${escapeHtml(String(student.name || 'Student'))}</strong>?
        </div>
        <div style="margin-top:10px; font-size:13px; opacity:0.86;">
          Current ${poolLabel}: <strong>${current}</strong><br/>
          ${effect === 'plus' ? 'After award' : 'Remaining after purchase'}: <strong>${remaining}</strong>
        </div>
      </div>
      <div class="ce-purchase-confirm-foot">
        <button type="button" class="ce-btn" data-ce-purchase="cancel">Cancel</button>
        <button type="button" class="ce-btn ce-btn--primary" data-ce-purchase="confirm" ${remaining < 0 ? 'disabled' : ''}>Confirm</button>
      </div>
    `;

    backdrop.appendChild(modal);
    PURCHASE.root.appendChild(backdrop);

    qs('[data-ce-purchase="cancel"]', modal)?.addEventListener('click', () => {
      closePurchaseConfirm();
    });

    qs('[data-ce-purchase="confirm"]', modal)?.addEventListener('click', () => {
      if (commitInstantPurchase(studentId, itemId)) {
        closePurchaseConfirm();
      }
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closePurchaseConfirm();
    });
  }

  function cloneDesks(desks = []) {
    return Array.isArray(desks) ? desks.map((d) => ({ ...d })) : [];
  }

  function ensureOriginalSeatingSnapshot() {
    if (PURCHASE.originalSeatingSnapshot) return;
    PURCHASE.originalSeatingSnapshot = { desks: cloneDesks(getSeatLayout()) };
  }

  function getOriginalDeskByOccupant(studentId) {
    const desks = PURCHASE.originalSeatingSnapshot?.desks || [];
    return desks.find((d) => String(d.defaultOccupantId || '') === String(studentId)) || null;
  }

  function isStudentOutOfOriginalSeat(studentId) {
    if (!studentId || !PURCHASE.originalSeatingSnapshot?.desks) return false;
    const currentDesk = getSelectedDeskByOccupant(studentId);
    const originalDesk = getOriginalDeskByOccupant(studentId);
    if (!currentDesk || !originalDesk) return false;
    return String(currentDesk.id || '') !== String(originalDesk.id || '');
  }

  function restoreOriginalSeating() {
    const desks = cloneDesks(PURCHASE.originalSeatingSnapshot?.desks || []);
    if (!desks.length) return false;
    writeSeatLayout(desks);
    render();
    return true;
  }

  function restoreStudentToOriginalSeat(studentId) {
    const sid = String(studentId || '').trim();
    if (!sid) return false;

    const desks = getSeatLayout();
    if (!desks.length) return false;

    const currentDeskIdx = desks.findIndex((d) => String(d.defaultOccupantId || '') === sid);
    if (currentDeskIdx < 0) return false;

    const originalDesk = getOriginalDeskByOccupant(sid);
    if (!originalDesk) return false;

    const originalDeskId = String(originalDesk.id || '').trim();
    if (!originalDeskId) return false;

    const targetDeskIdx = desks.findIndex((d) => String(d.id || '') === originalDeskId);
    if (targetDeskIdx < 0) return false;

    // already back in original seat
    if (currentDeskIdx === targetDeskIdx) return false;

    const currentOcc = desks[currentDeskIdx].defaultOccupantId || '';
    const targetOcc = desks[targetDeskIdx].defaultOccupantId || '';

    // Move back if empty, otherwise swap with whoever is there
    desks[targetDeskIdx].defaultOccupantId = currentOcc;
    desks[currentDeskIdx].defaultOccupantId = targetOcc || '';

    writeSeatLayout(desks);
    render();
    return true;
  }

  function render() {
    if (!PURCHASE.root) return;

    const selected = getSelectedStudentFromDom();
    const roster = getRoster();
    const byId = getScoresById();
    const cost = getSeatSwapCost();
    const totalUnbanked = roster.reduce((sum, s) => {
      if (s?.active === false) return sum;
      return sum + Number(byId[String(s.id)]?.unbanked || 0);
    }, 0);
    const totalBanked = roster.reduce((sum, s) => {
      if (s?.active === false) return sum;
      return sum + Number(byId[String(s.id)]?.banked || 0);
    }, 0);

    const selectedRec = selected ? (byId[String(selected.id)] || {}) : null;
    const selectedBanked = Number(selectedRec?.banked || 0);
    const selectedUnbanked = Number(selectedRec?.unbanked || 0);
    const selectedDesk = selected ? getSelectedDeskByOccupant(selected.id) : null;
    const affordable = selected ? canAfford(selected.id) : false;
    const selectedMoved = selected ? isStudentOutOfOriginalSeat(selected.id) : false;

    const seatSwapDisabled = !selected || !canAfford(selected.id);
    const seatSwapRow = `
      <div class="ce-auction-row ${seatSwapDisabled ? 'is-disabled' : ''}" data-seat-swap="1">
        <div class="ce-auction-title">Seat Swap</div>
        <div class="ce-auction-cost ce-auction-cost--unbanked">-${PURCHASE.phaseEntrySeatSwapCost}</div>
        <div class="ce-auction-note">${
          selected
            ? 'Move this student to another desk.'
            : 'Select a student tile first.'
        }</div>
      </div>
    `;

    const auctionsHtml = `
      ${seatSwapRow}
      ${PURCHASE.listings.map((item) => `
      <div
        class="ce-auction-row ${(!selected || item.active === false || !canAffordListing(selected?.id, item)) ? 'is-disabled' : ''}"
        data-purchase-item-id="${escapeAttr(String(item.id || ''))}"
      >
        <div class="ce-auction-title">${escapeHtml(item.title)}</div>
        <div class="ce-auction-cost ce-auction-cost--${getListingPointsType(item)}">${getListingEffect(item) === 'plus' ? '+' : '-'}${getListingCost(item)}</div>
        <div class="ce-auction-note">${escapeHtml(item.note || '')}</div>
      </div>
    `).join('')}
    `;

    PURCHASE.root.innerHTML = `
      <div class="ce-purchase-shell">
        <div class="ce-purchase-left">
          <div class="ce-purchase-panel ce-purchase-card">
            <div class="ce-purchase-title">Purchase Summary</div>
            <div class="ce-purchase-summary">
              <div class="ce-kpi">
                <div class="ce-kpi-label">Seat Swap Cost</div>
                <div class="ce-kpi-value">${cost}</div>
              </div>
              <div class="ce-kpi">
                <div class="ce-kpi-label">Active Avg Unbanked</div>
                <div class="ce-kpi-value">${Math.ceil(getAverageUnbankedActive())}</div>
              </div>
              <div class="ce-kpi">
                <div class="ce-kpi-label">Class Unbanked</div>
                <div class="ce-kpi-value">${totalUnbanked}</div>
              </div>
              <div class="ce-kpi">
                <div class="ce-kpi-label">Class Banked</div>
                <div class="ce-kpi-value">${totalBanked}</div>
              </div>
            </div>
          </div>

          <div class="ce-purchase-panel ce-purchase-card">
            <div class="ce-purchase-title">Selected Student</div>
            ${
              selected
                ? `
                  <div class="ce-selected-name">${escapeHtml(selected.name)}${selectedMoved ? '<span class="ce-swapped-badge">SWAPPED</span>' : ''}</div>
                  <div class="ce-selected-meta">
                    <span>Banked: <strong class="ce-phase7-bank">${selectedBanked}</strong></span>
                    <span>Unbanked: <strong>${selectedUnbanked}</strong></span>
                    <span>Desk: <strong>${escapeHtml(selectedDesk?.id || '—')}</strong></span>
                    <span>${affordable ? 'Can afford seat swap' : 'Cannot afford seat swap'}</span>
                  </div>
                `
                : `<div class="ce-selected-name">No student selected</div>`
            }
            <div class="ce-actions">
              <button
                type="button"
                class="ce-btn"
                data-ce-return-one="1"
                ${selected && selectedMoved ? '' : 'disabled'}
              >
                Return to Original Seat
              </button>
            </div>
            <div class="ce-hint">Select a leaderboard tile first. Phase 7 uses the selected tile student as the seat-swap subject.</div>
          </div>
        </div>

        <div class="ce-purchase-right">
          <div class="ce-purchase-panel ce-purchase-card" style="min-height:0; display:flex; flex-direction:column; overflow:hidden;">
            <div class="ce-panel-head">
              <div class="ce-purchase-title">Purchase Listings</div>
              <button class="ce-btn" id="ce-purchase-edit-listings">Edit Listings</button>
            </div>
            <div class="ce-auctions">${auctionsHtml}</div>
          </div>
        </div>
      </div>

      <button id="ce-export-fab" class="ce-export-fab">
        Export Lesson Data
      </button>
      <button id="ce-bank-fab" class="ce-bank-fab">
        Bank Unbanked Tokens
      </button>
    `;

    const btnExportFab = qs('#ce-export-fab', PURCHASE.root);
    const btnBankFab = qs('#ce-bank-fab', PURCHASE.root);
    const btnEditListings = qs('#ce-purchase-edit-listings', PURCHASE.root);

    if (btnExportFab) {
      btnExportFab.onclick = () => {
        try { getBus()?.emit?.('teacher:download-json', { source: 'pc105' }); } catch {}
      };
    }

    if (btnBankFab) {
      btnBankFab.onclick = () => {
        try { getBus()?.emit?.('bank:request', { source: 'pc105' }); } catch {}
      };
    }

    const btnReturnOne = qs('[data-ce-return-one="1"]', PURCHASE.root);
    if (btnReturnOne) {
      btnReturnOne.onclick = () => {
        if (!selected || !selectedMoved) return;
        restoreStudentToOriginalSeat(selected.id);
      };
    }

    qsa('[data-purchase-item-id]', PURCHASE.root).forEach((row) => {
      row.addEventListener('click', () => {
        const itemId = String(row.getAttribute('data-purchase-item-id') || '').trim();
        const item = (PURCHASE.listings || []).find((x) => String(x.id) === itemId);
        if (!selected || !item || item.active === false) return;
        if (!canAffordListing(selected.id, item)) return;
        openPurchaseConfirm(selected.id, itemId);
      });
    });

    qsa('[data-seat-swap]', PURCHASE.root).forEach((row) => {
      row.addEventListener('click', () => {
        if (!selected) return;
        if (!canAfford(selected.id)) return;
        openSeatSwapModal(selected.id);
      });
    });

    if (btnEditListings) {
      btnEditListings.onclick = () => {
        window.__CE_PURCHASE_LISTINGS?.openEditor?.();
      };
    }
  }

  function openSeatSwapModal(subjectId) {
    const subject = getStudentById(subjectId);
    if (!subject) return;

    const byId = getScoresById();
    const cost = getSeatSwapCost();
    const subjectDesk = getSelectedDeskByOccupant(subjectId);
    const desks = getSeatLayout();
    if (!subjectDesk) return;

    PURCHASE.modalTargetId = null;

    const backdrop = document.createElement('div');
    backdrop.className = 'ce-seat-modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'ce-seat-modal';

    const renderModal = () => {
      const targetDesk = PURCHASE.modalTargetId
        ? desks.find((d) => String(d.id || '') === String(PURCHASE.modalTargetId))
        : null;
      const targetOccId = String(targetDesk?.defaultOccupantId || '');
      const targetStudent = targetOccId ? getStudentById(targetOccId) : null;
      const remaining = Number(byId[String(subjectId)]?.unbanked || 0) - cost;

      modal.innerHTML = `
        <div class="ce-seat-head">
          <div style="font-size:18px;font-weight:900;">Seat Swap</div>
          <div class="ce-seat-inline">
            <span>Subject: <strong>${escapeHtml(subject.name)}</strong></span>
            <span>Current desk: <strong>${escapeHtml(subjectDesk.id || '—')}</strong></span>
            <span>Cost: <strong>${cost}</strong></span>
            <span>Unbanked after swap: <strong>${remaining}</strong></span>
          </div>
        </div>
        <div class="ce-seat-body">
          <div class="ce-seat-grid">
            ${desks.map((desk) => {
              const occId = String(desk.defaultOccupantId || '');
              const occ = occId ? getStudentById(occId) : null;
              const isSubject = occId === String(subjectId);
              const isEmpty = !occId;
              const isInactive = occ && occ.active === false;
              const isTarget = PURCHASE.modalTargetId && String(desk.id || '') === String(PURCHASE.modalTargetId);
              const disabled = isSubject;
              const wasOriginalSeat = !!occId && !isStudentOutOfOriginalSeat(occId);
              const showMovedFlag = !!occId && !isSubject && !wasOriginalSeat;

              return `
                <button
                  type="button"
                  class="ce-seat-card ${isSubject ? 'is-subject' : ''} ${isTarget ? 'is-target' : ''} ${isInactive ? 'is-inactive' : ''}"
                  data-seat-desk-id="${escapeAttr(String(desk.id || ''))}"
                  data-seat-occupant-id="${escapeAttr(occId)}"
                  ${disabled ? 'disabled' : ''}
                >
                  <div class="ce-seat-desk">${escapeHtml(String(desk.id || 'Desk'))}</div>
                  <div class="ce-seat-name ${isEmpty ? 'ce-seat-empty' : ''}">
                    ${escapeHtml(occ?.name || 'Empty')}
                  </div>
                  <div class="ce-seat-meta">${
                    isEmpty ? 'Move into this spare desk.' : 'Target this occupied desk.'
                  }</div>
                  ${showMovedFlag ? '<div class="ce-seat-flag">SWAPPED</div>' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>
        <div class="ce-seat-foot">
          <div>
            ${
              targetDesk
                ? (
                    targetStudent
                      ? `Swap <strong>${escapeHtml(subject.name)}</strong> with <strong>${escapeHtml(targetStudent.name)}</strong>?`
                      : `Move <strong>${escapeHtml(subject.name)}</strong> into spare desk <strong>${escapeHtml(String(targetDesk.id || ''))}</strong>?`
                  )
                : 'Choose the destination student/desk.'
            }
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="ce-btn" data-ce-action="restore">Restore Original Seating</button>
            <button type="button" class="ce-btn" data-ce-action="cancel">Cancel</button>
            <button type="button" class="ce-btn ce-btn--primary" data-ce-action="confirm" ${targetDesk ? '' : 'disabled'}>Confirm Swap</button>
          </div>
        </div>
      `;

      qsa('.ce-seat-card[data-seat-desk-id]', modal).forEach((btn) => {
        btn.addEventListener('click', () => {
          const deskId = String(btn.getAttribute('data-seat-desk-id') || '').trim();
          const occId = String(btn.getAttribute('data-seat-occupant-id') || '').trim();
          if (!deskId || occId === String(subjectId)) return;
          PURCHASE.modalTargetId = deskId;
          renderModal();
        });
      });

      const btnRestore = qs('[data-ce-action="restore"]', modal);
      const btnCancel = qs('[data-ce-action="cancel"]', modal);
      const btnConfirm = qs('[data-ce-action="confirm"]', modal);

      if (btnRestore) {
        btnRestore.onclick = () => {
          restoreOriginalSeating();
          PURCHASE.modalTargetId = null;
          backdrop.remove();
          openSeatSwapModal(subjectId);
        };
      }

      if (btnCancel) {
        btnCancel.onclick = () => backdrop.remove();
      }

      if (btnConfirm) {
        btnConfirm.onclick = () => {
          if (!PURCHASE.modalTargetId) return;
          commitSeatSwap(subjectId, PURCHASE.modalTargetId, cost);
          backdrop.remove();
        };
      }
    };

    renderModal();
    backdrop.appendChild(modal);
    PURCHASE.root.appendChild(backdrop);
  }

  function commitSeatSwap(subjectId, targetId, cost) {
    if (!canAfford(subjectId)) return false;

    const desks = getSeatLayout();
    const subjectDeskIdx = desks.findIndex((d) => String(d.defaultOccupantId || '') === String(subjectId));
    const targetDeskIdx = desks.findIndex((d) => String(d.id || '') === String(targetId));

    if (subjectDeskIdx < 0 || targetDeskIdx < 0) return false;

    const Dashboard = getDashboard();
    const ok = Dashboard?.applyAward?.({
      studentId: String(subjectId),
      value: -Number(cost || 0),
      reason: 'seat_swap',
      phase: '7'
    });

    if (ok === false) return false;

    if (!String(desks[targetDeskIdx].defaultOccupantId || '').trim()) {
      desks[targetDeskIdx].defaultOccupantId = desks[subjectDeskIdx].defaultOccupantId;
      desks[subjectDeskIdx].defaultOccupantId = '';
    } else {
      const tmp = desks[subjectDeskIdx].defaultOccupantId;
      desks[subjectDeskIdx].defaultOccupantId = desks[targetDeskIdx].defaultOccupantId;
      desks[targetDeskIdx].defaultOccupantId = tmp;
    }

    writeSeatLayout(desks);
    render();
    return true;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  function mount(baseHost) {
    if (PURCHASE.mounted) return { el: PURCHASE.el };

    PURCHASE.mounted = true;
    PURCHASE.host = baseHost;
    ensureOriginalSeatingSnapshot();
    PURCHASE.phaseEntrySeatSwapCost = Math.max(1, Math.ceil(getAverageUnbankedActive() * 1.2));
    ensureStyles();

    const el = document.createElement('div');
    el.id = 'ce-purchase-root';

    const root = document.createElement('div');
    root.className = 'ce-purchase-shell-host';
    el.appendChild(root);

    PURCHASE.el = el;
    PURCHASE.root = el;

    try { baseHost?.appendChild?.(el); } catch {}

    const lb = qs('.leaderboard');
    if (lb) {
      PURCHASE.lbClickHandler = () => {
        if (PURCHASE.mounted) setTimeout(render, 0);
      };
      lb.addEventListener('click', PURCHASE.lbClickHandler, true);
    }

    const Bus = getBus();
    if (Bus?.on) {
      const rerender = () => render();
      Bus.on('scores:updated', rerender);
      Bus.on('roster:updated', rerender);
      Bus.on('seating:layout:updated', rerender);
      Bus.on('lesson:phaseChange', rerender);

      PURCHASE.offScores = () => { try { Bus.off?.('scores:updated', rerender); } catch {} };
      PURCHASE.offRoster = () => { try { Bus.off?.('roster:updated', rerender); } catch {} };
      PURCHASE.offSeating = () => { try { Bus.off?.('seating:layout:updated', rerender); } catch {} };
      PURCHASE.offPhase = () => { try { Bus.off?.('lesson:phaseChange', rerender); } catch {} };
    }

    render();
    return { el };
  }

  function unmount() {
    if (!PURCHASE.mounted) return;
    PURCHASE.mounted = false;
    PURCHASE.phaseEntrySeatSwapCost = null;
    PURCHASE.originalSeatingSnapshot = null;

    const lb = qs('.leaderboard');
    if (lb && PURCHASE.lbClickHandler) {
      try { lb.removeEventListener('click', PURCHASE.lbClickHandler, true); } catch {}
    }

    try { PURCHASE.offScores?.(); } catch {}
    try { PURCHASE.offRoster?.(); } catch {}
    try { PURCHASE.offSeating?.(); } catch {}
    try { PURCHASE.offPhase?.(); } catch {}

    PURCHASE.lbClickHandler = null;
    PURCHASE.offScores = null;
    PURCHASE.offRoster = null;
    PURCHASE.offSeating = null;
    PURCHASE.offPhase = null;
    PURCHASE.modalTargetId = null;

    try { PURCHASE.el?.remove?.(); } catch {}
    PURCHASE.el = null;
    PURCHASE.root = null;
    PURCHASE.host = null;
  }

  PURCHASE.mount = mount;
  PURCHASE.unmount = unmount;
  PURCHASE.setListings = (items = []) => {
    PURCHASE.listings = Array.isArray(items)
      ? items.map((item) => ({
          ...item,
          cost: getListingCost(item),
          effect: getListingEffect(item),
          pointsType: getListingPointsType(item),
          active: item?.active !== false
        }))
      : [];
    if (PURCHASE.mounted) render();
    return PURCHASE.listings.length;
  };

  window.__CE_PURCHASE_BASE = PURCHASE;
})();