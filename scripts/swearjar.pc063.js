/* =========================================================
   PC#063 – Swear Jar Behaviour + Animation
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine v1.8 Final – Swear Jar (Penalty.SwearJar)
   Role:
     - Override Swear action from PC#062 student tiles
     - Apply canonical -1 penalty via Dashboard.applyAward()
     - Render a brief coin→jar animation inside Activity Canvas
========================================================= */

import * as Events from './events.js';
import * as Dashboard from './dashboard.js';

const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
const emit = Bus.emit || Events.emit;
const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || Bus.EVENTS || {};

/* ---------- One-time style injection for Swear Jar animation ---------- */

function ensureSwearJarStyles() {
  if (document.getElementById('ce-swearjar-styles')) return;

  const style = document.createElement('style');
  style.id = 'ce-swearjar-styles';
  style.textContent = `
    .ce-swearjar-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 40;
    }

    .ce-swearjar-inner {
      min-width: 480px;
      max-width: 600px;
      padding: 36px 48px;
      border-radius: 28px;
      background: rgba(10, 10, 10, 0.85);
      box-shadow: 0 8px 20px rgba(0,0,0,0.45);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      color: #f5f5f5;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      transform: translateY(0);
      animation: ce-swearjar-pop 150ms ease-out;
    }

    .ce-swearjar-coin {
      width: 96px;
      height: 96px;
      border-radius: 999px;
      background: radial-gradient(circle at 30% 30%, #fff8c2, #d3a72a);
      box-shadow: 0 0 10px rgba(255, 230, 140, 0.6);
      transform: translateY(-80px);
      animation: ce-swearjar-drop 480ms ease-out forwards;
    }

    .ce-swearjar-jar {
      width: 160px;
      height: 100px;
      border-radius: 0 0 26px 26px;
      border: 3px solid rgba(220, 220, 220, 0.9);
      border-top: none;
      background: linear-gradient(to top, rgba(60, 120, 180, 0.9), rgba(60, 120, 180, 0.2));
      position: relative;
      overflow: hidden;
      margin-top: 12px;
      animation: ce-swearjar-jarpulse 700ms ease-out 550ms 1;
    }

    .ce-swearjar-jar::before {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55), transparent 60%);
      opacity: 0.95;
    }

    .ce-swearjar-label {
      font-size: 1.6rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      opacity: 0.95;
    }

    .ce-swearjar-label span {
      font-weight: 700;  
      color: #ffbf5f;
      margin-left: 12px;
      font-size: 1.7rem;   
    }

    .ce-swearjar-overlay.ce-swearjar-fade {
      animation: ce-swearjar-fadeout 380ms ease-out forwards;
    }

    @keyframes ce-swearjar-drop {
      0%   { transform: translateY(-40px); opacity: 0; }
      30%  { opacity: 1; }
      100% { transform: translateY(4px); opacity: 1; }
    }

    @keyframes ce-swearjar-jarpulse {
      0%   { transform: scale(1); box-shadow: 0 0 0 rgba(255, 255, 255, 0); }
      40%  { transform: scale(1.06); box-shadow: 0 0 18px rgba(255, 220, 140, 0.75); }
      100% { transform: scale(1); box-shadow: 0 0 0 rgba(255, 255, 255, 0); }
    }

    @keyframes ce-swearjar-pop {
      0%   { transform: translateY(10px) scale(0.96); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }

    @keyframes ce-swearjar-fadeout {
      0%   { opacity: 1; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

/* ---------- Activity Canvas coin→jar animation ---------- */

function showSwearJarAnimation(detail) {
  // Prefer official canvas host from PC#054, fall back to raw node if needed
  const host =
    (window.__CE_CANVAS && window.__CE_CANVAS.el) ||
    document.getElementById('activity-canvas');

  if (!host) return;

  ensureSwearJarStyles();

  // Ensure host can contain an absolutely positioned overlay without leaking
  const currentPosition = window.getComputedStyle(host).position;
  if (!host.dataset.ceSwearJarPrevPos && (currentPosition === 'static' || !currentPosition)) {
    host.dataset.ceSwearJarPrevPos = 'static';
    host.style.position = 'relative';
  }

  const overlay = document.createElement('div');
  overlay.className = 'ce-swearjar-overlay';

  overlay.innerHTML = `
    <div class="ce-swearjar-inner">
      <div class="ce-swearjar-coin"></div>
      <div class="ce-swearjar-jar"></div>
      <div class="ce-swearjar-label">
        Swear Jar <span>-1</span>
      </div>
    </div>
  `;

  host.appendChild(overlay);

  // Lifetime: visible for ~1.2s, then fade + cleanup
  const visibleMs = 2200;
  const fadeMs    = 380;

  setTimeout(() => {
    overlay.classList.add('ce-swearjar-fade');
    setTimeout(() => {
      overlay.remove();
      // Restore host positioning if we temporarily changed it
      if (host.dataset.ceSwearJarPrevPos === 'static') {
        host.style.position = '';
        delete host.dataset.ceSwearJarPrevPos;
      }
    }, fadeMs);
  }, visibleMs);
}

/* ---------- Swear Jar scoring + hook into studentTiles.pc062 ---------- */

document.addEventListener('DOMContentLoaded', () => {
  const baseHandle = window.handleScoreAction;

  if (typeof baseHandle !== 'function') {
    console.warn('[PC#063] handleScoreAction base function not found – Swear Jar patch inactive.');
    return;
  }

  window.handleScoreAction = function patchedHandleScoreAction(studentId, action) {
    if (action === 'swear') {
      let student = null;

      try {
        const snap = Dashboard.getRosterSnapshot
          ? Dashboard.getRosterSnapshot()
          : null;
        const list = snap?.students || [];
        student = list.find(s => String(s.id) === String(studentId));
      } catch (e) {
        console.warn('[PC#063] roster snapshot failed', e);
      }

      if (!student || student.active === false) {
        // Inactive or missing student → no effect
        return;
      }

      try {
        // Canonical Swear Jar penalty
        Dashboard.applyAward({
          studentId: String(studentId),
          points: -1,
          reason: 'Penalty.SwearJar',
          ts: Date.now()
        });

        // Optional event for any external listeners
        try {
          emit(E.PENALTY_SWEAR_JAR || 'penalty:swearJar', {
            ts: Date.now(),
            studentId: String(studentId),
            value: -1,
            source: 'Penalty.SwearJar'
          });
        } catch { /* non-fatal */ }

        // Local Activity Canvas animation (coin → jar)
        showSwearJarAnimation({
          studentId: String(studentId)
        });

      } catch (e) {
        console.warn('[PC#063] Swear Jar applyAward failed', e);
      }

      // Swear handled entirely here; do not call base handler
      return;
    }

    // For all other actions, fall back to PC#062 logic
    return baseHandle(studentId, action);
  };

  console.log('[PC#063] Swear Jar behaviour + animation patch active');
});

