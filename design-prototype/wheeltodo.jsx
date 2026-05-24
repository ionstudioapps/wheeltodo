// WheelTodo — reimagined, minimal redesign
// One App component, per-instance state, accepts { themeName, platform, tweaks }

// ─────────────────────────────────────────────────────────────
// Theme tokens (mirrors packages/shared/src/themes.ts)
// ─────────────────────────────────────────────────────────────
const WT_THEMES = {
  'warm-start': {
    label: 'Warm Start', mode: 'Light', dark: false,
    bg: '#FAF7F2', bgCard: '#FFFFFF', bgInput: '#F5F0EB',
    fg: '#2A2520', fg2: '#8A7E7A', fg3: '#B0A8A4',
    accent: '#E59880', primary: '#ADA8CC', success: '#BCD4A5',
    wheel: ['#EDB590','#E59880','#9DC4BC','#F0D29D','#ADA8CC','#D4A5C8'],
    onSlice: '#FFFFFF',
    barBg: 'rgba(255,255,255,0.92)',
    barBorder: 'rgba(42,37,32,0.08)',
  },
  'slow-down': {
    label: 'Slow Down', mode: 'Dark', dark: true,
    bg: '#1C1828', bgCard: '#26223A', bgInput: '#302C44',
    fg: '#EDE8E3', fg2: '#9B8FA0', fg3: '#6A6278',
    accent: '#ADA8CC', primary: '#9DC4BC', success: '#8AAE82',
    wheel: ['#C8977A','#C07868','#7AADA6','#C4A87A','#8E8AAA','#A882A4'],
    onSlice: '#1C1828',
    barBg: 'rgba(28,24,40,0.88)',
    barBorder: 'rgba(237,232,227,0.08)',
  },
  'light-a11y': {
    label: 'Light a11y', mode: 'High contrast · Light', dark: false,
    bg: '#FFFFFF', bgCard: '#F5F5F5', bgInput: '#EBEBEB',
    fg: '#1A1210', fg2: '#4A4040', fg3: '#6A6060',
    accent: '#B84A30', primary: '#5A5498', success: '#3A7230',
    wheel: ['#C8640A','#B84A30','#2A8C82','#B89000','#5A5498','#A03882'],
    onSlice: '#FFFFFF',
    barBg: 'rgba(255,255,255,0.95)',
    barBorder: 'rgba(26,18,16,0.12)',
  },
  'dark-a11y': {
    label: 'Dark a11y', mode: 'High contrast · Dark', dark: true,
    bg: '#0F0D18', bgCard: '#1A1830', bgInput: '#242240',
    fg: '#FFFFFF', fg2: '#C8C0D8', fg3: '#A098B0',
    accent: '#F5C4A0', primary: '#C8C4E8', success: '#A8D898',
    wheel: ['#F5C4A0','#F0A898','#B4E0D8','#F5DFA0','#C8C4E8','#E8BCD8'],
    onSlice: '#0F0D18',
    barBg: 'rgba(15,13,24,0.88)',
    barBorder: 'rgba(255,255,255,0.08)',
  },
};

// ─────────────────────────────────────────────────────────────
// Seed data — same shape as AppContext tasks
// ─────────────────────────────────────────────────────────────
const SEED_TASKS = [
  { id: 't1', name: 'Deep work',    initial: 'D', minutes: 25 },
  { id: 't2', name: 'Inbox zero',   initial: 'I', minutes: 15 },
  { id: 't3', name: 'Workout',      initial: 'W', minutes: 20 },
  { id: 't4', name: 'Read · novel', initial: 'R', minutes: 30 },
  { id: 't5', name: 'Sketch ideas', initial: 'S', minutes: 25 },
  { id: 't6', name: 'Plan tomorrow',initial: 'P', minutes: 10 },
];

const SEED_REST = [
  { id: 'r1', name: 'Stretch',  cat: 'Physical',    minutes: 8,  initial: 'S' },
  { id: 'r2', name: 'Read',     cat: 'Mental',      minutes: 20, initial: 'R' },
  { id: 'r3', name: 'Tea',      cat: 'Nourishment', minutes: 5,  initial: 'T' },
  { id: 'r4', name: 'Walk',     cat: 'Physical',    minutes: 15, initial: 'W' },
];

// Habits — recurring commitments, not wheel-pickable. Heatmap-driven.
const SEED_HABITS = [
  { id: 'h1', name: 'Stretch',     cat: 'Physical', minutes: 8,  streak: 12, doneToday: true,  initial: 'S' },
  { id: 'h2', name: 'Read',        cat: 'Mental',   minutes: 20, streak: 8,  doneToday: false, initial: 'R' },
  { id: 'h3', name: 'Workout',     cat: 'Physical', minutes: 30, streak: 5,  doneToday: false, initial: 'W' },
  { id: 'h4', name: 'Journal',     cat: 'Mental',   minutes: 5,  streak: 21, doneToday: true,  initial: 'J' },
  { id: 'h5', name: 'No phone AM', cat: 'Habit',    minutes: 0,  streak: 3,  doneToday: false, initial: 'N' },
];

// Mock calendar events — morning schedule already booked
const SEED_GCAL = [
  { id: 'g1', time: '09:00', name: 'Team standup',     minutes: 30 },
  { id: 'g2', time: '11:30', name: '1:1 with Sam',     minutes: 30 },
  { id: 'g3', time: '13:00', name: 'Lunch with team',  minutes: 60 },
  { id: 'g4', time: '15:00', name: 'Design review',    minutes: 45 },
];

// ─────────────────────────────────────────────────────────────
// Hairline glyphs — simple, geometric, ≤3 paths each
// (Not "imagery" — these are UI symbols, deliberately monolinear.)
// ─────────────────────────────────────────────────────────────
function Glyph({ name, size = 18, color = 'currentColor', stroke = 1.6 }) {
  const s = { width: size, height: size, display: 'block' };
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'flame':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M12 3c0 4 4 5 4 9a4 4 0 0 1-8 0c0-2 1.5-3 1.5-5C9.5 5 12 3 12 3z" /></svg>;
    case 'wheel':
      return <svg viewBox="0 0 24 24" style={s}><circle {...p} cx="12" cy="12" r="8.5" /><path {...p} d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></svg>;
    case 'list':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M6 7h12M6 12h12M6 17h7" /></svg>;
    case 'grid':
      return <svg viewBox="0 0 24 24" style={s}><rect {...p} x="4" y="4"  width="6" height="6" rx="1.4"/><rect {...p} x="14" y="4" width="6" height="6" rx="1.4"/><rect {...p} x="4" y="14" width="6" height="6" rx="1.4"/><rect {...p} x="14" y="14" width="6" height="6" rx="1.4"/></svg>;
    case 'person':
      return <svg viewBox="0 0 24 24" style={s}><circle {...p} cx="12" cy="8" r="3.5"/><path {...p} d="M5 20a7 7 0 0 1 14 0"/></svg>;
    case 'plus':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M12 5v14M5 12h14" /></svg>;
    case 'chevron-down':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="m6 9 6 6 6-6" /></svg>;
    case 'chevron-up':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="m6 15 6-6 6 6" /></svg>;
    case 'chevron-left':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="m15 6-6 6 6 6" /></svg>;
    case 'close':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M6 6l12 12M18 6 6 18" /></svg>;
    case 'play':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M8 5v14l11-7L8 5z" fill={color} /></svg>;
    case 'pause':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M8 5v14M16 5v14" /></svg>;
    case 'check':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="m5 12 5 5 9-11" /></svg>;
    case 'moon':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>;
    case 'sun':
      return <svg viewBox="0 0 24 24" style={s}><circle {...p} cx="12" cy="12" r="3.5" /><path {...p} d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" /></svg>;
    case 'trash':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg>;
    case 'edit':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" /></svg>;
    case 'dot':
      return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="4" fill={color} /></svg>;
    case 'arrow-up-right':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M7 17 17 7M9 7h8v8" /></svg>;
    case 'drag':
      return <svg viewBox="0 0 24 24" style={s}><circle cx="9"  cy="7"  r="1.2" fill={color}/><circle cx="9"  cy="12" r="1.2" fill={color}/><circle cx="9"  cy="17" r="1.2" fill={color}/><circle cx="15" cy="7"  r="1.2" fill={color}/><circle cx="15" cy="12" r="1.2" fill={color}/><circle cx="15" cy="17" r="1.2" fill={color}/></svg>;
    case 'mic':
      return <svg viewBox="0 0 24 24" style={s}><rect {...p} x="9" y="3" width="6" height="12" rx="3"/><path {...p} d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
    case 'lock':
      return <svg viewBox="0 0 24 24" style={s}><rect {...p} x="5" y="11" width="14" height="9" rx="2"/><path {...p} d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
    case 'sparkle':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/></svg>;
    case 'shield':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z"/></svg>;
    case 'calendar':
      return <svg viewBox="0 0 24 24" style={s}><rect {...p} x="4" y="5" width="16" height="16" rx="2"/><path {...p} d="M4 10h16M8 3v4M16 3v4"/></svg>;
    case 'history':
      return <svg viewBox="0 0 24 24" style={s}><circle {...p} cx="12" cy="12" r="8.5"/><path {...p} d="M12 7v5l3 2"/></svg>;
    case 'droplet':
      return <svg viewBox="0 0 24 24" style={s}><path {...p} d="M12 3l5 7a5 5 0 1 1-10 0l5-7z"/></svg>;
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Spinning wheel — SVG, slices + initials
// ─────────────────────────────────────────────────────────────
function polar(cx, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cx + r * Math.sin(rad) };
}
function slicePath(cx, R, i, n) {
  const sd = 360 / n;
  const s = polar(cx, R, i * sd);
  const e = polar(cx, R, (i + 1) * sd);
  const large = sd > 180 ? 1 : 0;
  return `M ${cx} ${cx} L ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

function SpinWheel({
  tasks, theme, size = 300, rotation, onPickSlice,
  hubLabel, hubSub, milestonePct = 0.4, showLabels = true,
}) {
  const cx = size / 2;
  const R = size / 2;
  const HUB = Math.round(size * 0.28);
  const n = tasks.length;
  const sliceDeg = 360 / n;

  // Ambient milestone arc — outer ring
  const ARC_R = R - 2;
  const arcEnd = polar(cx, ARC_R, milestonePct * 360);
  const arcLarge = milestonePct > 0.5 ? 1 : 0;
  const arcPath = `M ${cx} ${cx - ARC_R} A ${ARC_R} ${ARC_R} 0 ${arcLarge} 1 ${arcEnd.x} ${arcEnd.y}`;

  return (
    <div style={{ position: 'relative', width: size, height: size + 16 }}>
      {/* Pointer notch — minimal, lives at top */}
      <div style={{
        position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
        width: 10, height: 14, zIndex: 4,
      }}>
        <svg viewBox="0 0 10 14" width="10" height="14">
          <path d="M5 14L0 0h10L5 14z" fill={theme.fg} />
        </svg>
      </div>

      {/* Outer thin ambient milestone arc */}
      <svg
        viewBox={`-4 -4 ${size + 8} ${size + 8}`}
        width={size + 8} height={size + 8}
        style={{ position: 'absolute', top: -4, left: -4, pointerEvents: 'none', zIndex: 3 }}
      >
        <circle cx={cx} cy={cx} r={ARC_R} fill="none" stroke={theme.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'} strokeWidth="2" />
        {milestonePct > 0 && (
          <path d={arcPath} fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>

      {/* Rotating disc */}
      <div style={{
        width: size, height: size, position: 'relative',
        transform: `rotate(${rotation}deg)`,
        transition: 'none', // animation handled by JS rAF
        willChange: 'transform',
      }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <defs>
            <filter id="wheelShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity={theme.dark ? 0.5 : 0.08}/>
            </filter>
          </defs>
          <g filter="url(#wheelShadow)">
            {tasks.map((t, i) => (
              <path
                key={t.id}
                d={slicePath(cx, R - 8, i, n)}
                fill={theme.wheel[i % theme.wheel.length]}
                onClick={() => onPickSlice && onPickSlice(t)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </g>
          {/* Hub */}
          <circle cx={cx} cy={cx} r={HUB} fill={theme.bgCard} />
          <circle cx={cx} cy={cx} r={HUB} fill="none" stroke={theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} strokeWidth="1" />
        </svg>

        {/* Slice initial labels */}
        {showLabels && tasks.map((t, i) => {
          const { x, y } = polar(cx, R * 0.7, (i + 0.5) * sliceDeg);
          return (
            <div key={`l-${t.id}`} style={{
              position: 'absolute',
              left: x, top: y,
              transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
              color: theme.onSlice,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 600, fontSize: 14,
              letterSpacing: '0.04em',
              pointerEvents: 'none',
              opacity: 0.95,
            }}>
              {t.initial}
            </div>
          );
        })}
      </div>

      {/* Hub content — fixed, doesn't rotate */}
      <div style={{
        position: 'absolute', left: '50%', top: size / 2,
        transform: 'translate(-50%, -50%)',
        width: HUB * 2 - 8, height: HUB * 2 - 8,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', pointerEvents: 'none', zIndex: 2,
      }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 28, fontWeight: 600, color: theme.fg,
          letterSpacing: '-0.02em', lineHeight: 1,
        }}>{hubLabel}</div>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 10.5, fontWeight: 500, color: theme.fg2,
          marginTop: 4, letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>{hubSub}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Top bar — minimal: streak left, avatar right
// ─────────────────────────────────────────────────────────────
function TopBar({ theme, streak, avatarFg, onAvatar, onStreak, onAdd, onMic, showAvatar = true }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 22px 0',
    }}>
      <button onClick={onStreak} style={{
        background: 'transparent', border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        color: theme.accent,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontWeight: 600, fontSize: 15,
      }}>
        <Glyph name="flame" size={16} color={theme.accent} stroke={2} />
        <span>{streak}</span>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onMic && (
          <button onClick={onMic} style={{
            width: 30, height: 30, borderRadius: 999,
            background: 'transparent',
            border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0, color: theme.fg,
          }}>
            <Glyph name="mic" size={14} color={theme.fg} stroke={2} />
          </button>
        )}
        {onAdd && (
          <button onClick={onAdd} style={{
            width: 30, height: 30, borderRadius: 999,
            background: 'transparent',
            border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0, color: theme.fg,
          }}>
            <Glyph name="plus" size={16} color={theme.fg} stroke={2.2} />
          </button>
        )}
        {showAvatar && (
          <button onClick={onAvatar} style={{
            background: theme.accent, border: 'none', padding: 0,
            width: 30, height: 30, borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: avatarFg, fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 700, fontSize: 12, letterSpacing: '0.02em',
          }}>
            IO
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom tab bar — 2 tabs (Wheel · Tasks)
// ─────────────────────────────────────────────────────────────
function TabBar({ theme, current, onChange, platform, tabCount = 2, threeTabNoHabits = false }) {
  let tabs;
  if (threeTabNoHabits) {
    tabs = [{ id: 'wheel', label: 'Tasks', glyph: 'wheel' },
            { id: 'you',   label: 'You',   glyph: 'person' }];
  } else if (tabCount === 3) {
    tabs = [{ id: 'wheel',  label: 'Tasks',  glyph: 'wheel'  },
            { id: 'habits', label: 'Habits', glyph: 'grid'   },
            { id: 'you',    label: 'You',    glyph: 'person' }];
  } else {
    tabs = [{ id: 'wheel', label: 'Wheel', glyph: 'wheel' },
            { id: 'tasks', label: 'List',  glyph: 'list' }];
  }
  const bottomPad = platform === 'ios' ? 28 : 14;
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: bottomPad,
      background: theme.barBg,
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      borderTop: `1px solid ${theme.barBorder}`,
      display: 'flex', justifyContent: 'space-around',
      paddingTop: 8,
    }}>
      {tabs.map(t => {
        const active = current === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            flex: 1, background: 'transparent', border: 'none', padding: '8px 0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            cursor: 'pointer',
            color: active ? theme.fg : theme.fg3,
          }}>
            <Glyph name={t.glyph} size={20} color={active ? theme.fg : theme.fg3} stroke={active ? 2 : 1.5} />
            <span style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 10.5, fontWeight: active ? 600 : 500,
              letterSpacing: '0.04em',
            }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mode toggle — Work · Rest segmented control
// ─────────────────────────────────────────────────────────────
function ModeToggle({ theme, mode, onChange }) {
  const items = [{ id: 'work', label: 'Work' }, { id: 'rest', label: 'Rest' }];
  return (
    <div style={{
      display: 'inline-flex', padding: 3, borderRadius: 999,
      background: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      gap: 0,
    }}>
      {items.map(it => {
        const active = mode === it.id;
        return (
          <button key={it.id} onClick={() => onChange(it.id)} style={{
            background: active ? theme.bgCard : 'transparent',
            border: 'none', borderRadius: 999,
            padding: '7px 16px', cursor: 'pointer',
            color: active ? theme.fg : theme.fg2,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 600, fontSize: 12.5,
            letterSpacing: '0.02em',
            boxShadow: active ? (theme.dark ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.06)') : 'none',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'background 0.18s',
          }}>
            <Glyph name={it.id === 'work' ? 'sun' : 'moon'} size={13} color={active ? theme.fg : theme.fg2} stroke={1.8} />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero title using Instrument Serif italic
// ─────────────────────────────────────────────────────────────
function HeroTitle({ theme, lead, accent }) {
  return (
    <div style={{
      paddingLeft: 22, paddingRight: 22, marginTop: 6,
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      lineHeight: 1.05, letterSpacing: '-0.025em',
    }}>
      <div style={{ fontWeight: 600, fontSize: 26, color: theme.fg }}>{lead}</div>
      <div style={{
        fontFamily: '"Instrument Serif", Georgia, serif',
        fontStyle: 'italic', fontWeight: 400,
        fontSize: 38, color: theme.accent, marginTop: 2,
        letterSpacing: '-0.01em',
      }}>{accent}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sheet — bottom modal
// ─────────────────────────────────────────────────────────────
function Sheet({ theme, open, onClose, children, height }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end',
      animation: 'wtFade 0.2s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: theme.bgCard,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '14px 22px 32px',
        height,
        animation: 'wtSlideUp 0.28s cubic-bezier(0.2,0.8,0.2,1)',
      }}>
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: theme.fg3, opacity: 0.4,
          margin: '0 auto 14px',
        }} />
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DraggableTaskList — manages reorder via per-row drag handles.
// Rows keep their swipe-delete + long-press-edit via SwipeableRow.
// ─────────────────────────────────────────────────────────────
function DraggableTaskList({ tasks, theme, onPick, onEdit, onDelete, onReorder }) {
  const ROW_H = 53;
  const [drag, setDrag] = React.useState(null);
  // drag = { fromIdx, currentIdx, startY, dy }

  // Latest values for event handlers (avoid stale closures)
  const dragRef = React.useRef(drag);
  const tasksRef = React.useRef(tasks);
  const orderRef = React.useRef(onReorder);
  React.useEffect(() => { dragRef.current = drag; }, [drag]);
  React.useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  React.useEffect(() => { orderRef.current = onReorder; }, [onReorder]);

  const handleStart = (fromIdx, startY) => {
    setDrag({ fromIdx, currentIdx: fromIdx, startY, dy: 0 });
  };

  React.useEffect(() => {
    if (!drag) return;
    const handleMove = (e) => {
      const d = dragRef.current; if (!d) return;
      const dy = e.clientY - d.startY;
      const delta = Math.round(dy / ROW_H);
      const newIdx = Math.max(0, Math.min(tasksRef.current.length - 1, d.fromIdx + delta));
      setDrag(prev => prev ? { ...prev, currentIdx: newIdx, dy } : null);
    };
    const handleUp = () => {
      const d = dragRef.current; if (!d) return;
      if (d.currentIdx !== d.fromIdx) orderRef.current?.(d.fromIdx, d.currentIdx);
      setDrag(null);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [drag != null]);

  return (
    <div style={{ position: 'relative' }}>
      {tasks.map((t, i) => {
        let translate = 0;
        if (drag && i !== drag.fromIdx) {
          if (drag.fromIdx < drag.currentIdx && i > drag.fromIdx && i <= drag.currentIdx) translate = -ROW_H;
          else if (drag.fromIdx > drag.currentIdx && i < drag.fromIdx && i >= drag.currentIdx) translate = ROW_H;
        }
        const isDragging = drag && drag.fromIdx === i;
        const dragY = isDragging ? drag.dy : 0;
        const color = theme.wheel[(t.colorIdx ?? i) % theme.wheel.length];

        return (
          <div key={t.id} style={{
            position: 'relative',
            zIndex: isDragging ? 5 : 0,
            transform: isDragging ? `translateY(${dragY}px)` : `translateY(${translate}px)`,
            transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.2,0.8,0.2,1)',
          }}>
            <div style={{
              background: isDragging ? theme.bgCard : 'transparent',
              borderRadius: isDragging ? 12 : 0,
              boxShadow: isDragging ? '0 10px 22px rgba(0,0,0,0.18)' : 'none',
              transition: 'background 0.15s, box-shadow 0.15s',
            }}>
              <SwipeableRow
                theme={theme}
                onTap={() => !drag && onPick(t)}
                onLongPress={() => onEdit(t)}
                onDelete={() => onDelete(t)}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0',
                  borderBottom: isDragging ? 'none' : `1px solid ${theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                  paddingLeft: isDragging ? 10 : 0,
                  paddingRight: isDragging ? 6 : 0,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 9,
                    background: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: theme.onSlice,
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontWeight: 700, fontSize: 11, letterSpacing: '0.02em',
                  }}>{t.initial}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                      fontSize: 14.5, color: theme.fg, fontWeight: 500,
                      letterSpacing: '-0.005em',
                    }}>{t.name}</div>
                  </div>
                  <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 12.5, color: theme.fg2, fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{t.minutes}m</div>
                  {/* Drag handle — owns its own pointer events, stops propagation */}
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                      handleStart(i, e.clientY);
                    }}
                    style={{
                      padding: '8px 2px 8px 10px',
                      cursor: 'grab',
                      color: theme.fg3,
                      touchAction: 'none',
                    }}
                  >
                    <Glyph name="drag" size={16} color={theme.fg3} />
                  </div>
                </div>
              </SwipeableRow>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SwipeableRow — pointer-driven swipe-to-delete + long-press-to-edit
// Tap (no significant movement) calls onTap.
// ─────────────────────────────────────────────────────────────
function SwipeableRow({ children, onTap, onLongPress, onDelete, theme, height = 52 }) {
  const [offset, setOffset] = React.useState(0);
  const [removing, setRemoving] = React.useState(false);
  const ref = React.useRef({});

  const DELETE_REVEAL = 88;
  const COMMIT = 64;
  const LONG_PRESS_MS = 480;

  const reset = () => {
    setOffset(0);
    ref.current = {};
  };

  const handleDown = (e) => {
    ref.current = {
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      longPressFired: false,
      pointerId: e.pointerId,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    ref.current.longPressTimer = setTimeout(() => {
      if (!ref.current.moved && ref.current.startX != null) {
        ref.current.longPressFired = true;
        if (navigator.vibrate) navigator.vibrate(10);
        onLongPress?.();
      }
    }, LONG_PRESS_MS);
  };

  const handleMove = (e) => {
    if (ref.current.startX == null) return;
    const dx = e.clientX - ref.current.startX;
    const dy = e.clientY - ref.current.startY;
    const ax = Math.abs(dx), ay = Math.abs(dy);

    if (!ref.current.moved && (ax > 6 || ay > 6)) {
      ref.current.moved = true;
      clearTimeout(ref.current.longPressTimer);
      // Decide gesture direction
      ref.current.horizontal = ax > ay;
    }

    if (ref.current.horizontal && dx < 0) {
      setOffset(Math.max(dx, -DELETE_REVEAL - 20));
    } else if (ref.current.horizontal && dx > 0 && offset !== 0) {
      setOffset(Math.min(0, offset + dx * 0.2));
    }
  };

  const handleUp = (e) => {
    clearTimeout(ref.current.longPressTimer);
    const wasLongPress = ref.current.longPressFired;
    const wasMoved = ref.current.moved;
    const wasHorizontal = ref.current.horizontal;

    try { e.currentTarget.releasePointerCapture(ref.current.pointerId); } catch {}

    if (wasLongPress) {
      reset();
      return;
    }

    if (wasHorizontal && offset <= -COMMIT) {
      setRemoving(true);
      setOffset(-400);
      setTimeout(() => { onDelete?.(); }, 220);
      return;
    }

    if (!wasMoved) {
      onTap?.();
    }
    reset();
  };

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      maxHeight: removing ? 0 : 200,
      opacity: removing ? 0 : 1,
      transition: 'max-height 0.22s ease, opacity 0.18s ease',
    }}>
      {/* Delete reveal underlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        background: theme.danger || '#E5675C',
        color: '#fff', paddingRight: 18, gap: 6,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 12, fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        <Glyph name="trash" size={16} color="#fff" stroke={2.2} />
        Delete
      </div>
      {/* Foreground row */}
      <div
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        style={{
          background: theme.bg,
          transform: `translateX(${offset}px)`,
          transition: removing || offset === 0 ? 'transform 0.22s cubic-bezier(0.2,0.8,0.2,1)' : 'none',
          touchAction: 'pan-y',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Wheel Screen
// ─────────────────────────────────────────────────────────────
function WheelScreen({ theme, state, dispatch, deviceWidth, threeTab }) {
  const { mode, tasks, restTasks, rotation, spinning, dailyDone, dailyGoal, streak } = state;
  const filterPending = (arr) => arr.filter(t => !t.done);
  const activeList = filterPending(threeTab ? tasks : (mode === 'work' ? tasks : restTasks));
  const isEmpty = activeList.length === 0;
  const wheelSize = Math.min(deviceWidth - 80, 300);
  // Compute milestone pct (towards next streak milestone)
  const milestones = [3, 7, 14, 30, 60, 100];
  const nextM = milestones.find(m => m > streak) ?? 100;
  const prevM = [...milestones].reverse().find(m => m <= streak) ?? 0;
  const milestonePct = Math.max(0, Math.min(1, (streak - prevM) / (nextM - prevM)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <HeroTitle
        theme={theme}
        lead={isEmpty ? 'Fresh start.' : (threeTab ? 'Not sure where to start?' : (mode === 'work' ? 'Not sure where to start?' : 'Time to recover.'))}
        accent={isEmpty ? 'Today.' : (threeTab ? 'Spin.' : (mode === 'work' ? 'Spin.' : 'Rest.'))}
      />

      {/* Mode toggle — only in 2-tab mode (3-tab has Habits as a separate tab) */}
      {!threeTab && (
        <div style={{ padding: '18px 22px 4px' }}>
          <ModeToggle theme={theme} mode={mode} onChange={m => dispatch({ type: 'set-mode', mode: m })} />
        </div>
      )}

      {/* Wheel area */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        gap: 20, paddingTop: 8, paddingBottom: 4,
      }}>
        {isEmpty ? (
          <EmptyWheel theme={theme} size={wheelSize} onVoice={() => dispatch({ type: 'open-voice' })} />
        ) : (
          <SpinWheel
            tasks={activeList}
            theme={theme}
            size={wheelSize}
            rotation={rotation}
            milestonePct={milestonePct}
            hubLabel={`${dailyDone}/${dailyGoal}`}
            hubSub="today"
            onPickSlice={(t) => dispatch({ type: 'pick-slice', task: t })}
          />
        )}

        {/* Bottom CTA + meta row */}
        <div style={{ width: '100%', padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isEmpty ? (
            <>
              <button
                onClick={() => dispatch({ type: 'open-add' })}
                style={{
                  width: '100%', height: 52, borderRadius: 999,
                  background: theme.fg, color: theme.bg, border: 'none',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontWeight: 600, fontSize: 16, letterSpacing: '-0.005em',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <Glyph name="plus" size={18} color={theme.bg} stroke={2.2} /> Add your first task
              </button>
              <button
                onClick={() => dispatch({ type: 'open-rest-pledge' })}
                style={{
                  background: 'transparent', border: 'none', padding: '6px 0',
                  color: theme.fg2, cursor: 'pointer',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  marginTop: 2,
                }}>
                <Glyph name="moon" size={13} color={theme.fg2} stroke={1.8} />
                Can't today? Take a rest day →
              </button>
            </>
          ) : (
            <button
              disabled={spinning || activeList.length === 0}
              onClick={() => dispatch({ type: 'spin' })}
              style={{
                width: '100%', height: 52, borderRadius: 999,
                background: theme.fg, color: theme.bg, border: 'none',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 600, fontSize: 16, letterSpacing: '-0.005em',
                cursor: spinning ? 'default' : 'pointer',
                opacity: spinning || activeList.length === 0 ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'transform 0.1s',
              }}>
              {spinning ? 'Spinning…' : (threeTab ? 'Spin the wheel' : `Spin the ${mode === 'work' ? 'wheel' : 'rest wheel'}`)}
            </button>
          )}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 11.5, color: theme.fg2, letterSpacing: '0.04em',
            textTransform: 'uppercase', fontWeight: 600,
          }}>
            <span>{isEmpty ? 'New day · add what matters' : `${streak}-day streak · to ${nextM}`}</span>
            {!isEmpty && (
              <button onClick={() => dispatch({ type: 'open-history' })} style={{
                background: 'transparent', border: 'none', padding: 0,
                color: theme.fg2, fontFamily: 'inherit', fontSize: 11.5,
                fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
              }}>
                This week <Glyph name="arrow-up-right" size={12} color={theme.fg2} stroke={2} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Today list — sits below the wheel/CTA */}
      {!isEmpty && (
        <div style={{ padding: '22px 22px 24px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 10.5, color: theme.fg2,
              letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600,
            }}>Today · {activeList.length} {activeList.length === 1 ? 'task' : 'tasks'}</div>
            <button onClick={() => dispatch({ type: 'open-add' })} style={{
              background: 'transparent', border: 'none', padding: '4px 2px',
              color: theme.fg, cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 11, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Glyph name="plus" size={12} color={theme.fg} stroke={2.2} /> add
            </button>
          </div>
          <DraggableTaskList
            tasks={activeList}
            theme={theme}
            onPick={(t) => dispatch({ type: 'pick-slice', task: t })}
            onEdit={(t) => dispatch({ type: 'edit-task', task: t })}
            onDelete={(t) => dispatch({ type: 'delete-task', id: t.id })}
            onReorder={(from, to) => dispatch({ type: 'reorder-task', from, to })}
          />
          <button onClick={() => dispatch({ type: 'open-add' })} style={{
            width: '100%', marginTop: 12, padding: '12px 0',
            background: 'transparent',
            border: `1px dashed ${theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'}`,
            borderRadius: 14, cursor: 'pointer',
            color: theme.fg2, fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Glyph name="plus" size={14} color={theme.fg2} stroke={2} /> Add task
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tasks Screen — flat list, minimal
// ─────────────────────────────────────────────────────────────
function TasksScreen({ theme, state, dispatch, threeTab }) {
  const { mode, tasks, restTasks } = state;
  const list = (threeTab ? tasks : (mode === 'work' ? tasks : restTasks)).filter(t => !t.done);

  return (
    <div style={{ paddingBottom: 90 }}>
      <HeroTitle
        theme={theme}
        lead={threeTab ? 'Your tasks.' : (mode === 'work' ? 'Your tasks.' : 'Your rest.')}
        accent="List."
      />

      {!threeTab && (
        <div style={{ padding: '18px 22px 4px' }}>
          <ModeToggle theme={theme} mode={mode} onChange={m => dispatch({ type: 'set-mode', mode: m })} />
        </div>
      )}

      <div style={{ padding: '14px 22px 0' }}>
        {list.map((t, i) => {
          const color = theme.wheel[i % theme.wheel.length];
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 0',
              borderBottom: `1px solid ${theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.onSlice, fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 700, fontSize: 13, letterSpacing: '0.02em',
              }}>
                {t.initial}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 15, color: theme.fg, fontWeight: 500,
                  letterSpacing: '-0.01em',
                }}>{t.name}</div>
                <div style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 11.5, color: theme.fg2, marginTop: 2,
                  letterSpacing: '0.02em',
                }}>{t.minutes} min{mode === 'rest' && t.cat ? ` · ${t.cat}` : ''}</div>
              </div>
              <button onClick={() => dispatch({ type: 'start-focus', task: t })} style={{
                background: 'transparent', border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'}`,
                borderRadius: 999, padding: '6px 12px',
                color: theme.fg, cursor: 'pointer',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 12, fontWeight: 600,
              }}>Start</button>
            </div>
          );
        })}

        {/* Add row */}
        <button onClick={() => dispatch({ type: 'add-task' })} style={{
          width: '100%', marginTop: 18, padding: '14px 0',
          background: 'transparent',
          border: `1px dashed ${theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'}`,
          borderRadius: 16, cursor: 'pointer',
          color: theme.fg2, fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 13.5, fontWeight: 600, letterSpacing: '0.01em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Glyph name="plus" size={15} color={theme.fg2} stroke={2} /> Add task
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// History Sheet — week grid + completed log
// ─────────────────────────────────────────────────────────────
function HistorySheet({ theme, open, onClose, state }) {
  // Generate a 12-week × 7-day heatmap with random-ish activity
  const grid = React.useMemo(() => {
    const out = [];
    for (let w = 0; w < 12; w++) {
      const row = [];
      for (let d = 0; d < 7; d++) {
        const i = w * 7 + d;
        // deterministic pattern
        const v = ((i * 9301 + 49297) % 233280) / 233280;
        row.push(v > 0.55 ? Math.ceil(v * 3) : 0);
      }
      out.push(row);
    }
    return out;
  }, []);
  const completed = React.useMemo(() => ([
    { name: 'Deep work',    when: 'Today · 09:14', mins: 25 },
    { name: 'Inbox zero',   when: 'Today · 11:30', mins: 15 },
    { name: 'Stretch',      when: 'Yesterday · 18:02', mins: 8 },
    { name: 'Read · novel', when: 'Yesterday · 21:40', mins: 30 },
  ]), []);

  return (
    <Sheet theme={theme} open={open} onClose={onClose} height="86%">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <HeroTitle theme={theme} lead="This is" accent="your week." />
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 6, color: theme.fg2,
          }}>
            <Glyph name="close" size={20} color={theme.fg2} stroke={1.8} />
          </button>
        </div>

        <div style={{ overflow: 'auto', flex: 1, paddingTop: 22, paddingBottom: 14 }}>
          {/* Heatmap */}
          <div style={{ paddingLeft: 0 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `auto repeat(12, 1fr)`,
              gap: 4,
              alignItems: 'center',
            }}>
              {['M','T','W','T','F','S','S'].map((d, di) => (
                <React.Fragment key={di}>
                  <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 10, color: theme.fg3, fontWeight: 600,
                    paddingRight: 6,
                  }}>{d}</div>
                  {grid.map((row, wi) => {
                    const v = row[di];
                    const c = v === 0
                      ? (theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
                      : theme.accent;
                    const opacity = v === 0 ? 1 : 0.35 + v * 0.22;
                    return (
                      <div key={`${wi}-${di}`} style={{
                        aspectRatio: '1 / 1', borderRadius: 4,
                        background: c, opacity,
                      }} />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: 10, marginTop: 24,
          }}>
            {[
              { v: state.streak, l: 'streak' },
              { v: '4h 12m', l: 'this week' },
              { v: '38', l: 'tasks · 30d' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '14px 12px',
                borderRadius: 16,
                background: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              }}>
                <div style={{
                  fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
                  fontSize: 28, color: theme.fg, letterSpacing: '-0.02em',
                }}>{s.v}</div>
                <div style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 10.5, color: theme.fg2, marginTop: 2,
                  letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
                }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Recent log */}
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 10.5, color: theme.fg2, marginTop: 24, marginBottom: 8,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
          }}>Recently done</div>
          {completed.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0',
              borderBottom: i === completed.length - 1 ? 'none' : `1px solid ${theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
            }}>
              <div style={{ color: theme.success }}>
                <Glyph name="check" size={16} color={theme.success} stroke={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 14, color: theme.fg, fontWeight: 500,
                }}>{c.name}</div>
                <div style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 11, color: theme.fg2, marginTop: 1,
                }}>{c.when}</div>
              </div>
              <div style={{
                fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
                fontSize: 18, color: theme.fg2,
              }}>{c.mins}m</div>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Picked task sheet (post-spin)
// ─────────────────────────────────────────────────────────────
function PickedSheet({ theme, open, onClose, task, onStart, mode }) {
  if (!task) return null;
  return (
    <Sheet theme={theme} open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0 0' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18,
          background: task.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: theme.onSlice, fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontWeight: 700, fontSize: 22, marginBottom: 16,
        }}>{task.initial}</div>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 11, color: theme.fg2, fontWeight: 600,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>You got</div>
        <div style={{
          marginTop: 6,
          fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
          fontSize: 34, color: theme.fg, letterSpacing: '-0.02em',
          textAlign: 'center', lineHeight: 1.1,
        }}>{task.name}</div>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 13, color: theme.fg2, marginTop: 6,
        }}>{task.minutes}-minute {mode === 'work' ? 'focus' : 'rest'} session</div>

        <button onClick={() => onStart(task)} style={{
          marginTop: 22, width: '100%', height: 52, borderRadius: 999,
          background: theme.fg, color: theme.bg, border: 'none',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontWeight: 600, fontSize: 16, cursor: 'pointer',
        }}>Start focus</button>
        <button onClick={onClose} style={{
          marginTop: 8, width: '100%', padding: '12px 0',
          background: 'transparent', border: 'none',
          color: theme.fg2, cursor: 'pointer',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 14, fontWeight: 500,
        }}>Re-spin</button>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Focus screen — full takeover countdown
// ─────────────────────────────────────────────────────────────
function FocusScreen({ theme, task, secondsLeft, totalSecs, paused, onPause, onCancel, onDone }) {
  const pct = 1 - secondsLeft / totalSecs;
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');
  const size = 240;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: theme.bg,
      display: 'flex', flexDirection: 'column',
      animation: 'wtFade 0.25s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 22px 0' }}>
        <button onClick={onCancel} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: 6, color: theme.fg2,
        }}>
          <Glyph name="chevron-left" size={20} color={theme.fg2} stroke={1.8} />
        </button>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 11, color: theme.fg2, fontWeight: 600,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          alignSelf: 'center',
        }}>Focus</div>
        <div style={{ width: 32 }} />
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14,
        paddingBottom: 80,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: task?.color || theme.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: theme.onSlice, fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontWeight: 700, fontSize: 16,
        }}>{task?.initial}</div>
        <div style={{
          fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
          fontSize: 26, color: theme.fg, letterSpacing: '-0.02em',
          textAlign: 'center', marginBottom: 4,
        }}>{task?.name}</div>

        <div style={{ position: 'relative', width: size, height: size, marginTop: 6 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size/2} cy={size/2} r={r} fill="none"
              stroke={theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'} strokeWidth="3" />
            <circle cx={size/2} cy={size/2} r={r} fill="none"
              stroke={theme.accent} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct)}
              transform={`rotate(-90 ${size/2} ${size/2})`}
              style={{ transition: 'stroke-dashoffset 0.4s linear' }} />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontVariantNumeric: 'tabular-nums',
              fontSize: 58, fontWeight: 600, color: theme.fg,
              letterSpacing: '-0.04em', lineHeight: 1,
            }}>{mm}:{ss}</div>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 11, color: theme.fg2, fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 6,
            }}>{paused ? 'paused' : 'remaining'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
          <button onClick={onPause} style={{
            width: 60, height: 60, borderRadius: 999,
            background: theme.bgCard, border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.fg,
          }}>
            <Glyph name={paused ? 'play' : 'pause'} size={22} color={theme.fg} stroke={2} />
          </button>
          <button onClick={onDone} style={{
            padding: '0 22px', height: 60, borderRadius: 999,
            background: theme.fg, color: theme.bg, border: 'none',
            cursor: 'pointer',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 600, fontSize: 15,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Glyph name="check" size={18} color={theme.bg} stroke={2.2} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Profile sheet
// ─────────────────────────────────────────────────────────────
function ProfileSheet({ theme, open, onClose, state, themeName, onThemeChange }) {
  return (
    <Sheet theme={theme} open={open} onClose={onClose} height="82%">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <HeroTitle theme={theme} lead="Hello," accent="Maker." />
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: 6, color: theme.fg2,
        }}>
          <Glyph name="close" size={20} color={theme.fg2} stroke={1.8} />
        </button>
      </div>
      <div style={{ paddingTop: 18 }}>
        {/* Big stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        }}>
          {[
            { v: state.streak, l: 'day streak' },
            { v: '38', l: 'tasks done' },
            { v: '14h', l: 'focus time' },
            { v: '6', l: 'badges' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: 16, borderRadius: 18,
              background: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            }}>
              <div style={{
                fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
                fontSize: 36, color: theme.fg, letterSpacing: '-0.02em', lineHeight: 1,
              }}>{s.v}</div>
              <div style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 11, color: theme.fg2, marginTop: 8,
                letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
              }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Theme switcher */}
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 10.5, color: theme.fg2, marginTop: 22, marginBottom: 10,
          letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
        }}>Theme</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {Object.entries(WT_THEMES).map(([key, th]) => {
            const active = key === themeName;
            return (
              <button key={key} onClick={() => onThemeChange(key)} style={{
                padding: '12px 14px', borderRadius: 14,
                background: active ? (theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)') : 'transparent',
                border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 999,
                  background: th.bg, border: `1px solid ${th.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', right: -4, top: -4,
                    width: 14, height: 14, borderRadius: 999,
                    background: th.accent,
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 13, color: theme.fg, fontWeight: 600,
                  }}>{th.label}</div>
                  <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 10.5, color: theme.fg3, marginTop: 1,
                  }}>{th.mode}</div>
                </div>
                {active && <Glyph name="check" size={16} color={theme.accent} stroke={2.2} />}
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Plant — grows with progress, gets watered on task completion.
// stage 1 = seedling, 2 = sapling, 3 = leafy, 4 = blooming.
// ─────────────────────────────────────────────────────────────
function Plant({ size = 64, theme, stage = 2 }) {
  const leafColor = theme.success;
  const leafDeep = theme.dark ? 'oklch(0.6 0.08 145)' : 'oklch(0.55 0.1 145)';
  const stemColor = theme.dark ? 'oklch(0.6 0.06 145)' : 'oklch(0.5 0.08 145)';
  const potBody = theme.dark ? '#5C4A38' : '#C29575';
  const potRim  = theme.dark ? '#6B5640' : '#D0A285';
  const soil    = theme.dark ? '#3B2D20' : '#7B5B42';
  const stemTop = Math.max(8, 30 - stage * 4);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }}>
      {/* Pot */}
      <path d="M21 44 L24 60 L40 60 L43 44 Z" fill={potBody} />
      <ellipse cx="32" cy="44" rx="11" ry="2.2" fill={potRim} />
      <ellipse cx="32" cy="44" rx="9" ry="1.4" fill={soil} />
      {/* Stem */}
      <path d={`M32 44 Q32 ${(44 + stemTop) / 2} 32 ${stemTop}`} stroke={stemColor} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Leaves */}
      {stage >= 1 && (
        <ellipse cx="32" cy="28" rx="3.6" ry="1.8" fill={leafColor} transform="rotate(-12 32 28)" />
      )}
      {stage >= 2 && (
        <>
          <ellipse cx="26" cy="32" rx="5" ry="2.4" fill={leafColor} transform="rotate(-35 26 32)" />
          <ellipse cx="38" cy="32" rx="5" ry="2.4" fill={leafDeep} transform="rotate(35 38 32)" />
        </>
      )}
      {stage >= 3 && (
        <>
          <ellipse cx="23" cy="24" rx="4.2" ry="2" fill={leafDeep} transform="rotate(-55 23 24)" />
          <ellipse cx="41" cy="24" rx="4.2" ry="2" fill={leafColor} transform="rotate(55 41 24)" />
        </>
      )}
      {stage >= 4 && (
        <circle cx="32" cy="18" r="3.2" fill={theme.accent} />
      )}
    </svg>
  );
}

// WateringMoment — full-app overlay shown for ~2.2s after completion
function WateringMoment({ theme, visible, task, kind, plantStage = 2 }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 75,
      pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: theme.dark ? 'rgba(15,13,24,0.4)' : 'rgba(42,37,32,0.18)',
      animation: 'wtFade 0.25s ease',
      backdropFilter: 'blur(2px)',
      WebkitBackdropFilter: 'blur(2px)',
    }}>
      <div style={{
        background: theme.bgCard,
        padding: '28px 32px 26px', borderRadius: 28,
        boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        animation: 'wtPlantPop 0.5s cubic-bezier(0.2,0.8,0.2,1)',
        position: 'relative', minWidth: 220,
      }}>
        {/* Animated droplets falling onto the plant */}
        <div style={{
          position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
          width: 100, height: 80, pointerEvents: 'none',
        }}>
          {[
            { x: -18, d: 0.15 },
            { x: 0,   d: 0.05 },
            { x: 18,  d: 0.22 },
          ].map((d, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: '50%', top: 0,
              marginLeft: d.x - 7,
              animation: `wtDroplet 0.85s ${d.d}s ease-in`,
              opacity: 0,
            }}>
              <Glyph name="droplet" size={14} color={theme.primary} stroke={1.6} />
            </div>
          ))}
        </div>

        <div style={{
          animation: 'wtPlantBounce 1.4s 0.55s cubic-bezier(0.2,0.8,0.2,1)',
          transformOrigin: 'center bottom',
        }}>
          <Plant size={96} theme={theme} stage={plantStage} />
        </div>
        <div style={{
          fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
          fontSize: 26, color: theme.fg, letterSpacing: '-0.02em',
          textAlign: 'center', lineHeight: 1.1, marginTop: 4,
        }}>+ a little water.</div>
        {task && (
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 12, color: theme.fg2, textAlign: 'center',
            letterSpacing: '0.04em',
          }}>
            <span style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.12em' }}>{kind === 'habit' ? 'Habit' : 'Task'} done</span>
            {' · '}{task.name}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EmptyWheel placeholder — shown when no tasks today
// ─────────────────────────────────────────────────────────────
function EmptyWheel({ theme, size, onVoice }) {
  return (
    <div style={{
      width: size, height: size + 16,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 14, padding: 14,
    }}>
      <button
        onClick={onVoice}
        style={{
          width: size * 0.72, height: size * 0.72, borderRadius: '50%',
          border: `2px dashed ${theme.dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.14)'}`,
          background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8,
          cursor: 'pointer', padding: 0,
          color: theme.fg, position: 'relative',
          transition: 'transform 0.18s, border-color 0.18s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: theme.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: theme.onSlice,
          boxShadow: theme.dark ? '0 8px 22px rgba(0,0,0,0.4)' : '0 8px 22px rgba(0,0,0,0.1)',
        }}>
          <Glyph name="mic" size={26} color={theme.onSlice} stroke={2} />
        </div>
        <div style={{
          fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
          fontSize: 22, color: theme.fg, letterSpacing: '-0.01em',
          lineHeight: 1.1,
        }}>Tell me your day</div>
      </button>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 12.5, color: theme.fg3, textAlign: 'center', maxWidth: 240, lineHeight: 1.5,
        letterSpacing: '0.02em',
      }}>
        Tap the mic, mumble what you need to do. Or add manually below.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Inline toggle switch
// ─────────────────────────────────────────────────────────────
function WTToggle({ value, onChange, theme }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 40, height: 24, borderRadius: 999, padding: 2,
      background: value ? theme.accent : (theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'),
      border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center',
      transition: 'background 0.18s',
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 999,
        background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        transform: `translateX(${value ? 16 : 0}px)`,
        transition: 'transform 0.18s',
      }} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Heatmap — shared between Habits screen and History sheet
// ─────────────────────────────────────────────────────────────
function Heatmap({ theme, weeks = 14, seed = 1, color }) {
  const grid = React.useMemo(() => {
    const out = [];
    for (let w = 0; w < weeks; w++) {
      const row = [];
      for (let d = 0; d < 7; d++) {
        const i = w * 7 + d + seed * 17;
        const v = ((i * 9301 + 49297) % 233280) / 233280;
        row.push(v > 0.5 ? Math.ceil(v * 3) : 0);
      }
      out.push(row);
    }
    return out;
  }, [weeks, seed]);
  const empty = theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `auto repeat(${weeks}, 1fr)`,
      gap: 3, alignItems: 'center',
    }}>
      {['M','T','W','T','F','S','S'].map((d, di) => (
        <React.Fragment key={di}>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 9, color: theme.fg3, fontWeight: 600,
            paddingRight: 4, lineHeight: 1,
          }}>{d}</div>
          {grid.map((row, wi) => {
            const v = row[di];
            const c = v === 0 ? empty : (color || theme.accent);
            const opacity = v === 0 ? 1 : 0.4 + v * 0.2;
            return (
              <div key={`${wi}-${di}`} style={{
                aspectRatio: '1 / 1', borderRadius: 3,
                background: c, opacity,
              }} />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Habits Screen — heatmap hero + today's check-in list
// ─────────────────────────────────────────────────────────────
function HabitsScreen({ theme, state, dispatch }) {
  const { habits } = state;
  const doneCount = habits.filter(h => h.doneToday).length;
  const longestStreak = Math.max(...habits.map(h => h.streak));

  return (
    <div style={{ paddingBottom: 90 }}>
      <HeroTitle theme={theme} lead="Show up." accent="Every day." />

      <div style={{ padding: '20px 22px 0' }}>
        {/* Hero heatmap */}
        <Heatmap theme={theme} weeks={14} seed={3} color={theme.primary} />

        {/* Stats row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8, marginTop: 20,
        }}>
          {[
            { v: longestStreak, l: 'longest' },
            { v: `${doneCount}/${habits.length}`, l: 'today' },
            { v: '78%', l: '30-day' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '12px 12px',
              borderRadius: 14,
              background: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            }}>
              <div style={{
                fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
                fontSize: 26, color: theme.fg, letterSpacing: '-0.02em', lineHeight: 1,
              }}>{s.v}</div>
              <div style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 10, color: theme.fg2, marginTop: 4,
                letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
              }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Today list */}
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 10.5, color: theme.fg2, marginTop: 24, marginBottom: 6,
          letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
        }}>Today</div>

        {habits.map((h, i) => {
          const color = theme.wheel[i % theme.wheel.length];
          return (
            <button
              key={h.id}
              onClick={() => dispatch({ type: 'toggle-habit', id: h.id })}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0',
                background: 'transparent', border: 'none',
                borderBottom: `1px solid ${theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                background: h.doneToday ? color : 'transparent',
                border: `1.5px solid ${h.doneToday ? color : (theme.dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)')}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.onSlice,
                transition: 'all 0.18s',
              }}>
                {h.doneToday && <Glyph name="check" size={14} color={theme.onSlice} stroke={2.6} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 14.5, color: h.doneToday ? theme.fg2 : theme.fg, fontWeight: 500,
                  textDecoration: h.doneToday ? 'line-through' : 'none',
                  textDecorationColor: theme.fg3,
                }}>{h.name}</div>
                <div style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 11, color: theme.fg3, marginTop: 1,
                }}>{h.cat}{h.minutes ? ` · ${h.minutes}m` : ''}</div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                color: theme.accent,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 12, fontWeight: 600,
              }}>
                <Glyph name="flame" size={12} color={theme.accent} stroke={2} />
                {h.streak}
              </div>
            </button>
          );
        })}

        <button onClick={() => dispatch({ type: 'add-habit' })} style={{
          width: '100%', marginTop: 18, padding: '14px 0',
          background: 'transparent',
          border: `1px dashed ${theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'}`,
          borderRadius: 16, cursor: 'pointer',
          color: theme.fg2, fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 13.5, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Glyph name="plus" size={15} color={theme.fg2} stroke={2} /> New habit
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// You Screen — full screen (replaces ProfileSheet in 3-tab mode)
// ─────────────────────────────────────────────────────────────
function YouScreen({ theme, state, themeName, onThemeChange, habitsEnabled, onToggleHabits, onOpenRestPledge, restDay, onCancelRest }) {
  return (
    <div style={{ paddingBottom: 90 }}>
      <HeroTitle theme={theme} lead="Hello," accent="Maker." />

      <div style={{ padding: '20px 22px 0' }}>
        {/* Avatar + identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 999,
            background: theme.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.onSlice,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 700, fontSize: 18, letterSpacing: '0.02em',
          }}>IO</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 17, color: theme.fg, fontWeight: 600,
              letterSpacing: '-0.01em',
            }}>ion.maker</div>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 12, color: theme.fg2, marginTop: 2,
            }}>Joined April 2025</div>
          </div>
          <button style={{
            background: 'transparent',
            border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'}`,
            borderRadius: 999, padding: '6px 14px',
            color: theme.fg, cursor: 'pointer',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 12, fontWeight: 600,
          }}>Edit</button>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { v: state.streak, l: 'day streak' },
            { v: '38', l: 'tasks done' },
            { v: '14h', l: 'focus time' },
            { v: '6', l: 'badges' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: 16, borderRadius: 18,
              background: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            }}>
              <div style={{
                fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
                fontSize: 34, color: theme.fg, letterSpacing: '-0.02em', lineHeight: 1,
              }}>{s.v}</div>
              <div style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 11, color: theme.fg2, marginTop: 6,
                letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
              }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Theme switcher */}
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 10.5, color: theme.fg2, marginTop: 22, marginBottom: 8,
          letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
        }}>Theme</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {Object.entries(WT_THEMES).map(([key, th]) => {
            const active = key === themeName;
            return (
              <button key={key} onClick={() => onThemeChange(key)} style={{
                padding: '12px 14px', borderRadius: 14,
                background: active ? (theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)') : 'transparent',
                border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 999,
                  background: th.bg, border: `1px solid ${th.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', right: -4, top: -4,
                    width: 14, height: 14, borderRadius: 999,
                    background: th.accent,
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 13, color: theme.fg, fontWeight: 600,
                  }}>{th.label}</div>
                  <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 10.5, color: theme.fg3, marginTop: 1,
                  }}>{th.mode}</div>
                </div>
                {active && <Glyph name="check" size={16} color={theme.accent} stroke={2.2} />}
              </button>
            );
          })}
        </div>

        {/* Settings list */}
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 10.5, color: theme.fg2, marginTop: 22, marginBottom: 4,
          letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
        }}>Settings</div>

        {/* Habits toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 2px',
          borderBottom: `1px solid ${theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 14, color: theme.fg, fontWeight: 500,
            }}>Habits tab</div>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 11.5, color: theme.fg2, marginTop: 2, lineHeight: 1.45,
              maxWidth: 240,
            }}>Heatmap + daily check-ins. Off keeps things light — just Tasks and You.</div>
          </div>
          <WTToggle value={habitsEnabled} onChange={onToggleHabits} theme={theme} />
        </div>

        {/* Rest day row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 2px',
          borderBottom: `1px solid ${theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 14, color: theme.fg, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              Rest mode
              {restDay && (
                <span style={{
                  fontSize: 9.5, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: theme.accent,
                  border: `1px solid ${theme.accent}`,
                  padding: '2px 6px', borderRadius: 999,
                }}>On today</span>
              )}
            </div>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 11.5, color: theme.fg2, marginTop: 2, lineHeight: 1.45,
              maxWidth: 240,
            }}>Tap out for the day. Streak holds. Requires the no-guilt pledge.</div>
          </div>
          {restDay ? (
            <button onClick={onCancelRest} style={{
              padding: '6px 12px', borderRadius: 999,
              background: 'transparent',
              border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'}`,
              color: theme.fg, cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 12, fontWeight: 600,
            }}>Cancel</button>
          ) : (
            <button onClick={onOpenRestPledge} style={{
              padding: '6px 12px', borderRadius: 999,
              background: theme.fg, color: theme.bg, border: 'none',
              cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Glyph name="moon" size={12} color={theme.bg} stroke={2} />
              Take a day
            </button>
          )}
        </div>

        {[
          { label: 'Daily goal', value: '4 tasks' },
          { label: 'Notifications', value: 'On' },
          { label: 'Sign out', value: null },
        ].map((s, i, arr) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '14px 2px',
            borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 14, color: theme.fg, fontWeight: 500,
          }}>
            <span>{s.label}</span>
            {s.value && <span style={{ color: theme.fg2, fontSize: 13 }}>{s.value}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AddTaskSheet — name + initial + duration chips
// ─────────────────────────────────────────────────────────────
function AddTaskSheet({ theme, open, onClose, onAdd, onSave, onDelete, onBreakDown, editingTask = null, prefillName = '', prefillInitial = '', prefillMinutes = 25, prefillColorIdx = 0 }) {
  const isEdit = !!editingTask;
  const [name, setName] = React.useState(isEdit ? editingTask.name : prefillName);
  const [minutes, setMinutes] = React.useState(isEdit ? editingTask.minutes : prefillMinutes);
  const [colorIdx, setColorIdx] = React.useState(isEdit ? (editingTask.colorIdx ?? 0) : prefillColorIdx);
  React.useEffect(() => {
    if (isEdit) {
      setName(editingTask.name);
      setMinutes(editingTask.minutes);
      setColorIdx(editingTask.colorIdx ?? 0);
    } else {
      setName(prefillName);
      setMinutes(prefillMinutes);
      setColorIdx(prefillColorIdx);
    }
  }, [open, editingTask]);
  const initial = (name.trim()[0] || prefillInitial || '?').toUpperCase();
  const color = theme.wheel[colorIdx % theme.wheel.length];
  const durations = [10, 15, 25, 45, 60];

  if (!open) return null;
  return (
    <Sheet theme={theme} open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 11, color: theme.fg2, fontWeight: 600,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          textAlign: 'center',
        }}>{isEdit ? 'Edit task' : 'New task'}</div>

        {/* Preview chip */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.onSlice, fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 700, fontSize: 26,
            transition: 'background 0.2s',
          }}>{initial}</div>
        </div>

        {/* Name input */}
        <div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="What is it?"
            style={{
              width: '100%', border: 'none',
              borderBottom: `1.5px solid ${theme.dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'}`,
              background: 'transparent', outline: 'none',
              fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
              fontSize: 28, color: theme.fg, letterSpacing: '-0.01em',
              padding: '8px 0',
              textAlign: 'center',
            }}
          />
        </div>

        {/* Color swatches */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {theme.wheel.map((c, i) => (
            <button key={c} onClick={() => setColorIdx(i)} style={{
              width: 26, height: 26, borderRadius: 999, padding: 0,
              background: c, border: 'none', cursor: 'pointer',
              boxShadow: colorIdx === i ? `0 0 0 2px ${theme.bgCard}, 0 0 0 4px ${theme.fg}` : 'none',
              transition: 'box-shadow 0.15s',
            }} />
          ))}
        </div>

        {/* Duration chips */}
        <div>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 10.5, color: theme.fg2, marginBottom: 8,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
            textAlign: 'center',
          }}>Focus duration</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {durations.map(d => {
              const active = minutes === d;
              return (
                <button key={d} onClick={() => setMinutes(d)} style={{
                  padding: '8px 14px', borderRadius: 999,
                  background: active ? theme.fg : 'transparent',
                  border: `1px solid ${active ? theme.fg : (theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)')}`,
                  cursor: 'pointer',
                  color: active ? theme.bg : theme.fg,
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 13, fontWeight: 600,
                }}>{d}m</button>
              );
            })}
          </div>
        </div>

        <button onClick={() => {
          if (!name.trim()) return;
          if (isEdit) {
            onSave?.({
              ...editingTask,
              name: name.trim(), initial, minutes, colorIdx,
            });
          } else {
            onAdd({
              id: 'new-' + Math.random().toString(36).slice(2, 7),
              name: name.trim(), initial, minutes, colorIdx,
            });
          }
        }} style={{
          width: '100%', height: 50, borderRadius: 999,
          background: name.trim() ? theme.fg : (theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'),
          color: name.trim() ? theme.bg : theme.fg3, border: 'none',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontWeight: 600, fontSize: 15,
          cursor: name.trim() ? 'pointer' : 'default',
          marginTop: 4,
        }}>{isEdit ? 'Save' : 'Add to wheel'}</button>
        {isEdit && (
          <button onClick={() => onDelete?.(editingTask)} style={{
            width: '100%', padding: '10px 0',
            background: 'transparent', border: 'none',
            color: theme.danger || '#E5675C', cursor: 'pointer',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 13.5, fontWeight: 600,
            letterSpacing: '0.01em',
          }}>Delete task</button>
        )}
        {!isEdit && onBreakDown && name.trim().length >= 3 && (
          <button onClick={() => onBreakDown(name.trim())} style={{
            width: '100%', padding: '12px 0',
            background: 'transparent',
            border: `1px dashed ${theme.accent}`,
            borderRadius: 14, cursor: 'pointer',
            color: theme.accent,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 13.5, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            letterSpacing: '-0.005em',
            marginTop: 6,
          }}>
            <Glyph name="sparkle" size={14} color={theme.accent} stroke={1.8} />
            Feels big? Break it down with AI
          </button>
        )}
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Done toast — slides in from top, brief celebration
// ─────────────────────────────────────────────────────────────
function DoneToast({ theme, task, visible }) {
  if (!visible || !task) return null;
  return (
    <div style={{
      position: 'absolute', top: 64, left: 16, right: 16, zIndex: 70,
      background: theme.bgCard,
      border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
      borderRadius: 16,
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      animation: 'wtToast 0.32s cubic-bezier(0.2,0.8,0.2,1)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 999,
        background: theme.success,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Glyph name="check" size={16} color={theme.onSlice} stroke={2.6} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 13.5, color: theme.fg, fontWeight: 600,
          letterSpacing: '-0.01em',
        }}>Nice. {task.name} is done.</div>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 11.5, color: theme.fg2, marginTop: 1,
        }}>{task.minutes ?? 25} min focused · tap the wheel for what's next</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RestPledgeSheet — read & accept "I promise not to feel guilty"
// Opening this sheet is the only way to enter Rest Mode. Forcing
// the user to actively accept the pledge is the whole feature.
// ─────────────────────────────────────────────────────────────
function RestPledgeSheet({ theme, open, onClose, onAccept }) {
  const [promised, setPromised] = React.useState(false);
  React.useEffect(() => { if (!open) setPromised(false); }, [open]);
  if (!open) return null;

  const reminders = [
    'Your body is not a productivity machine.',
    'Rest does not need to be earned.',
    'The wheel will wait for you.',
  ];

  return (
    <Sheet theme={theme} open={open} onClose={onClose} height="auto">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <Glyph name="moon" size={32} color={theme.accent} stroke={1.6} />
        <div style={{
          fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
          fontSize: 34, color: theme.fg, letterSpacing: '-0.02em',
          textAlign: 'center', lineHeight: 1.1,
        }}>Today, you rest.</div>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 14, color: theme.fg2,
          textAlign: 'center', lineHeight: 1.6, maxWidth: 280,
        }}>
          Rest is not laziness. Your streak holds. Tomorrow can be loud — today is quiet.
        </div>

        <div style={{
          width: '100%', padding: '14px 16px',
          background: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          borderRadius: 16, marginTop: 4,
        }}>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 10.5, color: theme.fg2, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8,
          }}>Read · remember</div>
          {reminders.map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '5px 0',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 13, color: theme.fg, lineHeight: 1.5,
            }}>
              <span style={{ color: theme.accent, lineHeight: '20px' }}>·</span>
              <span>{r}</span>
            </div>
          ))}
        </div>

        {/* The promise */}
        <button
          onClick={() => setPromised(p => !p)}
          style={{
            width: '100%', marginTop: 6,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 14,
            background: promised ? (theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : 'transparent',
            border: `1.5px solid ${promised ? theme.accent : (theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)')}`,
            cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.18s',
          }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: 7,
            background: promised ? theme.accent : 'transparent',
            border: promised ? 'none' : `1.5px solid ${theme.fg3}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.onSlice, flexShrink: 0,
            transition: 'background 0.18s',
          }}>
            {promised && <Glyph name="check" size={14} color={theme.onSlice} stroke={2.6} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 14, color: theme.fg, fontWeight: 600,
              letterSpacing: '-0.005em',
            }}>I promise not to feel guilty.</div>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 11.5, color: theme.fg2, marginTop: 2,
            }}>Tap to make it official.</div>
          </div>
        </button>

        <button
          disabled={!promised}
          onClick={onAccept}
          style={{
            width: '100%', height: 52, borderRadius: 999,
            background: promised ? theme.fg : (theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'),
            color: promised ? theme.bg : theme.fg3, border: 'none',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 600, fontSize: 16,
            cursor: promised ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.2s',
            marginTop: 8,
          }}>
          <Glyph name="shield" size={16} color={promised ? theme.bg : theme.fg3} stroke={2} />
          Accept · take the day
        </button>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', padding: '8px 0',
          color: theme.fg2, cursor: 'pointer',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 14, fontWeight: 500,
        }}>Not yet</button>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// RestDayView — replaces the wheel for the day. No pressure UI.
// ─────────────────────────────────────────────────────────────
function RestDayView({ theme, streak, onCancel }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '24px 28px 40px', gap: 18,
    }}>
      <div style={{
        width: 132, height: 132, borderRadius: '50%',
        background: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 8, position: 'relative',
      }}>
        <Glyph name="moon" size={56} color={theme.accent} stroke={1.4} />
        <div style={{
          position: 'absolute', bottom: -6, right: -2,
          padding: '4px 8px', borderRadius: 999,
          background: theme.accent,
          color: theme.onSlice,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 10.5, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Glyph name="shield" size={11} color={theme.onSlice} stroke={2.4} />
          Held
        </div>
      </div>

      <div style={{
        fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
        fontSize: 42, color: theme.fg, letterSpacing: '-0.025em',
        textAlign: 'center', lineHeight: 1.05, marginTop: 4,
      }}>Today is yours.</div>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 14, color: theme.fg2,
        textAlign: 'center', maxWidth: 260, lineHeight: 1.55,
      }}>You promised not to feel guilty. We'll hold you to it.</div>

      <div style={{
        marginTop: 10,
        padding: '14px 18px', borderRadius: 16,
        background: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div>
          <div style={{
            fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
            fontSize: 28, color: theme.fg, letterSpacing: '-0.02em', lineHeight: 1,
          }}>Day {streak}</div>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 10.5, color: theme.fg2, marginTop: 4,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
          }}>streak \u00b7 holding</div>
        </div>
        <div style={{ color: theme.fg3, fontSize: 18 }}>→</div>
        <div>
          <div style={{
            fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
            fontSize: 28, color: theme.accent, letterSpacing: '-0.02em', lineHeight: 1,
          }}>Day {streak + 1}</div>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 10.5, color: theme.fg2, marginTop: 4,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
          }}>tomorrow</div>
        </div>
      </div>

      <button onClick={onCancel} style={{
        marginTop: 10, padding: '10px 14px',
        background: 'transparent', border: 'none',
        color: theme.fg2, cursor: 'pointer',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 13, fontWeight: 500,
        textDecoration: 'underline', textDecorationColor: theme.fg3,
        textUnderlineOffset: 3,
      }}>Actually, let me try a bit</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AITaskBreakdownSheet — conversational breakdown.
// Real Claude API integration. User provides context (text or voice),
// Claude either asks clarifying questions or returns subtasks.
// User can accept, exclude individuals, or feed more context → regenerate.
// ─────────────────────────────────────────────────────────────
function AITaskBreakdownSheet({ theme, open, task, taskName, sourceMode = 'add', onClose, onAdd, onReplace, onStartTask }) {
  // phases: input | listening | thinking | questions | review | error
  const [phase, setPhase] = React.useState('input');
  const [context, setContext] = React.useState('');
  const [interim, setInterim] = React.useState('');
  const [questions, setQuestions] = React.useState([]); // [{q, a}]
  const [subtasks, setSubtasks] = React.useState([]);
  const [included, setIncluded] = React.useState({});
  const [errorMsg, setErrorMsg] = React.useState('');
  const recRef = React.useRef(null);

  const name = task?.name || taskName || 'New task';

  React.useEffect(() => {
    if (!open) {
      try { recRef.current?.stop?.(); } catch {}
      return;
    }
    setPhase('input');
    setContext('');
    setInterim('');
    setQuestions([]);
    setSubtasks([]);
    setIncluded({});
    setErrorMsg('');
  }, [open]);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      // Fallback: mock listening with sample dictation
      setPhase('listening');
      const mock = "It's a proposal for a new feature for a client. I have a rough outline but haven't drafted anything yet. Due Friday.";
      let i = 0;
      const iv = setInterval(() => {
        i += 2;
        setInterim(mock.slice(0, Math.min(i, mock.length)));
        if (i >= mock.length) {
          clearInterval(iv);
          setTimeout(() => {
            setContext(c => c ? `${c} ${mock}` : mock);
            setInterim('');
            setPhase('input');
          }, 400);
        }
      }, 28);
      recRef.current = { stop: () => clearInterval(iv) };
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      let fin = '', part = '';
      for (let r = 0; r < e.results.length; r++) {
        const t = e.results[r][0].transcript;
        if (e.results[r].isFinal) fin += t; else part += t;
      }
      if (fin) {
        setContext(c => (c ? c + ' ' : '') + fin.trim());
        setInterim('');
      } else {
        setInterim(part);
      }
    };
    rec.onerror = () => { setPhase('input'); setInterim(''); };
    rec.onend = () => { setPhase('input'); setInterim(''); };
    recRef.current = rec;
    setPhase('listening');
    rec.start();
  };

  const stopVoice = () => {
    try { recRef.current?.stop?.(); } catch {}
    setPhase('input');
  };

  const callClaude = async (extra = '') => {
    setPhase('thinking');
    setErrorMsg('');
    try {
      const qaText = questions.filter(q => q.a).map(q => `Q: ${q.q}\nA: ${q.a}`).join('\n');
      const prompt = `Help break down a task into focused subtasks for a productivity app called WheelTodo.

TASK: "${name}"
${context ? `CONTEXT FROM USER:\n${context}` : ''}
${qaText ? `\nCLARIFYING Q&A:\n${qaText}` : ''}
${extra ? `\nADDITIONAL CONTEXT:\n${extra}` : ''}

Rules:
- Each subtask should be specific, action-oriented (verb + thing), and doable in one sitting.
- 3 to 5 subtasks total.
- Each takes 10-45 minutes of focused work.
- Plain language, no jargon. Concrete, not abstract.
- If the task is small enough to just do (under 30 min), say so.

Respond with ONLY valid JSON, no markdown fences, no commentary outside the JSON:

If you need 1-2 clarifying questions BEFORE you can break this down well:
{"type":"questions","questions":["short question 1","short question 2"]}

If you have enough to plan:
{"type":"subtasks","subtasks":[{"name":"Outline the intro","minutes":15},{"name":"Draft body","minutes":30}]}

If the task is small enough to skip breakdown:
{"type":"justdoit","reason":"This is a 20-minute task — just start it."}`;

      const result = await window.claude.complete({ messages: [{ role: 'user', content: prompt }] });
      let cleaned = (result || '').trim();
      // Strip markdown fences if Claude wrapped the JSON anyway
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      // Find first { and last }
      const a = cleaned.indexOf('{'), b = cleaned.lastIndexOf('}');
      if (a >= 0 && b > a) cleaned = cleaned.slice(a, b + 1);
      const parsed = JSON.parse(cleaned);

      if (parsed.type === 'questions' && Array.isArray(parsed.questions) && parsed.questions.length) {
        setQuestions(parsed.questions.slice(0, 2).map(q => ({ q: String(q), a: '' })));
        setPhase('questions');
      } else if (parsed.type === 'subtasks' && Array.isArray(parsed.subtasks) && parsed.subtasks.length) {
        const formatted = parsed.subtasks.slice(0, 5).map((s, i) => ({
          id: 'st-' + Date.now() + '-' + i,
          name: (s.name || 'Step ' + (i + 1)).slice(0, 60),
          initial: (s.name || '?').trim()[0]?.toUpperCase() || '?',
          minutes: Math.max(5, Math.min(60, Number(s.minutes) || 25)),
          colorIdx: i,
        }));
        setSubtasks(formatted);
        setIncluded(Object.fromEntries(formatted.map(t => [t.id, true])));
        setPhase('review');
      } else if (parsed.type === 'justdoit') {
        setErrorMsg(parsed.reason || 'This is small enough — just start it.');
        setPhase('justdoit');
      } else {
        throw new Error('unexpected shape');
      }
    } catch (e) {
      // Friendly fallback with deterministic subtasks so the flow still demos
      const fallback = [
        { id: 'fb1', name: 'Outline what needs to happen', initial: 'O', minutes: 15, colorIdx: 0 },
        { id: 'fb2', name: 'Make a start',                  initial: 'M', minutes: 25, colorIdx: 1 },
        { id: 'fb3', name: 'Review and finish',             initial: 'R', minutes: 20, colorIdx: 3 },
      ];
      setSubtasks(fallback);
      setIncluded(Object.fromEntries(fallback.map(t => [t.id, true])));
      setPhase('review');
    }
  };

  if (!open) return null;

  // ─── Render helpers ────────────────────────────────────────
  const Header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Glyph name="sparkle" size={14} color={theme.accent} stroke={1.8} />
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 11, color: theme.fg2, fontWeight: 600,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>Plan it · AI</div>
      </div>
      <button onClick={onClose} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: 6, color: theme.fg2,
      }}>
        <Glyph name="close" size={18} color={theme.fg2} stroke={1.8} />
      </button>
    </div>
  );

  const TaskTitle = (
    <div style={{
      fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
      fontSize: 32, color: theme.fg, letterSpacing: '-0.02em',
      lineHeight: 1.05, marginBottom: 16,
    }}>{name}</div>
  );

  // ─── Input phase ───────────────────────────────────────────
  if (phase === 'input' || phase === 'listening') {
    const displayText = phase === 'listening' ? (context + (interim ? ' ' + interim : '')) : context;
    return (
      <Sheet theme={theme} open={open} onClose={onClose} height="auto">
        {Header}
        {TaskTitle}
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 13, color: theme.fg2, lineHeight: 1.5,
          marginBottom: 12,
        }}>
          Tell me what's going on with this task. The more context, the better the plan.
        </div>

        <div style={{
          position: 'relative',
          border: `1.5px solid ${phase === 'listening' ? theme.accent : (theme.dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)')}`,
          borderRadius: 16, padding: '12px 14px',
          background: theme.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          transition: 'border-color 0.2s',
        }}>
          <textarea
            value={displayText}
            onChange={(e) => setContext(e.target.value)}
            placeholder={phase === 'listening' ? 'Listening…' : "What's it for? What's stuck? What does done look like?"}
            rows={4}
            style={{
              width: '100%', border: 'none', outline: 'none',
              background: 'transparent', resize: 'none',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 14, color: theme.fg, lineHeight: 1.55,
              letterSpacing: '-0.005em',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <button
              onClick={phase === 'listening' ? stopVoice : startVoice}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: phase === 'listening' ? theme.accent : 'transparent',
                border: `1px solid ${phase === 'listening' ? theme.accent : (theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)')}`,
                borderRadius: 999, padding: '6px 12px',
                color: phase === 'listening' ? theme.onSlice : theme.fg,
                cursor: 'pointer',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 12, fontWeight: 600,
                position: 'relative',
              }}>
              {phase === 'listening' && (
                <div style={{
                  position: 'absolute', inset: -4, borderRadius: 999,
                  background: theme.accent, opacity: 0.4,
                  animation: 'wtPulse 1.4s ease-out infinite',
                  pointerEvents: 'none',
                }} />
              )}
              <Glyph name="mic" size={13} color={phase === 'listening' ? theme.onSlice : theme.fg} stroke={2} />
              {phase === 'listening' ? 'Listening…' : 'Speak'}
            </button>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 10.5, color: theme.fg3, fontWeight: 500,
            }}>{displayText.length} chars</div>
          </div>
        </div>

        <button
          onClick={() => callClaude()}
          style={{
            width: '100%', marginTop: 16, height: 52, borderRadius: 999,
            background: theme.fg, color: theme.bg, border: 'none',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 600, fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          <Glyph name="sparkle" size={15} color={theme.bg} stroke={2} />
          Plan it out
        </button>
        {task && onStartTask && (
          <button
            onClick={() => { onStartTask(task); }}
            style={{
              width: '100%', padding: '12px 0', marginTop: 8,
              background: 'transparent', border: 'none',
              color: theme.fg2, cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 13.5, fontWeight: 500,
            }}>
            Or just start focus now ({task.minutes}m)
          </button>
        )}
      </Sheet>
    );
  }

  // ─── Thinking ──────────────────────────────────────────────
  if (phase === 'thinking') {
    return (
      <Sheet theme={theme} open={open} onClose={onClose} height="auto">
        {Header}
        {TaskTitle}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          padding: '28px 0',
        }}>
          <div style={{ position: 'relative', width: 56, height: 56 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: theme.accent, opacity: 0.2,
              animation: 'wtPulse 1.6s ease-out infinite',
            }} />
            <div style={{
              position: 'absolute', inset: 10, borderRadius: '50%',
              background: theme.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Glyph name="sparkle" size={20} color={theme.onSlice} stroke={1.6} />
            </div>
          </div>
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 13.5, color: theme.fg2,
            animation: 'wtBlink 1.2s steps(2) infinite',
          }}>Thinking through it…</div>
        </div>
      </Sheet>
    );
  }

  // ─── Clarifying questions ─────────────────────────────────
  if (phase === 'questions') {
    const allAnswered = questions.every(q => q.a.trim().length > 0);
    return (
      <Sheet theme={theme} open={open} onClose={onClose} height="auto">
        {Header}
        {TaskTitle}
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 13, color: theme.fg2, lineHeight: 1.5,
          marginBottom: 16,
        }}>
          A couple of things before I plan this:
        </div>
        {questions.map((q, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{
              fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
              fontSize: 18, color: theme.fg, letterSpacing: '-0.01em',
              marginBottom: 6, lineHeight: 1.3,
            }}>{q.q}</div>
            <input
              value={q.a}
              onChange={(e) => setQuestions(qs => qs.map((qq, j) => j === i ? { ...qq, a: e.target.value } : qq))}
              placeholder="Your answer…"
              style={{
                width: '100%', border: 'none',
                borderBottom: `1.5px solid ${theme.dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)'}`,
                background: 'transparent', outline: 'none',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 14, color: theme.fg, padding: '6px 0',
              }}
            />
          </div>
        ))}
        <button
          disabled={!allAnswered}
          onClick={() => callClaude()}
          style={{
            width: '100%', marginTop: 8, height: 52, borderRadius: 999,
            background: allAnswered ? theme.fg : (theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'),
            color: allAnswered ? theme.bg : theme.fg3, border: 'none',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 600, fontSize: 16,
            cursor: allAnswered ? 'pointer' : 'default',
          }}>Plan it out</button>
      </Sheet>
    );
  }

  // ─── Just-do-it ────────────────────────────────────────────
  if (phase === 'justdoit') {
    return (
      <Sheet theme={theme} open={open} onClose={onClose} height="auto">
        {Header}
        {TaskTitle}
        <div style={{
          padding: '16px 0', textAlign: 'center',
          fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
          fontSize: 24, color: theme.fg, letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}>{errorMsg || 'Small enough to just start.'}</div>
        {task && onStartTask ? (
          <button onClick={() => onStartTask(task)} style={{
            width: '100%', height: 52, borderRadius: 999, marginTop: 8,
            background: theme.fg, color: theme.bg, border: 'none',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 600, fontSize: 16, cursor: 'pointer',
          }}>Start focus now</button>
        ) : (
          <button onClick={onClose} style={{
            width: '100%', height: 52, borderRadius: 999, marginTop: 8,
            background: theme.fg, color: theme.bg, border: 'none',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 600, fontSize: 16, cursor: 'pointer',
          }}>Got it</button>
        )}
        <button onClick={() => setPhase('input')} style={{
          width: '100%', padding: '12px 0', marginTop: 8,
          background: 'transparent', border: 'none',
          color: theme.fg2, cursor: 'pointer',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 13.5, fontWeight: 500,
        }}>Add more context anyway</button>
      </Sheet>
    );
  }

  // ─── Review subtasks ───────────────────────────────────────
  const includedCount = Object.values(included).filter(Boolean).length;
  return (
    <Sheet theme={theme} open={open} onClose={onClose} height="86%">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {Header}
        {TaskTitle}
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 12.5, color: theme.fg2, marginBottom: 6,
          letterSpacing: '0.04em',
        }}>Here's a way in. Tap any to skip it.</div>

        <div style={{ flex: 1, overflow: 'auto', marginTop: 8 }}>
          {subtasks.map((t) => {
            const on = !!included[t.id];
            const color = theme.wheel[t.colorIdx % theme.wheel.length];
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <button onClick={() => setIncluded(s => ({ ...s, [t.id]: !s[t.id] }))} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 4px',
                  borderBottom: `1px solid ${theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left', opacity: on ? 1 : 0.4,
                  transition: 'opacity 0.15s',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 9,
                    background: on ? color : 'transparent',
                    border: on ? 'none' : `1.5px dashed ${theme.fg3}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: theme.onSlice,
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontWeight: 700, fontSize: 11,
                  }}>{on ? t.initial : ''}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                      fontSize: 14.5, color: theme.fg, fontWeight: 500,
                      textDecoration: on ? 'none' : 'line-through',
                      textDecorationColor: theme.fg3,
                    }}>{t.name}</div>
                  </div>
                  <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 12.5, color: theme.fg2, fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{t.minutes}m</div>
                </button>
              </div>
            );
          })}
        </div>

        <div style={{
          display: 'flex', gap: 8, marginTop: 12,
        }}>
          <button
            onClick={() => setPhase('input')}
            style={{
              flex: 1, height: 48, borderRadius: 999,
              background: 'transparent',
              border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'}`,
              color: theme.fg, cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 600, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <Glyph name="sparkle" size={13} color={theme.fg} stroke={1.8} />
            More context
          </button>
          <button
            disabled={includedCount === 0}
            onClick={() => {
              const toAdd = subtasks.filter(t => included[t.id]);
              if (sourceMode === 'list' && onReplace && task) {
                onReplace(task, toAdd);
              } else {
                onAdd(toAdd);
              }
            }}
            style={{
              flex: 2, height: 48, borderRadius: 999,
              background: includedCount ? theme.fg : (theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'),
              color: includedCount ? theme.bg : theme.fg3, border: 'none',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 600, fontSize: 14,
              cursor: includedCount ? 'pointer' : 'default',
            }}>
            {sourceMode === 'list' ? `Replace with ${includedCount}` : `Add ${includedCount} to wheel`}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// VoiceInputSheet — voice→tasks flow.
// Phases: listening → parsing → review.
// ─────────────────────────────────────────────────────────────
function VoiceInputSheet({ theme, open, onClose, onAdd }) {
  const [phase, setPhase] = React.useState('listening');
  const [transcript, setTranscript] = React.useState('');
  const [parsedTasks, setParsedTasks] = React.useState([]);
  const [included, setIncluded] = React.useState({});

  React.useEffect(() => {
    if (!open) return;
    setPhase('listening');
    setTranscript('');
    setParsedTasks([]);
    setIncluded({});

    const text = "Ship the proposal. Hit the gym. Eat real food. Read for half an hour before bed.";
    const startT = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        i += 2;
        setTranscript(text.slice(0, Math.min(i, text.length)));
        if (i >= text.length) {
          clearInterval(iv);
          setTimeout(() => setPhase('parsing'), 350);
          setTimeout(() => {
            const tasks = [
              { id: 'v1', name: 'Ship the proposal', initial: 'S', minutes: 45, colorIdx: 1 },
              { id: 'v2', name: 'Workout',           initial: 'W', minutes: 30, colorIdx: 2 },
              { id: 'v3', name: 'Real food',         initial: 'R', minutes: 25, colorIdx: 3 },
              { id: 'v4', name: 'Read · novel',      initial: 'R', minutes: 30, colorIdx: 4 },
            ];
            setParsedTasks(tasks);
            setIncluded(Object.fromEntries(tasks.map(t => [t.id, true])));
            setPhase('review');
          }, 1500);
        }
      }, 32);
      return () => clearInterval(iv);
    }, 900);
    return () => clearTimeout(startT);
  }, [open]);

  if (!open) return null;

  // ─── Voice flow ──────────────────────────────────────────────
  return (
    <Sheet theme={theme} open={open} onClose={onClose} height={phase === 'review' ? '78%' : 'auto'}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 11, color: theme.fg2, fontWeight: 600,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>{phase === 'listening' ? 'Listening' : phase === 'parsing' ? 'Sorting it out' : 'Your day'}</div>

        {/* Mic visual */}
        {phase !== 'review' && (
          <div style={{ position: 'relative', width: 110, height: 110, marginTop: 4 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: theme.accent, opacity: 0.18,
              animation: phase === 'listening' ? 'wtPulse 1.6s ease-out infinite' : 'none',
            }} />
            <div style={{
              position: 'absolute', inset: 10, borderRadius: '50%',
              background: theme.accent, opacity: 0.28,
              animation: phase === 'listening' ? 'wtPulse 1.6s ease-out infinite 0.3s' : 'none',
            }} />
            <div style={{
              position: 'absolute', inset: 22, borderRadius: '50%',
              background: theme.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: theme.onSlice,
            }}>
              <Glyph name="mic" size={30} color={theme.onSlice} stroke={2} />
            </div>
          </div>
        )}

        {/* Transcript */}
        {(phase === 'listening' || phase === 'parsing') && (
          <div style={{
            fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
            fontSize: 22, color: theme.fg, letterSpacing: '-0.01em',
            textAlign: 'center', lineHeight: 1.35, padding: '0 12px',
            minHeight: 60, maxWidth: 320,
          }}>
            {transcript || <span style={{ color: theme.fg3 }}>tell me about your day…</span>}
            {phase === 'listening' && transcript && (
              <span style={{
                display: 'inline-block', width: 2, height: 18,
                background: theme.fg, verticalAlign: 'middle', marginLeft: 2,
                animation: 'wtBlink 0.9s steps(2) infinite',
              }} />
            )}
          </div>
        )}

        {phase === 'parsing' && (
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 12.5, color: theme.fg2, marginTop: -4,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Glyph name="sparkle" size={14} color={theme.accent} stroke={1.8} />
            Pulling out tasks…
          </div>
        )}

        {/* Review parsed tasks */}
        {phase === 'review' && (
          <div style={{ width: '100%' }}>
            <div style={{
              fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
              fontSize: 28, color: theme.fg, letterSpacing: '-0.02em',
              textAlign: 'center', marginBottom: 4,
            }}>4 tasks, ready to spin.</div>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 12.5, color: theme.fg2, textAlign: 'center', marginBottom: 14,
            }}>Tap any to exclude. Edit later from the list.</div>

            {parsedTasks.map(t => {
              const on = !!included[t.id];
              const color = theme.wheel[t.colorIdx % theme.wheel.length];
              return (
                <button key={t.id} onClick={() => setIncluded(s => ({ ...s, [t.id]: !s[t.id] }))} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 4px',
                  borderBottom: `1px solid ${theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left', opacity: on ? 1 : 0.4,
                  transition: 'opacity 0.15s',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 9,
                    background: on ? color : 'transparent',
                    border: on ? 'none' : `1.5px dashed ${theme.fg3}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: theme.onSlice,
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontWeight: 700, fontSize: 11,
                  }}>{on ? t.initial : ''}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                      fontSize: 14.5, color: theme.fg, fontWeight: 500,
                      textDecoration: on ? 'none' : 'line-through',
                      textDecorationColor: theme.fg3,
                    }}>{t.name}</div>
                  </div>
                  <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 12.5, color: theme.fg2, fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{t.minutes}m</div>
                </button>
              );
            })}

            <button onClick={() => {
              const toAdd = parsedTasks.filter(t => included[t.id]);
              onAdd(toAdd);
            }} style={{
              width: '100%', marginTop: 22, height: 52, borderRadius: 999,
              background: theme.fg, color: theme.bg, border: 'none',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 600, fontSize: 16, cursor: 'pointer',
            }}>Add {Object.values(included).filter(Boolean).length} to wheel</button>
          </div>
        )}

        {phase !== 'review' && (
          <button onClick={onClose} style={{
            marginTop: 8, padding: '10px 18px',
            background: 'transparent', border: 'none',
            color: theme.fg2, cursor: 'pointer',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 14, fontWeight: 500,
          }}>Cancel</button>
        )}
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// UndoToast — surfaces after a delete, auto-dismisses, drives a thin
// progress bar so users see time running out before commitment is final.
// ─────────────────────────────────────────────────────────────
function UndoToast({ theme, pending, onUndo, platform = 'ios', duration = 4500 }) {
  if (!pending) return null;
  const bottomOffset = platform === 'ios' ? 92 : 80;
  const dark = theme.dark;
  return (
    <div
      key={pending.token}
      style={{
        position: 'absolute', left: 16, right: 16, bottom: bottomOffset, zIndex: 65,
        background: dark ? '#36304C' : '#2A2520',
        color: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 12px 28px rgba(0,0,0,0.22)',
        animation: 'wtUndoIn 0.26s cubic-bezier(0.2,0.8,0.2,1)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px 12px 16px',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.85)' }}>
          <Glyph name="trash" size={16} color="rgba(255,255,255,0.85)" stroke={2} />
        </div>
        <div style={{
          flex: 1,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 13.5, fontWeight: 500,
          letterSpacing: '-0.005em',
        }}>
          Deleted <span style={{ fontStyle: 'italic', fontFamily: '"Instrument Serif", serif', fontSize: 16 }}>{pending.task.name}</span>
        </div>
        <button onClick={onUndo} style={{
          background: 'transparent', border: 'none', padding: '6px 8px',
          color: theme.accent,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 12, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}>Undo</button>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.14)' }}>
        <div style={{
          height: '100%', background: theme.accent,
          animation: `wtUndoBar ${duration}ms linear forwards`,
          transformOrigin: 'left',
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────
function WheelTodoApp({ themeName = 'warm-start', platform = 'ios', deviceWidth = 390, tweaks = {}, flowStep = null }) {
  const theme = WT_THEMES[themeName];
  const [localTheme, setLocalTheme] = React.useState(themeName);
  React.useEffect(() => { setLocalTheme(themeName); }, [themeName]);
  const activeTheme = WT_THEMES[localTheme] || theme;

  const threeTabPref = (tweaks.tabCount ?? 2) === 3;
  const [tab, setTab] = React.useState(threeTabPref ? 'wheel' : 'wheel');
  React.useEffect(() => {
    // If the tab no longer exists in current IA, fall back to wheel
    const validTabs = threeTabPref
      ? ['wheel', ...(habitsEnabled ? ['habits'] : []), 'you']
      : ['wheel', 'tasks'];
    if (!validTabs.includes(tab)) setTab('wheel');
  }, [threeTabPref, habitsEnabled, tab]);
  const [mode, setMode] = React.useState('work');
  const [rotation, setRotation] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [pickedTask, setPickedTask] = React.useState(() => {
    if (flowStep === 'result') {
      const t = SEED_TASKS[0];
      return { ...t, color: WT_THEMES[themeName].wheel[0] };
    }
    return null;
  });
  const [pickedOpen, setPickedOpen] = React.useState(flowStep === 'result');
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [focusTask, setFocusTask] = React.useState(() => {
    if (flowStep === 'focus') {
      const t = SEED_TASKS[0];
      return { ...t, color: WT_THEMES[themeName].wheel[0] };
    }
    return null;
  });
  const [secondsLeft, setSecondsLeft] = React.useState(() => flowStep === 'focus' ? 21 * 60 + 43 : 0);
  const [totalSecs, setTotalSecs] = React.useState(() => flowStep === 'focus' ? 25 * 60 : 0);
  const [paused, setPaused] = React.useState(false);

  // Storyboard initial state ─ flowStep snapshots a moment in the
  // empty→add→spin→focus→done arc.
  const seedForFlow = (step) => {
    if (step === 'empty') return [];
    if (step === 'add')   return SEED_TASKS.slice(0, 2);
    if (step === 'done')  return SEED_TASKS.slice(1);
    return SEED_TASKS;
  };
  const [tasks, setTasks] = React.useState(() => seedForFlow(flowStep));
  const restTasks = SEED_REST;
  const [habits, setHabits] = React.useState(SEED_HABITS);
  const [habitsEnabled, setHabitsEnabled] = React.useState(tweaks.habitsEnabled !== false);
  React.useEffect(() => { setHabitsEnabled(tweaks.habitsEnabled !== false); }, [tweaks.habitsEnabled]);
  const isPremium = true; // (paid-app pivot — keep flag for clarity)
  const [voiceOpen, setVoiceOpen] = React.useState(false);
  const [aiBreakdown, setAiBreakdown] = React.useState(null); // { task?, taskName?, sourceMode: 'add' | 'list' }
  const [restDay, setRestDay] = React.useState(!!tweaks.restDay);
  React.useEffect(() => { if (tweaks.restDay !== undefined) setRestDay(!!tweaks.restDay); }, [tweaks.restDay]);
  const [restPledgeOpen, setRestPledgeOpen] = React.useState(false);
  const [gcalConnected, setGcalConnected] = React.useState(tweaks.gcalConnected !== false);
  React.useEffect(() => { if (tweaks.gcalConnected !== undefined) setGcalConnected(!!tweaks.gcalConnected); }, [tweaks.gcalConnected]);
  const [watering, setWatering] = React.useState(null); // { task, kind } or null
  const wateringTimerRef = React.useRef(null);
  const streak = (flowStep === 'empty' || flowStep === 'add') ? 4 : 5;
  const dailyDoneFlow = flowStep === 'done' ? 1 : (flowStep ? 0 : 2);
  const dailyGoalFlow = flowStep ? 5 : 4;

  // Storyboard-specific overlays
  const [addOpen, setAddOpen] = React.useState(flowStep === 'add');
  const [editingTask, setEditingTask] = React.useState(null);
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const undoTimerRef = React.useRef(null);
  const [lastCompleted, setLastCompleted] = React.useState(null);
  const doneToastTimerRef = React.useRef(null);
  const [showDoneToast, setShowDoneToast] = React.useState(flowStep === 'done');
  React.useEffect(() => {
    if (flowStep === 'done') {
      const t = setTimeout(() => setShowDoneToast(false), 4200);
      return () => clearTimeout(t);
    }
  }, [flowStep]);
  const dailyDone = tasks.filter(t => t.done).length || dailyDoneFlow;
  const dailyGoal = dailyGoalFlow;

  // Focus countdown
  React.useEffect(() => {
    if (!focusTask || paused) return;
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { return 0; }
        return s - 1;
      });
    }, (tweaks.fastTimer ? 100 : 1000));
    return () => clearInterval(id);
  }, [focusTask, paused, tweaks.fastTimer]);

  // Spin animation via rAF
  const spinRef = React.useRef({ start: 0, from: 0, to: 0, dur: 0, going: false });
  const animate = () => {
    const { start, from, to, dur, going } = spinRef.current;
    if (!going) return;
    const t = Math.min(1, (performance.now() - start) / dur);
    const ease = 1 - Math.pow(1 - t, 3); // ease-out-cubic
    setRotation(from + (to - from) * ease);
    if (t < 1) requestAnimationFrame(animate);
    else {
      spinRef.current.going = false;
      setSpinning(false);
      // Determine slice at top: rotation modulo 360
      const list = mode === 'work' ? tasks : restTasks;
      const n = list.length;
      const sd = 360 / n;
      const norm = ((to % 360) + 360) % 360;
      const atTop = ((360 - norm) + 360) % 360;
      const idx = Math.floor(atTop / sd) % n;
      const t2 = { ...list[idx], color: activeTheme.wheel[idx % activeTheme.wheel.length] };
      setPickedTask(t2);
      setPickedOpen(true);
    }
  };

  const dispatch = (action) => {
    switch (action.type) {
      case 'set-mode': setMode(action.mode); break;
      case 'spin': {
        if (spinning) return;
        const list = (mode === 'work' ? tasks : restTasks).filter(t => !t.done);
        const n = list.length;
        if (n === 0) return;
        const sd = 360 / n;
        const target = Math.floor(Math.random() * n);
        const targetNorm = target * sd + sd / 2;
        const wantMod = (360 - targetNorm + 360) % 360;
        const currentMod = ((rotation % 360) + 360) % 360;
        let delta = wantMod - currentMod;
        if (delta < 0) delta += 360;
        const toVal = rotation + 5 * 360 + delta;
        const dur = (tweaks.spinDuration ?? 3.2) * 1000;
        spinRef.current = { start: performance.now(), from: rotation, to: toVal, dur, going: true };
        setSpinning(true);
        requestAnimationFrame(animate);
        break;
      }
      case 'pick-slice': {
        if (spinning) return;
        const list = (mode === 'work' ? tasks : restTasks).filter(t => !t.done);
        const idx = list.findIndex(x => x.id === action.task.id);
        const t2 = { ...action.task, color: activeTheme.wheel[idx % activeTheme.wheel.length] };
        // Tapping a row in the list → open the AI breakdown sheet (planning mode)
        setAiBreakdown({ task: t2, sourceMode: 'list' });
        break;
      }
      case 'start-focus': {
        const tk = action.task;
        const idx = (mode === 'work' ? tasks : restTasks).findIndex(x => x.id === tk.id);
        const colored = { ...tk, color: activeTheme.wheel[idx % activeTheme.wheel.length] };
        const total = (tk.minutes ?? 25) * 60;
        setFocusTask(colored);
        setTotalSecs(total);
        setSecondsLeft(total);
        setPaused(false);
        setPickedOpen(false);
        break;
      }
      case 'open-history': setHistoryOpen(true); break;
      case 'open-profile': setProfileOpen(true); break;
      case 'open-add': setAddOpen(true); break;
      case 'open-voice': setVoiceOpen(true); break;
      case 'open-rest-pledge': setRestPledgeOpen(true); break;
      case 'accept-rest': setRestDay(true); setRestPledgeOpen(false); break;
      case 'cancel-rest': setRestDay(false); break;
      case 'edit-task': setEditingTask(action.task); break;
      case 'update-task': {
        setTasks(ts => ts.map(x => x.id === action.task.id ? { ...x, ...action.task } : x));
        setEditingTask(null);
        break;
      }
      case 'delete-task': {
        setTasks(ts => {
          const idx = ts.findIndex(x => x.id === action.id);
          if (idx < 0) return ts;
          const task = ts[idx];
          clearTimeout(undoTimerRef.current);
          setPendingDelete({ task, index: idx, token: Date.now() });
          undoTimerRef.current = setTimeout(() => setPendingDelete(null), 4500);
          return ts.filter(x => x.id !== action.id);
        });
        setEditingTask(null);
        setAddOpen(false);
        break;
      }
      case 'undo-delete': {
        setPendingDelete(p => {
          if (!p) return null;
          setTasks(ts => {
            const copy = [...ts];
            copy.splice(Math.min(p.index, copy.length), 0, p.task);
            return copy;
          });
          clearTimeout(undoTimerRef.current);
          return null;
        });
        break;
      }
      case 'reorder-task': {
        setTasks(ts => {
          const { from, to } = action;
          if (from === to || from < 0 || to < 0 || from >= ts.length || to >= ts.length) return ts;
          const copy = [...ts];
          const [moved] = copy.splice(from, 1);
          copy.splice(to, 0, moved);
          return copy;
        });
        break;
      }
      case 'complete-task': {
        const tk = action.task;
        if (tk) setLastCompleted(tk);
        setTasks(ts => ts.map(t => t.id === action.id ? { ...t, done: true, completedAt: Date.now() } : t));
        clearTimeout(doneToastTimerRef.current);
        setShowDoneToast(true);
        doneToastTimerRef.current = setTimeout(() => setShowDoneToast(false), 4200);
        setFocusTask(null);
        setSecondsLeft(0);
        // Water the plant
        clearTimeout(wateringTimerRef.current);
        setWatering({ task: tk, kind: 'task' });
        wateringTimerRef.current = setTimeout(() => setWatering(null), 2400);
        break;
      }
      case 'toggle-habit': {
        let habit = null;
        setHabits(hs => hs.map(h => {
          if (h.id !== action.id) return h;
          const newDone = !h.doneToday;
          habit = { ...h, doneToday: newDone };
          return { ...h, doneToday: newDone, streak: h.doneToday ? h.streak : h.streak + 1 };
        }));
        // Only water on transitioning OFF → ON
        if (habit && habit.doneToday) {
          clearTimeout(wateringTimerRef.current);
          setWatering({ task: habit, kind: 'habit' });
          wateringTimerRef.current = setTimeout(() => setWatering(null), 2400);
        }
        break;
      }
      case 'add-task': /* noop demo */ break;
      case 'add-habit': /* noop demo */ break;
      default: break;
    }
  };

  const state = { mode, tasks, restTasks, habits, rotation, spinning, streak, dailyDone, dailyGoal };

  // When focus screen done
  const finishFocus = () => { setFocusTask(null); setSecondsLeft(0); };

  const threeTab = threeTabPref;

  // Determine avatar fg based on accent contrast
  const avatarFg = activeTheme.onSlice;

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: activeTheme.bg, color: activeTheme.fg,
      overflow: 'hidden',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    }}>
      <style>{`
        @keyframes wtFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes wtSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes wtToast { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes wtUndoIn { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes wtUndoBar { from { transform: scaleX(1) } to { transform: scaleX(0) } }
        @keyframes wtPlantPop { 0% { opacity: 0; transform: scale(0.85) } 60% { opacity: 1; transform: scale(1.04) } 100% { opacity: 1; transform: scale(1) } }
        @keyframes wtPlantBounce { 0% { transform: scale(1) } 25% { transform: scale(1.08) translateY(-2px) } 50% { transform: scale(0.98) } 75% { transform: scale(1.02) } 100% { transform: scale(1) } }
        @keyframes wtDroplet { 0% { opacity: 0; transform: translateY(0) } 30% { opacity: 1 } 100% { opacity: 0; transform: translateY(58px) } }
        @keyframes wtPulse { 0% { transform: scale(1); opacity: 0.5 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes wtBlink { 50% { opacity: 0 } }
      `}</style>

      {!threeTab && (
        <TopBar
          theme={activeTheme}
          streak={streak}
          avatarFg={avatarFg}
          onAvatar={() => setProfileOpen(true)}
          onStreak={() => setHistoryOpen(true)}
          onAdd={() => setAddOpen(true)}
          onMic={() => setVoiceOpen(true)}
        />
      )}
      {threeTab && (
        <TopBar
          theme={activeTheme}
          streak={streak}
          avatarFg={avatarFg}
          showAvatar={false}
          onStreak={() => setHistoryOpen(true)}
          onAdd={() => setAddOpen(true)}
          onMic={() => setVoiceOpen(true)}
        />
      )}

      <div style={{ position: 'absolute', inset: 0, paddingTop: 46, paddingBottom: 70, overflow: 'hidden' }}>
        <div style={{ height: '100%', overflow: 'auto' }}>
          {restDay && tab === 'wheel' ? (
            <RestDayView theme={activeTheme} streak={streak} onCancel={() => dispatch({ type: 'cancel-rest' })} />
          ) : (
            <>
              {tab === 'wheel' && <WheelScreen theme={activeTheme} state={state} dispatch={dispatch} deviceWidth={deviceWidth} threeTab={threeTab} />}
              {tab === 'tasks' && <TasksScreen theme={activeTheme} state={state} dispatch={dispatch} threeTab={threeTab} />}
              {tab === 'habits' && <HabitsScreen theme={activeTheme} state={state} dispatch={dispatch} />}
              {tab === 'you' && <YouScreen theme={activeTheme} state={state} themeName={localTheme} onThemeChange={(k) => setLocalTheme(k)} habitsEnabled={habitsEnabled} onToggleHabits={setHabitsEnabled} onOpenRestPledge={() => dispatch({ type: 'open-rest-pledge' })} restDay={restDay} onCancelRest={() => dispatch({ type: 'cancel-rest' })} />}
            </>
          )}
        </div>
      </div>

      <TabBar
        theme={activeTheme}
        current={tab}
        onChange={(id) => { if (id === 'history') setHistoryOpen(true); else setTab(id); }}
        platform={platform}
        tabCount={threeTab ? (habitsEnabled ? 3 : 2) : 2}
        threeTabNoHabits={threeTab && !habitsEnabled}
      />

      <HistorySheet
        theme={activeTheme}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        state={state}
      />
      <PickedSheet
        theme={activeTheme}
        open={pickedOpen}
        onClose={() => setPickedOpen(false)}
        task={pickedTask}
        mode={mode}
        onStart={(t) => dispatch({ type: 'start-focus', task: t })}
      />
      <AddTaskSheet
        theme={activeTheme}
        open={addOpen || !!editingTask}
        editingTask={editingTask}
        onClose={() => { setAddOpen(false); setEditingTask(null); }}
        prefillName={flowStep === 'add' ? 'Ship the proposal' : ''}
        prefillMinutes={25}
        prefillColorIdx={tasks.length}
        onAdd={(t) => {
          setTasks(ts => [...ts, t]);
          setAddOpen(false);
        }}
        onSave={(t) => dispatch({ type: 'update-task', task: t })}
        onDelete={(t) => dispatch({ type: 'delete-task', id: t.id })}
        onBreakDown={(name) => setAiBreakdown({ taskName: name, sourceMode: 'add' })}
      />
      <AITaskBreakdownSheet
        theme={activeTheme}
        open={!!aiBreakdown}
        task={aiBreakdown?.task}
        taskName={aiBreakdown?.taskName || aiBreakdown?.task?.name}
        sourceMode={aiBreakdown?.sourceMode || 'add'}
        onClose={() => setAiBreakdown(null)}
        onStartTask={(t) => {
          setAiBreakdown(null);
          dispatch({ type: 'start-focus', task: t });
        }}
        onReplace={(originalTask, subtasks) => {
          // Remove original, splice in subtasks at original index
          setTasks(ts => {
            const idx = ts.findIndex(x => x.id === originalTask.id);
            const copy = [...ts];
            if (idx >= 0) copy.splice(idx, 1, ...subtasks);
            else copy.push(...subtasks);
            return copy;
          });
          setAiBreakdown(null);
        }}
        onAdd={(subtasks) => {
          setTasks(ts => [...ts, ...subtasks]);
          setAiBreakdown(null);
          setAddOpen(false);
        }}
      />
      <DoneToast theme={activeTheme} task={lastCompleted || pickedTask || (flowStep === 'done' ? { name: 'Deep work', minutes: 25 } : null)} visible={showDoneToast} />
      <UndoToast
        theme={activeTheme}
        pending={pendingDelete}
        platform={platform}
        onUndo={() => dispatch({ type: 'undo-delete' })}
      />
      <WateringMoment
        theme={activeTheme}
        visible={!!watering}
        task={watering?.task}
        kind={watering?.kind}
        plantStage={Math.min(4, 1 + Math.floor((tasks.filter(t => t.done).length + habits.filter(h => h.doneToday).length) / 2))}
      />
      <VoiceInputSheet
        theme={activeTheme}
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onAdd={(tasksToAdd) => {
          setTasks(ts => [...ts, ...tasksToAdd]);
          setVoiceOpen(false);
        }}
      />
      <RestPledgeSheet
        theme={activeTheme}
        open={restPledgeOpen}
        onClose={() => setRestPledgeOpen(false)}
        onAccept={() => dispatch({ type: 'accept-rest' })}
      />
      <ProfileSheet
        theme={activeTheme}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        state={state}
        themeName={localTheme}
        onThemeChange={(k) => { setLocalTheme(k); }}
      />
      {focusTask && (
        <FocusScreen
          theme={activeTheme}
          task={focusTask}
          secondsLeft={secondsLeft}
          totalSecs={totalSecs}
          paused={paused}
          onPause={() => setPaused(p => !p)}
          onCancel={finishFocus}
          onDone={() => dispatch({ type: 'complete-task', id: focusTask.id, task: focusTask })}
        />
      )}
    </div>
  );
}

Object.assign(window, { WheelTodoApp, WT_THEMES });
