// PC073 — Burnline Phase Bridge
// Canon-preserving bridge between the Lesson Phase Engine and Burnline Visuals.
// Additive-only. No modifications to existing modules.

// Ensure CE_BOOT exists
window.__CE_BOOT = window.__CE_BOOT || { modules: {} };
window.__CE_BOOT.modules = window.__CE_BOOT.modules || {};

// Use the global CE_BOOT event system
const Events = window.__CE_BOOT.modules.Events;

// Safety check — required canon structure
if (!Events || !Events.on || !Events.emit) {
  console.warn("[PC073] CE_BOOT Events unavailable — bridge not attached");
} else {

  console.log("[PC073] Burnline Phase Bridge active (canon mode)");

  // Listen to the REAL master phase engine
  Events.on("lesson:phaseChange", (evt) => {

    const detail = evt?.detail;

    // Canon extraction (same logic PC052 used)
    const next =
      detail?.to ??
      detail?.phase ??
      detail ??
      null;

    if (next == null) {
      console.warn("[PC073] Phase change received but could not parse phase:", evt);
      return;
    }

    console.log("[PC073] Lesson→Burnline phase:", next);

    // Forward to burnline visuals
    Events.emit("burnline:phaseChanged", {
      phase: next,
      ts: Date.now()
    });
  });

}
