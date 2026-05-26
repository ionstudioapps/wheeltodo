"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HelpCircle, ChevronDown, ChevronUp,
  Flame, Target, Trophy, Clock, Zap, Moon, RotateCcw,
  // ── icons used on wheel slices ──
  BookOpen, Code, Palette, Users, Mail, PenLine,
  Coffee, Timer, Pencil, Star, Heart, Music, Camera,
  Laptop, Dumbbell, Brain, Leaf, Sun, Sparkles,
} from "lucide-react";
import { useApp, type Task } from "@/context/AppContext";
import { ACHIEVEMENT_DEFS, getNextAchievement } from "@/utils/achievements";

// ─── Icon map for wheel slices ────────────────────────────────────────────────

type IconComp = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const ICON_MAP: Record<string, IconComp> = {
  BookOpen, Code, Palette, Users, Mail, PenLine,
  Coffee, Timer, Pencil, Star, Heart, Music, Camera,
  Laptop, Dumbbell, Brain, Leaf, Sun, Sparkles,
  Flame, Target, Trophy, Clock, Zap, Moon, RotateCcw,
};

const ACHIEVEMENT_ICONS: Record<string, IconComp> = {
  Flame, Trophy, Clock, Zap, Moon, RotateCcw,
};

// Wheel colours use CSS variables so they respond to theme changes
const WHEEL_COLORS = [
  "var(--wheel-2)", "var(--wheel-1)", "var(--wheel-3)",
  "var(--wheel-4)", "var(--wheel-5)", "var(--wheel-6)",
  "var(--wheel-7)", "var(--wheel-8)",
];

// ─── FAQ Accordion ────────────────────────────────────────────────────────────

function SpinFaqAccordion() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left"
      >
        <HelpCircle size={15} strokeWidth={2} className="shrink-0" style={{ color: 'var(--accent)' }} />
        <span className="flex-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>How do I use the wheel?</span>
        {open
          ? <ChevronUp size={15} strokeWidth={2} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          : <ChevronDown size={15} strokeWidth={2} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Click a slice to pick a task, or hit <strong style={{ color: 'var(--text-primary)' }}>Spin</strong> to get a random one. Then start a focus session to track your time.
        </div>
      )}
    </div>
  );
}

// ─── SVG Wheel ────────────────────────────────────────────────────────────────

interface WheelProps {
  tasks: Task[];
  rotation: number;
  spinning: boolean;
  onSliceClick: (task: Task) => void;
}

function SpinWheel({ tasks, rotation, spinning, onSliceClick }: WheelProps) {
  const SIZE = 320;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = CX - 10;
  const ICON_R = R * 0.62;

  if (tasks.length === 0) {
    return (
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="block">
        <circle cx={CX} cy={CY} r={R} style={{ fill: 'var(--bg-track)' }} />
        <circle cx={CX} cy={CY} r={R * 0.15} style={{ fill: 'var(--bg-card)' }} />
      </svg>
    );
  }

  const n = tasks.length;
  const sliceAngle = (2 * Math.PI) / n;

  const slices = tasks.map((task, i) => {
    const startAngle = i * sliceAngle - Math.PI / 2;
    const endAngle = startAngle + sliceAngle;

    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const pathD = `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const midAngle = startAngle + sliceAngle / 2;
    const iconX = CX + ICON_R * Math.cos(midAngle);
    const iconY = CY + ICON_R * Math.sin(midAngle);

    const maxChars = n > 6 ? 12 : 16;
    const labelText = task.name.length > maxChars ? task.name.slice(0, maxChars - 1) + "…" : task.name;

    const IconComp = ICON_MAP[task.icon];
    const color = WHEEL_COLORS[i % WHEEL_COLORS.length];

    return { task, pathD, iconX, iconY, midAngle, labelText, color, IconComp };
  });

  const iconSize = n > 6 ? 14 : 18;

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="block"
      style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "none" : undefined }}
    >
      {slices.map(({ task, pathD, iconX, iconY, midAngle, labelText, color, IconComp }) => (
        <g key={task.id}>
          <path
            d={pathD}
            style={{ fill: color }}
            stroke="white"
            strokeWidth={1.5}
            className={!spinning ? "cursor-pointer" : ""}
            onClick={() => { if (!spinning) onSliceClick(task); }}
          />
          {IconComp ? (
            <foreignObject
              x={iconX - iconSize}
              y={iconY - iconSize}
              width={iconSize * 2}
              height={iconSize * 2}
              className="pointer-events-none overflow-visible"
            >
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <div style={{ width: iconSize * 2, height: iconSize * 2, display: "flex", alignItems: "center", justifyContent: "center" } as any}>
                <IconComp size={iconSize} color="rgba(255,255,255,0.95)" strokeWidth={1.8} />
              </div>
            </foreignObject>
          ) : (
            <text
              x={iconX}
              y={iconY}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${(midAngle * 180) / Math.PI + 90}, ${iconX}, ${iconY})`}
              fontSize={n > 8 ? 10 : n > 5 ? 11 : 12}
              fontWeight="600"
              fontFamily="var(--font-dm-sans), system-ui, sans-serif"
              fill="rgba(255,255,255,0.95)"
              className="pointer-events-none select-none"
            >
              {labelText}
            </text>
          )}
        </g>
      ))}
      <circle cx={CX} cy={CY} r={R * 0.12} style={{ fill: 'var(--bg-card)' }} />
    </svg>
  );
}

// ─── Week activity bubbles ────────────────────────────────────────────────────

function WeekBubbles() {
  const { completedTasks, completedRestDays } = useApp();
  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysFromMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysFromMonday);

  const days = DAY_LABELS.map((label, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const active =
      completedTasks.some((t) => { const d = new Date(t.completedAt); return d >= day && d < next; }) ||
      completedRestDays.some((d) => d >= day && d < next);
    const isToday = day.getTime() === today.getTime();
    const isFuture = day > today;
    return { label, active, isToday, isFuture };
  });

  return (
    <div className="flex gap-1.5 mt-2">
      {days.map((day, i) => (
        <div
          key={i}
          className="flex-1 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-colors"
          style={{
            background: day.isToday
              ? 'var(--accent)'
              : day.active
              ? 'var(--text-primary)'
              : day.isFuture
              ? 'var(--bg-subtle)'
              : 'var(--bg-input)',
            color: day.isToday || day.active
              ? 'white'
              : day.isFuture
              ? 'var(--text-muted)'
              : 'var(--text-secondary)',
          }}
        >
          {day.label}
        </div>
      ))}
    </div>
  );
}

// ─── Result sheet ─────────────────────────────────────────────────────────────

interface ResultSheetProps {
  task: Task;
  onStartFocus: () => void;
  onDismiss: () => void;
}

function ResultSheet({ task, onStartFocus, onDismiss }: ResultSheetProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end md:items-center justify-center" onClick={onDismiss}>
      <div
        className="w-full max-w-sm rounded-t-3xl md:rounded-2xl p-7 shadow-2xl flex flex-col items-center gap-3"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mb-3 md:hidden" style={{ background: 'var(--border)' }} />
        <div className="w-10 h-10 rounded-full mb-1 flex items-center justify-center" style={{ backgroundColor: 'var(--wheel-2)' }}>
          {ICON_MAP[task.icon]
            ? (() => { const I = ICON_MAP[task.icon]; return <I size={18} color="white" strokeWidth={1.8} />; })()
            : null}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>You got</p>
        <p className="text-2xl font-bold text-center" style={{ color: 'var(--text-primary)' }}>{task.name}</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{task.minutes}-minute focus session</p>
        <button
          onClick={onStartFocus}
          className="w-full text-white font-semibold text-base rounded-full py-3.5 mt-2 active:scale-[0.98] transition"
          style={{ background: 'var(--text-primary)' }}
        >
          Start Focus
        </button>
        <button
          onClick={onDismiss}
          className="w-full font-medium text-base py-2 transition"
          style={{ color: 'var(--text-muted)' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Main SpinTab ─────────────────────────────────────────────────────────────

interface SpinTabProps {
  onNavigateToTasks: () => void;
}

export function SpinTab({ onNavigateToTasks }: SpinTabProps) {
  const { tasks, startPomodoro, streak, incrementSpinCount, dailyGoal, completedTasks, achievementValues } = useApp();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [picked, setPicked] = useState<Task | null>(null);
  const rotationRef = useRef(0);

  const todayDone = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return completedTasks.filter((t) => { const d = new Date(t.completedAt); d.setHours(0, 0, 0, 0); return d.getTime() === today.getTime(); }).length;
  })();

  const nextAch = getNextAchievement(achievementValues);

  function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
  }

  const spinWheel = useCallback(() => {
    if (tasks.length === 0 || spinning) return;
    setSpinning(true);
    const selectedIndex = Math.floor(Math.random() * tasks.length);
    const sliceAngle = 360 / tasks.length;
    const targetSliceCenter = -(selectedIndex + 0.5) * sliceAngle;
    const normalizedTarget = ((targetSliceCenter % 360) + 360) % 360;
    const currentNorm = ((rotationRef.current % 360) + 360) % 360;
    let delta = normalizedTarget - currentNorm;
    if (delta < 0) delta += 360;
    const extraSpins = (5 + Math.floor(Math.random() * 4)) * 360;
    const totalDelta = extraSpins + delta;
    const startRot = rotationRef.current;
    const targetRot = startRot + totalDelta;
    const duration = 3200 + Math.random() * 800;
    const startTime = performance.now();

    const frame = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = easeOutCubic(t);
      const current = startRot + totalDelta * eased;
      rotationRef.current = current;
      setRotation(current);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        rotationRef.current = targetRot;
        setRotation(targetRot);
        setSpinning(false);
        setPicked(tasks[selectedIndex]);
        incrementSpinCount();
      }
    };
    requestAnimationFrame(frame);
  }, [tasks, spinning, incrementSpinCount]);

  function handleSliceClick(task: Task) {
    if (!spinning) setPicked(task);
  }

  function handleStartFocus() {
    if (!picked) return;
    startPomodoro(picked);
    setPicked(null);
    onNavigateToTasks();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Not sure where to start?</h1>
        <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>Spin the wheel.</p>
      </div>

      {/* FAQ */}
      <SpinFaqAccordion />

      {/* Week bubbles + streak */}
      <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>This week</span>
          {streak > 0 && (
            <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              <Flame size={12} strokeWidth={2} />
              {streak}-day streak
            </div>
          )}
        </div>
        <WeekBubbles />
      </div>

      {/* Wheel + Spin button */}
      {tasks.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center py-12 px-6 gap-3 text-center" style={{ background: 'var(--bg-card)' }}>
          <span className="text-5xl" style={{ color: 'var(--text-muted)' }}>◎</span>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Your wheel is empty</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add tasks to start spinning.</p>
          <button
            onClick={onNavigateToTasks}
            className="mt-2 text-white font-semibold text-sm rounded-full px-6 py-2.5 transition"
            style={{ background: 'var(--text-primary)' }}
          >
            Add tasks
          </button>
        </div>
      ) : (
        <div className="rounded-2xl flex flex-col items-center py-6 px-6 gap-5" style={{ background: 'var(--bg-card)' }}>
          <div className="relative w-[320px] h-[320px]">
            {/* Pointer */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 w-0 h-0"
              style={{
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderTop: "22px solid var(--text-primary)",
              }}
            />
            <SpinWheel
              tasks={tasks}
              rotation={rotation}
              spinning={spinning}
              onSliceClick={handleSliceClick}
            />
          </div>
          {/* Daily goal */}
          <div className="flex items-center justify-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{todayDone}</span>
            <span>/</span>
            <span>{dailyGoal}</span>
            <span>tasks today</span>
          </div>
          <button
            onClick={spinWheel}
            disabled={spinning || tasks.length === 0}
            className="w-full max-w-xs text-white font-semibold text-base rounded-full py-3.5 active:scale-[0.98] transition disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            {spinning ? "Spinning…" : "Spin the wheel"}
          </button>
        </div>
      )}

      {/* Next milestone */}
      {(() => {
        if (!nextAch) {
          return (
            <div className="rounded-2xl flex items-center gap-3 px-4 py-4" style={{ background: 'var(--bg-card)' }}>
              <Target size={26} strokeWidth={1.8} className="shrink-0" style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>All achievements unlocked!</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>You're an absolute legend.</p>
              </div>
            </div>
          );
        }

        const { def, tier, current, pct } = nextAch;
        const AchIcon = ACHIEVEMENT_ICONS[def.iconName];
        const pctDisplay = Math.round(pct * 100);

        return (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide px-4 pt-4 pb-2" style={{ color: 'var(--text-muted)' }}>Next milestone</p>
            <div className="flex items-center gap-3 px-4 pb-4">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${def.color}22` }}
              >
                {AchIcon && <AchIcon size={20} color={def.color} strokeWidth={2} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{tier.badge}</p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{current} / {tier.target}</p>
                </div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{def.description(tier.target)}</p>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-track)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pctDisplay}%`, backgroundColor: def.color }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {picked && (
        <ResultSheet task={picked} onStartFocus={handleStartFocus} onDismiss={() => setPicked(null)} />
      )}
    </div>
  );
}
