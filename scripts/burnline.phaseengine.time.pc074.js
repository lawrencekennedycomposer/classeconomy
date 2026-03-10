// =========================================================
// PC074 — Burnline Time-Phase Engine
// Converts time → burnline phase.
// Works alongside PC064, PC065, PC066, PC071, PC072.
// Does not modify existing systems; additive-only.
// =========================================================

(function () {
  const CE = window.__CE_BOOT;
  if (!CE || !CE.modules) {
    console.error("[PC074] CE_BOOT not ready.");
    return;
  }

  const Events = CE.modules.Events;
  const Core = CE.modules.BurnlineCore;
  const Visual = CE.modules.BurnlineVisual; // for updateHighlight()

  if (!Events || !Core) {
    console.error("[PC074] Missing dependencies.");
    return;
  }

  console.log("[PC074] Burnline Time-Phase Engine active.");

  function getBurnlineMode() {
    return window.__CE_BOOT?.lessonConfig?.burnlineMode || 'timeline';
  }


  // -------------------------------------------------------
  //  Compute phase based on time and boundaries
  // -------------------------------------------------------
  function computePhase(now, bounds) {
    const { p3End, p4End, p5End, p6End, p7End } = bounds;

    if (now < p3End) return 3;
    if (now < p4End) return 4;
    if (now < p5End) return 5;
    if (now < p6End) return 6;
    if (now < p7End) return 7;

    return 7; // terminal phase
  }

  // -------------------------------------------------------
  //  Listen to burnline:tick (every second)
  // -------------------------------------------------------
  Events.on("burnline:tick", (e) => {
    // Advisory mode: time engine must not assert phase/highlight.
    if (getBurnlineMode() === 'advisory') return;

    const state = e.detail?.state || Core.getState();
    const now = e.detail?.now || Date.now();
    const bounds = state.phaseBoundaries;
    if (!bounds) return;

    const phase = computePhase(now, bounds);

    // -----------------------------------------------------
    // Write phase back to Core (additive field)
    // -----------------------------------------------------
    state.phase = phase;

    // -----------------------------------------------------
    // Notify system
    // -----------------------------------------------------
    Events.emit("burnline:phaseChanged", { phase });

    // Also trigger visual update (via PC066)
    if (Visual && typeof Visual.updateHighlight === "function") {
      Visual.updateHighlight(phase);
    }
  });
})();
