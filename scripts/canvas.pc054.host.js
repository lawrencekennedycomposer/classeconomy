/* =========================================================
   VERSION INTEGRITY BLOCK – PC#054
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   Module: Canvas Host Integration (Window Manager foundation)
   Date: 2025-11-13
========================================================= */

import * as Events from './events.js';

(function initCanvasHost() {
  // Prefer boot-injected Events module if present, otherwise fallback to local events.js
  const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
  const emit = Bus.emit || Events.emit;
  const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || Bus.EVENTS || {};

  const CanvasHost = {
    el: null,
    windows: {},

    mount() {
      // Main container
      let root = document.getElementById('activity-canvas');
      if (!root) {
        root = document.createElement('section');
        root.id = 'activity-canvas';
        document.body.appendChild(root);
      }
      root.classList.add('canvas-host');
      this.el = root;

      // --- Phase Base Layer Host (PC076 scaffold target) ---
      if (!document.getElementById('phase-base-host')) {
        const baseHost = document.createElement('div');
        baseHost.id = 'phase-base-host';
        baseHost.className = 'phase-base-host';

        // Ensure the base layer always sits beneath popup windows
        baseHost.style.position = 'relative';
        baseHost.style.zIndex = '0';

        this.el.appendChild(baseHost);
      }


      console.log('[PC#054] Canvas Host mounted');
    },

     open({ id, title = '', content = '', mode = 'modal' }) {
      if (!this.el) this.mount();

      // Close existing with same id
      this.close(id);

      const wrap = document.createElement('div');
      wrap.className = `canvas-window ${mode}`;

      // Ensure all canvas windows render above the base layer
      wrap.style.position = 'fixed';
      wrap.style.zIndex = '20';

      // Bottomsheet mode (Phase advisory windows): light grey + docked near bottom
      if (mode === 'bottomsheet') {
        wrap.style.left = '50%';
        wrap.style.transform = 'translateX(-50%)';
        wrap.style.bottom = '72px';
        wrap.style.top = 'auto';
        wrap.style.width = 'min(560px, calc(100% - 24px))';
        wrap.style.maxWidth = '560px';
        wrap.style.borderRadius = '14px';
        wrap.style.border = '1px solid rgba(0,0,0,0.12)';
        wrap.style.background = '#f2f2f2';
        wrap.style.color = '#111';
        wrap.style.boxShadow = '0 12px 30px rgba(0,0,0,0.25)';
      }

      wrap.dataset.id = id;
      wrap.innerHTML = `
        <header class="canvas-header">
          <span class="title">${title}</span>
          <button class="close">×</button>
        </header>
        <div class="canvas-body">${content}</div>
      `;

      if (mode === 'bottomsheet') {
        const h = wrap.querySelector('.canvas-header');
        const b = wrap.querySelector('.canvas-body');
        const x = wrap.querySelector('.canvas-header .close');
        if (h) {
          h.style.background = '#e7e7e7';
          h.style.borderBottom = '1px solid rgba(0,0,0,0.10)';
        }
        if (b) {
          b.style.background = 'transparent';
          b.style.padding = '14px';
        }
        if (x) {
          x.style.background = 'rgba(0,0,0,0.06)';
          x.style.borderRadius = '10px';
          x.style.width = '32px';
          x.style.height = '28px';
        }
      }

      // 🔹 For the seating plan editor, hide the outer canvas header
      // so only the inner seating editor toolbar is visible.
      if (id === 'seating-plan') {
        const header = wrap.querySelector('.canvas-header');
        if (header) {
          header.style.display = 'none';
        }
      }

      wrap.querySelector('.close').onclick = () => this.close(id);
      this.el.appendChild(wrap);
      this.windows[id] = wrap;

      // Canonical UI event for window open
      emit(E.UI_WINDOW_OPEN || 'ui:openWindow', { id });
      console.log(`[PC#054] Canvas window opened: ${id}`);
    },


close(id) {
  const win = this.windows[id];
  if (!win) return;
  win.remove();
  delete this.windows[id];

  // Canonical UI event for window close
  emit(E.UI_WINDOW_CLOSE || 'ui:closeWindow', { id });
  console.log(`[PC#054] Canvas window closed: ${id}`);

  // Unmount seating editor if its window is closed
  if (id === 'seating-plan' && window.__CE_SEATING_EDITOR?.unmount) {
    window.__CE_SEATING_EDITOR.unmount();
  }
}

  };

  // Expose globally
  window.__CE_CANVAS = CanvasHost;

  // Auto-mount on load
  CanvasHost.mount();
})();
