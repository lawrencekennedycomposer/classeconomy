/* =========================================================
   PC#100 – Preboot Login Wall (no backend)
   Goal:
     - Block OS boot until user logs in
     - Session persistence via localStorage only (device-local)
     - After auth: import canon OS chain in the SAME order as main.html used to
========================================================= */

import { hasUserId, findAccount, listAccountsSafe } from './accounts.local.pc100.js';

const SESSION_KEY = 'ce:session:v1';

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
function readSession() {
  try { return safeParse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function writeSession(userId) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, loginAt: Date.now() }));
    return true;
  } catch { return false; }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

function mountWall() {
  if (document.getElementById('pc100-wall')) return;

  const style = document.createElement('style');
  style.id = 'pc100-wall-style';
  style.textContent = `
    .pc100-wall{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);backdrop-filter:blur(2px)}
    .pc100-card{width:min(420px,calc(100vw - 32px));background:#111;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.45);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
    .pc100-title{font-size:18px;font-weight:700;margin:0 0 10px}
    .pc100-sub{font-size:12px;opacity:.8;margin:0 0 14px;line-height:1.4}
    .pc100-row{display:grid;gap:8px;margin-bottom:10px}
    .pc100-row label{font-size:12px;opacity:.85}
    .pc100-row input{width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;outline:none}
    .pc100-actions{display:flex;gap:10px;align-items:center;margin-top:12px}
    .pc100-btn{padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.10);color:#fff;cursor:pointer;font-weight:600}
    .pc100-btn.primary{background:rgba(0,170,255,.22);border-color:rgba(0,170,255,.35)}
    .pc100-error{margin-top:10px;font-size:12px;color:#ffb4b4;display:none}
    .pc100-users{margin-top:8px;font-size:11px;opacity:.85;line-height:1.6}
    .pc100-users code{margin-right:6px}
  `;
  document.head.appendChild(style);

  const wall = document.createElement('div');
  wall.id = 'pc100-wall';
  wall.className = 'pc100-wall';
  wall.innerHTML = `
    <div class="pc100-card" role="dialog" aria-modal="true" aria-label="Login">
      <div class="pc100-title">Tester Login</div>
      <div class="pc100-sub">
        Local accounts only. Data stays on this device (localStorage).
      </div>
      <form id="pc100-form">
        <div class="pc100-row">
          <label for="pc100-username">Username</label>
          <input id="pc100-username" autocomplete="username" spellcheck="false" />
        </div>
        <div class="pc100-row">
          <label for="pc100-password">Password</label>
          <input id="pc100-password" type="password" autocomplete="current-password" />
        </div>
        <div class="pc100-actions">
          <button class="pc100-btn primary" type="submit">Login</button>
          <button class="pc100-btn" type="button" id="pc100-clear">Clear session</button>
        </div>
        <div class="pc100-error" id="pc100-error">Invalid username/password</div>
        <div class="pc100-users" id="pc100-users"></div>
      </form>
    </div>
  `;
  document.body.appendChild(wall);

  const usersEl = wall.querySelector('#pc100-users');
  const users = listAccountsSafe();
  usersEl.innerHTML = `Users: ${users.map(u => `<code>${u.username}</code>`).join('')} &nbsp; | &nbsp; Password: <code>test123</code>`;

  return wall;
}

function unmountWall() {
  document.getElementById('pc100-wall')?.remove();
}

async function bootCanonChain() {
  // EXACT old order from main.html
  await import('./events.js');
   const Storage = await import('./storage.js');
   // Critical: ensure session has BOTH userId + classId before anything reads/writes class-scoped keys.
   // Without classId, scores/roster will fall back to legacy unscoped keys (shared across users).
   try { Storage.ensureBootContext?.(); } catch {}
  await import('./persistence.pc039.js');
  await import('./hydration.pc040.js');
  await import('./main.js');
}

function exposeLogoutHook() {
  // Called by teacher menu / top bar
  window.__CE_ACCOUNTS = Object.freeze({
    logout() {
      clearSession();
      try { location.reload(); } catch {}
    },
    sessionKey: SESSION_KEY,
  });
}

(async function preboot() {
  exposeLogoutHook();

  const sess = readSession();
  const userId = String(sess?.userId || '').trim();

  if (userId && hasUserId(userId)) {
    await bootCanonChain();
    return;
  }

  clearSession();
  const wall = mountWall();
  const form = wall.querySelector('#pc100-form');
  const uEl = wall.querySelector('#pc100-username');
  const pEl = wall.querySelector('#pc100-password');
  const err = wall.querySelector('#pc100-error');
  const clearBtn = wall.querySelector('#pc100-clear');

  setTimeout(() => { try { uEl.focus(); } catch {} }, 0);

  clearBtn.addEventListener('click', () => {
    clearSession();
    err.style.display = 'none';
    uEl.value = '';
    pEl.value = '';
    try { uEl.focus(); } catch {}
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.style.display = 'none';

    const acct = findAccount(uEl.value, pEl.value);
    if (!acct) {
      err.style.display = 'block';
      try { pEl.focus(); pEl.select?.(); } catch {}
      return;
    }

    writeSession(acct.id);
    unmountWall();
    await bootCanonChain();
  });
})();