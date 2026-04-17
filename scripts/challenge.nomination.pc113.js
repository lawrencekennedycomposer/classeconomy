/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC113-A0
   Module: challenge.nomination.pc113.js
   Purpose: Phase 6 Challenge Activity Nomination Flow
   Notes:
     - Additive-only nomination layer for Challenge Phase.
     - Must not emit lesson:phaseChange.
     - Must not persist state directly.
     - Reads committed duel queue from window.__CE_CHALLENGE_COMMIT.
     - Writes wheel slots through window.__CE_CHALLENGE_WHEEL.
     - Session-only state.
     - PC113 scope:
     -   * identify current duel from committed lineup
     -   * allow 2 nominations per duelist
     -   * allow duplicate activities
     -   * populate exactly 4 wheel slots
     -   * expose current duel + selected activity state for next PC
   ========================================================= */

(() => {
  const MOD = {
    mounted: false,
    host: null,
    root: null,
    currentDuelIndex: 0,
    selectedActivity: null,
    nominationsByPairKey: new Map(),
    activities: [
      'Target Tap',
      'PicklePong',
      'Wizard Duel',
      'Neon Trails',
      'Rhythm Strike',
    ]
  };

  function getBus() {
    return window.__CE_BOOT?.modules?.Events ||
      window.__CE_BOOT?.CE?.modules?.Events ||
      null;
  }

  function getCommitApi() {
    return window.__CE_CHALLENGE_COMMIT || null;
  }

  function getWheelApi() {
    return window.__CE_CHALLENGE_WHEEL || null;
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

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function emitNominationUpdate(type) {
    const payload = {
      type: String(type || 'updated'),
      duelIndex: MOD.currentDuelIndex,
      selectedActivity: MOD.selectedActivity,
      ts: Date.now()
    };
    try { getBus()?.emit?.('challenge:nominationsUpdated', payload); } catch {}
  }

  function ensureStyles() {
    if (document.getElementById('ce-challenge113-styles')) return;

    const s = document.createElement('style');
    s.id = 'ce-challenge113-styles';
    s.textContent = `
      #ce-ch113-root{
        position:absolute;
        inset:12px 12px 12px 12px;
        z-index:4;
        pointer-events:none;
        display:grid;
        grid-template-columns:minmax(320px, 420px) 1fr;
        gap:12px;
        font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }

      .ce-ch113-left,
      .ce-ch113-right{
        min-height:0;
      }

      .ce-ch113-right{
        display:flex;
        align-items:flex-start;
        justify-content:center;
      }

      .ce-ch113-card{
        pointer-events:auto;
        width:min(100%, 420px);
        background:rgba(17,21,26,0.96);
        border:1px solid rgba(255,255,255,0.10);
        border-radius:16px;
        box-shadow:0 12px 30px rgba(0,0,0,0.25);
        color:#e8eef2;
        padding:14px;
        box-sizing:border-box;
        display:flex;
        flex-direction:column;
        gap:12px;
      }

      .ce-ch113-title{
        font-size:14px;
        font-weight:900;
        letter-spacing:0.04em;
        text-transform:uppercase;
        opacity:0.9;
      }

      .ce-ch113-duel{
        padding:12px;
        border-radius:12px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.08);
      }

      .ce-ch113-names{
        font-size:18px;
        font-weight:900;
        line-height:1.2;
      }

      .ce-ch113-meta{
        margin-top:6px;
        font-size:13px;
        opacity:0.82;
      }

      .ce-ch113-grid{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
      }

      .ce-ch113-col{
        display:flex;
        flex-direction:column;
        gap:8px;
        padding:10px;
        border-radius:12px;
        background:rgba(255,255,255,0.05);
        border:1px solid rgba(255,255,255,0.08);
      }

      .ce-ch113-label{
        font-size:12px;
        text-transform:uppercase;
        opacity:0.74;
        font-weight:900;
      }

      .ce-ch113-select{
        width:100%;
        border-radius:10px;
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(255,255,255,0.07);
        color:#fff;
        padding:10px;
        box-sizing:border-box;
        font-weight:800;
      }

      .ce-ch113-actions{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
      }

      .ce-ch113-btn{
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(255,255,255,0.08);
        color:#fff;
        padding:10px 12px;
        border-radius:12px;
        font-weight:900;
        cursor:pointer;
      }

      .ce-ch113-btn:hover{
        background:rgba(255,255,255,0.12);
      }

      .ce-ch113-btn--primary{
        background:rgba(80,140,255,0.32);
        border-color:rgba(80,140,255,0.42);
      }

      .ce-ch113-btn[disabled]{
        opacity:0.45;
        cursor:not-allowed;
      }

      .ce-ch113-status{
        font-size:13px;
        line-height:1.4;
        padding:10px 12px;
        border-radius:12px;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.08);
      }
    `;
    document.head.appendChild(s);
  }

  function getHost() {
    return document.getElementById('activity-canvas');
  }

  function getCommittedSnapshot() {
    return getCommitApi()?.getCommittedSnapshot?.() || null;
  }

  function getPairs() {
    const snap = getCommittedSnapshot();
    return Array.isArray(snap?.orderedPairs) ? snap.orderedPairs : [];
  }

  function getCurrentDuel() {
    const pairs = getPairs();
    return pairs[MOD.currentDuelIndex] || null;
  }

  function getPairKey(pair) {
    return String(pair?.pairKey || '');
  }

  function getNominationState(pair) {
    const key = getPairKey(pair);
    if (!key) return null;
    if (!MOD.nominationsByPairKey.has(key)) {
      MOD.nominationsByPairKey.set(key, {
        a1: '',
        a2: '',
        b1: '',
        b2: ''
      });
    }
    return MOD.nominationsByPairKey.get(key);
  }

  function getWheelSlotsFromState(state) {
    return [state?.a1 || null, state?.a2 || null, state?.b1 || null, state?.b2 || null];
  }

  function syncWheelFromCurrentDuel() {
    const pair = getCurrentDuel();
    const wheel = getWheelApi();
    if (!wheel) return;
    if (!pair) {
      wheel.clearSlots?.();
      return;
    }
    const state = getNominationState(pair);
    wheel.setSlots?.(getWheelSlotsFromState(state));
  }

  function areAllSlotsFilled(state) {
    return !!(state?.a1 && state?.a2 && state?.b1 && state?.b2);
  }

  function setNomination(field, value) {
    const pair = getCurrentDuel();
    if (!pair) return;
    const state = getNominationState(pair);
    if (!state || !Object.prototype.hasOwnProperty.call(state, field)) return;
    state[field] = String(value || '');
    MOD.selectedActivity = null;
    syncWheelFromCurrentDuel();
    render();
    emitNominationUpdate('setNomination');
  }

  function spinWheel() {
    const pair = getCurrentDuel();
    if (!pair) return Promise.resolve(false);
    const state = getNominationState(pair);
    if (!areAllSlotsFilled(state)) return Promise.resolve(false);

    return getWheelApi()?.spinRandom?.().then(() => {
      const idx = getWheelApi()?.getLastResultIndex?.();
      const slots = getWheelSlotsFromState(state);
      MOD.selectedActivity = idx == null ? null : (slots[idx] || null);
      render();
      emitNominationUpdate('spinWheel');
      return true;
    }) || Promise.resolve(false);
  }

  function gotoNextDuel() {
    const pairs = getPairs();
    if (!pairs.length) return false;
    MOD.currentDuelIndex = Math.min(MOD.currentDuelIndex + 1, pairs.length - 1);
    MOD.selectedActivity = null;
    syncWheelFromCurrentDuel();
    render();
    emitNominationUpdate('gotoNextDuel');
    return true;
  }

  function resetCurrentNominations() {
    const pair = getCurrentDuel();
    if (!pair) return false;
    const state = getNominationState(pair);
    state.a1 = '';
    state.a2 = '';
    state.b1 = '';
    state.b2 = '';
    MOD.selectedActivity = null;
    syncWheelFromCurrentDuel();
    render();
    emitNominationUpdate('resetCurrentNominations');
    return true;
  }

  function render() {
    if (!MOD.root) return;

    MOD.root.innerHTML = '';
    if (!isPhase6(getPhaseNow())) return;
    syncWheelFromCurrentDuel();
  }


  function mount() {
    if (MOD.mounted) return;
    MOD.mounted = true;

    MOD.host = getHost();
    if (!MOD.host) return;

    ensureStyles();

    MOD.root = document.createElement('div');
    MOD.root.id = 'ce-ch113-root';
    MOD.host.appendChild(MOD.root);

    render();

  }

  function unmount() {
    if (!MOD.mounted) return;
    MOD.mounted = false;


    try { MOD.root?.remove?.(); } catch {}
    MOD.root = null;
    MOD.host = null;
    MOD.selectedActivity = null;
  }

  MOD.mount = mount;
  MOD.unmount = unmount;
  MOD.spinWheel = spinWheel;
  MOD.gotoNextDuel = gotoNextDuel;
  MOD.resetCurrentNominations = resetCurrentNominations;
  MOD.getCurrentDuel = getCurrentDuel;
  MOD.getSelectedActivity = () => MOD.selectedActivity;
  MOD.getCurrentDuelIndex = () => MOD.currentDuelIndex;
  MOD.getCurrentNominationState = () => {
    const pair = getCurrentDuel();
    const state = pair ? getNominationState(pair) : null;
    return state ? { ...state } : null;
  };
  MOD.getActivities = () => MOD.activities.slice();
  MOD.setNomination = setNomination;

  MOD._setSelectedActivity = (value) => {
    MOD.selectedActivity = value ? String(value) : null;
    emitNominationUpdate('spinResult');
  };

  window.__CE_CHALLENGE_NOMINATION = MOD;
})();
