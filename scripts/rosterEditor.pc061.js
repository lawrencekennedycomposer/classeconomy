/* =========================================================
   PC#061 – Roster Editor Window (Edit Names)
   Canonical v5 – Final Corrected Version
   Includes:
   - Auto-focus new rows
   - Enter = commit + add
   - Ctrl+S / Cmd+S = Save
   - Duplicate name prevention
   - Empty name blocking
   - Proper scroll padding (no overlap)
   - Sticky footer that never covers content
   - Correct placement between topbar & burnline
========================================================= */

(function () {
  const Boot    = window.__CE_BOOT;
  const CE      = Boot && Boot.CE;
  const Modules = (Boot && Boot.modules) || {};

  const Events    = Modules.Events    || window.Events;
  const Storage   = Modules.Storage   || window.Storage;
  const Dashboard = Modules.Dashboard || window.Dashboard;
  const Canvas    = window.__CE_CANVAS;

  if (!Events || !Storage || !Dashboard || !Canvas) {
    console.warn("[PC#061] Missing core modules. Roster Editor not installed.");
    return;
  }

  const Bus  = Events;
  const on   = Bus.on   || Events.on;
  const emit = Bus.emit || Events.emit;

  const MAX_STUDENTS = 32;
  let model = [];

  /* ========= STYLE (Corrected & Polished) ========= */
  (function ensureRosterStyle() {
    if (document.getElementById("pc061-roster-style")) return;

    const s = document.createElement("style");
    s.id = "pc061-roster-style";
    s.textContent = `

/* Correct window placement (between topbar and burnline) */
.canvas-window.roster-editor {
  position: fixed !important;
  top: 50px !important;
  bottom: 120px !important;
  max-height: calc(100vh - 50px - 120px) !important;
  width: 420px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
}

/* Scroll region for content */
.canvas-window.roster-editor .canvas-body {
  overflow-y: auto !important;
  padding-bottom: 90px !important; /* prevents rows from hiding behind footer */
}

/* Content wrapper */
.roster-editor .re-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 6px 6px 10px 6px;
}

/* Student list area */
.roster-editor .re-list {
  flex: 0 0 auto;
  overflow: visible;
}

/* Student row */
.roster-editor .re-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.roster-editor .re-index {
  min-width: 1.6em;
  opacity: 0.75;
  text-align: right;
}

.roster-editor .re-name {
  flex: 1;
}

/* Delete button */
.roster-editor .re-del {
  color: #ff5555;
  border: none;
  background: #222;
  padding: 2px 8px;
  cursor: pointer;
  border-radius: 4px;
}

.roster-editor .re-del:hover {
  background: #333;
  color: #ff7777;
}

/* Footer action bar */
.roster-editor .re-actions {
  position: sticky;
  bottom: 0;
  background: var(--panel, #11151a);
  padding: 10px 0 6px 0;
  display: flex;
  justify-content: space-between;
  z-index: 6;
}

    `;
    document.head.appendChild(s);
  })();

  /* ========= MODEL HELPERS ========= */

  function loadModel() {
    try {
      const snap = Dashboard.getRosterSnapshot() || {};
      const students = Array.isArray(snap.students) ? snap.students : [];

      model = students.map((s, i) => ({
        id: String(s.id ?? `s${i + 1}`),
        name: String(s.name ?? `Student ${i + 1}`),
        active: s.active !== false
      }));
    } catch (e) {
      console.warn("[PC#061] Failed to load roster snapshot", e);
      model = [];
    }
  }

  function nextId() {
    let max = 0;
    for (const s of model) {
      const n = parseInt(String(s.id).replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return "s" + (max + 1);
  }

  function saveModel() {
    try {
      Storage.writeJSON(Storage.KEYS.ROSTER_V1, { students: model });
    } catch (e) {
      console.warn("[PC#061] Failed to save roster", e);
    }

    try {
      emit("roster:updated", { ts: Date.now(), count: model.length });
      emit("scores:updated", { ts: Date.now(), reason: "roster-edit" });
    } catch (e) {
      console.warn("[PC#061] Failed to emit roster events", e);
    }
  }

  /* ========= RENDERING ========= */

  function renderRows(root) {
    const list = root.querySelector(".re-list");
    if (!list) return;

    list.innerHTML = model.map((s, idx) => `
      <div class="re-row" data-id="${s.id}">
        <span class="re-index">${idx + 1}.</span>
        <input class="re-name" type="text" value="${s.name}" />
        <button type="button" class="re-del">Delete</button>
      </div>
    `).join("");
  }

  function renderEditorContent() {
    return `
      <div class="re-wrap">
        <h2>Edit Student Names</h2>
        <div class="re-list"></div>
        <div class="re-actions">
          <button type="button" class="re-add">Add Student</button>
          <button type="button" class="re-save">Save</button>
        </div>
      </div>
    `;
  }

  /* ========= OPEN WINDOW ========= */

  function openEditor() {
    loadModel();

    Canvas.open({
      id: "roster-editor",
      title: "Edit Names",
      mode: "modal roster-editor",
      content: renderEditorContent()
    });

    const root = document.querySelector(".re-wrap");
    if (!root) return;

    renderRows(root);
    wireEvents(root);
  }

  /* ========= EVENT LOGIC ========= */

  function wireEvents(root) {
    const listEl = root.querySelector(".re-list");
    const btnAdd = root.querySelector(".re-add");
    const btnSave = root.querySelector(".re-save");

    /* ——————— ADD NEW ——————— */
    btnAdd?.addEventListener("click", () => {
      if (model.length >= MAX_STUDENTS) return;

      model.push({
        id: nextId(),
        name: `Student ${model.length + 1}`,
        active: true
      });

      renderRows(root);

      /* Auto-focus newest entry */
      requestAnimationFrame(() => {
        const inputs = root.querySelectorAll(".re-name");
        const last = inputs[inputs.length - 1];
        last?.focus();
        last?.select();
      });
    });

    /* ——————— DELETE ——————— */
    listEl?.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".re-del");
      if (!btn) return;

      const row = btn.closest(".re-row");
      const id = row?.dataset?.id;
      if (!id) return;

      model = model.filter(s => s.id !== id);
      renderRows(root);
    });

    /* ——————— ENTER = commit + add ——————— */
    root.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        const input = ev.target.closest(".re-name");
        if (!input) return;

        ev.preventDefault();

        /* Commit value to model BEFORE re-render */
        const row = input.closest(".re-row");
        const id = row?.dataset.id;
        const entry = model.find(s => s.id === id);
        if (entry) entry.name = input.value.trim();

        /* Add new */
        btnAdd?.click();
      }
    });

    /* ——————— CTRL+S / CMD+S = SAVE ——————— */
    root.addEventListener("keydown", (ev) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "s") {
        ev.preventDefault();
        btnSave?.click();
      }
    });

    /* ——————— SAVE ——————— */
    btnSave?.addEventListener("click", () => {
      const rows = [...root.querySelectorAll(".re-row")];

      /* Prevent empty names */
      for (const row of rows) {
        const name = row.querySelector(".re-name")?.value.trim();
        if (!name) {
          alert("One or more student names are empty.");
          return;
        }
      }

      /* Detect duplicates */
      const names = rows.map(r =>
        r.querySelector(".re-name")?.value.trim().toLowerCase()
      );
      const dupe = names.some((n, i) => names.indexOf(n) !== i);
      if (dupe) {
        alert("Duplicate names found. Every student must be unique.");
        return;
      }

      /* Commit new list */
      model = rows.map((row, idx) => ({
        id: row.dataset.id || `s${idx + 1}`,
        name: row.querySelector(".re-name").value.trim(),
        active: true
      }));

      saveModel();
      Canvas.close?.("roster-editor");
    });
  }

  /* ========= REGISTER ========= */

  const handler = () => openEditor();
  if (typeof on === "function") on("roster:edit", handler);
  if (window.Ev?.on) window.Ev.on("roster:edit", handler);

  console.log("[PC#061] Roster Editor installed (Canonical v5 – Final).");
})();

