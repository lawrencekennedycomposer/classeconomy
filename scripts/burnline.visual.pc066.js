/* =========================================================
   PC066 — Burnline Visuals (Persistent DOM)
   Scope: VISUALS ONLY — time/phase logic lives in Core/Ticker/Bridge
========================================================= */

(function () {
  const CE = window.__CE_BOOT;
  if (!CE || !CE.modules) return;

  const Events = CE.modules.Events;
  const Core   = () => CE.modules.BurnlineCore;
  const getBurnlineMode = () => (CE.lessonConfig && CE.lessonConfig.burnlineMode) ? CE.lessonConfig.burnlineMode : "timeline";

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

  const ACTIVE_OPACITY   = 0.85;
  const INACTIVE_OPACITY = 0.35;
  const STUB             = 0.04;  // 4% stub for phases 1–2
  const PROGRESS_WIDTH   = 7;     // white progress bar width (px)

  /* ---------------------------------------------------------
     DOM Cache — persistent structure
  --------------------------------------------------------- */
  const dom = {
    root: null,
    wrap: null,
    pill: null,
    labelsRow: null,
    segments: [],   // 1..7
    labels: [],     // 1..7
    progress: null, // vertical white line
  };

  /* ---------------------------------------------------------
     Ensure Base Structure Exists (build once, then reuse)
  --------------------------------------------------------- */
  function ensureStructure() {
    const root = document.getElementById("burnline");
    if (!root) return null;

    // If already built and still attached, reuse.
    if (
      dom.root === root &&
      dom.pill &&
      dom.labelsRow &&
      dom.segments.length === 8 && // we store from index 1..7
      dom.labels.length === 8 &&
      dom.progress
    ) {
      return root;
    }

    // Rebuild structure (FIRST TIME, or after a hard reset of #burnline)
    root.innerHTML = "";
    dom.root = root;

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.width = "100%";
    wrap.style.height = "100%";
    wrap.style.position = "relative";

    const pill = document.createElement("div");
    pill.className = "pc066-pill";
    pill.style.flex = "1 1 auto";
    pill.style.width = "100%";
    pill.style.display = "flex";
    pill.style.borderRadius = "999px";
    pill.style.overflow = "hidden";
    pill.style.position = "relative";
    pill.style.height = "100%";

    const barRow = document.createElement("div");
    barRow.className = "pc066-bar-row";
    barRow.style.display = "flex";
    barRow.style.width = "100%";
    barRow.style.gap = "8px";
    barRow.style.flex = "1 1 auto";
    barRow.style.alignItems = "stretch";

    const timerBox = document.createElement("div");
    timerBox.className = "pc066-timer-box";
    timerBox.style.flex = "0 0 70px";
    timerBox.style.display = "flex";
    timerBox.style.alignItems = "center";
    timerBox.style.justifyContent = "center";
    timerBox.style.height = "100%";
    timerBox.style.fontSize = "16px";
    timerBox.style.fontWeight = "900";
    timerBox.style.lineHeight = "1";
    timerBox.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    timerBox.style.opacity = "0.9";
    timerBox.style.userSelect = "none";
    timerBox.innerText = "--:--";

    const labelsRow = document.createElement("div");
    labelsRow.className = "pc066-label-row";
    labelsRow.style.display = "flex";
    labelsRow.style.width = "calc(100% - 78px)";
    labelsRow.style.fontSize = "10px";
    labelsRow.style.textAlign = "center";
    labelsRow.style.opacity = "0.75";
    labelsRow.style.marginTop = "2px";

    dom.segments = new Array(8);
    dom.labels   = new Array(8);

    // Create 7 segments + 7 label cells, store references
    for (let p = 1; p <= 7; p++) {
      const seg = document.createElement("div");
      seg.classList.add("pc066-seg");
      
      pill.appendChild(seg);
      dom.segments[p] = seg;

      const lab = document.createElement("div");
      lab.style.flex = "1 1 0";
      lab.style.minWidth = "0";
      labelsRow.appendChild(lab);
      dom.labels[p] = lab;
    }

    // Single persistent progress line
    const progress = document.createElement("div");
    progress.className = "pc066-progress-line";
    progress.style.position = "absolute";
    progress.style.top = "2px";
    progress.style.bottom = "2px";
    progress.style.width = PROGRESS_WIDTH + "px";
    progress.style.background = "white";
    progress.style.boxShadow = "0 0 6px rgba(255,255,255,0.8)";
    progress.style.borderRadius = "4px";
    pill.appendChild(progress);

    wrap.appendChild(pill);
    barRow.appendChild(pill);
    barRow.appendChild(timerBox);
    wrap.appendChild(barRow);
    wrap.appendChild(labelsRow);
    root.appendChild(wrap);

    dom.wrap      = wrap;
    dom.pill      = pill;
    dom.timerBox  = timerBox;
    dom.labelsRow = labelsRow;
    dom.progress  = progress;

    return root;
  }

  /* ---------------------------------------------------------
     Apply Highlight (shared between modes)
     NOTE: relies on CSS transitions for fade (opacity/filter/box-shadow)
  --------------------------------------------------------- */
  function applyHighlight(currentPhase, modeBrightness) {
    for (let p = 1; p <= 7; p++) {
      const seg = dom.segments[p];
      if (!seg) continue;

      const isActive = String(currentPhase) === String(p);

      if (isActive) {
        seg.style.opacity = ACTIVE_OPACITY;
        seg.style.filter  = "brightness(" + modeBrightness + ")";
        seg.classList.add("pc066-seg-active");
      } else {
        seg.style.opacity = INACTIVE_OPACITY;
        seg.style.filter  = "none";
        seg.classList.remove("pc066-seg-active");
      }

      seg.style.background  = COLORS[p];
      seg.style.borderRight = "1px solid rgba(255,255,255,0.15)";
    }

    // Labels text stays canonical
    for (let p = 1; p <= 7; p++) {
      const lab = dom.labels[p];
      if (!lab) continue;
      lab.innerText = LABELS[p];
    }
  }

  /* ---------------------------------------------------------
     MODE 1 — Equal widths during phases 1–2
  --------------------------------------------------------- */
  function renderMode1(currentPhase) {
    const root = ensureStructure();
    if (!root) return;

    const pill      = dom.pill;
    const labelsRow = dom.labelsRow;
    if (!pill || !labelsRow) return;

    for (let p = 1; p <= 7; p++) {
      const seg = dom.segments[p];
      const lab = dom.labels[p];
      if (!seg || !lab) continue;

      // Equal widths
      seg.style.flex = "1 1 0";
      seg.style.width = "";
      seg.style.background = COLORS[p];

      lab.style.flex = "1 1 0";
      lab.style.width = "";
      lab.innerText = LABELS[p];
    }

    // No progress line in Mode 1
    if (dom.progress) {
      dom.progress.style.display = "none";
    }

    // Slightly stronger brightness for Mode 1
    applyHighlight(currentPhase, 1.35);
  }

  /* ---------------------------------------------------------
     MODE 2 — Timed burnline (phases 3–7)
  --------------------------------------------------------- */
  function renderMode2(currentPhase, st) {
    const root = ensureStructure();
    if (!root) return;
    if (!st || !st.phaseBoundaries) return;

    const pill      = dom.pill;
    const labelsRow = dom.labelsRow;
    if (!pill || !labelsRow) return;

    const pb = st.phaseBoundaries;

    // Real durations
    const d3 = pb.p3End - st.startTime;
    const d4 = pb.p4End - pb.p3End;
    const d5 = pb.p5End - pb.p4End;
    const d6 = pb.p6End - pb.p5End;
    const d7 = pb.p7End - pb.p6End;
    const timedTotal = d3 + d4 + d5 + d6 + d7;

    // Percent scaling
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

    for (let p = 1; p <= 7; p++) {
      const seg = dom.segments[p];
      const lab = dom.labels[p];
      if (!seg || !lab) continue;

      seg.style.flex  = "0 0 auto";
      seg.style.width = (widths[p - 1] * 100) + "%";
      seg.style.background = COLORS[p];

      lab.style.flex  = "0 0 auto";
      lab.style.width = (widths[p - 1] * 100) + "%";
      lab.innerText = LABELS[p];
    }

    // Progress line is active in Mode 2
    if (dom.progress) {
      dom.progress.style.display = "block";

      const p3Start = st.startTime;
      const now     = Date.now();
      const total   = st.bellTime - p3Start;
      const pct     = Math.min(Math.max((now - p3Start) / total, 0), 1);

      const offset    = STUB * 2;              // 8% reserved for phases 1–2
      const scaledPct = offset + pct * (1 - offset); // map [0,1] → [0.08,1]

      dom.progress.style.left =
        "calc(" + (scaledPct * 100) + "% - " + (PROGRESS_WIDTH / 2) + "px)";
    }

    // Slightly softer brightness for Mode 2
    applyHighlight(currentPhase, 1.15);
  }

  /* ---------------------------------------------------------
     MODE A — Advisory Phase Bar (NO timeline authority)
     - Equal-width segments across ENABLED phases only
     - No moving progress line
     - Click emits ui:phaseRequestEnter (PhaseGate handles)
  --------------------------------------------------------- */
  function renderAdvisory(currentPhase) {
    const root = ensureStructure();
    if (!root) return;

    const cfg = CE.lessonConfig || {};
    // Default enablement (Phase 1/7 always on; if unset assume all enabled)
    const enabled = Object.assign({ 1: true, 7: true }, cfg.enabledPhases || {});
    if (!cfg.enabledPhases) {
      // If nothing configured yet, assume phases 2–6 enabled (safe default)
      enabled[2] = true; enabled[3] = true; enabled[4] = true; enabled[5] = true; enabled[6] = true;
    }

    // Count enabled phases (defensive)
    let activeCount = 0;
    for (let p = 1; p <= 7; p++) if (enabled[p]) activeCount++;
    if (!activeCount) return;

    for (let p = 1; p <= 7; p++) {
      const seg = dom.segments[p];
      const lab = dom.labels[p];
      if (!seg || !lab) continue;

      if (!enabled[p]) {
        seg.style.display = "none";
        lab.style.display = "none";
        seg.onclick = null;
        continue;
      }

      seg.style.display = "";
      lab.style.display = "";

      // Equal widths (enabled phases share the row)
      seg.style.flex = "1 1 0";
      seg.style.width = "";
      seg.style.background = COLORS[p];
      // Make it obviously clickable + ensure no CSS disables interaction
      seg.style.cursor = "pointer";
      seg.style.pointerEvents = "auto";

      lab.style.flex = "1 1 0";
      lab.style.width = "";
      lab.innerText = LABELS[p];

      // CLICK → PhaseGate request (UI-only, no authority here)
      seg.onclick = () => {
      Events.emit("ui:phaseRequestEnter", { toPhase: p, source: "burnline", ts: Date.now() });
      };
    }

    // No progress line in advisory mode
    if (dom.progress) dom.progress.style.display = "none";

    applyHighlight(currentPhase, 1.25);
  }


  /* ---------------------------------------------------------
     UPDATE HIGHLIGHT — single entry-point for visuals
  --------------------------------------------------------- */
  function updateHighlight(phase) {
    const C  = Core();
    const st = C && C.getState ? C.getState() : { phase: 1 };
    const pg = window.__CE_BOOT && window.__CE_BOOT.phaseGateState;
    const current =
      (phase != null ? phase : null) ??
      (pg && pg.currentPhase != null ? pg.currentPhase : null) ??
      (st && st.phase != null ? st.phase : 1);

    // ---- ADVISORY MODE SHORT-CIRCUIT ----
    if (getBurnlineMode() === "advisory") {
      renderAdvisory(current);
      return;
    }

    if (!st.phaseBoundaries || current <= 2) {
      // Phases 1–2, or pre-boot — equal layout
      renderMode1(current);
    } else {
      // Phases 3–7 — timed layout
      renderMode2(current, st);
    }
  }


  function fmtMMSS(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  }

  function updateTimerSlot() {
    const box = dom && dom.timerBox;
    if (!box) return;

    const st = window.__CE_BOOT && window.__CE_BOOT.phaseGateState;
    if (!st || !st.currentPhase) {
      box.innerText = "--:--";
      box.style.color = "#cfcfcf";
      return;
    }

    const p = Number(st.currentPhase);
    const now = Date.now();

    // Phases 3–6: countdown (yellow) if active, otherwise overtime elapsed (grey)
    if (p >= 3 && p <= 6) {
      if (st.countdown && st.countdown.endsAt) {
        const remaining = st.countdown.endsAt - now;
        box.innerText = fmtMMSS(remaining);
        box.style.color = "rgb(255, 214, 74)";
        return;
      }
      if (st.overtimeSince) {
        box.innerText = fmtMMSS(now - st.overtimeSince);
        box.style.color = "#cfcfcf";
        return;
      }
      box.innerText = "00:00";
      box.style.color = "#cfcfcf";
      return;
    }

    // Phases 1,2,7: grey elapsed since phase entry
    if (st.phaseEnteredAt) {
      box.innerText = fmtMMSS(now - st.phaseEnteredAt);
      box.style.color = "#cfcfcf";
      return;
    }

    box.innerText = "--:--";
    box.style.color = "#cfcfcf";
  }

  /* ---------------------------------------------------------
     EVENT WIRING
     - Lesson phase changes
     - Burnline boot
     - Burnline phase changes
     - Burnline ticks (for progress line + subtle updates)
  --------------------------------------------------------- */

  // Lesson side → keep in sync (safety)
  Events.on("lesson:phaseChange", ({ detail }) => {
    const next = detail?.to ?? detail?.phase ?? detail;
    const p = Number(next);
    if (Number.isFinite(p) && p >= 1 && p <= 7) {
      updateHighlight(p);
      return;
    }
    // Advisory safety: fall back to PhaseGateState if payload is malformed
    const pg = window.__CE_BOOT && window.__CE_BOOT.phaseGateState;
    const q = Number(pg && pg.currentPhase);
    if (Number.isFinite(q) && q >= 1 && q <= 7) {
      updateHighlight(q);
    }
  });

  // After boot configuration (boundaries computed)
  Events.on("burnline:bootConfigured", () => {
    updateHighlight();
  });

  // Burnline phase changed (authoritative for highlight)
  Events.on("burnline:phaseChanged", ({ detail }) => {
    if (getBurnlineMode() === "advisory") return;
    updateHighlight(detail.phase);
  });

  // Burnline tick — update progress line & keep layout fresh
  Events.on("burnline:tick", () => {
    if (getBurnlineMode() === "advisory") return;
    const C  = Core();
    const st = C && C.getState ? C.getState() : null;
    if (!st) return;

    if (!st.phaseBoundaries || (st.phase ?? 1) <= 2) {
      renderMode1(st.phase ?? 1);
    } else {
      renderMode2(st.phase, st);
    }
  });

  /* ---------------------------------------------------------
     EXPORT — BurnlineVisual (compat with PC052)
  --------------------------------------------------------- */
  CE.modules.BurnlineVisual = {
    init: function () {
      updateHighlight(1);
    },
    renderEqualLayout: function () {
      renderMode1(1);
    },
    updateHighlight
  };
  
// Start smooth animation loop for progress line
  requestAnimationFrame(animateProgressLine);
  
/* ---------------------------------------------------------
   Smooth progress-line animation (60fps)
   - Does NOT affect timing engine
   - DOM-only interpolation
--------------------------------------------------------- */
function animateProgressLine() {
  updateTimerSlot();
  if (getBurnlineMode() === "advisory") {
    requestAnimationFrame(animateProgressLine);
    return;
  }
  const C = Core();
  const st = C && C.getState ? C.getState() : null;
  if (!st || !st.phaseBoundaries || (st.phase ?? 1) <= 2) {
    requestAnimationFrame(animateProgressLine);
    return;
  }

  const p3Start = st.startTime;
  const now     = Date.now();
  const total   = st.bellTime - p3Start;

  const pct = Math.min(Math.max((now - p3Start) / total, 0), 1);
  const offset = STUB * 2; // reserve 8% for phases 1–2
  const scaledPct = offset + pct * (1 - offset);

  if (dom.progress) {
    dom.progress.style.left =
      "calc(" + (scaledPct * 100) + "% - " + (PROGRESS_WIDTH / 2) + "px)";
  }

  requestAnimationFrame(animateProgressLine);
}
  

  /* ---------------------------------------------------------
     PC052 Compatibility Shim
  --------------------------------------------------------- */
  CE.modules.Burnline = CE.modules.Burnline || {};

  CE.modules.Burnline.previewLabel = function (phase) {
    return LABELS[phase] || ("P" + phase);
  };

  CE.modules.Burnline.refreshBurnlineHints = function () {};
  CE.modules.Burnline.setSlicePhaseMap    = function () {};
  CE.modules.Burnline.setLessonWindow     = function () {};
  CE.modules.Burnline.mountSlicePill      = function () {};

  CE.modules.Burnline.PHASE_ORDER = ["1","2","3","4","5","6","7"];

})();
