/* =========================================================
   VERSION INTEGRITY BLOCK – VI-E0 (Canon Aligned)
   Charter: THE CODING PROCEDURE (v1.0-GOV)
   Operational Routine: v1.8 Final (A–C) + Errata v1.8-E1
   PC Range: PC#039 – Persistence Loop Activation (autosave only)
   Generated: 2025-11-13 (AEST)
   Notes:
     - Append-only persistence listeners (scores + phase)
     - Delegates score writes to Dashboard.persistScores()
     - Phase token stored as { current: 'n' } (canon)
========================================================= */

import * as Events from './events.js';
import * as Storage from './storage.js';
import * as Dashboard from './dashboard.js';

/* ---------------------------------------------------------
   Canonical Event Bus Resolution
--------------------------------------------------------- */
const Bus = window.__CE_BOOT?.CE?.modules?.Events || Events;
const on  = Bus.on || Events.on;
const emit = Bus.emit || Events.emit;
const E   = Bus.EVENTS_V3 || Bus.EVENTS_V2 || Bus.EVENTS || {};

/* ---------------------------------------------------------
   Debounce helper (with optional flush for dev)
--------------------------------------------------------- */
function debounce(fn, ms = 250) {
  let t = null;
  const wrapper = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapper.flush = () => {
    clearTimeout(t);
    t = null;
    try { fn(); } catch {}
  };
  return wrapper;
}

/* ---------------------------------------------------------
   Scores autosave – Dashboard is the source of truth
   Canon path: Dashboard.persistScores() → SCORES_V1 { byId: {…} }
--------------------------------------------------------- */
const saveScores = debounce(() => {
  try {
    if (!Storage.helpersReady) return;
    if (typeof Dashboard.persistScores === 'function') {
      Dashboard.persistScores();
    }
  } catch {
    /* non-blocking */
  }
}, 250);

/* ---------------------------------------------------------
   Phase autosave – canon schema: { current: 'n' }
   Hydration + Dashboard read this shape from PHASE_V1.
--------------------------------------------------------- */
const savePhase = debounce((nextPhase) => {
  try {
    if (!Storage.helpersReady) return;
    const p = String(nextPhase || '1').trim();
    Storage.writeJSON(Storage.KEYS.PHASE_V1, { current: p });
  } catch {
    /* non-blocking */
  }
}, 100);

/* ---------------------------------------------------------
   Wire governed events → storage writes (append-only)
--------------------------------------------------------- */
try {
  // Scores: any update → autosave via Dashboard.persistScores()
  const EVT_SCORES = E.SCORES_UPDATED || 'scores:updated';
  on(EVT_SCORES, () => saveScores());

  // Phase: on canonical phase-change event → persist phase token only
  const EVT_PHASE =
    E.LESSON_PHASE_CHANGE ||
    E.LESSON_PHASE_CHANGED ||
    'lesson:phaseChange';

  on(EVT_PHASE, (e) => {
    const next = e?.detail?.to;
    if (next != null) savePhase(next);
  });
} catch {
  /* non-blocking */
}
/* =========================================================
   PC#039 – Advisory MVP File IO (Export/Import)
   Requirements:
     - filename includes: className + date + time
     - exports: roster, seating layout, banked/unbanked scores
     - no phase required for MVP export/import
========================================================= */

function _pad2(n) { return String(n).padStart(2, '0'); }

function _safeFilePart(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'Class';
}

function _exportFilename(ext) {
  let className = Storage.getClassName?.() || '';
  if (!className) {
    const entered = window.prompt?.('Class name for export filename:', '') || '';
    if (String(entered).trim()) {
      Storage.setClassName?.(entered);
      className = String(entered).trim();
    }
  }

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = _pad2(d.getMonth() + 1);
  const dd = _pad2(d.getDate());
  const hh = _pad2(d.getHours());
  const mi = _pad2(d.getMinutes());

  const cls = _safeFilePart(className);
  return `${cls}_${yyyy}-${mm}-${dd}_${hh}-${mi}.${ext}`;
}

async function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  try {
    const safeName = String(filename || 'export.txt');
    const safeText = String(text ?? '');
    const safeMime = String(mime || 'text/plain;charset=utf-8');
    const blob = new Blob([safeText], { type: safeMime });

    const canPick =
      typeof window !== 'undefined' &&
      typeof window.showSaveFilePicker === 'function' &&
      window.isSecureContext;

    if (canPick) {
      const ext = safeName.includes('.') ? `.${safeName.split('.').pop()}` : '';
      const handle = await window.showSaveFilePicker({
        suggestedName: safeName,
        types: [{
          description: ext ? `${ext.slice(1).toUpperCase()} file` : 'Text file',
          accept: {
            [safeMime.split(';')[0] || 'text/plain']: ext ? [ext] : ['.txt']
          }
        }]
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {}
  return false;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    try {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ''));
      fr.onerror = reject;
      fr.readAsText(file);
    } catch (e) {
      reject(e);
    }
  });
}

async function pickSingleFile(accept = '.json,.csv,application/json,text/csv') {
  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => resolve(input.files?.[0] || null);
      input.click();
    } catch {
      resolve(null);
    }
  });
}

function _inferTypeFromName(name) {
  const n = String(name || '').toLowerCase();
  if (n.endsWith('.csv')) return 'csv';
  if (n.endsWith('.json')) return 'json';
  return null;
}

function _safeJsonParse(text) {
  try { return JSON.parse(String(text || '')); } catch { return null; }
}

function _suggestClassNameFromImport(text, filename) {
  const obj = _safeJsonParse(text);
  const n = String(obj?.className || '').trim();
  if (n) return n;
  const base = String(filename || '').replace(/\.[^.]+$/, '');
  return String(base || '').trim() || 'Imported Class';
}

// PC#039 Import policy:
// Always import as a NEW class to prevent accidental data loss.

function _postImportRefresh() {
  try { Dashboard.loadScores?.(); } catch {}

  try { emit(E.SCORES_UPDATED || 'scores:updated', { ts: Date.now(), source: 'import' }); } catch {}
  try { emit('roster:updated', { ts: Date.now(), source: 'import' }); } catch {}

  try {
    const boot = (window.__CE_BOOT = window.__CE_BOOT || {});
    const layout = Storage.readJSON?.(Storage.KEYS.SEATING_LAYOUT_V1, null);
    if (layout && Array.isArray(layout.desks)) {
      boot.SeatingLayout = { desks: layout.desks.map(d => ({ ...d })) };
      emit('seating:layout:updated', { source: 'import', layout: boot.SeatingLayout });
    }
  } catch {}
}

/* ---------------------------------------------------------
   Teacher Menu IO events
--------------------------------------------------------- */
try {
  on('teacher:download-json', () => {
    const json = Storage.exportAdvisoryJSON?.() ?? '{}';
    downloadText(_exportFilename('json'), json, 'application/json;charset=utf-8');
  });

  on('teacher:download-csv', () => {
    const csv = Storage.exportAdvisoryCSV?.() ?? 'key,value\n';
    downloadText(_exportFilename('csv'), csv, 'text/csv;charset=utf-8');
  });

  on('teacher:upload', async (e) => {
    const p = e?.detail || {};
    let text = p.text || null;
    let name = p.filename || p.name || null;

    if (!text) {
      const file = p.file || await pickSingleFile();
      if (!file) return;
      name = name || file.name;
      text = await readFileAsText(file);
    }

    const inferred = (p.type || _inferTypeFromName(name) || 'json').toLowerCase();
    
    // ------------------------------------------------------
    // Import Safety Guard (SAFE-ONLY):
    // Always create a NEW class and import into it.
    // Never overwrite the current class via import.
    // ------------------------------------------------------
    const sess = Storage.getSession?.() || {};
    const userId = String(sess.userId || '').trim();
    const classId = String(sess.classId || '').trim();

    // If we don't have a valid session context, fall back to legacy behavior.
    if (!userId || !classId) {
      if (inferred === 'csv') Storage.importAdvisoryCSV?.(text);
      else Storage.importAdvisoryJSON?.(text);
      _postImportRefresh();
      return;
    }

    const suggestedName = _suggestClassNameFromImport(text, name);
    // Create a new class using the name stored in the file (or filename fallback).
    const clsName = String(suggestedName || '').trim() || 'Imported Class';
    const created = Storage.createClass?.(userId, clsName);
    const newId = String(created?.id || '').trim();
    if (!newId) {
      alert('Could not create a new class for import.');
      return;
    }

    // Switch session so import writes into the new class namespace.
    try { Storage.setSession?.(userId, newId); } catch {}

    // Import into the NEW class
    if (inferred === 'csv') Storage.importAdvisoryCSV?.(text);
    else Storage.importAdvisoryJSON?.(text);

    _postImportRefresh();

    // Reload so dropdown/UI reflects the new class cleanly.
    try { location.reload(); } catch {}
  });

  // Engagement Boost: teacher menu emits events only; persistence owns storage IO
  on('teacher:boost:request', () => {
    const v = Storage.readJSON('ce:engagementBoost:v1', { value: 1 })?.value ?? 1;
    emit('teacher:boost:value', { value: v });
  });

  on('teacher:boost:cycle', () => {
    const cur = Number(Storage.readJSON('ce:engagementBoost:v1', { value: 1 })?.value ?? 1);
    const next = cur >= 3 ? 1 : cur + 1;
    Storage.writeJSON('ce:engagementBoost:v1', { value: next });
    emit('teacher:boost:value', { value: next });
  });
} catch {
  /* non-blocking */
}

/* ---------------------------------------------------------
   Tiny dev handle (inert unless used)
--------------------------------------------------------- */
window.__CE_PERSIST = Object.freeze({
  saveScoresNow: () => {
    try { saveScores.flush?.(); } catch {}
    saveScores();
  },
  savePhaseNow: (p) => savePhase(p)
});
