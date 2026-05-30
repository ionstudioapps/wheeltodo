'use strict';
(function () {

  // ── Constants ──────────────────────────────────────────────
  const DB_NAME    = 'wheelTodoDB';
  const DB_VER     = 1;
  const STORE      = 'days';
  const MILESTONE  = 5;   // tasks per milestone arc segment
  const SPIN_DUR   = 2900; // ms

  const WHEEL_COLORS = {
    'warm-start':  ['#EDB590','#E59880','#9DC4BC','#F0D29D','#ADA8CC','#D4A5C8'],
    'slow-down':   ['#C8977A','#C07868','#7AADA6','#C4A87A','#8E8AAA','#A882A4'],
    'light-a11y':  ['#C8640A','#B84A30','#2A8C82','#B89000','#5A5498','#A03882'],
    'dark-a11y':   ['#F5C4A0','#F0A898','#B4E0D8','#F5DFA0','#C8C4E8','#E8BCD8'],
  };

  const THEMES = {
    'warm-start': { label: 'Warm Start', mode: 'Light',                  bg: '#FAF7F2', swatch: '#E59880' },
    'slow-down':  { label: 'Slow Down',  mode: 'Dark',                   bg: '#1C1828', swatch: '#ADA8CC' },
    'light-a11y': { label: 'Light a11y', mode: 'High contrast · Light',  bg: '#FFFFFF', swatch: '#B84A30' },
    'dark-a11y':  { label: 'Dark a11y',  mode: 'High contrast · Dark',   bg: '#0F0D18', swatch: '#F5C4A0' },
  };

  // ── State ──────────────────────────────────────────────────
  let db            = null;
  let tasks         = [];      // today's pending tasks
  let doneTasks     = [];      // today's completed tasks
  let habits        = [];      // [{id,name,cat,minutes,initial}]
  let habitLog      = {};      // {dateKey:{habitId:true}}
  let currentTheme  = localStorage.getItem('wt_theme') || 'warm-start';
  let habitsEnabled = localStorage.getItem('wt_habits_enabled') !== 'false';
  let currentTab    = 'tasks';
  let wheelRotation = 0;
  let spinFrame     = null;
  let pickedTask    = null;
  let editingTaskId = null;
  let editingHabitId = null;
  let focusTask     = null;
  let focusTotalSecs = 0;
  let focusRemSecs  = 0;
  let focusInterval = null;
  let focusPaused   = false;
  let undoTimeout   = null;
  let deletedTask   = null;
  let deletedTaskIndex = 0;
  let _heatmapCache = {};
  let wateringTimeout = null;
  let dragSrc       = null;

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
    const sd  = 360 / n;
    const s   = polar(cx, R, i * sd);
    const e   = polar(cx, R, (i + 1) * sd);
    const lg  = sd > 180 ? 1 : 0;
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
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: 'dateKey' });
        }
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
    await dbPut({ dateKey: localDayKey(), tasks, doneTasks });
  }

  async function loadTodayTasks() {
    const rec = await dbGet(localDayKey());
    tasks     = rec ? (rec.tasks || [])     : [];
    doneTasks = rec ? (rec.doneTasks || []) : [];
  }

  // ── Habits (localStorage) ───────────────────────────────────
  function loadHabits() {
    try {
      habits    = JSON.parse(localStorage.getItem('wt_habits')     || '[]');
      habitLog  = JSON.parse(localStorage.getItem('wt_habit_log')  || '{}');
    } catch (_) { habits = []; habitLog = {}; }
  }

  function saveHabits()   { localStorage.setItem('wt_habits', JSON.stringify(habits)); }
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
    all.forEach(r => { if (r.doneTasks && r.doneTasks.length > 0) done[r.dateKey] = true; });
    if (doneTasks.length > 0) done[localDayKey()] = true;
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
    all.forEach(r => { if (r.doneTasks) _heatmapCache[r.dateKey] = r.doneTasks.length; });
    _heatmapCache[localDayKey()] = doneTasks.length;
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
        btn.style.background = t.bg;
        btn.style.color      = key.includes('dark') ? '#fff' : '#1a1a1a';
        btn.innerHTML = `
          <div class="theme-card-swatch" style="background:${t.swatch}"></div>
          <div class="theme-card-info">
            <div class="theme-card-name">${escHtml(t.label)}</div>
            <div class="theme-card-mode">${escHtml(t.mode)}</div>
          </div>`;
        btn.addEventListener('click', () => applyTheme(key));
        grid.appendChild(btn);
      });
    });
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
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CX = 150, WHEEL_R = 146, HUB_R = 42, LABEL_R_RATIO = 0.65;

  function renderWheel() {
    const disc   = $('wheel-disc');
    const labels = $('wheel-labels');
    if (!disc || !labels) return;
    disc.innerHTML   = '';
    labels.innerHTML = '';
    if (tasks.length === 0) return;

    const n      = tasks.length;
    const colors = getWheelColors();

    tasks.forEach((task, i) => {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', slicePath(CX, WHEEL_R, i, n));
      path.setAttribute('fill', colors[i % colors.length]);
      path.style.cursor = 'pointer';
      path.addEventListener('click', () => openEditTask(task.id));
      disc.appendChild(path);
    });

    // Hub cutout
    const hub = document.createElementNS(SVG_NS, 'circle');
    hub.setAttribute('cx', CX);
    hub.setAttribute('cy', CX);
    hub.setAttribute('r',  HUB_R);
    hub.setAttribute('fill', 'var(--bg)');
    disc.appendChild(hub);

    disc.setAttribute('transform', `rotate(${wheelRotation}, ${CX}, ${CX})`);
    updateWheelLabels();
    updateArcProgress();
    updateHubText();
  }

  function updateWheelLabels() {
    const labels = $('wheel-labels');
    if (!labels || tasks.length === 0) return;
    labels.innerHTML = '';
    const n        = tasks.length;
    const sliceDeg = 360 / n;
    const labelR   = WHEEL_R * LABEL_R_RATIO;

    tasks.forEach((task, i) => {
      const angle  = wheelRotation + (i + 0.5) * sliceDeg;
      const { x, y } = polar(CX, labelR, angle);
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', x.toFixed(2));
      text.setAttribute('y', y.toFixed(2));
      text.setAttribute('class', 'wheel-label-text');
      text.setAttribute('fill', '#FFFFFF');
      text.textContent = task.initial || getInitial(task.name);
      labels.appendChild(text);
    });
  }

  function updateArcProgress() {
    const arcEl = $('arc-progress');
    if (!arcEl) return;
    const total = doneTasks.length;
    if (total === 0) { arcEl.setAttribute('d', ''); return; }
    const pct  = MILESTONE > 0 ? (total % MILESTONE) / MILESTONE : 0;
    const eff  = pct === 0 ? 1 : pct;  // full circle when at milestone exactly
    const end  = polar(CX, WHEEL_R, eff * 360);
    const lg   = eff > 0.5 ? 1 : 0;
    arcEl.setAttribute('d',
      `M ${CX} ${CX - WHEEL_R} A ${WHEEL_R} ${WHEEL_R} 0 ${lg} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`);
  }

  function updateHubText() {
    const el = $('hub-num');
    if (el) el.textContent = `${doneTasks.length}/${tasks.length + doneTasks.length}`;
  }

  function updateWheelVisibility() {
    const empty  = tasks.length === 0;
    $('empty-state').hidden  = !empty;
    $('wheel-wrap').hidden   = empty;
    $('spin-btn').hidden     = empty;
    $('streak-meta').hidden  = empty;
    $('add-first-btn').hidden  = !empty;
    $('rest-day-link').hidden  = !empty;
    $('today-tasks').hidden  = empty;
    $('done-section').hidden = doneTasks.length === 0;
    const lbl = $('today-count-label');
    if (lbl) lbl.textContent = `Today · ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
  }

  // ── Spin animation ─────────────────────────────────────────
  function spin() {
    if (tasks.length === 0 || spinFrame) return;
    const n        = tasks.length;
    const extra    = 5 + Math.floor(Math.random() * 3);  // 5-7 full turns
    const offset   = Math.random() * 360;
    const total    = extra * 360 + offset;
    const startRot = wheelRotation;
    const startT   = performance.now();

    function frame(now) {
      const t      = Math.min((now - startT) / SPIN_DUR, 1);
      const eased  = easeOutCubic(t);
      wheelRotation = startRot + total * eased;
      const disc   = $('wheel-disc');
      if (disc) disc.setAttribute('transform', `rotate(${wheelRotation}, ${CX}, ${CX})`);
      updateWheelLabels();
      if (t < 1) { spinFrame = requestAnimationFrame(frame); return; }
      spinFrame = null;
      wheelRotation = ((wheelRotation % 360) + 360) % 360;
      if (disc) disc.setAttribute('transform', `rotate(${wheelRotation}, ${CX}, ${CX})`);
      updateWheelLabels();
      onSpinComplete();
    }
    spinFrame = requestAnimationFrame(frame);
  }

  function onSpinComplete() {
    const n        = tasks.length;
    const sliceDeg = 360 / n;
    // pointer at top = 0°; find which unrotated slice covers that angle
    const ptr      = ((0 - wheelRotation) % 360 + 360) % 360;
    const idx      = Math.floor(ptr / sliceDeg) % n;
    pickedTask     = tasks[idx];
    openPickedSheet(pickedTask);
  }

  // ── Picked sheet ───────────────────────────────────────────
  function openPickedSheet(task) {
    if (!task) return;
    const i     = tasks.indexOf(task);
    const color = getWheelColors()[i % getWheelColors().length];
    $('picked-badge').textContent       = task.initial || getInitial(task.name);
    $('picked-badge').style.background  = color;
    $('picked-name').textContent        = task.name;
    $('picked-meta').textContent        = task.minutes ? fmtMins(task.minutes) : '';
    openSheet('sheet-picked');
  }

  // ── Sheets ─────────────────────────────────────────────────
  function openSheet(id) {
    const el = $(id);
    if (!el) return;
    el.hidden = false;
    // Re-trigger entry animation
    const body = el.querySelector('.sheet-body');
    if (body) { body.style.animation = 'none'; body.offsetHeight; body.style.animation = ''; }
    const bd = el.querySelector('.sheet-backdrop');
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
    tasks.forEach((t, i)     => list.appendChild(makeTaskItem(t, colors[i % colors.length], false)));
    doneTasks.forEach((t, i) => doneList.appendChild(makeTaskItem(t, colors[i % colors.length], true)));
    updateWheelVisibility();
  }

  function makeTaskItem(task, color, done) {
    const li = document.createElement('li');
    li.className   = 'task-item';
    li.dataset.id  = task.id;
    li.innerHTML   = `
      <div class="task-badge" style="background:${color}">${escHtml(task.initial || getInitial(task.name))}</div>
      <div class="task-info">
        <div class="task-name">${escHtml(task.name)}</div>
        ${task.minutes ? `<div class="task-meta">${fmtMins(task.minutes)}</div>` : ''}
      </div>
      ${!done ? `<button class="task-drag-btn" aria-label="Reorder">
        <svg style="width:14px;height:14px" viewBox="0 0 24 24">
          <circle cx="9"  cy="7"  r="1.4" fill="var(--fg3)"/>
          <circle cx="9"  cy="12" r="1.4" fill="var(--fg3)"/>
          <circle cx="9"  cy="17" r="1.4" fill="var(--fg3)"/>
          <circle cx="15" cy="7"  r="1.4" fill="var(--fg3)"/>
          <circle cx="15" cy="12" r="1.4" fill="var(--fg3)"/>
          <circle cx="15" cy="17" r="1.4" fill="var(--fg3)"/>
        </svg>
      </button>` : ''}
      <button class="task-action-btn ${done ? 'checked' : ''}" aria-label="${done ? 'Done' : 'Mark done'}">
        <svg class="glyph" viewBox="0 0 24 24"><path d="m5 12 5 5 9-11"/></svg>
      </button>`;

    if (!done) {
      li.querySelector('.task-action-btn').addEventListener('click', () => completeTask(task.id));
      li.addEventListener('click', e => {
        if (!e.target.closest('.task-action-btn') && !e.target.closest('.task-drag-btn')) {
          openEditTask(task.id);
        }
      });
    }
    return li;
  }

  async function addTask(name, minutes) {
    const task = { id: uid(), name, initial: getInitial(name), minutes: parseInt(minutes) || 25 };
    tasks.push(task);
    await saveTodayTasks();
    renderTaskList();
    renderWheel();
    updateHubText();
    closeSheet('sheet-add');
  }

  async function updateTask(id, name, minutes) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.name    = name;
      task.initial = getInitial(name);
      task.minutes = parseInt(minutes) || 25;
      await saveTodayTasks();
      renderTaskList();
      renderWheel();
    }
    closeSheet('sheet-add');
  }

  async function deleteTask(id) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    deletedTask      = tasks[idx];
    deletedTaskIndex = idx;
    tasks.splice(idx, 1);
    await saveTodayTasks();
    renderTaskList();
    renderWheel();
    closeSheet('sheet-add');
    showUndoToast('Task removed');
  }

  async function completeTask(id) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const task = tasks.splice(idx, 1)[0];
    task.completedAt = Date.now();
    doneTasks.push(task);
    _heatmapCache[localDayKey()] = doneTasks.length;
    await saveTodayTasks();
    renderTaskList();
    renderWheel();
    updateHubText();
    updateArcProgress();
    updateStreak();
    showWateringMoment(task.name);
    showDoneToast('✓ ' + task.name);
  }

  // ── Drag reorder ───────────────────────────────────────────
  function setupDragReorder() {
    const list = $('task-list');
    if (!list) return;

    list.addEventListener('dragstart', e => {
      const li = e.target.closest('li.task-item');
      if (!li) return;
      dragSrc = li;
      e.dataTransfer.effectAllowed = 'move';
      requestAnimationFrame(() => { if (li) li.style.opacity = '.4'; });
    });
    list.addEventListener('dragend', e => {
      if (dragSrc) dragSrc.style.opacity = '';
      dragSrc = null;
    });
    list.addEventListener('dragover', e => {
      e.preventDefault();
      const li = e.target.closest('li.task-item');
      if (!li || !dragSrc || li === dragSrc) return;
      const all    = [...list.querySelectorAll('li.task-item')];
      const srcIdx = all.indexOf(dragSrc);
      const tgtIdx = all.indexOf(li);
      if (srcIdx < tgtIdx) list.insertBefore(dragSrc, li.nextSibling);
      else                 list.insertBefore(dragSrc, li);
    });
    list.addEventListener('drop', async e => {
      e.preventDefault();
      const all    = [...list.querySelectorAll('li.task-item')];
      tasks = all.map(li => tasks.find(t => t.id === li.dataset.id)).filter(Boolean);
      await saveTodayTasks();
      renderWheel();
    });

    const attachDrag = () => {
      list.querySelectorAll('li.task-item').forEach(li => {
        const btn = li.querySelector('.task-drag-btn');
        if (!btn) return;
        btn.addEventListener('mousedown', () => { li.draggable = true; });
        btn.addEventListener('mouseup',   () => { li.draggable = false; });
        btn.addEventListener('mouseleave',() => { li.draggable = false; });
      });
    };
    new MutationObserver(attachDrag).observe(list, { childList: true });
    attachDrag();
  }

  // ── Task sheet open ────────────────────────────────────────
  function openAddTask() {
    editingTaskId = null;
    $('add-sheet-title').textContent    = 'New task';
    $('add-task-name').value            = '';
    $('add-task-mins').value            = '25';
    $('add-task-submit-btn').textContent = 'Add task';
    $('delete-task-btn').hidden         = true;
    openSheet('sheet-add');
    setTimeout(() => $('add-task-name').focus(), 280);
  }

  function openEditTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    editingTaskId = id;
    $('add-sheet-title').textContent    = 'Edit task';
    $('add-task-name').value            = task.name;
    $('add-task-mins').value            = task.minutes || 25;
    $('add-task-submit-btn').textContent = 'Save';
    $('delete-task-btn').hidden         = false;
    openSheet('sheet-add');
    setTimeout(() => $('add-task-name').focus(), 280);
  }

  // ── Undo / Toasts ──────────────────────────────────────────
  function showUndoToast(msg) {
    $('undo-msg').textContent    = msg;
    $('undo-toast').hidden       = false;
    const bar = $('undo-bar');
    bar.style.animation = 'none';
    bar.offsetHeight;
    bar.style.animation = '';
    clearTimeout(undoTimeout);
    undoTimeout = setTimeout(() => {
      $('undo-toast').hidden = true;
      deletedTask = null;
    }, 3000);
  }

  function showDoneToast(msg) {
    const el = $('done-toast');
    el.textContent = msg;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 2000);
  }

  // ── Streak ────────────────────────────────────────────────
  async function updateStreak() {
    const streak = await calcOverallStreak();
    const cnt = $('streak-count');
    if (cnt) cnt.textContent = streak;
    const meta = $('streak-to-next');
    if (meta) {
      const next = (Math.floor(streak / 7) + 1) * 7;
      meta.textContent = `${streak}-day streak · ${next - streak} to ${next}`;
    }
  }

  // ── Watering moment ────────────────────────────────────────
  function showWateringMoment(name) {
    $('watering-sub').textContent    = name || '';
    $('watering-moment').hidden      = false;
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

    const i     = tasks.indexOf(task);
    const color = getWheelColors()[i >= 0 ? i % getWheelColors().length : 0];
    $('focus-badge').textContent      = task.initial || getInitial(task.name);
    $('focus-badge').style.background = color;
    $('focus-task-name').textContent  = task.name;
    $('focus-time').textContent       = fmtTime(focusRemSecs);
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
    const circ = 691.15;  // 2π × 110
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

  // ── Habits tab ────────────────────────────────────────────
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
    const doneToday  = habits.filter(h => isHabitDoneToday(h.id)).length;
    const maxStreak  = habits.reduce((m, h) => Math.max(m, calcHabitStreak(h.id)), 0);
    el.innerHTML = `
      <div class="stat-card"><div class="stat-value">${doneToday}/${habits.length}</div><div class="stat-label">Today</div></div>
      <div class="stat-card"><div class="stat-value">${maxStreak}</div><div class="stat-label">Best streak</div></div>
      <div class="stat-card"><div class="stat-value">${habits.length}</div><div class="stat-label">Habits</div></div>`;
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
        <div class="habit-badge" style="background:${color}">${escHtml(habit.initial || getInitial(habit.name))}</div>
        <div class="habit-info">
          <div class="habit-name">${escHtml(habit.name)}</div>
          <div class="habit-streak">${escHtml(habit.cat)} · ${streak > 0 ? streak + '-day streak' : 'No streak yet'}</div>
        </div>
        <button class="habit-toggle-btn ${done ? 'done' : ''}" aria-label="${done ? 'Done' : 'Mark done'}">
          <svg class="glyph" viewBox="0 0 24 24"><path d="m5 12 5 5 9-11"/></svg>
        </button>`;
      li.querySelector('.habit-toggle-btn').addEventListener('click', () => toggleHabit(habit.id));
      li.addEventListener('click', e => {
        if (!e.target.closest('.habit-toggle-btn')) openEditHabit(habit.id);
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
    const streak     = await calcOverallStreak();
    const all        = await dbGetAll();
    const totalDone  = all.reduce((s, r) => s + (r.doneTasks ? r.doneTasks.length : 0), 0) + doneTasks.length;

    const statsEl = $('you-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-card"><div class="stat-value">${streak}</div><div class="stat-label">Day streak</div></div>
        <div class="stat-card"><div class="stat-value">${totalDone}</div><div class="stat-label">Tasks done</div></div>`;
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
    const streak    = await calcOverallStreak();
    const all       = await dbGetAll();
    const total     = all.reduce((s, r) => s + (r.doneTasks ? r.doneTasks.length : 0), 0) + doneTasks.length;
    const active    = new Set(all.filter(r => r.doneTasks && r.doneTasks.length > 0).map(r => r.dateKey)).size;
    const el        = $('history-stats');
    if (el) {
      el.innerHTML = `
        <div class="stat-card"><div class="stat-value">${streak}</div><div class="stat-label">Streak</div></div>
        <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Done</div></div>
        <div class="stat-card"><div class="stat-value">${active}</div><div class="stat-label">Active days</div></div>`;
    }
  }

  async function renderHistoryLog() {
    const log  = $('history-log');
    if (!log) return;
    log.innerHTML = '';
    const all  = await dbGetAll();
    all.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    const items = [];
    doneTasks.forEach(t => items.push({ name: t.name, date: localDayKey() }));
    all.forEach(r => (r.doneTasks || []).forEach(t => items.push({ name: t.name, date: r.dateKey })));

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
    const streak    = await calcOverallStreak();
    const all       = await dbGetAll();
    const total     = all.reduce((s, r) => s + (r.doneTasks ? r.doneTasks.length : 0), 0) + doneTasks.length;
    const el        = $('profile-stats');
    if (el) {
      el.innerHTML = `
        <div class="stat-card"><div class="stat-value">${streak}</div><div class="stat-label">Day streak</div></div>
        <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Tasks done</div></div>`;
    }
    renderThemeGrids();
    openSheet('sheet-profile');
  }

  // ── Event bindings ─────────────────────────────────────────
  function bindEvents() {
    // Tab bar
    $$('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

    // Sheet close (backdrop & ✕ buttons)
    document.addEventListener('click', e => {
      const id = e.target.closest('[data-close]')?.dataset.close;
      if (id) closeSheet(id);
    });

    // Add task
    $('add-btn').addEventListener('click', openAddTask);
    $('add-first-btn').addEventListener('click', openAddTask);
    $('add-task-inline-btn').addEventListener('click', openAddTask);
    $('add-task-dashed').addEventListener('click', openAddTask);
    $('empty-circle-btn').addEventListener('click', openAddTask);

    // Add task form submit
    $('add-task-form').addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('add-task-name').value.trim();
      const mins = $('add-task-mins').value;
      if (!name) return;
      if (editingTaskId) await updateTask(editingTaskId, name, mins);
      else               await addTask(name, mins);
    });
    $('delete-task-btn').addEventListener('click', () => { if (editingTaskId) deleteTask(editingTaskId); });

    // Spin
    $('spin-btn').addEventListener('click', spin);

    // Post-spin sheet
    $('start-focus-btn').addEventListener('click', () => { if (pickedTask) startFocus(pickedTask); });
    $('respin-btn').addEventListener('click', () => { closeSheet('sheet-picked'); spin(); });

    // Focus screen
    $('focus-back-btn').addEventListener('click', () => {
      clearInterval(focusInterval);
      $('focus-screen').hidden = true;
      focusTask = null;
    });
    $('focus-pause-btn').addEventListener('click', toggleFocusPause);
    $('focus-done-btn').addEventListener('click', completeFocus);

    // Watering: tap to dismiss
    $('watering-moment').addEventListener('click', () => {
      clearTimeout(wateringTimeout);
      $('watering-moment').hidden = true;
    });

    // Habits tab
    $('add-habit-btn').addEventListener('click', openAddHabit);
    $('add-habit-form').addEventListener('submit', e => { e.preventDefault(); saveHabitFromForm(); });
    $('delete-habit-btn').addEventListener('click', () => { if (editingHabitId) deleteHabit(editingHabitId); });

    // Streak / history
    $('history-link').addEventListener('click', openHistorySheet);
    $('streak-btn').addEventListener('click', openHistorySheet);

    // Profile
    $('avatar-btn').addEventListener('click', openProfileSheet);

    // Undo
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

    // Habits toggle
    $('habits-toggle-btn').addEventListener('click', () => {
      habitsEnabled = !habitsEnabled;
      localStorage.setItem('wt_habits_enabled', String(habitsEnabled));
      renderYouTab();
      if (!habitsEnabled && currentTab === 'habits') switchTab('tasks');
    });

    // Rest day
    $('rest-day-link').addEventListener('click', () => showDoneToast('Rest day — nice.'));

    // Escape closes sheets
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
    updateHubText();
    updateArcProgress();
    await updateStreak();

    const tabBtn = $('tab-habits-btn');
    if (tabBtn) tabBtn.hidden = !habitsEnabled;

    bindEvents();
    setupDragReorder();
  }

  init().catch(err => console.error('[WheelTodo]', err));

})();
