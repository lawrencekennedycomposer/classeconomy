/* =========================================================
   VERSION INTEGRITY BLOCK – VI-PC122-A2
   Module: input.gamepad.pc122.js
   Purpose: Global Gamepad Input Layer
   Notes:
     - Additive-only module
     - No DOM rendering
     - No phase interaction
     - Polls Gamepad API and normalises input → actions
     - Provides player-based input state (a / b)
========================================================= */

(function () {
  function emptyActions() {
    return {
      confirm: false,
      left: false,
      right: false,
      up: false,
      down: false,
      lane1: false,
      lane2: false,
      lane3: false,
      lane4: false
    };
  }

  const INPUT = {
    running: false,
    frameId: null,
    pads: [],

    players: {
      a: {
        padIndex: 0,
        connected: false,
        id: '',
        mapping: '',
        actions: emptyActions()
      },
      b: {
        padIndex: 1,
        connected: false,
        id: '',
        mapping: '',
        actions: emptyActions()
      }
    },

    listeners: new Set()
  };

  function getGamepads() {
    try {
      return navigator.getGamepads ? navigator.getGamepads() : [];
    } catch {
      return [];
    }
  }

  function axis(v, threshold = 0.4) {
    const n = Number(v || 0);
    return Math.abs(n) >= threshold ? n : 0;
  }

  function btn(pad, i) {
    return !!pad?.buttons?.[i]?.pressed;
  }

  function mapPadToActions(pad) {
    if (!pad) return emptyActions();

    const ax0 = axis(pad.axes?.[0]);
    const ax1 = axis(pad.axes?.[1]);

    return {
      confirm: btn(pad, 0),

      left: ax0 < 0 || btn(pad, 14),
      right: ax0 > 0 || btn(pad, 15),
      up: ax1 < 0 || btn(pad, 12),
      down: ax1 > 0 || btn(pad, 13),

      lane1: btn(pad, 6), // L2
      lane2: btn(pad, 4), // L1
      lane3: btn(pad, 5), // R1
      lane4: btn(pad, 7)  // R2
    };
  }

  function updatePlayer(side, pad) {
    const player = INPUT.players[side];
    if (!player) return;

    player.connected = !!pad?.connected;
    player.id = String(pad?.id || '');
    player.mapping = String(pad?.mapping || '');
    player.actions = mapPadToActions(pad);
  }

  function getPlayerState(side) {
    const player = INPUT.players[side];
    return player ? { ...player.actions } : emptyActions();
  }

  function getState() {
    return {
      pads: Array.from(INPUT.pads || []),
      players: {
        a: {
          padIndex: INPUT.players.a.padIndex,
          connected: INPUT.players.a.connected,
          id: INPUT.players.a.id,
          mapping: INPUT.players.a.mapping,
          actions: { ...INPUT.players.a.actions }
        },
        b: {
          padIndex: INPUT.players.b.padIndex,
          connected: INPUT.players.b.connected,
          id: INPUT.players.b.id,
          mapping: INPUT.players.b.mapping,
          actions: { ...INPUT.players.b.actions }
        }
      }
    };
  }

  function notify() {
    const snapshot = getState();
    INPUT.listeners.forEach(fn => {
      try { fn(snapshot); } catch {}
    });
  }

  function tick() {
    if (!INPUT.running) return;

    const pads = getGamepads();
    INPUT.pads = pads;

    updatePlayer('a', pads[INPUT.players.a.padIndex] || null);
    updatePlayer('b', pads[INPUT.players.b.padIndex] || null);

    notify();
    INPUT.frameId = requestAnimationFrame(tick);
  }

  function start() {
    if (INPUT.running) return;
    INPUT.running = true;
    INPUT.frameId = requestAnimationFrame(tick);
  }

  function stop() {
    INPUT.running = false;
    if (INPUT.frameId) cancelAnimationFrame(INPUT.frameId);
    INPUT.frameId = null;
  }

  function assignPadToPlayer(side, index) {
    if (!INPUT.players[side]) return;
    INPUT.players[side].padIndex = Number(index) || 0;
  }

  function getPadMeta() {
    return Array.from(INPUT.pads || []).map((pad, index) => ({
      index,
      connected: !!pad?.connected,
      id: String(pad?.id || ''),
      mapping: String(pad?.mapping || '')
    }));
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    INPUT.listeners.add(fn);
    return () => INPUT.listeners.delete(fn);
  }

  function unsubscribe(fn) {
    INPUT.listeners.delete(fn);
  }

  const API = Object.freeze({
    start,
    stop,
    getState,
    getPlayerState,
    getPadMeta,
    assignPadToPlayer,
    subscribe,
    unsubscribe
  });

  window.CE_INPUT = API;
})();