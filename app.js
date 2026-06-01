'use strict';
(function () {

  // ── Constants ──────────────────────────────────────────────
  const DB_NAME      = 'wheelTodoDB';
  const DB_VER       = 1;
  const STORE        = 'days';
  const SPIN_DUR_MIN = 2900;
  const SPIN_DUR_MAX = 3200;
  const MILESTONES   = [3, 7, 14, 30, 60, 100];

  const WHEEL_COLORS = {
    'warm-start':  ['#EDB590','#E59880','#9DC4BC','#F0D29D','#ADA8CC','#D4A5C8'],
    'slow-down':   ['#C8977A','#C07868','#7AADA6','#C4A87A','#8E8AAA','#A882A4'],
    'light-a11y':  ['#C8640A','#B84A30','#2A8C82','#B89000','#5A5498','#A03882'],
    'dark-a11y':   ['#F5C4A0','#F0A898','#B4E0D8','#F5DFA0','#C8C4E8','#E8BCD8'],
  };

  const THEMES = {
    'warm-start': { label: 'Warm Start', mode: 'Light',                 bg: '#FAF7F2', swatch: '#E59880' },
    'slow-down':  { label: 'Slow Down',  mode: 'Dark',                  bg: '#1C1828', swatch: '#ADA8CC' },
    'light-a11y': { label: 'Light a11y', mode: 'High contrast · Light', bg: '#FFFFFF', swatch: '#B84A30' },
    'dark-a11y':  { label: 'Dark a11y',  mode: 'High contrast · Dark',  bg: '#0F0D18', swatch: '#F5C4A0' },
  };

  // ── State ──────────────────────────────────────────────────
  // Unified tasks array (prototype pattern): { id, name, initial, minutes, colorIdx, done, completedAt }
  let db              = null;
  let tasks           = [];
  let habits          = [];
  let habitLog        = {};
  let currentTheme    = localStorage.getItem('wt_theme') || 'warm-start';
  let habitsEnabled   = localStorage.getItem('wt_habits_enabled') !== 'false';
  let currentTab      = 'tasks';
  let wheelRotation   = 0;
  let spinFrame       = null;
  let pickedTask      = null;
  let editingTaskId   = null;
  let editingHabitId  = null;
  let focusTask       = null;
  let focusTotalSecs  = 0;
  let focusRemSecs    = 0;
  let focusInterval   = null;
  let focusPaused     = false;
  let undoTimeout     = null;
  let doneToastTimer  = null;
  let deletedTask     = null;
  let deletedTaskIndex = 0;
  let cachedStreak    = 0;
  let _heatmapCache   = {};
  let wateringTimeout = null;
  let dragSrc         = null;
  let selectedColorIdx = 0;
  let selectedIconIdx  = 0;
  let selectedMins     = 25;

  // ── Helpers ────────────────────────────────────────────────
  function localDayKey(date) {
    const d = date || new Date();
    return d.getFullYear()
      + '-' + String(d.getMonth() + 1).padStart(2, '0')
      + '-' + String(d.getDate()).padStart(2, '0');
  }

  function uid() {
    return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  function polar(cx, r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cx + r * Math.sin(rad) };
  }

  function slicePath(cx, R, i, n) {
    const sd = 360 / n;
    const s  = polar(cx, R, i * sd);
    const e  = polar(cx, R, (i + 1) * sd);
    const lg = sd > 180 ? 1 : 0;
    return `M ${cx} ${cx} L ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${R} ${R} 0 ${lg} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)} Z`;
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function fmtMins(m) {
    if (!m || m <= 0) return '';
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  }

  function fmtTime(secs) {
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function getInitial(name) { return (name || '?').trim()[0].toUpperCase(); }
  function getWheelColors() { return WHEEL_COLORS[currentTheme] || WHEEL_COLORS['warm-start']; }
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  // ── IndexedDB ──────────────────────────────────────────────
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'dateKey' });
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  function dbGet(key) {
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  function dbPut(record) {
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(record);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
    });
  }

  function dbGetAll() {
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  async function saveTodayTasks() {
    await dbPut({ dateKey: localDayKey(), tasks });
  }

  async function loadTodayTasks() {
    const rec = await dbGet(localDayKey());
    if (!rec) { tasks = []; return; }
    // Handle both old format (tasks+doneTasks separate) and new unified format
    if (rec.tasks && rec.tasks.length > 0 && typeof rec.tasks[0].done === 'boolean') {
      tasks = rec.tasks;
    } else {
      const active = (rec.tasks     || []).map(t => ({ ...t, done: false }));
      const done   = (rec.doneTasks || []).map(t => ({ ...t, done: true }));
      tasks = [...active, ...done];
    }
  }

  // ── Habits (localStorage) ───────────────────────────────────
  function loadHabits() {
    try {
      habits   = JSON.parse(localStorage.getItem('wt_habits')    || '[]');
      habitLog = JSON.parse(localStorage.getItem('wt_habit_log') || '{}');
    } catch (_) { habits = []; habitLog = {}; }
  }

  function saveHabits()   { localStorage.setItem('wt_habits',    JSON.stringify(habits)); }
  function saveHabitLog() { localStorage.setItem('wt_habit_log', JSON.stringify(habitLog)); }

  function isHabitDoneToday(id) {
    const k = localDayKey();
    return !!(habitLog[k] && habitLog[k][id]);
  }

  function calcHabitStreak(id) {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = localDayKey(d);
      if (habitLog[k] && habitLog[k][id]) { streak++; } else { break; }
    }
    return streak;
  }

  // ── Overall streak ─────────────────────────────────────────
  async function calcOverallStreak() {
    const all = await dbGetAll();
    const done = {};
    all.forEach(r => {
      let hasDone = false;
      if (r.tasks)     hasDone = r.tasks.some(t => t.done);
      if (!hasDone && r.doneTasks) hasDone = r.doneTasks.length > 0;
      if (hasDone) done[r.dateKey] = true;
    });
    if (tasks.some(t => t.done)) done[localDayKey()] = true;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (done[localDayKey(d)]) { streak++; } else { break; }
    }
    return streak;
  }

  // ── Heatmap data ───────────────────────────────────────────
  async function loadHeatmapData() {
    const all = await dbGetAll();
    _heatmapCache = {};
    all.forEach(r => {
      if (r.tasks)     _heatmapCache[r.dateKey] = r.tasks.filter(t => t.done).length;
      else if (r.doneTasks) _heatmapCache[r.dateKey] = r.doneTasks.length;
    });
    _heatmapCache[localDayKey()] = tasks.filter(t => t.done).length;
  }

  // ── Theme ──────────────────────────────────────────────────
  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wt_theme', theme);
    renderThemeGrids();
    renderWheel();
  }

  function renderThemeGrids() {
    [$('theme-grid'), $('profile-theme-grid')].forEach(grid => {
      if (!grid) return;
      grid.innerHTML = '';
      Object.entries(THEMES).forEach(([key, t]) => {
        const btn = document.createElement('button');
        btn.className = 'theme-card' + (key === currentTheme ? ' selected' : '');
        btn.innerHTML = `
          <div class="theme-card-dot" style="background:${t.swatch}"></div>
          <div class="theme-card-info">
            <div class="theme-card-name">${escHtml(t.label)}</div>
            <div class="theme-card-mode">${escHtml(t.mode)}</div>
          </div>
          ${key === currentTheme ? '<svg viewBox="0 0 24 24" style="width:16px;height:16px;flex-shrink:0" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-11"/></svg>' : ''}`;
        btn.addEventListener('click', () => applyTheme(key));
        grid.appendChild(btn);
      });
    });
    renderColorPicker();
  }

  // ── Tab switching ──────────────────────────────────────────
  function switchTab(tab) {
    currentTab = tab;
    $$('.tab-panel').forEach(p => {
      const isActive = p.id === `panel-${tab}`;
      p.hidden = !isActive;
      p.classList.toggle('active', isActive);
    });
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'habits') { loadHeatmapData().then(renderHabitsTab); }
    if (tab === 'you')    { renderYouTab(); }
  }

  // ── SVG Wheel ──────────────────────────────────────────────
  const SVG_NS  = 'http://www.w3.org/2000/svg';
  const CX      = 150;
  const SLICE_R = 142;  // R - 8
  const ARC_R   = 148;  // R - 2
  const HUB_R   = 22;   // small center hole
  const LABEL_R = 100;  // icon position radius

  // Stroke-based icons for wheel slices (centered at 0,0, ±6-7 units)
  const TASK_ICONS = [
    // pencil (write / journal)
    'M-3.5,4 L4,-3.5 5.5,-2 -2,5.5 Z M4,-3.5 L5,-5 L6.5,-3.5 L5,-2',
    // checklist (plan / organize)
    'M-6,-3 L6,-3 M-6,0 L6,0 M-6,3 L2,3',
    // code brackets (dev / review)
    'M-2,-4 L-6,0 L-2,4 M2,-4 L6,0 L2,4',
    // star (priority / important)
    'M0,-6 L1.5,-2.2 L6,-2.2 L2.5,0.8 L3.8,5.5 L0,3 L-3.8,5.5 L-2.5,0.8 L-6,-2.2 L-1.5,-2.2 Z',
    // clock (deadline / time)
    'M5,0 A5,5,0,1,1,4.9,1 Z M0,0 L0,-3 L2.5,-1.5',
    // book (learn / read)
    'M-5,-5 L-5,5 L0,5 L0,-5 Z M0,-5 L0,5 L5,3.5 L5,-6.5 Z',
    // zap / lightning (quick / energy)
    'M2,-6 L-2,0.5 L1.5,0.5 L-2,6 L6,-0.5 L2.5,-0.5 Z',
    // heart (wellbeing / health)
    'M0,5 C-5,1.5,-7,-3,-4,-5.5 C-2,-7,0,-4.5,0,-4.5 C0,-4.5,2,-7,4,-5.5 C7,-3,5,1.5,0,5 Z',
  ];

  function getActiveTasks() { return tasks.filter(t => !t.done); }
  function getDoneTasks()   { return tasks.filter(t => t.done);  }

  function renderWheel() {
    const disc   = $('wheel-disc');
    const labels = $('wheel-labels');
    if (!disc || !labels) return;
    disc.innerHTML   = '';
    labels.innerHTML = '';
    const active = getActiveTasks();
    if (active.length === 0) return;

    const n      = active.length;
    const colors = getWheelColors();

    active.forEach((task, i) => {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', slicePath(CX, SLICE_R, i, n));
      path.setAttribute('fill', colors[(task.colorIdx ?? i) % colors.length]);
      path.setAttribute('stroke', 'var(--bg)');
      path.setAttribute('stroke-width', '3');
      path.setAttribute('stroke-linejoin', 'round');
      path.style.cursor = 'pointer';
      path.addEventListener('click', () => openPickedSheet(task));
      disc.appendChild(path);
    });

    // Tiny center pin (full-wheel look — no large hub hole)
    const hub = document.createElementNS(SVG_NS, 'circle');
    hub.setAttribute('cx',   CX);
    hub.setAttribute('cy',   CX);
    hub.setAttribute('r',    HUB_R);
    hub.setAttribute('fill', 'var(--bg-card)');
    hub.setAttribute('stroke', 'rgba(255,255,255,0.35)');
    hub.setAttribute('stroke-width', '1.5');
    disc.appendChild(hub);

    disc.setAttribute('transform', `rotate(${wheelRotation}, ${CX}, ${CX})`);
    updateWheelLabels();
    updateArcProgress();
    updateWheelStat();
  }

  function updateWheelLabels() {
    const labels = $('wheel-labels');
    if (!labels) return;
    const active = getActiveTasks();
    if (active.length === 0) { labels.innerHTML = ''; return; }
    labels.innerHTML = '';
    const n        = active.length;
    const sliceDeg = 360 / n;
    active.forEach((task, i) => {
      const angle  = wheelRotation + (i + 0.5) * sliceDeg;
      const { x, y } = polar(CX, LABEL_R, angle);
      const iconD = TASK_ICONS[(task.iconIdx ?? i) % TASK_ICONS.length];
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('transform', `translate(${x.toFixed(2)},${y.toFixed(2)})`);
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d',                iconD);
      p.setAttribute('fill',             'none');
      p.setAttribute('stroke',           'rgba(255,255,255,0.88)');
      p.setAttribute('stroke-width',     n <= 2 ? '1.8' : '1.5');
      p.setAttribute('stroke-linecap',  'round');
      p.setAttribute('stroke-linejoin', 'round');
      g.appendChild(p);
      labels.appendChild(g);
    });
  }

  function updateArcProgress() {
    const arcEl = $('arc-progress');
    if (!arcEl) return;
    if (cachedStreak <= 0) { arcEl.setAttribute('d', ''); return; }
    const nextM = MILESTONES.find(m => m > cachedStreak) ?? 100;
    const prevM = [...MILESTONES].reverse().find(m => m <= cachedStreak) ?? 0;
    const pct   = (nextM === prevM) ? 1
                : Math.max(0, Math.min(1, (cachedStreak - prevM) / (nextM - prevM)));
    if (pct <= 0) { arcEl.setAttribute('d', ''); return; }
    const eff = Math.min(pct, 0.9999);
    const end = polar(CX, ARC_R, eff * 360);
    const lg  = eff > 0.5 ? 1 : 0;
    arcEl.setAttribute('d', `M ${CX} ${CX - ARC_R} A ${ARC_R} ${ARC_R} 0 ${lg} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`);
  }

  function updateWheelStat() {
    const el   = $('wheel-stat');
    const done = getDoneTasks().length;
    if (el) el.textContent = tasks.length > 0 ? `${done} of ${tasks.length} done today` : '';
  }

  function updateWheelVisibility() {
    const active = getActiveTasks();
    const done   = getDoneTasks();
    const empty  = active.length === 0;
    $('empty-state').hidden  = !empty;
    $('wheel-wrap').hidden   = empty;
    $('spin-btn').hidden     = empty;
    $('streak-meta').hidden  = empty;
    $('add-first-btn').hidden  = !empty;
    $('rest-day-link').hidden  = !empty;
    $('today-tasks').hidden  = empty;
    $('done-section').hidden = done.length === 0;
    const lbl = $('today-count-label');
    if (lbl) lbl.textContent = `Today · ${active.length} task${active.length !== 1 ? 's' : ''}`;
  }

  // ── Spin — deterministic target-based ─────────────────────
  function spin() {
    const active = getActiveTasks();
    if (active.length === 0 || spinFrame) return;
    const n  = active.length;
    const sd = 360 / n;

    // Pick target slice first, then compute exact rotation delta to land on it
    const target     = Math.floor(Math.random() * n);
    const targetNorm = target * sd + sd / 2;
    const wantMod    = (360 - targetNorm + 360) % 360;
    const currentMod = ((wheelRotation % 360) + 360) % 360;
    let delta = wantMod - currentMod;
    if (delta < 0) delta += 360;
    const toVal = wheelRotation + 5 * 360 + delta;

    const startRot   = wheelRotation;
    const totalDelta = toVal - startRot;
    const dur        = SPIN_DUR_MIN + Math.random() * (SPIN_DUR_MAX - SPIN_DUR_MIN);
    const startT     = performance.now();

    function frame(now) {
      const t     = Math.min((now - startT) / dur, 1);
      const eased = easeOutCubic(t);
      wheelRotation = startRot + totalDelta * eased;
      const disc = $('wheel-disc');
      if (disc) disc.setAttribute('transform', `rotate(${wheelRotation}, ${CX}, ${CX})`);
      updateWheelLabels();
      if (t < 1) { spinFrame = requestAnimationFrame(frame); return; }
      spinFrame = null;
      pickedTask = active[target];
      openPickedSheet(pickedTask);
    }
    spinFrame = requestAnimationFrame(frame);
  }

  // ── Picked sheet ───────────────────────────────────────────
  function openPickedSheet(task) {
    if (!task) return;
    pickedTask = task;
    const active = getActiveTasks();
    const i      = active.indexOf(task);
    const colors = getWheelColors();
    const color  = colors[(task.colorIdx ?? (i >= 0 ? i : 0)) % colors.length];
    $('picked-badge').textContent      = task.initial || getInitial(task.name);
    $('picked-badge').style.background = color;
    $('picked-name').textContent       = task.name;
    $('picked-meta').textContent       = task.minutes ? fmtMins(task.minutes) : '';
    openSheet('sheet-picked');
  }

  // ── Sheets ─────────────────────────────────────────────────
  function openSheet(id) {
    const el = $(id);
    if (!el) return;
    el.hidden = false;
    const body = el.querySelector('.sheet-body');
    if (body) { body.style.animation = 'none'; body.offsetHeight; body.style.animation = ''; }
    const bd   = el.querySelector('.sheet-backdrop');
    if (bd)   { bd.style.animation   = 'none'; bd.offsetHeight;   bd.style.animation   = ''; }
  }

  function closeSheet(id) { const el = $(id); if (el) el.hidden = true; }

  // ── Task CRUD ──────────────────────────────────────────────
  function renderTaskList() {
    const list     = $('task-list');
    const doneList = $('done-list');
    if (!list || !doneList) return;
    list.innerHTML     = '';
    doneList.innerHTML = '';
    const colors = getWheelColors();
    const active = getActiveTasks();
    const done   = getDoneTasks();
    active.forEach((t, i) => list.appendChild(makeTaskItem(t, colors[(t.colorIdx ?? i) % colors.length], false)));
    done.forEach((t, i)   => doneList.appendChild(makeTaskItem(t, colors[(t.colorIdx ?? i) % colors.length], true)));
    updateWheelVisibility();
  }

  function makeTaskItem(task, color, isDone) {
    const li = document.createElement('li');
    li.className  = 'task-item';
    li.dataset.id = task.id;
    if (isDone) li.classList.add('task-item-done');
    li.innerHTML = `
      <div class="task-badge" style="background:${color}">${escHtml(task.initial || getInitial(task.name))}</div>
      <div class="task-info">
        <div class="task-name${isDone ? ' task-name-done' : ''}">${escHtml(task.name)}</div>
        ${task.minutes ? `<div class="task-meta">${fmtMins(task.minutes)}</div>` : ''}
      </div>
      ${!isDone ? `
        <button class="task-edit-btn" aria-label="Edit task">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/>
          </svg>
        </button>
        <button class="task-drag-btn" aria-label="Reorder">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px">
            <circle cx="9"  cy="7"  r="1.4" fill="var(--fg3)"/>
            <circle cx="9"  cy="12" r="1.4" fill="var(--fg3)"/>
            <circle cx="9"  cy="17" r="1.4" fill="var(--fg3)"/>
            <circle cx="15" cy="7"  r="1.4" fill="var(--fg3)"/>
            <circle cx="15" cy="12" r="1.4" fill="var(--fg3)"/>
            <circle cx="15" cy="17" r="1.4" fill="var(--fg3)"/>
          </svg>
        </button>
      ` : ''}
      <button class="task-action-btn${isDone ? ' checked' : ''}" aria-label="${isDone ? 'Done' : 'Mark done'}">
        <svg class="glyph" viewBox="0 0 24 24"><path d="m5 12 5 5 9-11"/></svg>
      </button>`;

    if (!isDone) {
      li.querySelector('.task-action-btn').addEventListener('click', e => {
        e.stopPropagation();
        completeTask(task.id);
      });
      li.querySelector('.task-edit-btn').addEventListener('click', e => {
        e.stopPropagation();
        openEditTask(task.id);
      });
      li.addEventListener('click', e => {
        if (!e.target.closest('.task-action-btn') &&
            !e.target.closest('.task-drag-btn') &&
            !e.target.closest('.task-edit-btn')) {
          openPickedSheet(task);
        }
      });
      attachSwipeDelete(li, () => deleteTask(task.id));
    }
    return li;
  }

  // ── Swipe-to-delete (pointer events) ──────────────────────
  function attachSwipeDelete(el, onDelete) {
    const COMMIT = 64;
    const REVEAL = 88;
    let startX, startY, moved, horizontal, offset = 0, removing = false, pointerId = null;

    el.addEventListener('pointerdown', e => {
      startX     = e.clientX;
      startY     = e.clientY;
      moved      = false;
      horizontal = null;
      offset     = 0;
      removing   = false;
      pointerId  = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    });

    el.addEventListener('pointermove', e => {
      if (startX == null || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        moved      = true;
        horizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (horizontal && dx < 0) {
        offset = Math.max(dx, -REVEAL - 20);
        el.style.transform  = `translateX(${offset}px)`;
        el.style.transition = 'none';
      }
    });

    const finish = () => {
      if (startX == null) return;
      if (horizontal && offset <= -COMMIT && !removing) {
        removing = true;
        el.style.transition = 'transform 0.2s ease, opacity 0.18s ease, max-height 0.22s ease';
        el.style.transform  = 'translateX(-400px)';
        el.style.opacity    = '0';
        setTimeout(() => onDelete(), 200);
      } else {
        el.style.transition = 'transform 0.22s cubic-bezier(0.2,0.8,0.2,1)';
        el.style.transform  = '';
        setTimeout(() => { el.style.transition = ''; }, 240);
      }
      startX     = null;
      offset     = 0;
      horizontal = null;
    };

    el.addEventListener('pointerup',     finish);
    el.addEventListener('pointercancel', finish);
  }

  // ── Add/Edit task sheet ────────────────────────────────────
  function openAddTask() {
    editingTaskId    = null;
    selectedColorIdx = getActiveTasks().length % getWheelColors().length;
    selectedIconIdx  = getActiveTasks().length % TASK_ICONS.length;
    selectedMins     = 25;
    $('add-sheet-title').textContent     = 'New task';
    $('add-task-name').value             = '';
    $('add-task-submit-btn').textContent = 'Add to wheel';
    $('delete-task-btn').hidden          = true;
    renderColorPicker();
    syncDurationChips(selectedMins);
    openSheet('sheet-add');
    setTimeout(() => $('add-task-name').focus(), 280);
  }

  function openEditTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    editingTaskId    = id;
    selectedColorIdx = task.colorIdx ?? 0;
    selectedIconIdx  = task.iconIdx  ?? 0;
    selectedMins     = task.minutes || 25;
    $('add-sheet-title').textContent     = 'Edit task';
    $('add-task-name').value             = task.name;
    $('add-task-submit-btn').textContent = 'Save';
    $('delete-task-btn').hidden          = false;
    renderColorPicker();
    syncDurationChips(selectedMins);
    openSheet('sheet-add');
    setTimeout(() => $('add-task-name').focus(), 280);
  }

  function renderColorPicker() {
    const picker = $('add-task-color-picker');
    if (!picker) return;
    const colors = getWheelColors();
    picker.innerHTML = '';
    colors.forEach((color, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-swatch' + (i === selectedColorIdx ? ' selected' : '');
      btn.style.background = color;
      btn.setAttribute('aria-label', `Color ${i + 1}`);
      btn.addEventListener('click', () => {
        selectedColorIdx = i;
        picker.querySelectorAll('.color-swatch').forEach((s, j) => s.classList.toggle('selected', j === i));
      });
      picker.appendChild(btn);
    });
  }

  function syncDurationChips(activeMins) {
    $$('#add-task-duration-chips .duration-chip').forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.dataset.mins) === activeMins);
    });
  }

  async function addTask(name) {
    const task = {
      id:       uid(),
      name,
      initial:  getInitial(name),
      minutes:  selectedMins,
      colorIdx: selectedColorIdx,
      iconIdx:  selectedIconIdx,
      done:     false,
    };
    tasks.push(task);
    await saveTodayTasks();
    renderTaskList();
    renderWheel();
    updateWheelStat();
    closeSheet('sheet-add');
  }

  async function updateTask(id, name) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.name     = name;
      task.initial  = getInitial(name);
      task.minutes  = selectedMins;
      task.colorIdx = selectedColorIdx;
      task.iconIdx  = selectedIconIdx;
      await saveTodayTasks();
      renderTaskList();
      renderWheel();
    }
    closeSheet('sheet-add');
  }

  async function deleteTask(id) {
    const idx = tasks.findIndex(t => t.id === id && !t.done);
    if (idx === -1) return;
    deletedTask      = tasks[idx];
    deletedTaskIndex = idx;
    tasks.splice(idx, 1);
    await saveTodayTasks();
    renderTaskList();
    renderWheel();
    closeSheet('sheet-add');
    showUndoToast(deletedTask);
  }

  async function completeTask(id) {
    const task = tasks.find(t => t.id === id && !t.done);
    if (!task) return;
    task.done        = true;
    task.completedAt = Date.now();
    _heatmapCache[localDayKey()] = getDoneTasks().length;
    await saveTodayTasks();
    renderTaskList();
    renderWheel();
    updateWheelStat();
    await updateStreak();
    showWateringMoment(task.name);
    showDoneToast(task);
    closeSheet('sheet-picked');
  }

  // ── Drag reorder (pointer-events — works on touch + mouse) ──
  function setupDragReorder() {
    const list = $('task-list');
    if (!list) return;

    let dragging  = null;
    let pointerId = null;

    function commit() {
      if (!dragging) return;
      dragging.style.opacity   = '';
      dragging.style.boxShadow = '';
      const all       = [...list.querySelectorAll('li.task-item')];
      const active    = getActiveTasks();
      const reordered = all.map(el => active.find(t => t.id === el.dataset.id)).filter(Boolean);
      tasks = [...reordered, ...getDoneTasks()];
      saveTodayTasks().then(() => renderWheel());
      dragging = null; pointerId = null;
    }

    function onMove(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      e.preventDefault();
      const all = [...list.querySelectorAll('li.task-item')];
      const idx = all.indexOf(dragging);
      // Swap with previous item if cursor crosses its midpoint going up
      if (idx > 0) {
        const prev = all[idx - 1];
        if (e.clientY < prev.getBoundingClientRect().top + prev.offsetHeight * 0.5) {
          list.insertBefore(dragging, prev); return;
        }
      }
      // Swap with next item if cursor crosses its midpoint going down
      if (idx < all.length - 1) {
        const next = all[idx + 1];
        if (e.clientY > next.getBoundingClientRect().top + next.offsetHeight * 0.5) {
          list.insertBefore(dragging, next.nextSibling);
        }
      }
    }

    function attachHandlers() {
      list.querySelectorAll('.task-drag-btn').forEach(btn => {
        if (btn._pDrag) return;   // already attached
        btn._pDrag = true;

        btn.addEventListener('pointerdown', e => {
          const li = btn.closest('li.task-item');
          if (!li) return;
          e.preventDefault();
          try { btn.setPointerCapture(e.pointerId); } catch (_) {}
          dragging  = li;
          pointerId = e.pointerId;
          li.style.opacity   = '0.5';
          li.style.boxShadow = '0 4px 16px rgba(0,0,0,0.13)';
        });

        btn.addEventListener('pointermove',   onMove);
        btn.addEventListener('pointerup',     commit);
        btn.addEventListener('pointercancel', commit);
      });
    }

    new MutationObserver(attachHandlers).observe(list, { childList: true });
    attachHandlers();
  }

  // ── Toasts ─────────────────────────────────────────────────
  function showUndoToast(task) {
    const nameEl = $('undo-task-name');
    if (nameEl) nameEl.textContent = task.name;
    const toast = $('undo-toast');
    toast.hidden = false;
    toast.style.animation = 'none';
    toast.offsetHeight;
    toast.style.animation = '';
    const bar = $('undo-bar');
    bar.style.animation = 'none';
    bar.offsetHeight;
    bar.style.animation = '';
    clearTimeout(undoTimeout);
    undoTimeout = setTimeout(() => {
      $('undo-toast').hidden = true;
      deletedTask = null;
    }, 4500);
  }

  function showDoneToast(task) {
    const el     = $('done-toast');
    const nameEl = $('done-toast-name');
    const minsEl = $('done-toast-mins');
    if (nameEl) nameEl.textContent = `Nice. ${task.name} is done.`;
    if (minsEl) minsEl.textContent = task.minutes
      ? `${task.minutes} min focused · tap the wheel for what's next`
      : 'tap the wheel for what\'s next';
    el.hidden = false;
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = '';
    clearTimeout(doneToastTimer);
    doneToastTimer = setTimeout(() => { el.hidden = true; }, 3000);
  }

  // ── Streak ─────────────────────────────────────────────────
  async function updateStreak() {
    cachedStreak = await calcOverallStreak();
    const cnt = $('streak-count');
    if (cnt) cnt.textContent = cachedStreak;
    const meta = $('streak-to-next');
    if (meta) {
      const nextM = MILESTONES.find(m => m > cachedStreak) ?? 100;
      meta.textContent = `${cachedStreak}-day streak · to ${nextM}`;
    }
    updateArcProgress();
  }

  // ── Watering moment ────────────────────────────────────────
  function showWateringMoment(name) {
    $('watering-sub').textContent = name || '';
    $('watering-moment').hidden   = false;
    clearTimeout(wateringTimeout);
    wateringTimeout = setTimeout(() => { $('watering-moment').hidden = true; }, 2200);
  }

  // ── Focus timer ────────────────────────────────────────────
  function startFocus(task) {
    closeSheet('sheet-picked');
    focusTask      = task;
    focusTotalSecs = (task.minutes || 25) * 60;
    focusRemSecs   = focusTotalSecs;
    focusPaused    = false;

    const active = getActiveTasks();
    const i      = active.indexOf(task);
    const color  = getWheelColors()[(task.colorIdx ?? (i >= 0 ? i : 0)) % getWheelColors().length];
    $('focus-badge').textContent        = task.initial || getInitial(task.name);
    $('focus-badge').style.background   = color;
    $('focus-task-name').textContent    = task.name;
    $('focus-time').textContent         = fmtTime(focusRemSecs);
    $('focus-status-label').textContent = 'remaining';
    updateFocusRing();

    $('focus-screen').hidden = false;
    clearInterval(focusInterval);
    focusInterval = setInterval(tickFocus, 1000);
    updateFocusPauseIcon();
  }

  function tickFocus() {
    if (focusPaused) return;
    focusRemSecs = Math.max(0, focusRemSecs - 1);
    $('focus-time').textContent = fmtTime(focusRemSecs);
    updateFocusRing();
    if (focusRemSecs <= 0) {
      clearInterval(focusInterval);
      $('focus-status-label').textContent = 'done!';
      setTimeout(completeFocus, 1000);
    }
  }

  function updateFocusRing() {
    const ring = $('focus-ring');
    if (!ring) return;
    const circ = 703.72;  // 2π × 112
    const pct  = focusTotalSecs > 0 ? focusRemSecs / focusTotalSecs : 0;
    ring.style.strokeDashoffset = String(circ * (1 - pct));
  }

  function completeFocus() {
    clearInterval(focusInterval);
    $('focus-screen').hidden = true;
    if (focusTask) completeTask(focusTask.id);
    focusTask = null;
  }

  function toggleFocusPause() {
    focusPaused = !focusPaused;
    $('focus-status-label').textContent = focusPaused ? 'paused' : 'remaining';
    updateFocusPauseIcon();
  }

  function updateFocusPauseIcon() {
    const icon = $('focus-pause-icon');
    if (!icon) return;
    icon.innerHTML = focusPaused
      ? '<path d="M8 5v14l11-7L8 5z" fill="currentColor"/>'
      : '<path d="M8 5v14M16 5v14"/>';
  }

  // ── Habits tab ─────────────────────────────────────────────
  function renderHabitsTab() {
    renderHeatmap($('habits-heatmap'), 14);
    renderHabitStats();
    renderHabitList();
  }

  function renderHeatmap(container, weeks) {
    if (!container) return;
    container.innerHTML = '';
    const grid  = document.createElement('div');
    grid.className = 'heatmap-grid';
    const today = new Date();
    const DAYS  = 7 * weeks;
    const start = new Date(today);
    start.setDate(today.getDate() - DAYS + 1);
    for (let d = 0; d < DAYS; d++) {
      const date  = new Date(start);
      date.setDate(start.getDate() + d);
      const key   = localDayKey(date);
      const count = _heatmapCache[key] || 0;
      const cell  = document.createElement('div');
      cell.className = 'heatmap-cell';
      const lvl = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
      if (lvl > 0) cell.setAttribute('data-level', lvl);
      cell.title = `${key}: ${count} done`;
      grid.appendChild(cell);
    }
    container.appendChild(grid);
  }

  function renderHabitStats() {
    const el = $('habits-stats');
    if (!el) return;
    const doneToday = habits.filter(h => isHabitDoneToday(h.id)).length;
    const maxStreak = habits.reduce((m, h) => Math.max(m, calcHabitStreak(h.id)), 0);
    el.innerHTML = `
      <div class="stat-card"><div class="stat-value serif-italic">${maxStreak}</div><div class="stat-label">longest</div></div>
      <div class="stat-card"><div class="stat-value serif-italic">${doneToday}/${habits.length}</div><div class="stat-label">today</div></div>
      <div class="stat-card"><div class="stat-value serif-italic">${habits.length}</div><div class="stat-label">habits</div></div>`;
  }

  function renderHabitList() {
    const list = $('habits-list');
    if (!list) return;
    list.innerHTML = '';
    const colors = getWheelColors();
    habits.forEach((habit, i) => {
      const done   = isHabitDoneToday(habit.id);
      const streak = calcHabitStreak(habit.id);
      const color  = colors[i % colors.length];
      const li     = document.createElement('li');
      li.className = 'habit-item';
      li.innerHTML = `
        <button class="habit-checkbox${done ? ' done' : ''}" style="${done ? `background:${color};border-color:${color}` : ''}" aria-label="${done ? 'Done' : 'Mark done'}">
          ${done ? '<svg viewBox="0 0 24 24" style="width:14px;height:14px;display:block" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-11"/></svg>' : ''}
        </button>
        <div class="habit-info">
          <div class="habit-name${done ? ' done' : ''}">${escHtml(habit.name)}</div>
          <div class="habit-cat">${escHtml(habit.cat || '')}${habit.minutes ? ` · ${habit.minutes}m` : ''}</div>
        </div>
        <div class="habit-streak-badge">
          <svg viewBox="0 0 24 24" style="width:12px;height:12px;display:block" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3c0 4 4 5 4 9a4 4 0 0 1-8 0c0-2 1.5-3 1.5-5C9.5 5 12 3 12 3z"/>
          </svg>
          <span>${streak}</span>
        </div>`;
      li.querySelector('.habit-checkbox').addEventListener('click', e => {
        e.stopPropagation();
        toggleHabit(habit.id);
      });
      li.addEventListener('click', e => {
        if (!e.target.closest('.habit-checkbox')) openEditHabit(habit.id);
      });
      list.appendChild(li);
    });
  }

  async function toggleHabit(id) {
    const key = localDayKey();
    if (!habitLog[key]) habitLog[key] = {};
    if (habitLog[key][id]) {
      delete habitLog[key][id];
    } else {
      habitLog[key][id] = true;
      const h = habits.find(x => x.id === id);
      showWateringMoment(h ? h.name : 'Habit');
    }
    saveHabitLog();
    renderHabitsTab();
  }

  function openAddHabit() {
    editingHabitId = null;
    $('habit-sheet-title').textContent = 'New habit';
    $('habit-name-input').value        = '';
    $('habit-cat-input').value         = 'Physical';
    $('habit-mins-input').value        = '10';
    $('delete-habit-btn').hidden       = true;
    openSheet('sheet-habit');
    setTimeout(() => $('habit-name-input').focus(), 280);
  }

  function openEditHabit(id) {
    const h = habits.find(x => x.id === id);
    if (!h) return;
    editingHabitId = id;
    $('habit-sheet-title').textContent = 'Edit habit';
    $('habit-name-input').value        = h.name;
    $('habit-cat-input').value         = h.cat || 'Physical';
    $('habit-mins-input').value        = h.minutes || 10;
    $('delete-habit-btn').hidden       = false;
    openSheet('sheet-habit');
    setTimeout(() => $('habit-name-input').focus(), 280);
  }

  function saveHabitFromForm() {
    const name    = $('habit-name-input').value.trim();
    const cat     = $('habit-cat-input').value;
    const minutes = parseInt($('habit-mins-input').value) || 0;
    if (!name) return;
    if (editingHabitId) {
      const h = habits.find(x => x.id === editingHabitId);
      if (h) { h.name = name; h.cat = cat; h.minutes = minutes; h.initial = getInitial(name); }
    } else {
      habits.push({ id: uid(), name, cat, minutes, initial: getInitial(name) });
    }
    saveHabits();
    closeSheet('sheet-habit');
    renderHabitsTab();
  }

  function deleteHabit(id) {
    habits = habits.filter(h => h.id !== id);
    saveHabits();
    closeSheet('sheet-habit');
    renderHabitsTab();
  }

  // ── You tab ───────────────────────────────────────────────
  async function renderYouTab() {
    renderThemeGrids();
    cachedStreak    = await calcOverallStreak();
    const all       = await dbGetAll();
    // dbGetAll includes today (saveTodayTasks syncs on every complete) — no need to add getDoneTasks()
    const totalDone = all.reduce((s, r) => {
      if (r.tasks) return s + r.tasks.filter(t => t.done).length;
      return s + (r.doneTasks ? r.doneTasks.length : 0);
    }, 0);

    const avatarEl = $('you-avatar-area');
    if (avatarEl) {
      avatarEl.innerHTML = `
        <div class="you-avatar">IO</div>
        <div class="you-identity">
          <div class="you-username">ion.maker</div>
          <div class="you-joined">Joined April 2025</div>
        </div>
        <button class="you-edit-btn">Edit</button>`;
    }

    const statsEl = $('you-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-card">
          <div class="stat-value serif-italic">${cachedStreak}</div>
          <div class="stat-label">day streak</div>
        </div>
        <div class="stat-card">
          <div class="stat-value serif-italic">${totalDone}</div>
          <div class="stat-label">tasks done</div>
        </div>`;
    }
    const toggle = $('habits-toggle-btn');
    if (toggle) toggle.setAttribute('aria-checked', habitsEnabled ? 'true' : 'false');
    const tabBtn = $('tab-habits-btn');
    if (tabBtn) tabBtn.hidden = !habitsEnabled;
  }

  // ── History sheet ─────────────────────────────────────────
  async function openHistorySheet() {
    await loadHeatmapData();
    renderHeatmap($('history-heatmap'), 12);
    await renderHistoryStats();
    await renderHistoryLog();
    openSheet('sheet-history');
  }

  async function renderHistoryStats() {
    const streak = await calcOverallStreak();
    const all    = await dbGetAll();
    const total  = all.reduce((s, r) => {
      if (r.tasks) return s + r.tasks.filter(t => t.done).length;
      return s + (r.doneTasks ? r.doneTasks.length : 0);
    }, 0);
    const activeDays = new Set(all.filter(r => {
      if (r.tasks) return r.tasks.some(t => t.done);
      return r.doneTasks && r.doneTasks.length > 0;
    }).map(r => r.dateKey)).size;
    const el = $('history-stats');
    if (el) {
      el.innerHTML = `
        <div class="stat-card"><div class="stat-value serif-italic">${streak}</div><div class="stat-label">Streak</div></div>
        <div class="stat-card"><div class="stat-value serif-italic">${total}</div><div class="stat-label">Done</div></div>
        <div class="stat-card"><div class="stat-value serif-italic">${activeDays}</div><div class="stat-label">Active days</div></div>`;
    }
  }

  async function renderHistoryLog() {
    const log = $('history-log');
    if (!log) return;
    log.innerHTML = '';
    const all = await dbGetAll();
    all.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    const items = [];
    // Build from DB only (DB always current — saveTodayTasks called on every complete)
    all.forEach(r => {
      const done = r.tasks ? r.tasks.filter(t => t.done) : (r.doneTasks || []);
      done.forEach(t => items.push({ name: t.name, date: r.dateKey }));
    });
    if (items.length === 0) {
      log.innerHTML = '<li style="color:var(--fg3);font-size:13px">No tasks completed yet</li>';
      return;
    }
    items.slice(0, 20).forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-log-item';
      li.innerHTML = `
        <div class="history-log-dot"></div>
        <div class="history-log-name">${escHtml(item.name)}</div>
        <div class="history-log-date">${item.date}</div>`;
      log.appendChild(li);
    });
  }

  // ── Profile sheet ─────────────────────────────────────────
  async function openProfileSheet() {
    const streak = await calcOverallStreak();
    const all    = await dbGetAll();
    const total  = all.reduce((s, r) => {
      if (r.tasks) return s + r.tasks.filter(t => t.done).length;
      return s + (r.doneTasks ? r.doneTasks.length : 0);
    }, 0);
    const el = $('profile-stats');
    if (el) {
      el.innerHTML = `
        <div class="stat-card"><div class="stat-value serif-italic">${streak}</div><div class="stat-label">Day streak</div></div>
        <div class="stat-card"><div class="stat-value serif-italic">${total}</div><div class="stat-label">Tasks done</div></div>`;
    }
    renderThemeGrids();
    openSheet('sheet-profile');
  }

  // ── Event bindings ─────────────────────────────────────────
  function bindEvents() {
    $$('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

    document.addEventListener('click', e => {
      const id = e.target.closest('[data-close]')?.dataset.close;
      if (id) closeSheet(id);
    });

    $('add-btn').addEventListener('click', openAddTask);
    $('add-first-btn').addEventListener('click', openAddTask);
    $('add-task-inline-btn').addEventListener('click', openAddTask);
    $('add-task-dashed').addEventListener('click', openAddTask);
    $('empty-circle-btn').addEventListener('click', openAddTask);

    $('add-task-form').addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('add-task-name').value.trim();
      if (!name) return;
      if (editingTaskId) await updateTask(editingTaskId, name);
      else               await addTask(name);
    });
    $('delete-task-btn').addEventListener('click', () => { if (editingTaskId) deleteTask(editingTaskId); });

    $$('#add-task-duration-chips .duration-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        selectedMins = parseInt(this.dataset.mins);
        $$('#add-task-duration-chips .duration-chip').forEach(c => c.classList.toggle('active', c === this));
      });
    });

    $('spin-btn').addEventListener('click', spin);

    $('start-focus-btn').addEventListener('click', () => { if (pickedTask) startFocus(pickedTask); });
    $('respin-btn').addEventListener('click', () => { closeSheet('sheet-picked'); spin(); });

    $('focus-back-btn').addEventListener('click', () => {
      clearInterval(focusInterval);
      $('focus-screen').hidden = true;
      focusTask = null;
    });
    $('focus-pause-btn').addEventListener('click', toggleFocusPause);
    $('focus-done-btn').addEventListener('click', completeFocus);

    $('watering-moment').addEventListener('click', () => {
      clearTimeout(wateringTimeout);
      $('watering-moment').hidden = true;
    });

    $('done-toast').addEventListener('click', () => {
      clearTimeout(doneToastTimer);
      $('done-toast').hidden = true;
    });

    $('add-habit-btn').addEventListener('click', openAddHabit);
    $('add-habit-form').addEventListener('submit', e => { e.preventDefault(); saveHabitFromForm(); });
    $('delete-habit-btn').addEventListener('click', () => { if (editingHabitId) deleteHabit(editingHabitId); });

    $('history-link').addEventListener('click', openHistorySheet);
    $('streak-btn').addEventListener('click', openHistorySheet);

    $('avatar-btn').addEventListener('click', openProfileSheet);

    $('undo-btn').addEventListener('click', async () => {
      if (!deletedTask) return;
      tasks.splice(deletedTaskIndex, 0, deletedTask);
      deletedTask = null;
      clearTimeout(undoTimeout);
      $('undo-toast').hidden = true;
      await saveTodayTasks();
      renderTaskList();
      renderWheel();
    });

    $('habits-toggle-btn').addEventListener('click', () => {
      habitsEnabled = !habitsEnabled;
      localStorage.setItem('wt_habits_enabled', String(habitsEnabled));
      renderYouTab();
      if (!habitsEnabled && currentTab === 'habits') switchTab('tasks');
    });

    $('rest-day-link').addEventListener('click', () => showDoneToast({ name: 'Rest day taken', minutes: 0 }));

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      $$('.sheet-overlay:not([hidden])').forEach(s => { s.hidden = true; });
      if (!$('focus-screen').hidden) {
        clearInterval(focusInterval);
        $('focus-screen').hidden = true;
      }
    });
  }

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    db = await openDB();
    loadHabits();
    await loadTodayTasks();
    await loadHeatmapData();

    applyTheme(currentTheme);
    renderTaskList();
    renderWheel();
    updateWheelStat();
    await updateStreak();

    const tabBtn = $('tab-habits-btn');
    if (tabBtn) tabBtn.hidden = !habitsEnabled;

    bindEvents();
    setupDragReorder();
  }

  init().catch(err => console.error('[WheelTodo]', err));

})();
