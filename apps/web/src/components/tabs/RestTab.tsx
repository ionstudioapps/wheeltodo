"use client";

import { useEffect, useRef, useState } from "react";
import {
  Shield,
  Moon,
  ChevronDown,
  ChevronUp,
  Timer,
  X,
  Check,
  Plus,
  Activity,
  Brain,
  Coffee,
  MessageCircle,
  Pencil,
  Frown,
  Meh,
  Zap,
} from "lucide-react";
import { useApp, type RestTask, type DailyMood, type RestCategory } from "@/context/AppContext";
import { Confetti } from "@/components/Confetti";
import { GentlePush } from "@/components/GentlePush";

// ─── Category meta ────────────────────────────────────────────────────────────

const CATEGORY_META: Record<RestCategory, { Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; colorVar: string; bg: string }> = {
  Physical:    { Icon: Activity,       colorVar: "var(--wheel-1)", bg: "#FFF4EC" },
  Mental:      { Icon: Brain,          colorVar: "var(--wheel-5)", bg: "#F5F3FF" },
  Social:      { Icon: MessageCircle,  colorVar: "var(--wheel-3)", bg: "#EDFAFA" },
  Nourishment: { Icon: Coffee,         colorVar: "var(--wheel-4)", bg: "#FFFDE8" },
  "My Tasks":  { Icon: Pencil,         colorVar: "#93C5FD",        bg: "#EFF6FF" },
};

const MOOD_ORDER: Record<string, string[]> = {
  drained:  ["preset_6", "preset_4", "preset_1"],
  okay:     ["preset_3", "preset_9", "preset_7"],
  restless: ["preset_8", "preset_2", "preset_5"],
};

const CATEGORIES_ORDER: RestCategory[] = ["Physical", "Mental", "Social", "Nourishment", "My Tasks"];

// ─── Format seconds ───────────────────────────────────────────────────────────

function fmt(s: number) {
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

// ─── Rest FAQ Accordion ───────────────────────────────────────────────────────

function RestFaqAccordion() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left">
        <Shield size={15} strokeWidth={2} className="shrink-0" style={{ color: 'var(--accent)' }} />
        <span className="flex-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>How does Rest Mode protect my streak?</span>
        {open
          ? <ChevronUp size={15} strokeWidth={2} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          : <ChevronDown size={15} strokeWidth={2} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Complete your daily rest goal to protect your streak — even on off days. Rest days count towards consecutive days, so taking a break never breaks your momentum.
        </div>
      )}
    </div>
  );
}

// ─── Rest Meter ───────────────────────────────────────────────────────────────

function RestMeter({ minutesDone, goalMinutes }: { minutesDone: number; goalMinutes: number }) {
  const pct = goalMinutes > 0 ? Math.min(minutesDone / goalMinutes, 1) : 0;
  const goalMet = pct >= 1;

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Rest Meter</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
          {minutesDone} / {goalMinutes}m
        </span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-track)' }}>
        <div
          className="h-2.5 rounded-full transition-all"
          style={{ width: `${Math.round(pct * 100)}%`, background: goalMet ? 'var(--success)' : 'var(--wheel-3)' }}
        />
      </div>
      <p className="text-sm" style={{ color: goalMet ? 'var(--success)' : 'var(--text-muted)', fontWeight: goalMet ? 600 : 400 }}>
        {goalMet
          ? "Streak protected!"
          : `${goalMinutes - minutesDone}m more to protect your streak`}
      </p>
    </div>
  );
}

// ─── Energy check-in ──────────────────────────────────────────────────────────

function EnergyCheckIn({ onSelect }: { onSelect: (mood: DailyMood) => void }) {
  const moods: { key: DailyMood; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; colorVar: string }[] = [
    { key: "drained",  label: "Drained",  Icon: Frown, colorVar: "var(--wheel-5)" },
    { key: "okay",     label: "Okay",     Icon: Meh,   colorVar: "var(--wheel-3)" },
    { key: "restless", label: "Restless", Icon: Zap,   colorVar: "var(--wheel-1)" },
  ];

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)' }}>
      <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>How are you feeling?</p>
      <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>We'll suggest the best activities for you.</p>
      <div className="flex gap-2">
        {moods.map(({ key, label, Icon, colorVar }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="flex-1 flex flex-col items-center gap-2 py-3.5 rounded-xl transition-colors"
            style={{ background: 'var(--bg-input)' }}
          >
            <span style={{ color: colorVar }}><Icon size={22} strokeWidth={2} /></span>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Rest task row ────────────────────────────────────────────────────────────

interface RestTaskRowProps {
  task: RestTask;
  isTimerActive: boolean;
  timerRemaining: number;
  timerTotal: number;
  onToggle: () => void;
  onStart: () => void;
  onCancel: () => void;
  onRemove: () => void;
}

function RestTaskRow({ task, isTimerActive, timerRemaining, timerTotal, onToggle, onStart, onCancel, onRemove }: RestTaskRowProps) {
  const timerPct = timerTotal > 0 ? (timerTotal - timerRemaining) / timerTotal : 0;

  if (task.completedToday) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} className="shrink-0">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--success)' }}>
            <Check size={11} strokeWidth={3} className="text-white" />
          </div>
        </button>
        <span className="flex-1 text-sm line-through" style={{ color: 'var(--text-muted)' }}>{task.name}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.durationMinutes}m</span>
      </div>
    );
  }

  if (isTimerActive) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--bg-input)' }}>
            <Timer size={12} strokeWidth={2} style={{ color: 'var(--wheel-5)' }} />
          </div>
          <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{task.name}</span>
          <span className="text-base font-bold tabular-nums" style={{ color: 'var(--wheel-5)' }}>{fmt(timerRemaining)}</span>
          <button onClick={onCancel} className="shrink-0">
            <X size={13} strokeWidth={2.5} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
        <div className="h-1 rounded-full mt-2.5 overflow-hidden" style={{ background: 'var(--bg-track)' }}>
          <div
            className="h-1 rounded-full transition-all"
            style={{ width: `${Math.round(timerPct * 100)}%`, background: 'var(--wheel-5)' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button onClick={onToggle} className="shrink-0">
        <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />
      </button>
      <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{task.name}</span>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.durationMinutes}m</span>
      <button onClick={onStart} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0">
        <Timer size={16} strokeWidth={1.8} style={{ color: 'var(--text-primary)' }} />
      </button>
      {!task.isPreset && (
        <button onClick={onRemove} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors shrink-0">
          <X size={13} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
        </button>
      )}
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  tasks,
  isCollapsed,
  onToggle,
  activeRestTimer,
  onToggleTask,
  onStartTimer,
  onCancelTimer,
  onRemove,
}: {
  category: RestCategory;
  tasks: RestTask[];
  isCollapsed: boolean;
  onToggle: () => void;
  activeRestTimer: { taskId: string; totalSeconds: number; remainingSeconds: number; isRunning: boolean } | null;
  onToggleTask: (id: string) => void;
  onStartTimer: (id: string) => void;
  onCancelTimer: () => void;
  onRemove: (id: string) => void;
}) {
  const meta = CATEGORY_META[category];
  const CatIcon = meta.Icon;
  const doneCount = tasks.filter((t) => t.completedToday).length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg }}>
          <span style={{ color: meta.colorVar }}><CatIcon size={15} strokeWidth={2} /></span>
        </div>
        <span className="flex-1 text-sm font-bold" style={{ color: meta.colorVar }}>{category}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{doneCount}/{tasks.length}</span>
        {isCollapsed
          ? <ChevronDown size={15} strokeWidth={2} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          : <ChevronUp size={15} strokeWidth={2} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
        }
      </button>
      {!isCollapsed && (
        <div style={{ borderTop: '1px solid var(--bg-track)' }}>
          {tasks.map((task, i) => (
            <div key={task.id}>
              {i > 0 && <div className="h-px mx-4" style={{ background: 'var(--bg-track)' }} />}
              <RestTaskRow
                task={task}
                isTimerActive={activeRestTimer?.taskId === task.id}
                timerRemaining={activeRestTimer?.taskId === task.id ? activeRestTimer.remainingSeconds : 0}
                timerTotal={activeRestTimer?.taskId === task.id ? activeRestTimer.totalSeconds : 0}
                onToggle={() => onToggleTask(task.id)}
                onStart={() => onStartTimer(task.id)}
                onCancel={onCancelTimer}
                onRemove={() => onRemove(task.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main RestTab ─────────────────────────────────────────────────────────────

export function RestTab() {
  const {
    restTasks, toggleRestTask, addRestTask, removeRestTask,
    activeRestTimer, startRestTimer, cancelRestTimer, tickRestTimer,
    todayMood, setTodayMood,
    restMinutesToday, restGoalMinutes,
    streak, hasActivityToday, restStreak,
  } = useApp();

  const [inputText, setInputText] = useState("");
  const [collapsed, setCollapsed] = useState<Record<RestCategory, boolean>>({
    Physical: false, Mental: false, Social: false, Nourishment: false, "My Tasks": false,
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const prevGoalMet = useRef(false);

  useEffect(() => {
    if (!activeRestTimer?.isRunning) return;
    const id = setInterval(tickRestTimer, 1000);
    return () => clearInterval(id);
  }, [activeRestTimer?.isRunning, tickRestTimer]);

  const goalMet = restGoalMinutes > 0 && restMinutesToday >= restGoalMinutes;
  useEffect(() => {
    if (goalMet && !prevGoalMet.current) { setShowCelebration(true); setConfetti(true); }
    prevGoalMet.current = goalMet;
  }, [goalMet]);

  const atRisk = streak > 0 && !hasActivityToday;

  const getSortedTasks = (tasks: RestTask[]) => {
    if (!todayMood) return tasks;
    const suggested = MOOD_ORDER[todayMood] ?? [];
    return [...tasks].sort((a, b) => {
      const ai = suggested.indexOf(a.id);
      const bi = suggested.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  };

  const tasksByCategory = CATEGORIES_ORDER.reduce<Record<RestCategory, RestTask[]>>((acc, cat) => {
    const catTasks = getSortedTasks(restTasks.filter((t) => t.category === cat));
    if (catTasks.length > 0) acc[cat] = catTasks;
    return acc;
  }, {} as Record<RestCategory, RestTask[]>);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Need a day off?</h1>
        <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
          {atRisk ? "Streak at risk!" : "Take it easy today."}
        </p>
      </div>

      <RestFaqAccordion />
      <RestMeter minutesDone={restMinutesToday} goalMinutes={restGoalMinutes} />

      {restStreak > 0 && (
        <div className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ background: 'var(--bg-card)' }}>
          <Moon size={15} strokeWidth={2} style={{ color: 'var(--wheel-5)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{restStreak}-day rest streak</span>
        </div>
      )}

      {todayMood === null && <EnergyCheckIn onSelect={setTodayMood} />}

      {/* Gentle push */}
      <GentlePush mode="rest" />

      {CATEGORIES_ORDER.map((cat) => {
        const catTasks = tasksByCategory[cat];
        if (!catTasks || catTasks.length === 0) return null;
        return (
          <CategorySection
            key={cat}
            category={cat}
            tasks={catTasks}
            isCollapsed={collapsed[cat] ?? false}
            onToggle={() => setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))}
            activeRestTimer={activeRestTimer}
            onToggleTask={toggleRestTask}
            onStartTimer={startRestTimer}
            onCancelTimer={cancelRestTimer}
            onRemove={removeRestTask}
          />
        );
      })}

      {/* Add custom task */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>My Tasks</p>
        <div className="rounded-2xl flex items-center px-4 py-2 gap-3" style={{ background: 'var(--bg-card)' }}>
          <input
            type="text"
            placeholder="Add your own rest activity…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputText.trim()) {
                addRestTask(inputText.trim());
                setInputText("");
              }
            }}
            maxLength={60}
            className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            onClick={() => { if (inputText.trim()) { addRestTask(inputText.trim()); setInputText(""); } }}
            disabled={!inputText.trim()}
            className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity"
            style={{ background: 'var(--text-primary)' }}
          >
            <Plus size={16} strokeWidth={2.5} className="text-white" />
          </button>
        </div>
      </div>

      {/* Confetti */}
      <Confetti active={confetti} onDone={() => setConfetti(false)} />

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={() => setShowCelebration(false)}>
          <div
            className="rounded-2xl p-8 max-w-xs w-full flex flex-col items-center gap-4 text-center"
            style={{ background: 'var(--bg-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-5xl">🌿</span>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Rest complete!</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Streak protected. You've earned your rest.</p>
            <button
              onClick={() => setShowCelebration(false)}
              className="w-full text-white font-semibold text-base rounded-full py-3.5 transition"
              style={{ background: 'var(--text-primary)' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
