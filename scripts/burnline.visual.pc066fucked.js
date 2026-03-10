/* =========================================================
   PC066 — Canonical Burnline Visual Engine (Full Rewrite)
   USER AUTH: Full internal rewrite allowed
   Scope: VISUALS ONLY — logic resides in Core/Ticker/Bridge
========================================================= */

(function () {
  const CE = window.__CE_BOOT;
  if (!CE || !CE.modules) return;

  const Events = CE.modules.Events;

  // Defensive getter (Core may not exist at first render)
  const Core = () => CE.modules.BurnlineCore;

  /* ---------------------------------------------------------
     Canon Labels
  --------------------------------------------------------- */
  const LABELS = {
    1: "Welcome",
    2: "Coin Flip",
    3: "STW",
    4: "Work",
    5: "Competition",
    6: "Challenge",
    7: "Purchases"
  };

  /* ---------------------------------------------------------
     Colors & Style Constants
  --------------------------------------------------------- */
  const COLORS = {
    1: "#88AFCF",
    2: "#88AFCF",
    3: "#6FC3FF",
    4: "#6FDAA3",
    5: "#8CE88B",
    6: "#F5B65A",
    7: "#D19CFF",
  };

  const ACTIVE_OPACITY = 0.85;
  const INACTIVE_OPACITY = 0.35;
  const STUB = 0.04;              // 4% stub for phases 1–2
  const PROGRESS_WIDTH = 7;       // white progress bar width

  /* ---------------------------------------------------------
     DOM Helpers
  --------------------------------------------------------- */
  function clearRoot() {
    const root = document.getElementById("burnline");
    if (!root) return null;
    root.innerHTML = "";
    return root;
  }

  function createPill(root) {
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.width = "100%";
    wrap.style.height = "100%";
    wrap.style.position = "relative";

    // main pill row
    const pill = document.createElement("div");
    pill.className = "pc066-pill";
    pill.style.flex = "1 1 auto";
    pill.style.width = "100%";
    pill.style.display = "flex";
    pill.style.borderRadius = "999px";
    pill.style.overflow = "hidden";
    pill.style.position = "relative";

    // label row
    const labels = document.createElement("div");
    labels.className = "pc066-label-row";
    labels.style.display = "flex";
    labels.style.width = "100%";
    labels.style.fontSize = "10px";
    labels.style.textAlign = "center";
    labels.style.opacity = "0.75";
    labels.style.marginTop = "2px";

    wrap.appendChild(pill);
    wrap.appendChild(labels);
    root.appendChild(wrap);

    return { pill, labels };
  }

  /* ---------------------------------------------------------
     MODE 1 — Equal widths during phases 1–2
  --------------------------------------------------------- */
  function renderMode1() {
    const root = clearRoot();
    if (!root) return;

    const C = Core();
    const st = C && C.getState ? C.getState() : { phase: 1 };

    const { pill, labels } = createPill(root);

    for (let p = 1; p <= 7; p++) {
      const seg = document.createElement("div");
      seg.style.flex = "1";
      seg.style.background = COLORS[p];

      const isActive = String(st.phase) === String(p);
      seg.style.opacity = isActive ? ACTIVE_OPACITY : INACTIVE_OPACITY;
      seg.style.filter = isActive ? "brightness(1.15)" : "none";

      seg.style.borderRight = "1px solid rgba(255,255,255,0.15)";
      pill.appendChild(seg);

      const lab = document.createElement("div");
      lab.style.flex = "1";
      lab.innerText = LABELS[p];
      labels.appendChild(lab);
    }
  }

  /* ---------------------------------------------------------
     MODE 2 — Timed burnline (phases 3–7)
  --------------------------------------------------------- */
  function renderMode2() {
    const root = clearRoot();
    if (!root) return;

    const C = Core();
    if (!C || !C.getState) return;
    const st = C.getState();
    if (!st.phaseBoundaries) return;

    const pb = st.phaseBoundaries;

    const { pill, labels } = createPill(root);

    // real durations
    const d3 = pb.p3End - st.startTime;
    const d4 = pb.p4End - pb.p3End;
    const d5 = pb.p5End - pb.p4End;
    const d6 = pb.p6End - pb.p5End;
    const d7 = pb.p7End - pb.p6End;
    const timedTotal = d3 + d4 + d5 + d6 + d7;

    // percent scaling
    const scale = 1 - (STUB + STUB);
    const widths = [
      STUB,
      STUB,
      (d3 / timedTotal) * scale,
      (d4 / timedTotal) * scale,
      (d5 / timedTotal) * scale,
      (d6 / timedTotal) * scale,
      (d7 / timedTotal) * scale,
    ];

    // build 7 segments
    for (let p = 1; p <= 7; p++) {
      const seg = document.createElement("div");
      seg.style.flex = "0 0 auto";
      seg.style.width = (widths[p - 1] * 100) + "%";
      seg.style.background = COLORS[p];

      const isActive = String(st.phase) === String(p);
      seg.style.opacity = isActive ? ACTIVE_OPACITY : INACTIVE_OPACITY;
      seg.style.filter = isActive ? "brightness(1.15)" : "none";

      seg.style.borderRight = "1px solid rgba(255,255,255,0.15)";
      pill.appendChild(seg);

      const lab = document.createElement("div");
      lab.style.flex = "0 0 auto";
      lab.style.width = (widths[p - 1] * 100) + "%";
      lab.innerText = LABELS[p];
      labels.appendChild(lab);
    }

    /* -----------------------------
       PROGRESS BAR (white vertical)
       starts at Phase 3 (STW)
    ----------------------------- */
    // P3-ALIGNED PROGRESS — pct = 0 at true Phase 3 start
    const now = Date.now();
    const phase3Start =
        st.phaseBoundaries.p3End -
        st.g1Duration -
        st.g2Duration;

    const total = st.bellTime - phase3Start;
    const pct = Math.min(
        Math.max((now - phase3Start) / total, 0),
        1
    );
    const progress = document.createElement("div");
    progress.className = "pc066-progress-line";
    progress.style.position = "absolute";
    progress.style.top = "2px";
    progress.style.bottom = "2px";
    progress.style.width = PROGRESS_WIDTH + "px";
    progress.style.background = "white";
    progress.style.boxShadow = "0 0 6px rgba(255,255,255,0.8)";
    progress.style.borderRadius = "4px";

    const offset = STUB * 2; // 8% reserved for phases 1–2
    const scaledPct = offset + pct * (1 - offset); // map [0,1] → [0.08,1]
    progress.style.left = `calc(${scaledPct * 100}% - ${PROGRESS_WIDTH / 2}px)`;
    pill.appendChild(progress);
  }

  /* ---------------------------------------------------------
     updateHighlight — re-render appropriate mode
  --------------------------------------------------------- */
  function updateHighlight(phase) {
    // PC066 PATCH — Correct burnline gating:
    // Phase 1–2 → Mode 1 only
    if (phase < 3) {
    renderMode1();
    return;
   }

  // Phase 3+ → Mode 2 (timed)
    renderMode2();
  }

  /* ---------------------------------------------------------
     EVENT LISTENERS (same API surface)
  --------------------------------------------------------- */
  Events.on("lesson:phaseChange", ({ detail }) => {
    updateHighlight(detail.phase);
  });

  Events.on("burnline:phaseChanged", ({ detail }) => {
    updateHighlight(detail.phase);
  });

  Events.on("burnline:tick", () => {
    const C = Core();
    if (!C || !C.getState) return;
    const st = C.getState();
    updateHighlight(st.phase);
  });

  Events.on("burnline:bootConfigured", () => {
    const C = Core();
    if (!C || !C.getState) return;
    const st = C.getState();
    updateHighlight(st.phase);
  });

  /* ---------------------------------------------------------
     EXPORT — BurnlineVisual (compat)
  --------------------------------------------------------- */
  CE.modules.BurnlineVisual = {
    init: renderMode1,
    renderEqualLayout: renderMode1,
    updateHighlight
  };

  /* ---------------------------------------------------------
     PC052 Compatibility Shim
  --------------------------------------------------------- */
  CE.modules.Burnline = CE.modules.Burnline || {};

  CE.modules.Burnline.previewLabel = function (phase) {
    return LABELS[phase] || `P${phase}`;
  };

  CE.modules.Burnline.refreshBurnlineHints = function () {};
  CE.modules.Burnline.setSlicePhaseMap = function () {};
  CE.modules.Burnline.setLessonWindow = function () {};
  CE.modules.Burnline.mountSlicePill = function () {};

  CE.modules.Burnline.PHASE_ORDER = ["1","2","3","4","5","6","7"];

})();
