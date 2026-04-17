/* =========================================================
  PC#090 – STW Phase 3 Base Layer (Phase Base)
  - Mounted by PC076 into #phase-base-host
  - No popup-host, no global modal system
  - Session-only picked list
  - Awards via existing 'stw:award' event
========================================================= */

import * as Events from './events.js';
import { EVENTS } from './events.js';
// Legacy QB removed — PC121 is authoritative

(() => {
  const Bus  = window.__CE_BOOT?.CE?.modules?.Events || Events;
  const emit = Bus.emit || Events.emit;
  const E    = Bus.EVENTS_V3 || Bus.EVENTS_V2 || EVENTS;

  let _hostEl = null;
  let _rootEl = null;

  let _picked = new Set();         // session-only
  let _category = '';
  let _subcategory = '';
  let _focus = '';
  let _difficulty = 1;

  // QB source (built-in or uploaded)
  let _qbBuiltIn = window.STW_QB || {};
  let _qbUploaded = null;
  let _qbLoadedSingle = null;
  let _qbActive = _qbBuiltIn;
  let _qbSource = 'builtin'; // builtin | uploaded

  // Modal state
  let _modalEl = null;
  let _timerId = null;
  let _revealId = null;
  let _endsAt = 0;
  let _awarded = false;
  let _current = null; // { studentId, name }
  let _questionStarted = false;
  let _modalKeyHandler = null;
  let _endModalEl = null;
  let _phaseEndRequested = false;

  function _stopTimers() {
    if (_timerId) { clearInterval(_timerId); _timerId = null; }
    if (_revealId) { clearTimeout(_revealId); _revealId = null; }
  }

  function _qs(sel) { return _rootEl?.querySelector(sel) || null; }
  function _qsm(sel) { return _modalEl?.querySelector(sel) || null; }
  function _qse(sel) { return _endModalEl?.querySelector(sel) || null; }

  const QB_STORAGE_KEY = 'ce.qb.lastSelection';

  function _saveQBSelection() {
    if (_qbSource !== 'builtin') return;
    try {
      localStorage.setItem(QB_STORAGE_KEY, JSON.stringify({
        cat: _category,
        sub: _subcategory,
        focus: _focus
      }));
    } catch {}
  }

  function _loadQBSelection() {
    try {
      const raw = localStorage.getItem(QB_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data?.cat) _category = String(data.cat);
      if (data?.sub) _subcategory = String(data.sub);
      if (data?.focus) _focus = String(data.focus);
    } catch {}
  }


  function _normalizeUploadedQB(raw) {
    const obj = raw && typeof raw === 'object' ? raw : null;
    if (!obj) return null;

    // unwrap common wrapper shapes from evaluated module/default exports
    if (obj.default && typeof obj.default === 'object') {
      return _normalizeUploadedQB(obj.default);
    }
    if (obj.__QB_DEFAULT__ && typeof obj.__QB_DEFAULT__ === 'object') {
      return _normalizeUploadedQB(obj.__QB_DEFAULT__);
    }

    const ensureD = (d) => ({
      1: Array.isArray(d?.[1]) ? d[1] : [],
      2: Array.isArray(d?.[2]) ? d[2] : [],
      3: Array.isArray(d?.[3]) ? d[3] : []
    });

    // Full exported tree: { STW_QB: {...} }
    if (obj.STW_QB && typeof obj.STW_QB === 'object' && Object.keys(obj.STW_QB).length) {
      return obj.STW_QB;
    }

    // Single-file new format:
    // { stage:{key,label}, unit:{key,label}, focus:{key,label}, d:{1:[],2:[],3:[]} }
    // Keep RAW so true load mode can use it directly.
    if (obj?.stage?.key && obj?.unit?.key && obj?.focus?.key) {
      return {
        stage: {
          key: String(obj.stage.key),
          label: String(obj.stage.label || obj.stage.key)
        },
        unit: {
          key: String(obj.unit.key),
          label: String(obj.unit.label || obj.unit.key)
        },
        focus: {
          key: String(obj.focus.key),
          label: String(obj.focus.label || obj.focus.key)
        },
        d: ensureD(obj.d)
      };
    }

    // Already a full QB tree
    if (Object.keys(obj).length) return obj;
    return null;
  }

  function _parseQBFileText(text) {
    if (!text || typeof text !== 'string') return null;

    // 1) JSON path
    try {
      return _normalizeUploadedQB(JSON.parse(text));
    } catch {}

    // 2) JS export / literal path
    try {
      let src = String(text);
      src = src.replace(/^\uFEFF/, '');
      src = src.replace(/\bexport\s+const\s+/g, 'const ');
      src = src.replace(/\bexport\s+let\s+/g, 'let ');
      src = src.replace(/\bexport\s+var\s+/g, 'var ');
      src = src.replace(/\bexport\s+default\s+/g, 'const __QB_DEFAULT__ = ');
      src = src.replace(/\bexport\s*\{[^}]*\}\s*;?/g, '');

      const fn = new Function(
        'exports',
        `let STW_QB;
         ${src};
         return (typeof __QB_DEFAULT__ !== 'undefined'
           ? __QB_DEFAULT__
           : (typeof STW_QB !== 'undefined' && STW_QB
               ? STW_QB
               : (typeof exports !== 'undefined' ? (exports.STW_QB || exports.default) : null)
             )
         );`
      );
      const out = fn({});
      return _normalizeUploadedQB(out);
    } catch {}

    return null;
  }

  function _qbGetCategories() {
    const qb = _qbActive || {};
    return Object.entries(qb).map(([key, v]) => ({ key, label: v?.label || key }));
  }

  function _qbGetUnits(categoryKey) {
    const qb = _qbActive || {};
    const cat = qb?.[categoryKey];
    const subs = cat?.subs || {};
    return Object.entries(subs).map(([key, v]) => ({ key, label: v?.label || key }));
  }

  function _qbGetFocuses(categoryKey, unitKey) {
    const qb = _qbActive || {};
    const unit = qb?.[categoryKey]?.subs?.[unitKey];
    const subs = unit?.subs || {};
    return Object.entries(subs).map(([key, v]) => ({ key, label: v?.label || key }));
  }

  function _isLoadedSingleQB(obj) {
    return !!(obj?.stage?.key && obj?.unit?.key && obj?.focus?.key && obj?.d);
  }
  function _qbGetRandomQuestion(categoryKey, unitKey = null, focusKey = null, difficulty = 1) {
    const qb = _qbActive || {};
    const catKeys = Object.keys(qb);
    const catKey = qb?.[categoryKey] ? categoryKey : (catKeys[0] || null);
    const d = (Number(difficulty) === 1 || Number(difficulty) === 2 || Number(difficulty) === 3) ? Number(difficulty) : 1;

    if (!catKey) {
      return { category: null, unit: null, focus: null, difficulty: d, question: 'No categories in bank.', answer: '—' };
    }

    const cat = qb[catKey];
    const units = cat?.subs || {};
    const unitKeys = Object.keys(units);
    const resolvedUnitKey = (unitKey && units?.[unitKey]) ? unitKey : (unitKeys[0] || null);

    const focuses = units?.[resolvedUnitKey]?.subs || {};
    const focusKeys = Object.keys(focuses);
    const resolvedFocusKey = (focusKey && focuses?.[focusKey]) ? focusKey : (focusKeys[0] || null);

    let pool = [];
    if (resolvedFocusKey && focuses?.[resolvedFocusKey]) {
      pool = focuses[resolvedFocusKey]?.d?.[d] || focuses[resolvedFocusKey]?.d?.[String(d)] || [];
    }
    if (!Array.isArray(pool) || !pool.length) {
      for (const uk of unitKeys) {
        const fks = Object.keys(units?.[uk]?.subs || {});
        for (const fk of fks) {
          const arr = units?.[uk]?.subs?.[fk]?.d?.[d] || units?.[uk]?.subs?.[fk]?.d?.[String(d)] || [];
          if (Array.isArray(arr) && arr.length) {
            pool = arr;
            break;
          }
        }
        if (pool.length) break;
      }
    }

    const item = (Array.isArray(pool) && pool.length)
      ? pool[Math.floor(Math.random() * pool.length)]
      : null;

    const question = String(item?.q ?? item?.question ?? '—');
    const answer = String(item?.a ?? item?.answer ?? '—');

    return { category: catKey, unit: resolvedUnitKey, focus: resolvedFocusKey, difficulty: d, question, answer };
  }

  function _qbGetRandomQuestionLoaded(difficulty = 1) {
    const d = (Number(difficulty) === 1 || Number(difficulty) === 2 || Number(difficulty) === 3)
      ? Number(difficulty) : 1;

    const arr = _qbLoadedSingle?.d?.[d] || _qbLoadedSingle?.d?.[String(d)] || [];
    if (!Array.isArray(arr) || !arr.length) {
      return { question: 'No questions in loaded bank.', answer: '—' };
    }

    const item = arr[Math.floor(Math.random() * arr.length)];
    return {
      question: String(item?.q ?? item?.question ?? '—'),
      answer: String(item?.a ?? item?.answer ?? '—')
    };
  }
 
  function _setQBSourceLabel() {
    const el = _qs('[data-stw-qbsource]');
    if (!el) return;
    el.textContent = (_qbSource === 'uploaded') ? 'Loaded' : 'Built-in';
  }


  function _getRoster() {
    const snap = window.Dashboard?.getRosterSnapshot?.();
    const students = snap?.students;
    return Array.isArray(students) ? students : [];
  }

  function _eligibleStudents() {
    return _getRoster().filter(s => s && s.active !== false);
  }

  function _unpickedEligible() {
    const eligible = _eligibleStudents();
    return eligible.filter(s => !_picked.has(String(s.id)));
  }

  function _esc(s) {
    return String(s || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function _renderWheel(students, baseCount = null) {
    const wheel = _qs('[data-stw-wheel]');
    if (!wheel) return;

    const list = Array.isArray(students) ? students : [];
    const n = Math.max(1, list.length);
    const nBase = Math.max(1, Number(baseCount) || n);
    const cx = 260, cy = 260, r = 245;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const slice = 360 / n;

    const paths = [];
    const labels = [];

    // --- Label fit (OS capped at 32 students) ---
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const sliceDeg = 360 / nBase; // stable: based on total eligible active

    // Font size scales down as slices get smaller (max 32 => slice ~11.25deg)
    const fontSize = clamp(Math.floor(sliceDeg * 0.6) + 8, 10, 16); // 10..16

    // Max visible characters per slice (then truncate or initials)
    const maxChars = clamp(Math.floor(sliceDeg * 0.7), 3, 12); // 3..12

    const toInitials = (s) => {
      const parts = String(s || '').trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '—';
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + ' ' + parts[parts.length - 1][0]).toUpperCase();
    };

    const fitName = (raw) => {
      const s = String(raw || '').trim();
      if (!s) return '—';

      // 1) Dense wheel → ALWAYS initials
      if (sliceDeg <= 18) {
        return toInitials(s);
      }

      // 2) Medium density → short truncation (prevents overlap)
      if (sliceDeg <= 28) {
        const MAX = 5;
        return s.length > MAX
          ? s.slice(0, MAX - 1) + '…'
          : s;
      }

      // 3) Spacious → full name
      return s;
    };


    for (let i = 0; i < n; i++) {
      const a0 = -90 + i * slice;
      const a1 = -90 + (i + 1) * slice;
      const x0 = cx + r * Math.cos(toRad(a0));
      const y0 = cy + r * Math.sin(toRad(a0));
      const x1 = cx + r * Math.cos(toRad(a1));
      const y1 = cy + r * Math.sin(toRad(a1));
      const large = slice > 180 ? 1 : 0;
      const fill = i % 2 === 0 ? '#dbeafe' : '#bfdbfe';

      paths.push(
        `<path d="M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z" fill="${fill}" stroke="#93c5fd" stroke-width="2" />`
      );

      const mid = a0 + slice / 2;
      const lx = cx + (r * 0.68) * Math.cos(toRad(mid));
      const ly = cy + (r * 0.68) * Math.sin(toRad(mid));
      const rot = mid + 90;
      const rawName = String(list[i]?.name ?? list[i]?.label ?? list[i]?.id ?? '');
      const name = fitName(rawName);


      labels.push(
        `<text x="${lx}" y="${ly}" fill="#0f172a" font-size="${fontSize}" font-weight="800"
           text-anchor="middle" dominant-baseline="middle"
           transform="rotate(${rot} ${lx} ${ly})">${_esc(name)}</text>`
      );
    }

    wheel.innerHTML = `
      <svg viewBox="0 0 520 520" aria-label="STW Wheel">
        ${paths.join('')}
        ${labels.join('')}
      </svg>
    `;
  }

  function _spinWheelToWinnerIndex(winnerIndex, total) {
    const wheel = _qs('[data-stw-wheel]');
    const label = _qs('[data-stw-wheelLabel]');
    if (!wheel) return Promise.resolve(false);

    const n = Math.max(1, Number(total) || 1);
    const idx = Math.max(0, Math.min(n - 1, Number(winnerIndex) || 0));
    const slice = 360 / n;
    const targetCenterDeg = idx * slice + slice / 2;
    // Fewer full turns + longer duration = slower peak / more realistic
    const extraTurns = 3 + Math.floor(Math.random() * 3); // 3..5

    const cur = Number(wheel.dataset.rot || 0);
    const align = -targetCenterDeg;
    const final = cur + extraTurns * 360 + align;

    wheel.classList.remove('is-snapping');
    wheel.classList.add('is-spinning');
    // Scale duration gently with number of turns (realistic, avoids "snap" feel)
    wheel.style.transitionDuration = `${2.8 + extraTurns * 0.25}s`;
    wheel.style.setProperty('--stw-rot', `${final}deg`);
    wheel.dataset.rot = String(final);

    if (label) label.textContent = 'Spinning…';

    return new Promise((resolve) => {
      const onEnd = (e) => {
        if (e?.target !== wheel) return;
        wheel.removeEventListener('transitionend', onEnd);

        const snapped = align;
        wheel.classList.add('is-snapping');
        wheel.style.setProperty('--stw-rot', `${snapped}deg`);
        wheel.dataset.rot = String(snapped);
        void wheel.offsetWidth;
        wheel.classList.remove('is-snapping');

        if (label) label.textContent = 'Landed';
        resolve(true);
      };
      wheel.addEventListener('transitionend', onEnd);
    });
  }
 

  function _setDifficulty(n) {
    const d = Number(n);
    _difficulty = (d === 1 || d === 2 || d === 3) ? d : 1;
    _qsAllDiffButtons();
  }

  function _qsAllDiffButtons() {
    _rootEl?.querySelectorAll?.('[data-stw-diff]')?.forEach(btn => {
      const on = Number(btn.getAttribute('data-stw-diff')) === _difficulty;
      btn.classList.toggle('is-on', on);
    });
    _modalEl?.querySelectorAll?.('[data-stw-diff]')?.forEach(btn => {
      const on = Number(btn.getAttribute('data-stw-diff')) === _difficulty;
      btn.classList.toggle('is-on', on);
    });
  }

  function _setCategory(cat) {
    _category = String(cat || '');
    const sel = _qs('select[data-stw-category]');
    if (sel) sel.value = _category;
  

    _renderUnits();
    _setSubcategory(_firstUnitKey() || '');
    _saveQBSelection();

    _updateModalCategoryLabel();
  }

  function _setSubcategory(sub) {
    _subcategory = String(sub || '');
    const sel = _qs('select[data-stw-subcategory]');
    if (sel) sel.value = _subcategory;
    _renderFocuses();
    _setFocus(_firstFocusKey() || '');
    _saveQBSelection();
    _updateModalCategoryLabel();
  }

  function _setFocus(focus) {
    _focus = String(focus || '');
    const sel = _qs('select[data-stw-focus]');
    if (sel) sel.value = _focus;
    _saveQBSelection();    
    _updateModalCategoryLabel();
  }

  function _firstUnitKey() {
    const subs = _qbGetUnits(_category) || [];
    return subs[0]?.key || '';
  }

  function _firstFocusKey() {
    const focuses = _qbGetFocuses(_category, _subcategory) || [];
    return focuses[0]?.key || '';
  }


  function _getCategoryLabel(key) {
    const cats = _qbGetCategories() || [];
    const hit = cats.find(x => x.key === key);
    return hit?.label || key || '—';
  }

  function _getUnitLabel(catKey, subKey) {
    const subs = _qbGetUnits(catKey) || [];
    const hit = subs.find(x => x.key === subKey);
    return hit?.label || subKey || '';
  }

  function _getFocusLabel(catKey, unitKey, focusKey) {
    const subs = _qbGetFocuses(catKey, unitKey) || [];
    const hit = subs.find(x => x.key === focusKey);
    return hit?.label || focusKey || '';
  }

  function _updateModalCategoryLabel() {
    if (!_modalEl) return;

    if (_qbSource === 'uploaded') {
      const label = [
        _qbLoadedSingle?.stage?.label,
        _qbLoadedSingle?.unit?.label,
        _qbLoadedSingle?.focus?.label
      ].filter(Boolean).join(' / ');

      _qsm('[data-stw-cat]').textContent = label || 'Loaded Bank';
      return;
    }

    const catLabel = _getCategoryLabel(_category);
    const unitLabel = _subcategory ? _getUnitLabel(_category, _subcategory) : '';
    const focusLabel = _focus ? _getFocusLabel(_category, _subcategory, _focus) : '';
    const parts = [catLabel, unitLabel, focusLabel].filter(Boolean);
    const label = parts.join(' / ');
    _qsm('[data-stw-cat]').textContent = label;
  }

  function _renderFocuses() {
    const sel = _qs('select[data-stw-focus]');
    if (!sel) return;
    const focuses = _qbGetFocuses(_category, _subcategory) || [];
    sel.innerHTML = focuses.map(s => `<option value="${_esc(s.key)}">${_esc(s.label || s.key)}</option>`).join('');
  }

  function _renderUnits() {
    const sel = _qs('select[data-stw-subcategory]');
    if (!sel) return;
    const subs = _qbGetUnits(_category) || [];
    sel.innerHTML = subs.map(s => `<option value="${_esc(s.key)}">${_esc(s.label || s.key)}</option>`).join('');
  }

  function _updateCounts() {
    const eligible = _eligibleStudents().length;
    const picked = _picked.size;
    const el = _qs('[data-stw-counts]');
    if (el) el.textContent = `Eligible: ${eligible} | Picked: ${picked}`;
  }

  function _refreshWheel(labelText = 'Ready') {
    if (!_rootEl) return;
    const list = _unpickedEligible();
    _renderWheel(list, _eligibleStudents().length);

    const wheel = _qs('[data-stw-wheel]');
    if (wheel) {
      wheel.dataset.rot = '0';
      wheel.style.setProperty('--stw-rot', '0deg');
      wheel.classList.remove('is-spinning');
      wheel.classList.remove('is-snapping');
    }
    const label = _qs('[data-stw-wheelLabel]');
    if (label) label.textContent = labelText;
  }

  function _resetPicked(reason = 'manual') {
    _picked.clear();
    _updateCounts();
    const note = _qs('[data-stw-note]');
    if (note) note.textContent = `Picked list reset (${reason}).`;
    _refreshWheel('Ready');
  }

  function _autoResetIfExhausted() {
    const eligible = _eligibleStudents();
    if (!eligible.length) return false;
    if (_picked.size >= eligible.length) {
      _resetPicked('auto-exhausted');
    return { el: _rootEl };
    }
    return false;
  }

  function _pickRandomStudent() {
    // Enforce auto-reset when exhausted (locked requirement)
    const list = _unpickedEligible();
    if (!list.length) {
      const didReset = _autoResetIfExhausted();
      const after = _unpickedEligible();
      if (!after.length) return null; // no active students
      // proceed after reset
      return after[Math.floor(Math.random() * after.length)];
    }
    return list[Math.floor(Math.random() * list.length)];
  }

    function _summonQuestion(diff) {
    if (!_modalEl || !_current) return;

    // Recall behaviour: can summon a NEW question any time while modal is open.
    // This resets timer + re-hides answer.
    _stopTimers();
    _qsm('[data-stw-a-wrap]')?.classList.add('hidden');
    const tEl = _qsm('[data-stw-t]');
    if (tEl) tEl.textContent = '10.0s';

    const d = Number(diff);
    const chosen = (d === 1 || d === 2 || d === 3) ? d : 1;

    _questionStarted = true;
    _difficulty = chosen;

    const q = (_qbSource === 'uploaded')
      ? _qbGetRandomQuestionLoaded(chosen)
      : _qbGetRandomQuestion(_category, _subcategory || null, _focus || null, chosen);

    _qsm('[data-stw-d]').textContent = String(chosen);
    _qsm('[data-stw-q]').textContent = q?.question || '—';
    _qsm('[data-stw-a]').textContent = q?.answer || '—';

    _qsm('[data-stw-q-wrap]')?.classList.remove('stw-qPending');    
    _qsm('[data-stw-t-wrap]')?.classList.remove('hidden');
    _qsm('[data-stw-reveal]') && (_qsm('[data-stw-reveal]').disabled = false);

    // Enable marking buttons now that a real question exists
    const ok = _qsm('[data-stw-correct]');
    const no = _qsm('[data-stw-incorrect]');
    if (ok) ok.disabled = false;
    if (no) no.disabled = false;

    // Reveal answer after 2s (locked requirement)
    // Reveal answer ONLY when timer finishes
    // (no delayed reveal)

    // Start 10s timer
    const timerMs = 10000;
    _endsAt = Date.now() + timerMs;
    _timerId = setInterval(() => {
      const left = Math.max(0, _endsAt - Date.now());
      const el = _qsm('[data-stw-t]');
      if (el) el.textContent = (left / 1000).toFixed(1) + 's';
      if (left <= 0) {
        // Timer finished → reveal answer now
        _qsm('[data-stw-a-wrap]')?.classList.remove('hidden');
        _stopTimers();
      }
    }, 100);
  }


  function _openModal(payload) {
    _closeModal(); // idempotent
    _stopTimers();

    _current = payload;
    _awarded = false;

    _modalEl = document.createElement('div');
    _modalEl.className = 'stw-modal';
    _modalEl.innerHTML = `
      <div class="stw-modal-card" role="dialog" aria-modal="true" aria-label="STW Question">
        <header class="stw-modal-h">
          <div class="stw-modal-title"><span data-stw-who>—</span></div>
          <button class="stw-x" data-stw-close aria-label="Close">×</button>
        </header>

        <div class="stw-modal-row mono">
          Category: <span data-stw-cat>—</span>
          <span class="hidden" data-stw-d>—</span>

        </div>

        <div class="stw-modal-row">
          <div class="label mono">Summon question</div>
          <div class="stw-diffGroup" aria-label="Difficulty (hotkeys 1/2/3)">
            <button class="d" data-stw-summon="1">1</button>
            <button class="d" data-stw-summon="2">2</button>
            <button class="d" data-stw-summon="3">3</button>
            <button class="d" data-stw-reveal disabled>Reveal</button>
            <span class="mono stw-diffHint">Hotkeys: 1 / 2 / 3 • Reveal: 4</span>
         </div>
       </div>

        <div class="stw-modal-row q stw-qReserve stw-qPending" data-stw-q-wrap>
          <div class="label mono">Question</div>
          <div class="text" data-stw-q>—</div>
        </div>

        <div class="stw-modal-row a hidden" data-stw-a-wrap>
          <div class="label mono">Answer</div>
          <div class="text" data-stw-a>—</div>
        </div>

        <div class="stw-modal-row mono hidden" data-stw-t-wrap>
          Timer: <span data-stw-t>10.0s</span>
        </div>

        <footer class="stw-modal-f">
          <button class="ok" data-stw-correct disabled>✅ Correct (+1)</button>
          <button class="no" data-stw-incorrect disabled>❌ Incorrect</button>
        </footer>
      </div>
    `;

    _rootEl.appendChild(_modalEl);

    _qsm('[data-stw-who]').textContent = String(payload?.name || payload?.studentId || '—');
    _qsm('[data-stw-cat]').textContent = _getCategoryLabel(_category) || '—';
    _updateModalCategoryLabel();
    _qsm('[data-stw-d]').textContent = '—';
    _qsm('[data-stw-q]').textContent = '—';
    _qsm('[data-stw-a]').textContent = '—';

    _questionStarted = false;
    // Ensure question/timer remain hidden until summoned
    _qsm('[data-stw-q-wrap]')?.classList.add('stw-qPending');
    _qsm('[data-stw-a-wrap]')?.classList.add('hidden');
    _qsm('[data-stw-t-wrap]')?.classList.add('hidden');
    _qsm('[data-stw-correct]') && (_qsm('[data-stw-correct]').disabled = true);
    _qsm('[data-stw-incorrect]') && (_qsm('[data-stw-incorrect]').disabled = true);
    _qsm('[data-stw-reveal]') && (_qsm('[data-stw-reveal]').disabled = true);

    // handlers
    _modalEl.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      if (t.matches('[data-stw-close]')) _closeModal();

      if (t.matches('[data-stw-summon]')) {
        _summonQuestion(t.getAttribute('data-stw-summon'));
      }

      if (t.matches('[data-stw-reveal]')) {
        if (!_questionStarted) return;
        _qsm('[data-stw-a-wrap]')?.classList.remove('hidden');
        _stopTimers();
      }

      if (t.matches('[data-stw-correct]')) {
        if (_awarded) return;
        _awarded = true;
        emit(
          E.STW_AWARD || 'stw:award',
          { studentId: payload.studentId, points: 1, difficulty: _difficulty, ts: Date.now() }
        );
     
       // [PC#062] Green tile flash for correct STW answer
        try {
        window.__CE_FLASH?.flashLeaderboardStudent?.(payload.studentId, 'bonus');
        } catch {}
        _closeModal();
      }

      if (t.matches('[data-stw-incorrect]')) {
        _closeModal();
      }
    });

    // Hotkeys: 1/2/3 summon question difficulty
    _modalKeyHandler = (e) => {
      if (!_modalEl) return;
      const k = e.key;
      if (k === '1' || k === '2' || k === '3') {
        e.preventDefault();
        _summonQuestion(k);

        return;
       }

      // Hotkey: 4 = reveal answer early (no timer change)
      if (k === '4') {
        // Only meaningful after a question is summoned
        if (!_questionStarted) return;
        e.preventDefault();
        _qsm('[data-stw-a-wrap]')?.classList.remove('hidden');
        _stopTimers(); // stop the countdown once answer is force-revealed
        return;
      }
    };
    window.addEventListener('keydown', _modalKeyHandler, true);
  }

  function _closeModal() {
    _stopTimers();
    if (_modalKeyHandler) {
      window.removeEventListener('keydown', _modalKeyHandler, true);
      _modalKeyHandler = null;
    }
    if (_modalEl) {
      _modalEl.remove();
      _modalEl = null;
    }
    _current = null;
    _awarded = false;
    _questionStarted = false;
    // Winner is now "consumed" — remove them from the wheel immediately
    _refreshWheel('Ready');
  }
  function _closeEndModal() {
    if (_endModalEl) {
      _endModalEl.remove();
      _endModalEl = null;
    }
  }

  function _emitPhaseChangeOnce(from, to, reason = '') {
    if (_phaseEndRequested) return;
    _phaseEndRequested = true;
    const payload = { from, to, reason, ts: Date.now() };
    const mode = window.__CE_BOOT?.lessonConfig?.burnlineMode || 'timeline';
    if (mode === 'advisory') {
      // Advisory mode: request only (PhaseGate decides + applies exit gating)
      try { emit('ui:phaseRequestEnter', { toPhase: to, source: 'stw', reason, ts: Date.now() }); } catch {}
      try { Events?.emit?.('ui:phaseRequestEnter', { toPhase: to, source: 'stw', reason, ts: Date.now() }); } catch {}
      try { window.__CE_BOOT?.modules?.Events?.emit?.('ui:phaseRequestEnter', { toPhase: to, source: 'stw', reason, ts: Date.now() }); } catch {}
      try { window.__CE_BOOT?.CE?.modules?.Events?.emit?.('ui:phaseRequestEnter', { toPhase: to, source: 'stw', reason, ts: Date.now() }); } catch {}
      return;
    }

    // Timeline mode: preserve existing behaviour
    try { emit('lesson:phaseChange', payload); } catch {}
    try { Events?.emit?.('lesson:phaseChange', payload); } catch {}
    try { window.__CE_BOOT?.modules?.Events?.emit?.('lesson:phaseChange', payload); } catch {}
    try { window.__CE_BOOT?.CE?.modules?.Events?.emit?.('lesson:phaseChange', payload); } catch {}
  }

  function _openEndPhaseModal() {
    if (!_rootEl) return;
    _closeEndModal(); // idempotent

    // Advisory mode: do not show STW-local confirmation modal.
    // Delegate exit confirmation + routing to PhaseGate via ui:phaseRequestEnter.
    const mode = window.__CE_BOOT?.lessonConfig?.burnlineMode || 'timeline';
    if (mode === 'advisory') {
      _emitPhaseChangeOnce(3, 4, 'stw:endPhase3');
      return;
    }

    _endModalEl = document.createElement('div');
    _endModalEl.className = 'stw-modal stw-endModal';
    _endModalEl.innerHTML = `
      <div class="stw-modal-card stw-endCard" role="dialog" aria-modal="true" aria-label="End Phase 3">
        <header class="stw-modal-h">
          <div class="stw-modal-title"><span class="mono">End Phase 3?</span></div>
          <button class="stw-x" data-stw-end-close aria-label="Close">×</button>
        </header>
        <div class="stw-modal-row">
         <div class="text" style="font-size:28px;">            This will advance to <strong>Phase 4 (Work)</strong>.
          </div>
          <div class="mono" style="opacity:.8; margin-top:10px;">
            Tip: Enter = confirm • Esc = cancel
          </div>
        </div>
        <footer class="stw-modal-f">
          <button data-stw-end-cancel>Cancel</button>
          <button class="ok" data-stw-end-confirm>End Phase 3 → Phase 4</button>
        </footer>
      </div>
    `;

    _rootEl.appendChild(_endModalEl);

    const onKey = (e) => {
      if (!_endModalEl) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        _closeEndModal();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        _closeEndModal();
        _emitPhaseChangeOnce(3, 4, 'stw:endPhase3');
      }
    };

    // One-shot key binding (removed on close)
    const off = () => window.removeEventListener('keydown', onKey, true);
    window.addEventListener('keydown', onKey, true);

    _endModalEl.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      if (t.matches('[data-stw-end-close]') || t.matches('[data-stw-end-cancel]')) {
        _closeEndModal();
        off();
        return;
      }
      if (t.matches('[data-stw-end-confirm]')) {
        _closeEndModal();
        off();
        _emitPhaseChangeOnce(3, 4, 'stw:endPhase3');
        return;
      }
      // click outside card cancels
      if (t === _endModalEl) {
        _closeEndModal();
        off();
      }
    });
  }


  function _ensureStyles() {
    if (document.getElementById('stw-base-style')) return;
    const s = document.createElement('style');
    s.id = 'stw-base-style';
    s.textContent = `
      .stw-base {
        position: absolute;
        inset: 0;
        pointer-events: auto;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
        background: linear-gradient(180deg, #eff6ff 0%, #e0e7ff 100%);
      }
      .stw-shell {
        position: relative;
        width: 420px;
        background: #e8f0ff; /* coinflip light surface */
        color: #0f172a;      /* coinflip dark text */
        border-radius: 14px;
        padding: 14px;
        box-shadow: 0 12px 28px rgba(15,23,42,.20);
      }
      .stw-h { display:block; margin-bottom:4px; }
      .stw-h strong { font-size: 16px; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .stw-row { margin: 10px 0; }
      .stw-actions { display:flex; gap:10px; }
      .stw-actions .spin { flex: 1.4; }
      .stw-actions button:not(.spin) { flex: 1; }
      .stw-actions button, .stw-row select, .stw-diff .d {
        border: 2px solid #93c5fd;
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 14px;
        background: #e0e7ff;
        color: #0f172a;
        cursor: pointer;
      }
      .stw-actions .spin {
        font-weight: 900;
        font-size: 16px;
        padding: 10px 12px;
        background: #bbf7d0;
        color: #065f46;
        border: 2px solid #22c55e;
        box-shadow: 0 10px 18px rgba(15,23,42,.18);
      }
      .stw-diff { display:flex; gap:8px; }
      .stw-diff .d.is-on { outline: 2px solid #0b3c8a; }
      .stw-actions button:hover, .stw-diff .d:hover, .stw-row select:hover {
        background: #dbeafe;
      }
      .stw-note { opacity: .9; }
      .stw-modal {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,.45);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index: 50;
      }
      .stw-modal-card {
        width: min(1100px, 94vw);
        background: #e8f0ff; /* coinflip light surface */
        color: #0f172a;      /* coinflip dark text */
        border-radius: 14px;
        padding: 22px;
        box-shadow: 0 12px 28px rgba(15,23,42,.25);
      }

      .stw-modal-h {
        position: relative;
        display:flex;
        justify-content:center;
        align-items:center;
        margin-bottom: 8px;
      }

      /* Student name (who the question is for) */
      .stw-modal-title {
        width: 100%;
        text-align: center;
        color: #0b3c8a; /* coinflip header blue */   
      }
      .stw-modal-title [data-stw-who] {
        font-size: 44px;
        font-weight: 900;
      }
      .stw-x {
        position: absolute;
        right: 0;
        top: 0;
        background: transparent;
        border: 0;
        color: #0f172a;
        font-size: 22px;
        cursor: pointer;
      }
      .stw-modal-row { margin: 10px 0; }
      .stw-modal-row .label { opacity: .8; margin-bottom: 6px; }
      .stw-modal-row .text { font-size: 38px; line-height: 1.25; color: #0f172a; }

      /* Answer text slightly smaller than question (but still large) */
      .stw-modal-row.a .text { font-size: 34px; line-height: 1.25; color: #1e293b; }

      /* Timer emphasis (requested) */
      [data-stw-t] {
        font-size: 34px;
        font-weight: 900;
        color: #ca8a04; /* coinflip yellow, less glare */
        letter-spacing: 0.5px;
      }
      .stw-modal-f { display:flex; gap:10px; justify-content:flex-end; margin-top: 14px; }

      /* Modal difficulty buttons: attached group */
      .stw-diffGroup { display:flex; gap:0; }
      .stw-diffGroup .d {
        border-radius: 0;
        min-width: 64px;
        font-weight: 800;
      }
      .stw-diffGroup .d:first-child { border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
      .stw-diffGroup .d:last-child { border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
      .stw-diffHint { opacity: .8; margin-left: 10px; }
      .stw-modal-f button:disabled { opacity: .45; cursor: not-allowed; }

      /* Coinflip-style buttons */
      .stw-modal-f button,
      .stw-diffGroup .d {
        background: #e0e7ff;
        color: #0f172a;
        border: 2px solid #93c5fd;
      }

      .stw-modal-f button.ok {
        background: #bbf7d0;
        border-color: #22c55e;
        color: #065f46;
      }
    
      /* End Phase modal tweaks (slightly tighter) */
      .stw-endCard { width: min(820px, 92vw); }
      .stw-endModal .stw-modal-row .text strong { color:#0b3c8a; }

      .stw-modal-f button:hover,
      .stw-diffGroup .d:hover {
        background: #dbeafe;
      }
      
      /* ===== STW Wheel (deterministic land-on-winner) ===== */
      /* Layout: wheel is the hero centre; controls on the right */
      .stw-layout{
        position:absolute;
        inset: 0;
        display:grid;
        grid-template-columns: 1fr 420px;
        gap: 16px;
        padding: 16px;
        align-items: center;
        z-index: 1;
      }
      .stw-wheelArea{
        position: relative;
        width: 100%;
        height: 100%;
        display:flex;
        align-items:center;
        justify-content:center;
        pointer-events:auto;
      }
      .stw-wheelWrap{
        position:relative;
        width: min(760px, calc(100vw - 520px));
        aspect-ratio: 1 / 1;
      }

      .stw-wheel{
        position:absolute;
        inset:0;
        border-radius: 50%;
        background: #e8f0ff;
        border: 14px solid #93c5fd;
        box-shadow: 0 16px 34px rgba(15,23,42,.22);
        transform: rotate(var(--stw-rot, 0deg));
        transition: transform 3.2s cubic-bezier(.12,.78,.10,1);
        will-change: transform;
        overflow:hidden;
      }
      .stw-wheel svg{ width:100%; height:100%; display:block; }
      .stw-pointer{
        position:absolute;
        top: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 16px solid transparent;
        border-right: 16px solid transparent;
        border-bottom: 26px solid #0b3c8a;
        filter: drop-shadow(0 6px 10px rgba(0,0,0,.55));
        z-index: 3;
        pointer-events:none;
      }
      .stw-wheelCenter{
        position:absolute;
        left:50%;
        top:50%;
        transform: translate(-50%,-50%);
        width: 18%;
        height: 18%;
        border-radius: 50%;
        background: #eff6ff;
        border: 2px solid #93c5fd;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding: 10px;
        z-index: 2;
      }
      .stw-wheelCenter .mono{ font-size: 12px; opacity:.9; }
      .stw-wheel.is-spinning{ transition: transform 3.2s cubic-bezier(.12,.78,.10,1); }
      .stw-wheel.is-snapping{ transition: transform 0.001s linear; }

      .stw-modal-f .ok { font-weight: 700; }
      .hidden { display:none; }

      /* Reserve question space so the modal never changes size on summon */
      .stw-qReserve { min-height: 280px; }
      .stw-qPending [data-stw-q] { visibility: hidden; }
    `;
    document.head.appendChild(s);
  }

  function mount(baseHost) {
    unmount();
    _ensureStyles();
    _hostEl = baseHost;
    if (!_hostEl) return false;

    _rootEl = document.createElement('div');
    _rootEl.className = 'stw-base';
    _rootEl.innerHTML = `
      <div class="stw-layout">
        <div class="stw-wheelArea">
          <div class="stw-wheelWrap">
            <div class="stw-pointer"></div>
            <div class="stw-wheel" data-stw-wheel style="--stw-rot:0deg"></div>
            <div class="stw-wheelCenter">
              <div class="mono" data-stw-wheelLabel>Ready</div>
            </div>
          </div>
        </div>
        <div class="stw-shell">
        <div class="stw-h">
          <strong>Phase 3 • STW</strong>
        </div>
        <div class="mono" data-stw-counts style="margin-top:4px; opacity:.85;">
          Eligible: 0 | Picked: 0
        </div>

        <div class="stw-row">
          <div class="mono" style="opacity:.85; margin-bottom:6px;">Question bank: <span data-stw-qbsource>Built-in</span></div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button data-stw-uploadQB>Load QB</button>
            <button data-stw-useBuiltInQB>Use built-in</button>
            <input type="file" data-stw-qbfile style="display:none" accept=".json,.js,.txt" />
          </div>
        </div>


        <div class="stw-row">
          <div class="mono" style="opacity:.85; margin-bottom:6px;">Category</div>
          <select data-stw-category></select>
        </div>

        <div class="stw-row">
          <div class="mono" style="opacity:.85; margin-bottom:6px;">Unit</div>
          <select data-stw-subcategory></select>
        </div>

        <div class="stw-row">
          <div class="mono" style="opacity:.85; margin-bottom:6px;">Focus</div>
          <select data-stw-focus></select>
        </div>

        <div class="stw-row stw-actions">
          <button class="spin" data-stw-spin>🎯 SPIN</button>
        </div>

        <div class="stw-row stw-actions stw-actions-secondary">
          <button data-stw-reset>↻ Reset</button>
          <button data-stw-end>⏭ End Phase</button>
        </div>

        <div class="stw-row mono stw-note" data-stw-note>Ready.</div>
      </div>
      </div>
    `;

    _hostEl.appendChild(_rootEl);

    // populate category dropdown

    _qbBuiltIn = window.STW_QB || {};
    _qbActive = _qbBuiltIn;
    _qbSource = 'builtin';

    const catsRaw = _qbGetCategories() || [];
    const ORDER = ['quickmath', 'support', 'year7', 'year8', 'year9', 'year10'];
    const cats = [
      ...ORDER.map(k => catsRaw.find(c => c.key === k)).filter(Boolean),
      ...catsRaw.filter(c => !ORDER.includes(c.key))
    ];
    const sel = _qs('select[data-stw-category]');
    if (sel) {
      sel.innerHTML = cats.map(c => `<option value="${_esc(c.key)}">${_esc(c.label || c.key)}</option>`).join('');
    }
    _loadQBSelection();

    const validCat = cats.find(c => c.key === _category)?.key || '';
    _setCategory(validCat || cats[0]?.key || '');

    const validSub = _qbGetUnits(_category).find(s => s.key === _subcategory)?.key || '';
    _setSubcategory(validSub || _firstUnitKey() || '');

    const validFocus = _qbGetFocuses(_category, _subcategory).find(f => f.key === _focus)?.key || '';
    _setFocus(validFocus || _firstFocusKey() || '');
    _setDifficulty(1);
    _updateCounts();
    _refreshWheel('Ready');
    _setQBSourceLabel();

    const qbFile = _qs('input[data-stw-qbfile]');
    if (qbFile && !qbFile.__stwQBHooked) {
      qbFile.__stwQBHooked = true;
      qbFile.addEventListener('change', async () => {
        const f = qbFile.files?.[0];
        qbFile.value = '';
        if (!f) return;
        try {
          const text = await f.text();
          const qb = _parseQBFileText(text);

          if (!qb) {
            const note = _qs('[data-stw-note]');
            if (note) note.textContent = 'QB upload failed (could not parse).';
            _setQBSourceLabel();
            return;
          }
          _qbSource = 'uploaded';

          if (_isLoadedSingleQB(qb)) {
            // TRUE LOAD MODE (no category system)
            _qbLoadedSingle = qb;
            _qbUploaded = null;
            _qbActive = _qbBuiltIn; // leave built-in untouched
          } else {
            // fallback: full QB tree (rare)
            _qbLoadedSingle = null;
            _qbUploaded = qb;
            _qbActive = _qbUploaded;

            // rebuild categories/subcategories only for full-tree loads
            const catsRaw2 = _qbGetCategories() || [];
            const ORDER = ['quickmath', 'support', 'year7', 'year8', 'year9', 'year10'];
            const cats2 = [
              ...ORDER.map(k => catsRaw2.find(c => c.key === k)).filter(Boolean),
              ...catsRaw2.filter(c => !ORDER.includes(c.key))
            ];
            const sel2 = _qs('select[data-stw-category]');
            if (sel2) {
              sel2.innerHTML = cats2.map(c => `<option value="${_esc(c.key)}">${_esc(c.label || c.key)}</option>`).join('');
            }
            _setCategory(cats2[0]?.key || '');
            _setSubcategory(_firstUnitKey() || '');
            _setFocus(_firstFocusKey() || '');
          }

          _setQBSourceLabel();

          _qs('select[data-stw-category]')?.closest('.stw-row')?.classList.add('hidden');
          _qs('select[data-stw-subcategory]')?.closest('.stw-row')?.classList.add('hidden');
          _qs('select[data-stw-focus]')?.closest('.stw-row')?.classList.add('hidden');

          const note = _qs('[data-stw-note]');
          if (note) note.textContent = 'Loaded temporary question bank.';
        } catch {
          const note = _qs('[data-stw-note]');
          if (note) note.textContent = 'QB upload failed.';
        }
      });
    }

    _rootEl.addEventListener('click', async (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      if (t.matches('[data-stw-diff]')) _setDifficulty(t.getAttribute('data-stw-diff'));

      if (t.matches('[data-stw-uploadQB]')) {
        const inp = _qs('input[data-stw-qbfile]');
        if (inp) inp.click();
      }

      if (t.matches('[data-stw-useBuiltInQB]')) {
        _qbBuiltIn = window.STW_QB || {};
        _qbActive = _qbBuiltIn;
        _qbSource = 'builtin';
        _qbUploaded = null;
        _qbLoadedSingle = null;

        _qs('select[data-stw-category]')?.closest('.stw-row')?.classList.remove('hidden');
        _qs('select[data-stw-subcategory]')?.closest('.stw-row')?.classList.remove('hidden');
        _qs('select[data-stw-focus]')?.closest('.stw-row')?.classList.remove('hidden');

        const catsRaw2 = _qbGetCategories() || [];
        const ORDER = ['quickmath', 'support', 'year7', 'year8', 'year9', 'year10'];
        const cats2 = [
          ...ORDER.map(k => catsRaw2.find(c => c.key === k)).filter(Boolean),
          ...catsRaw2.filter(c => !ORDER.includes(c.key))
        ];
        const sel2 = _qs('select[data-stw-category]');
        if (sel2) {
          sel2.innerHTML = cats2.map(c => `<option value="${_esc(c.key)}">${_esc(c.label || c.key)}</option>`).join('');
        }
        _loadQBSelection();

        const validCat2 = cats2.find(c => c.key === _category)?.key || '';
        _setCategory(validCat2 || cats2[0]?.key || '');

        const validSub2 = _qbGetUnits(_category).find(s => s.key === _subcategory)?.key || '';
        _setSubcategory(validSub2 || _firstUnitKey() || '');

        const validFocus2 = _qbGetFocuses(_category, _subcategory).find(f => f.key === _focus)?.key || '';
        _setFocus(validFocus2 || _firstFocusKey() || '');
        _setQBSourceLabel();


        const note = _qs('[data-stw-note]');
        if (note) note.textContent = 'Using built-in question bank.';
      }


      if (t.matches('select[data-stw-category]')) {
        _setCategory(t.value);
      }

      if (t.matches('select[data-stw-subcategory]')) {
        _setSubcategory(t.value);
      }

      if (t.matches('select[data-stw-focus]')) {
        _setFocus(t.value);
      }

      if (t.matches('[data-stw-reset]')) _resetPicked('manual');
      if (t.matches('[data-stw-end]')) _openEndPhaseModal();

      if (t.matches('[data-stw-spin]')) {
        // Ensure pool exists (auto-reset on exhaustion)
        if (!_unpickedEligible().length) _autoResetIfExhausted();

        const candidates = _unpickedEligible();
        if (!candidates.length) {
          const note = _qs('[data-stw-note]');
          if (note) note.textContent = 'No eligible active students.';
          _updateCounts();
          return;
        }

        _renderWheel(candidates, _eligibleStudents().length);

        // Winner selection remains the source of truth
        const winner = candidates[Math.floor(Math.random() * candidates.length)];

        const id = String(winner.id);
        _picked.add(id);
        _updateCounts();

        const winnerIndex = candidates.findIndex(s => String(s.id) === id);
        await _spinWheelToWinnerIndex(winnerIndex, candidates.length);

        _openModal({
          studentId: id,
          name: (winner.name || winner.label || String(winner.id) || '').trim()
        });

        const note = _qs('[data-stw-note]');
        if (note) note.textContent = `Selected: ${winner.name || id}`;
      }
    });

    // Keyboard: 1/2/3 difficulty
    _rootEl.tabIndex = -1;
    _rootEl.addEventListener('keydown', (e) => {
      if (e.key === '1' || e.key === '2' || e.key === '3') _setDifficulty(e.key);
    });

    return { el: _rootEl };
  }

  function unmount() {
    _closeModal();
    _closeEndModal();
    _stopTimers();
    _picked.clear();
    _phaseEndRequested = false;
    if (_rootEl) _rootEl.remove();
    _rootEl = null;
    _hostEl = null;
  }

  window.__CE_STW_BASE = { mount, unmount };
})();
