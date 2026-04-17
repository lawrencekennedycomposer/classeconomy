/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC110-A0
   Module: challenge.input.pc110.js
   Purpose: Phase 6 Challenge Inline Stake Entry
   Notes:
     - Additive-only teacher input layer for Challenge stakes.
     - Must not emit lesson:phaseChange.
     - Must not persist state directly.
     - Must not replace core leaderboard rendering.
     - Writes through window.__CE_CHALLENGE_OVERLAY only.
     - Clicking the stake zone must NOT trigger normal tile selection.
   ========================================================= */

(() => {
  const MOD = {
    mounted: false,
    host: null,
    onClickCapture: null,
    onDocMouseDownCapture: null,
    onKeydownCapture: null,
    onFocusInCapture: null,
    activeStudentId: null,
    activeInputEl: null,
  };

  function getOverlayApi() {
    return window.__CE_CHALLENGE_OVERLAY || null;
  }

  function getDashboard() {
    return window.__CE_BOOT?.modules?.Dashboard ||
      window.__CE_BOOT?.CE?.modules?.Dashboard ||
      window.Dashboard ||
      null;
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

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function getLeaderboardHost() {
    return document.getElementById('leaderboard') || document.querySelector('.leaderboard');
  }

  function getRowByStudentId(studentId) {
    return document.querySelector(`.lb-item[data-student-id="${CSS.escape(String(studentId))}"]`);
  }

  function isRowLocked(row) {
    return row?.getAttribute?.('data-ch-locked') === '1';
  }

  function getEditableRows() {
    return qsa('.lb-item[data-student-id]')
      .filter((row) => row.getAttribute('data-ch-phase') === '6')
      .filter((row) => !isRowLocked(row))
      .filter((row) => !row.classList.contains('is-inactive'));
  }

  function getStudentOrder() {
    return getEditableRows().map((row) => String(row.dataset.studentId || '').trim()).filter(Boolean);
  }

  function ensureStyles() {
    if (document.getElementById('ce-challenge110-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-challenge110-styles';
    s.textContent = `
      .lb-item[data-ch-phase="6"] .ce-ch109-token-overlay{
        pointer-events:auto;
      }

      .lb-item[data-ch-phase="6"] .ce-ch109-stake{
        pointer-events:auto;
        cursor:text;
        user-select:none;
      }

      .lb-item[data-ch-phase="6"][data-ch-locked="1"] .ce-ch109-stake{
        cursor:default;
      }

      .ce-ch110-input{
        width:52px;
        height:22px;
        padding:1px 4px;
        border-radius:8px;
        border:1px solid rgba(125,211,252,0.75);
        background:rgba(15,23,42,0.92);
        color:#7dd3fc;
        font-size:14px;
        line-height:1;
        font-weight:900;
        text-align:right;
        outline:none;
        box-sizing:border-box;
        box-shadow:0 0 0 2px rgba(125,211,252,0.16);
      }

      .ce-ch110-input::-webkit-outer-spin-button,
      .ce-ch110-input::-webkit-inner-spin-button{
        -webkit-appearance:none;
        margin:0;
      }

      .ce-ch110-input[type=number]{
        appearance:textfield;
        -moz-appearance:textfield;
      }
    `;
    document.head.appendChild(s);
  }

  function getCurrentStake(studentId) {
    const api = getOverlayApi();
    const snap = api?.getSnapshot?.() || {};
    return Number(snap?.stakes?.[String(studentId)] || 0);
  }

  function clampDisplayValue(v) {
    const n = Math.max(0, Math.floor(Number(v || 0)));
    return Number.isFinite(n) ? n : 0;
  }

  function commitStake(studentId, rawValue) {
    const api = getOverlayApi();
    if (!api?.setStake) return 0;
    return Number(api.setStake(String(studentId), rawValue) || 0);
  }

  function restoreStakeText(studentId) {
    const row = getRowByStudentId(studentId);
    let stakeEl = row?.querySelector('.ce-ch109-stake');
    if (!stakeEl) {
      const overlay = row?.querySelector('.ce-ch109-token-overlay');
      if (!overlay) return;
      stakeEl = document.createElement('span');
      stakeEl.className = 'ce-ch109-stake';
      overlay.insertAdjacentElement('afterbegin', stakeEl);
    }

    const stake = getCurrentStake(studentId);
    if (stake > 0 && isPhase6(getPhaseNow())) {
      stakeEl.classList.add('is-visible');
      stakeEl.textContent = String(stake);
    } else {
      stakeEl.classList.remove('is-visible');
      stakeEl.textContent = '';
    }
  }

  function onDocMouseDownCapture(evt) {
    const input = MOD.activeInputEl;
    if (!input) return;

    const target = evt.target;
    if (target === input) return;
    if (target?.closest?.('[data-ch110-input="1"]')) return;
    if (target?.closest?.('.ce-ch109-token-overlay')) return;

    closeEditor({ commit: true, move: 0 });
  }

  function closeEditor({ commit = true, move = 0 } = {}) {
    const input = MOD.activeInputEl;
    const studentId = MOD.activeStudentId;
    if (!input || !studentId) return;

    const raw = input.value;
    const currentId = studentId;

    try {
      if (commit) commitStake(currentId, raw);
    } catch {}

    try { input.remove(); } catch {}
    MOD.activeInputEl = null;
    MOD.activeStudentId = null;

    restoreStakeText(currentId);


    if (move !== 0) {
      focusRelativeRow(currentId, move);
    }
  }

  function focusRelativeRow(fromStudentId, delta) {
    const ids = getStudentOrder();
    const idx = ids.indexOf(String(fromStudentId));
    if (idx === -1) return;

    const nextIdx = idx + Number(delta || 0);
    if (nextIdx < 0 || nextIdx >= ids.length) return;

    openEditor(ids[nextIdx]);
  }

  function openEditor(studentId) {
    const row = getRowByStudentId(studentId);
    if (!row) return false;
    if (isRowLocked(row)) return false;
    if (!isPhase6(getPhaseNow())) return false;

    const overlay = row.querySelector('.ce-ch109-token-overlay');
    let stakeEl = row.querySelector('.ce-ch109-stake');
    if (!overlay || !stakeEl) return false;

    if (MOD.activeStudentId && MOD.activeStudentId !== String(studentId)) {
      closeEditor({ commit: true, move: 0 });
    } else if (MOD.activeStudentId === String(studentId) && MOD.activeInputEl) {
      MOD.activeInputEl.focus();
      MOD.activeInputEl.select();
      return true;
    }

    const currentStake = getCurrentStake(studentId);
    stakeEl.textContent = '';
    stakeEl.classList.add('is-visible');

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'ce-ch110-input';
    input.value = currentStake > 0 ? String(currentStake) : '';
    input.min = '0';
    input.step = '1';
    input.id = `ce-ch110-input-${studentId}`;
    input.name = `ce-ch110-input-${studentId}`;
    input.setAttribute('data-ch110-input', '1');
    input.setAttribute('data-student-id', String(studentId));

    input.addEventListener('blur', () => {
      // handled by document mousedown instead
    });

    input.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    stakeEl.replaceWith(input);
    MOD.activeStudentId = String(studentId);
    MOD.activeInputEl = input;

    requestAnimationFrame(() => {
      try {
        input.focus();
        input.select();
      } catch {}
    });

    return true;
  }

  function isStakeZoneTarget(target) {
    if (!target) return false;
    return !!target.closest?.('.ce-ch109-token-overlay, .ce-ch109-stake, [data-ch110-input="1"]');
  }

  function onClickCapture(evt) {
    if (!isPhase6(getPhaseNow())) return;

    const inputTarget = evt.target.closest?.('[data-ch110-input="1"]');
    if (inputTarget) {
      evt.stopPropagation();
      return;
    }

    const stakeZone = evt.target.closest?.('.ce-ch109-token-overlay');
    if (!stakeZone) return;

    const row = stakeZone.closest('.lb-item[data-student-id]');
    const studentId = String(row?.dataset?.studentId || '').trim();
    if (!studentId) return;
    if (isRowLocked(row)) return;

    evt.preventDefault();
    evt.stopPropagation();
    evt.stopImmediatePropagation?.();

    openEditor(studentId);
  }

  function onFocusInCapture(evt) {
    if (!isPhase6(getPhaseNow())) return;
    if (!isStakeZoneTarget(evt.target)) return;
    evt.stopPropagation();
  }

  function onKeydownCapture(evt) {
    const input = MOD.activeInputEl;
    if (!input) return;
    if (evt.target !== input) return;

    if (evt.key === 'Enter') {
      evt.preventDefault();
      evt.stopPropagation();
      closeEditor({ commit: true, move: 0 });
      return;
    }

    if (evt.key === 'Tab') {
      evt.preventDefault();
      evt.stopPropagation();
      closeEditor({ commit: true, move: evt.shiftKey ? -1 : 1 });
      return;
    }

    if (evt.key === 'Escape') {
      evt.preventDefault();
      evt.stopPropagation();
      closeEditor({ commit: false, move: 0 });
      return;
    }

    if (evt.key === 'ArrowDown') {
      evt.preventDefault();
      evt.stopPropagation();
      closeEditor({ commit: true, move: 1 });
      return;
    }

    if (evt.key === 'ArrowUp') {
      evt.preventDefault();
      evt.stopPropagation();
      closeEditor({ commit: true, move: -1 });
    }
  }

  function mount() {
    if (MOD.mounted) return;
    MOD.mounted = true;
    MOD.host = getLeaderboardHost();
    if (!MOD.host) return;

    ensureStyles();

    MOD.onClickCapture = onClickCapture;
    MOD.onDocMouseDownCapture = onDocMouseDownCapture;
    MOD.onKeydownCapture = onKeydownCapture;
    MOD.onFocusInCapture = onFocusInCapture;

    MOD.host.addEventListener('click', MOD.onClickCapture, true);
    document.addEventListener('mousedown', MOD.onDocMouseDownCapture, true);
    MOD.host.addEventListener('keydown', MOD.onKeydownCapture, true);
    MOD.host.addEventListener('focusin', MOD.onFocusInCapture, true);
  }

  function unmount() {
    if (!MOD.mounted) return;
    MOD.mounted = false;

    try { closeEditor({ commit: false, move: 0 }); } catch {}

    try { MOD.host?.removeEventListener('click', MOD.onClickCapture, true); } catch {}
    try { document.removeEventListener('mousedown', MOD.onDocMouseDownCapture, true); } catch {}
    try { MOD.host?.removeEventListener('keydown', MOD.onKeydownCapture, true); } catch {}
    try { MOD.host?.removeEventListener('focusin', MOD.onFocusInCapture, true); } catch {}

    MOD.onClickCapture = null;
    MOD.onDocMouseDownCapture = null;
    MOD.onKeydownCapture = null;
    MOD.onFocusInCapture = null;
    MOD.host = null;
  }

  MOD.mount = mount;
  MOD.unmount = unmount;
  MOD.openEditor = openEditor;
  MOD.closeEditor = closeEditor;

  window.__CE_CHALLENGE_INPUT = MOD;
})();
