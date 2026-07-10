"use client";

import { useEffect, useRef, useState } from "react";
import { useApp, COLORS, FREE_LIMITS, type Task } from "@/context/AppContext";
import { useSubscription } from "@/hooks/useSubscription";
import { fnUrl, fnHeaders } from "@/lib/functions";
import { TUTORIAL_TASKS, isTutorialTask, tutorialStepFor } from "@/lib/tutorial";
import {
  WIcon, Headline, SpinPill, Sheet, SectionLabel, TaskWheel, WheelHub,
  ConfettiBurst, TASK_ICON_PATHS, TASK_CATEGORIES, formatMmSs,
} from "@/components/ui/kit";
import { FocusMode } from "@/components/FocusMode";
import { WeeklyRecap } from "@/components/WeeklyRecap";
import { BrainStarter } from "@/components/BrainStarter";
import { UpgradeScreen, BloomNudge } from "@/components/Upgrade";
import { Toast, useToast } from "@/components/ui/Toast";

/* ── Add / edit task sheet ───────────────────────────────────────────────── */

const DURATIONS = [
  { v: 15, l: "15m" },
  { v: 30, l: "30m" },
  { v: 45, l: "45m" },
  { v: 60, l: "1hr" },
];

function TaskSheet({ task, onAdd, onSave, onClose }: {
  task?: Task;
  onAdd: (name: string, mins: number, color: string, icon: string) => void;
  onSave: (id: string, name: string, mins: number, color: string, icon: string) => void;
  onClose: () => void;
}) {
  const { defaultTimerMinutes, tasks: allTasks } = useApp();
  const isEdit = !!task;
  const [name, setName] = useState(task?.name ?? "");
  const [mins, setMins] = useState(task?.minutes ?? defaultTimerMinutes);
  const [color, setColor] = useState(task?.color ?? COLORS[allTasks.length % COLORS.length]);
  const [icon, setIcon] = useState(task?.icon && TASK_ICON_PATHS[task.icon] ? task.icon : "work");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = name.trim();
    if (!v) return;
    if (isEdit && task) onSave(task.id, v, mins, color, icon);
    else onAdd(v, mins, color, icon);
    onClose();
  }

  const avatarLetter = name.trim()[0]?.toUpperCase() ?? "?";

  return (
    <Sheet onClose={onClose}>
      <h2 style={{ margin: "0 0 3px", fontSize: 22, fontWeight: 600, color: "var(--text-primary)" }}>
        {isEdit ? "Edit task" : "New task"}
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 300, color: "var(--text-secondary)" }}>
        {isEdit ? "Update the details below." : "It'll join the wheel for today."}
      </p>

      <form onSubmit={submit}>
        {/* Name input — avatar reflects selected colour */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--bg-input)", borderRadius: "var(--r-row)", padding: "0 16px", height: 54, boxShadow: "inset 0 0 0 2px var(--accent)" }}>
          <span style={{ width: 28, height: 28, borderRadius: 999, background: color, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--bg-card)", fontSize: 12, fontWeight: 700 }}>
            {avatarLetter}
          </span>
          <input
            autoFocus
            type="text"
            placeholder="What needs doing?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1, minWidth: 0, fontSize: 16, color: "var(--text-primary)", background: "transparent", border: "none", outline: "none", fontFamily: "inherit" }}
          />
        </div>

        {/* Duration */}
        <SectionLabel style={{ margin: "13px 2px 8px", fontSize: 11.5, letterSpacing: "0.06em" }}>How long?</SectionLabel>
        <div style={{ display: "flex", gap: 8 }}>
          {DURATIONS.map((d) => (
            <button key={d.v} type="button" onClick={() => setMins(d.v)} style={{
              flex: 1, height: 44, borderRadius: "var(--r-tag)", cursor: "pointer", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600,
              background: mins === d.v ? "var(--ink)" : "var(--bg-input)",
              color: mins === d.v ? "var(--text-on-ink)" : "var(--text-secondary)",
              transition: "background 120ms ease",
            }}>{d.l}</button>
          ))}
        </div>

        {/* Colour picker */}
        <SectionLabel style={{ margin: "13px 2px 8px", fontSize: 11.5, letterSpacing: "0.06em" }}>Colour</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 7 }}>
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} style={{
              width: "100%", aspectRatio: "1", borderRadius: 999, background: c, border: "none", cursor: "pointer", padding: 0,
              boxShadow: color === c ? `0 0 0 2.5px var(--bg-sheet), 0 0 0 4.5px ${c}` : "none",
              transform: color === c ? "scale(1.15)" : "scale(1)",
              transition: "transform 140ms ease, box-shadow 140ms ease",
            }} />
          ))}
        </div>

        {/* Category / icon picker */}
        <SectionLabel style={{ margin: "13px 2px 8px", fontSize: 11.5, letterSpacing: "0.06em" }}>Category</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 7 }}>
          {TASK_CATEGORIES.map((ic) => {
            const active = icon === ic.id;
            return (
              <button key={ic.id} type="button" onClick={() => setIcon(ic.id)} title={ic.label} style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "100%", aspectRatio: "1", borderRadius: 13, border: "none", cursor: "pointer",
                background: active ? "var(--accent-soft)" : "var(--bg-input)",
                outline: active ? `1.5px solid ${color}` : "none",
                transition: "background 140ms ease",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke={active ? color : "var(--text-secondary)"}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                  {TASK_ICON_PATHS[ic.id].map((d, k) => <path key={k} d={d} />)}
                </svg>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 18 }}>
          <SpinPill full type="submit">{isEdit ? "Save changes" : "Add task"}</SpinPill>
        </div>
      </form>
    </Sheet>
  );
}

/* ── Task row ────────────────────────────────────────────────────────────── */

function TaskAvatar({ task, size = 38 }: { task: Task; size?: number }) {
  const paths = task.icon ? TASK_ICON_PATHS[task.icon] : undefined;
  return (
    <span style={{ width: size, height: size, borderRadius: 999, background: task.color, color: "var(--bg-card)", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 600 }}>
      {paths ? (
        <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
          {paths.map((d, k) => <path key={k} d={d} />)}
        </svg>
      ) : (
        task.name.trim()[0]?.toUpperCase() ?? "?"
      )}
    </span>
  );
}

function TaskRow({ task, dim, displayTime, onComplete, onDelete, onEdit }: {
  task: Task; dim?: boolean; displayTime?: string;
  onComplete: () => void; onDelete: () => void; onEdit: () => void;
}) {
  const tut = isTutorialTask(task.id) ? tutorialStepFor(task.id) : undefined;

  return (
    <div onClick={onEdit} style={{
      display: "flex", alignItems: "center", gap: 13, cursor: "pointer",
      background: dim ? "var(--bg-sunk)" : "var(--bg-card)",
      borderRadius: "var(--r-row)", padding: "14px 15px",
      boxShadow: dim ? "none" : "var(--shadow-card)",
    }}>
      {tut ? (
        <span style={{ width: 38, height: 38, borderRadius: 999, background: task.color, color: "var(--bg-card)", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>
          {tut.step}
        </span>
      ) : (
        <TaskAvatar task={task} />
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 16, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.name}</span>
        <span style={{ display: "block", fontSize: 13, fontWeight: 300, color: "var(--text-secondary)", marginTop: 1 }}>
          {tut ? `${task.minutes > 0 ? `${task.minutes} min · ` : ""}${tut.feature}` : (displayTime ?? `${task.minutes} min`)}
        </span>
      </span>
      {tut && (
        <span style={{ display: "inline-flex", padding: "3px 9px", borderRadius: 999, flexShrink: 0, background: "var(--c-coral-soft)", fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>
          {tut.feature}
        </span>
      )}
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="Delete task" style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)", flexShrink: 0 }}>
        <WIcon name="trash" size={16} stroke={1.8} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onComplete(); }} aria-label="Mark done" style={{
        width: 26, height: 26, borderRadius: 999, flexShrink: 0, border: "none", cursor: "pointer",
        background: "transparent", boxShadow: "inset 0 0 0 1.5px var(--border-hairline)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
        <WIcon name="check" size={13} stroke={2} color="var(--text-muted)" />
      </button>
    </div>
  );
}

/* ── AI breakdown ────────────────────────────────────────────────────────── */

interface SubtaskSuggestion { name: string; minutes: number }
type BreakdownPhase = "questions" | "loading" | "results" | "error";

function BreakdownModal({ task, onClose, onAdd }: {
  task: Task; onClose: () => void; onAdd: (subtasks: SubtaskSuggestion[]) => void;
}) {
  const [phase, setPhase] = useState<BreakdownPhase>("questions");
  const [goal, setGoal] = useState("");
  const [constraints, setConstraints] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SubtaskSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  async function fetchBreakdown() {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch(fnUrl("break-task"), {
        method: "POST",
        headers: fnHeaders(),
        body: JSON.stringify({ taskName: task.name, taskMinutes: task.minutes, goal: goal.trim(), constraints: constraints.trim() }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as { subtasks?: SubtaskSuggestion[]; error?: string };
      if (data.error) throw new Error(data.error);
      const items = data.subtasks ?? [];
      setSuggestions(items);
      setSelected(new Set(items.map((_, i) => i)));
      setPhase("results");
    } catch {
      setError("Could not generate subtasks. Try again in a moment.");
      setPhase("error");
    }
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", borderRadius: "var(--r-row)", padding: "12px 16px", fontSize: 14, resize: "none",
    background: "var(--bg-input)", color: "var(--text-primary)", border: "none", outline: "none", fontFamily: "inherit",
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <WIcon name="wand" size={16} color="var(--accent)" />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>Break it down</h2>
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 300, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.name}</p>

      {phase === "questions" && (
        <form onSubmit={(e) => { e.preventDefault(); void fetchBreakdown(); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <SectionLabel style={{ marginBottom: 8, fontSize: 11.5, letterSpacing: "0.06em" }}>What does &quot;done&quot; look like?</SectionLabel>
            <textarea autoFocus required rows={2} value={goal} onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. A published post with intro, 3 sections and a conclusion" style={inputStyle} />
          </div>
          <div>
            <SectionLabel style={{ marginBottom: 8, fontSize: 11.5, letterSpacing: "0.06em" }}>Tools or constraints (optional)</SectionLabel>
            <textarea rows={2} value={constraints} onChange={(e) => setConstraints(e.target.value)}
              placeholder="e.g. Using Figma, must match the design system" style={inputStyle} />
          </div>
          <SpinPill full type="submit">Generate subtasks</SpinPill>
        </form>
      )}

      {phase === "loading" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 0" }}>
          <span style={{ display: "inline-block", animation: "wt-idle-spin 1.2s linear infinite", color: "var(--accent)", fontSize: 28 }}>◎</span>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Thinking…</p>
        </div>
      )}

      {phase === "error" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0" }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", textAlign: "center" }}>{error}</p>
          <button onClick={() => void fetchBreakdown()} style={{ padding: "10px 20px", borderRadius: "var(--r-tag)", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", background: "var(--bg-input)", color: "var(--text-primary)" }}>
            Retry
          </button>
        </div>
      )}

      {phase === "results" && suggestions.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => toggle(i)} style={{
                display: "flex", alignItems: "center", gap: 12, borderRadius: "var(--r-row)", padding: "12px 16px",
                textAlign: "left", border: "none", cursor: "pointer", background: "var(--bg-input)",
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                  background: selected.has(i) ? "var(--action-success)" : "transparent",
                  boxShadow: selected.has(i) ? "none" : "inset 0 0 0 1.5px var(--border-hairline)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  {selected.has(i) && <WIcon name="check" size={12} stroke={2.6} color="var(--bg-card)" />}
                </span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{s.name}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{s.minutes}m</span>
              </button>
            ))}
          </div>
          <SpinPill full disabled={selected.size === 0}
            onClick={() => { onAdd(suggestions.filter((_, i) => selected.has(i))); onClose(); }}>
            Add {selected.size} task{selected.size !== 1 ? "s" : ""}
          </SpinPill>
        </>
      )}
    </Sheet>
  );
}

/* ── AI voice-to-task ────────────────────────────────────────────────────── */

type VoicePhase = "recording" | "processing" | "results" | "error" | "unsupported";

interface VoiceTask { name: string; minutes: number; category?: string }

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
}

function VoiceModal({ onClose, onAdd, onGenerated }: {
  onClose: () => void;
  onAdd: (tasks: VoiceTask[]) => void;
  onGenerated: () => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [phase, setPhase] = useState<VoicePhase>(() => (getSpeechRecognition() ? "recording" : "unsupported"));
  const [transcript, setTranscript] = useState("");
  const [voiceTasks, setVoiceTasks] = useState<VoiceTask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "recording") return;
    const SR = getSpeechRecognition();
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      setTranscript(Array.from(e.results).map((r) => r[0].transcript).join(" "));
    };
    recognition.onerror = () => {
      setError("Microphone access was denied or an error occurred.");
      setPhase("error");
    };
    recognition.start();
    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, [phase]);

  async function handleDone() {
    recognitionRef.current?.stop();
    if (!transcript.trim()) {
      setError("Nothing was captured. Please try again.");
      setPhase("error");
      return;
    }
    setPhase("processing");
    try {
      const res = await fetch(fnUrl("voice-tasks"), {
        method: "POST",
        headers: fnHeaders(),
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as { tasks?: VoiceTask[]; error?: string };
      if (data.error) throw new Error(data.error);
      const items = data.tasks ?? [];
      onGenerated();
      setVoiceTasks(items);
      setSelected(new Set(items.map((_, i) => i)));
      setPhase("results");
    } catch {
      setError("Could not extract tasks. Please try again.");
      setPhase("error");
    }
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <WIcon name="mic" size={16} color="var(--accent)" />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>Tell me your day</h2>
      </div>

      {phase === "unsupported" && (
        <p style={{ margin: 0, fontSize: 14, padding: "24px 0", textAlign: "center", color: "var(--text-secondary)" }}>
          Voice input isn&apos;t supported in this browser. Try Chrome or Edge.
        </p>
      )}

      {phase === "recording" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 300, color: "var(--text-secondary)" }}>
            Say everything you need to get done — it becomes tasks on the wheel.
          </p>
          <div style={{ minHeight: 80, borderRadius: "var(--r-row)", padding: "12px 16px", fontSize: 14, lineHeight: 1.55, background: "var(--bg-input)", color: transcript ? "var(--text-primary)" : "var(--text-muted)" }}>
            {transcript || "Listening…"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--accent)", flexShrink: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--accent)", animation: "wt-fade-in 1s ease-in-out infinite alternate" }} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Recording</span>
            </span>
            <SpinPill full style={{ height: 48, fontSize: 15 }} onClick={() => void handleDone()}>Done — make my tasks</SpinPill>
          </div>
        </div>
      )}

      {phase === "processing" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 0" }}>
          <span style={{ display: "inline-block", animation: "wt-idle-spin 1.2s linear infinite", color: "var(--accent)", fontSize: 28 }}>◎</span>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Extracting tasks…</p>
        </div>
      )}

      {phase === "error" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0" }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", textAlign: "center" }}>{error}</p>
          <button onClick={() => { setTranscript(""); setPhase("recording"); }} style={{ padding: "10px 20px", borderRadius: "var(--r-tag)", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", background: "var(--bg-input)", color: "var(--text-primary)" }}>
            Try again
          </button>
        </div>
      )}

      {phase === "results" && voiceTasks.length > 0 && (
        <>
          <p style={{ margin: "4px 0 14px", fontSize: 14, fontWeight: 300, color: "var(--text-secondary)" }}>
            Pick the ones that should join the wheel.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {voiceTasks.map((t, i) => (
              <button key={i} type="button" onClick={() => toggle(i)} style={{
                display: "flex", alignItems: "center", gap: 12, borderRadius: "var(--r-row)", padding: "12px 16px",
                textAlign: "left", border: "none", cursor: "pointer", background: "var(--bg-input)",
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                  background: selected.has(i) ? "var(--action-success)" : "transparent",
                  boxShadow: selected.has(i) ? "none" : "inset 0 0 0 1.5px var(--border-hairline)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  {selected.has(i) && <WIcon name="check" size={12} stroke={2.6} color="var(--bg-card)" />}
                </span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{t.name}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{t.minutes}m</span>
              </button>
            ))}
          </div>
          <SpinPill full disabled={selected.size === 0}
            onClick={() => { onAdd(voiceTasks.filter((_, i) => selected.has(i))); onClose(); }}>
            Add {selected.size} task{selected.size !== 1 ? "s" : ""}
          </SpinPill>
        </>
      )}
    </Sheet>
  );
}

/* ── Main TasksTab ───────────────────────────────────────────────────────── */

interface TasksTabProps {
  addTaskOpen?: boolean;
  onAddTaskOpenChange?: (open: boolean) => void;
}

export function TasksTab({ addTaskOpen, onAddTaskOpenChange }: TasksTabProps) {
  const {
    tasks, addTask, updateTask, deleteTask, completeTask,
    startPomodoro, incrementSpinCount, pomodoroSession, taskProgress,
    completedTasks, dailyGoal, streak, spinsToday, aiUsesToday, registerAiUse,
    voiceUsesThisMonth, registerVoiceUse, lastBrainGameAt, registerBrainGame,
  } = useApp();
  const { isPremium, activate } = useSubscription();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [breakdownTask, setBreakdownTask] = useState<Task | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);
  // If a focus session was already running/paused when this mounted (restored
  // from storage), keep FocusMode mounted through completion — otherwise it
  // would vanish the instant an auto-completed session clears pomodoroSession,
  // and the user never sees the "In bloom." moment.
  const [focusOpen, setFocusOpen] = useState(() => pomodoroSession !== null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [brainOpen, setBrainOpen] = useState(false);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  // Wheel state
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [picked, setPicked] = useState<Task | null>(null);
  const rotationRef = useRef(0);

  const sheetOpen = modalOpen || !!addTaskOpen;
  function closeTaskSheet() {
    setModalOpen(false);
    setEditingTask(null);
    onAddTaskOpenChange?.(false);
  }

  const spinsLeft = isPremium ? Infinity : Math.max(0, FREE_LIMITS.spinsPerDay - spinsToday);

  function spinWheel() {
    if (tasks.length === 0 || spinning) return;
    if (!isPremium && spinsLeft === 0) { setLimitOpen(true); return; }
    setSpinning(true);
    setPicked(null);
    const idx = Math.floor(Math.random() * tasks.length);
    const sliceAngle = 360 / tasks.length;
    const targetSliceCenter = 360 - (idx * sliceAngle + sliceAngle / 2);
    const currentNorm = ((rotationRef.current % 360) + 360) % 360;
    let delta = targetSliceCenter - currentNorm;
    if (delta <= 0) delta += 360;
    const totalDelta = 6 * 360 + delta;
    const startRot = rotationRef.current;
    const duration = 3400 + Math.random() * 600;
    const startTime = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startRot + totalDelta * eased;
      rotationRef.current = current;
      setRotation(current);
      if (t < 1) requestAnimationFrame(frame);
      else {
        setSpinning(false);
        setPicked(tasks[idx]);
        incrementSpinCount();
      }
    };
    requestAnimationFrame(frame);
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayCompleted = completedTasks.filter((t) => {
    const d = new Date(t.completedAt); d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  // Tutorial state
  const tutTasks = tasks.filter((t) => isTutorialTask(t.id));
  const tutDone = new Set(completedTasks.filter((t) => isTutorialTask(t.taskId)).map((t) => t.taskId)).size;
  const tutActive = tutTasks.length > 0;
  const allTutDone = tutDone >= TUTORIAL_TASKS.length;

  // Seed cap: 8 active tasks on the wheel. Returns how many more can be added.
  const taskSlotsLeft = isPremium ? Infinity : Math.max(0, FREE_LIMITS.tasksOnWheel - tasks.length);

  function handleAdd(name: string, mins: number, color: string, icon: string) {
    if (taskSlotsLeft === 0) { setUpgradeOpen(true); return; }
    addTask({ name, minutes: mins, color, icon, category: icon });
  }

  // Voice-to-task: Seed gets 1 generation per month
  function handleVoiceOpen() {
    if (!isPremium && voiceUsesThisMonth >= FREE_LIMITS.voicePerMonth) { setUpgradeOpen(true); return; }
    setVoiceOpen(true);
  }

  // Brain Starter: Seed 1/week · Bloom 1/day.
  // Availability is time-dependent by design; a stale value within one render
  // pass is harmless (it refreshes on the next interaction).
  const brainAvailable = (() => {
    if (!lastBrainGameAt) return true;
    const last = new Date(lastBrainGameAt);
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    if (isPremium) return last.toDateString() !== new Date(now).toDateString();
    return now - last.getTime() > 7 * 86400000;
  })();

  function handleBrainOpen() {
    if (brainAvailable) { setBrainOpen(true); return; }
    if (!isPremium) setUpgradeOpen(true);
  }

  function handleSave(id: string, name: string, mins: number, color: string, icon: string) {
    updateTask(id, { name, minutes: mins, color, icon });
    setEditingTask(null);
  }

  function handleBreakdown(task: Task) {
    if (!isPremium && aiUsesToday >= FREE_LIMITS.aiBreakdownsPerDay) { setUpgradeOpen(true); return; }
    registerAiUse();
    setBreakdownTask(task);
  }

  function handleDone(task: Task) {
    const remaining = taskProgress[task.id];
    const minutesActual = remaining !== undefined
      ? Math.max(1, Math.ceil((task.minutes * 60 - remaining) / 60))
      : Math.max(1, task.minutes);
    completeTask(task.id, minutesActual);
    deleteTask(task.id);
    setConfetti(true);
    if (picked?.id === task.id) setPicked(null);
  }

  function handleStartFocus(task: Task) {
    setPicked(null);
    if (task.minutes === 0) { handleDone(task); return; }
    startPomodoro(task);
    setFocusOpen(true);
  }

  function handleDeleteTask(task: Task) {
    deleteTask(task.id);
    showToast(`"${task.name}" deleted`, () => {
      addTask({ name: task.name, minutes: task.minutes, color: task.color, icon: task.icon, category: task.category });
    });
  }

  const slices = tasks.map((t) => ({
    id: t.id, color: t.color,
    label: t.name.trim()[0]?.toUpperCase(),
    iconPaths: t.icon ? TASK_ICON_PATHS[t.icon] : undefined,
  }));

  const wheelSize = 300;
  const pickedTut = picked && isTutorialTask(picked.id) ? tutorialStepFor(picked.id) : undefined;

  const wheel = (size: number) => (
    <TaskWheel
      slices={slices} size={size} rotation={rotation}
      hub={<WheelHub done={todayCompleted.length} total={todayCompleted.length + tasks.length} />}
      onSliceClick={(s) => { const t = tasks.find((x) => x.id === s.id); if (t && !spinning) setPicked(t); }}
    />
  );

  const spinCta = tasks.length === 0
    ? null
    : (
      <SpinPill onClick={spinWheel} disabled={spinning || (!isPremium && spinsLeft === 0)}>
        {spinning ? "Spinning…" : !isPremium && spinsLeft === 0 ? "All done for today" : tutActive && tutDone === 0 ? "Spin to begin" : "Spin the wheel"}
      </SpinPill>
    );

  const spinCounter = !isPremium && tasks.length > 0 && (
    <div style={{ display: "flex", gap: 7, alignItems: "center", background: "var(--bg-card)", padding: "7px 16px", borderRadius: "var(--r-tag)", boxShadow: "var(--shadow-card)" }}>
      {Array.from({ length: FREE_LIMITS.spinsPerDay }, (_, i) => (
        <span key={i} style={{
          width: 9, height: 9, borderRadius: "50%",
          background: i < spinsToday ? "var(--bg-sunk)" : "var(--accent)",
          boxShadow: i < spinsToday ? "inset 0 0 0 1.5px var(--border-hairline)" : "none",
        }} />
      ))}
      <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 3 }}>
        {spinsLeft > 0 ? `${spinsLeft} of ${FREE_LIMITS.spinsPerDay} left` : "Resets at midnight"}
      </span>
    </div>
  );

  const metaLine = tasks.length > 0 && (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, color: "var(--text-secondary)" }}>
      <span>{streak}-day streak · {todayCompleted.length} to {dailyGoal}</span>
      <button onClick={() => setRecapOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--text-primary)", fontWeight: 500, cursor: "pointer", background: "none", border: "none", fontSize: 14, padding: 0 }}>
        This week <WIcon name="arrowUR" size={14} stroke={2} />
      </button>
    </div>
  );

  return (
    <div className="wt-page">
      <div className="wt-tasks-layout">
        <div className="wt-tasks-main">
          {/* Headline */}
          <div style={{ paddingTop: 10 }}>
            {allTutDone && tutTasks.length === 0 && todayCompleted.length > 0 ? (
              <Headline lead="Done. On to the next." script="Nice work" size={50} />
            ) : tutActive ? (
              <Headline lead="Your first spin." script="Begin" size={56} />
            ) : (
              <Headline lead="Not sure where to start?" script="Spin" size={58} />
            )}
          </div>

          {/* Tutorial banner + progress */}
          {tutActive && (
            <div style={{ marginTop: 16 }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 20, padding: "14px 16px", boxShadow: "var(--shadow-card)", display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ width: 38, height: 38, borderRadius: 999, flexShrink: 0, background: "var(--c-coral-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <WIcon name="sparkle" size={18} color="var(--accent)" />
                </span>
                <span>
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: "var(--text-primary)" }}>Start here.</span>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 300, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                    Five tasks. Five features. Spin to begin.
                  </span>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 2px" }}>
                <div style={{ flex: 1, height: 4, borderRadius: 99, background: "var(--bg-sunk)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(tutDone / TUTORIAL_TASKS.length) * 100}%`, background: "var(--accent)", borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", flexShrink: 0, letterSpacing: "0.04em" }}>
                  {tutDone} / {TUTORIAL_TASKS.length}
                </span>
              </div>
            </div>
          )}

          {/* Wheel — mobile inline */}
          <div className="wt-mobile-only" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "18px 0 0" }}>
            {tasks.length > 0 && wheel(Math.min(wheelSize, 320))}
            {spinCta}
            {spinCounter}
            <div style={{ minHeight: 20 }}>
              {picked && !spinning ? (
                <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                  Up next · <strong style={{ color: "var(--text-primary)" }}>{picked.name}</strong>
                </span>
              ) : metaLine}
            </div>
          </div>

          {/* Desktop spin controls */}
          <div className="wt-desktop-only" style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            {spinCta}
            {spinCounter}
            {metaLine}
          </div>

          {/* Empty state */}
          {tasks.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "40px 0 12px" }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 300, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.55 }}>
                Nothing on the wheel yet.<br />Add a task to get it going.
              </p>
              <SpinPill onClick={() => setModalOpen(true)}>
                <WIcon name="plus" size={18} /> Add your first task
              </SpinPill>
              <button onClick={handleVoiceOpen} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", padding: 6 }}>
                <WIcon name="mic" size={15} /> Or tell me your day — I&apos;ll make the tasks
              </button>
            </div>
          )}

          {/* Task list */}
          {tasks.length > 0 && (
            <div style={{ paddingTop: 26 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <SectionLabel style={{ fontSize: 12 }}>Today · {tasks.length} task{tasks.length !== 1 ? "s" : ""}</SectionLabel>
                <button onClick={() => setModalOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <WIcon name="plus" size={16} /> add
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    dim={picked?.id === task.id}
                    displayTime={taskProgress[task.id] != null ? `${formatMmSs(taskProgress[task.id])} left` : undefined}
                    onComplete={() => handleDone(task)}
                    onDelete={() => handleDeleteTask(task)}
                    onEdit={() => setEditingTask(task)}
                  />
                ))}
              </div>
              {/* AI + warm-up quick actions */}
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                {([
                  {
                    icon: "wand", label: "Break into steps",
                    capped: !isPremium && aiUsesToday >= FREE_LIMITS.aiBreakdownsPerDay,
                    onClick: () => tasks[0] && handleBreakdown(tasks[0]),
                  },
                  {
                    icon: "mic", label: "Tell me your day",
                    capped: !isPremium && voiceUsesThisMonth >= FREE_LIMITS.voicePerMonth,
                    onClick: handleVoiceOpen,
                  },
                ] as const).map((a) => (
                  <button key={a.label} onClick={a.onClick} className="wt-press" style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7, height: 48,
                    borderRadius: "var(--r-row)", border: "1.5px dashed var(--border-hairline)",
                    color: "var(--text-secondary)", fontSize: 13.5, fontWeight: 500, background: "transparent", cursor: "pointer",
                  }}>
                    <WIcon name={a.icon} size={15} /> {a.label}
                    {a.capped && (
                      <span style={{ background: "var(--c-lavender)", borderRadius: "var(--r-tag)", padding: "2px 7px", fontSize: 9.5, fontWeight: 700, color: "var(--text-on-ink)", letterSpacing: "0.06em" }}>BLOOM</span>
                    )}
                  </button>
                ))}
              </div>
              {/* Brain starter */}
              <button onClick={handleBrainOpen} className="wt-press" style={{
                marginTop: 9, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                height: 44, borderRadius: "var(--r-row)", border: "none", background: "var(--c-lavender-soft)",
                color: "var(--text-primary)", fontSize: 13.5, fontWeight: 500,
                cursor: "pointer", opacity: brainAvailable || !isPremium ? 1 : 0.5,
              }}>
                <WIcon name="sparkle" size={15} color="var(--c-lavender)" />
                {brainAvailable
                  ? "Brain starter · a 30-second warm-up"
                  : isPremium
                    ? "Brain starter · back tomorrow"
                    : "Brain starter · 1 a week on Seed"}
                {!brainAvailable && !isPremium && (
                  <span style={{ background: "var(--c-lavender)", borderRadius: "var(--r-tag)", padding: "2px 7px", fontSize: 9.5, fontWeight: 700, color: "var(--text-on-ink)", letterSpacing: "0.06em" }}>BLOOM</span>
                )}
              </button>
            </div>
          )}

          {/* Done today */}
          {todayCompleted.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <SectionLabel style={{ fontSize: 12, marginBottom: 12 }}>Done</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {todayCompleted.slice(0, 5).map((t) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 13, background: "var(--bg-sunk)", borderRadius: "var(--r-row)", padding: "14px 15px" }}>
                    <span style={{ width: 38, height: 38, borderRadius: 999, background: t.color, opacity: 0.7, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--bg-card)", fontSize: 15, fontWeight: 600 }}>
                      {t.taskName.trim()[0]?.toUpperCase() ?? "?"}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 16, fontWeight: 500, color: "var(--text-muted)", textDecoration: "line-through", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.taskName}</span>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 300, color: "var(--text-secondary)", marginTop: 1 }}>{t.minutesActual} min</span>
                    </span>
                    <span style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, background: "var(--action-success)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <WIcon name="check" size={14} stroke={2.6} color="var(--bg-card)" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Wheel — desktop side column */}
        <div className="wt-desktop-only wt-tasks-side">
          {tasks.length > 0 && wheel(340)}
        </div>
      </div>

      {/* ── Overlays ── */}

      {/* Result sheet */}
      {picked && !spinning && (
        <Sheet onClose={() => setPicked(null)}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
            {pickedTut ? (
              <span style={{ width: 46, height: 46, borderRadius: 999, background: picked.color, color: "var(--bg-card)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>{pickedTut.step}</span>
            ) : (
              <TaskAvatar task={picked} size={46} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>{picked.name}</div>
              <div style={{ fontSize: 13, fontWeight: pickedTut ? 500 : 300, color: pickedTut ? "var(--accent)" : "var(--text-secondary)", marginTop: 1 }}>
                {pickedTut ? `${pickedTut.feature} · step ${pickedTut.step} of 5` : `${picked.minutes} min focus block`}
              </div>
            </div>
          </div>
          {pickedTut?.step === 1 && (
            <div style={{ background: "var(--c-coral-soft)", borderRadius: 14, padding: "11px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.45 }}>
                You just used the wheel. It picked for you — that&apos;s the whole idea.
              </div>
            </div>
          )}
          <SpinPill full onClick={() => handleStartFocus(picked)}>
            {picked.minutes === 0 ? "Mark done · no focus needed" : <>Start focus<WIcon name="arrowR" size={19} /></>}
          </SpinPill>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button onClick={() => { setPicked(null); spinWheel(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", padding: 6 }}>
              Spin again
            </button>
          </div>
        </Sheet>
      )}

      {/* Spin limit sheet (Seed) */}
      {limitOpen && (
        <Sheet onClose={() => setLimitOpen(false)}>
          <div className="script" style={{ fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 0.88, color: "var(--text-primary)", marginBottom: 14 }}>
            5 spins<br /><span style={{ color: "var(--accent)" }}>done.</span>
          </div>
          <p style={{ margin: "0 0 24px", fontSize: 16, color: "var(--text-secondary)", fontWeight: 300, lineHeight: 1.55 }}>
            Your wheel resets at midnight. Plenty more tomorrow.
          </p>
          <BloomNudge label="Unlimited spins with Bloom" onClick={() => { setLimitOpen(false); setUpgradeOpen(true); }} />
          <div style={{ height: 14 }} />
          <SpinPill full onClick={() => setLimitOpen(false)}>Got it</SpinPill>
        </Sheet>
      )}

      {(sheetOpen || editingTask) && (
        <TaskSheet
          task={editingTask ?? undefined}
          onAdd={handleAdd}
          onSave={handleSave}
          onClose={closeTaskSheet}
        />
      )}

      {breakdownTask && (
        <BreakdownModal
          task={breakdownTask}
          onClose={() => setBreakdownTask(null)}
          onAdd={(subtasks) => {
            const capped = subtasks.slice(0, taskSlotsLeft === Infinity ? undefined : taskSlotsLeft);
            capped.forEach((s, i) => addTask({
              name: s.name, minutes: s.minutes,
              color: COLORS[(tasks.length + i) % COLORS.length],
              icon: breakdownTask.icon, category: breakdownTask.category,
            }));
            if (capped.length < subtasks.length) setUpgradeOpen(true);
          }}
        />
      )}

      {voiceOpen && (
        <VoiceModal
          onClose={() => setVoiceOpen(false)}
          onGenerated={registerVoiceUse}
          onAdd={(voiceTasks) => {
            const capped = voiceTasks.slice(0, taskSlotsLeft === Infinity ? undefined : taskSlotsLeft);
            capped.forEach((t, i) => addTask({
              name: t.name, minutes: t.minutes,
              color: COLORS[(tasks.length + i) % COLORS.length],
              icon: "work", category: t.category ?? "work",
            }));
            if (capped.length < voiceTasks.length) setUpgradeOpen(true);
          }}
        />
      )}

      {brainOpen && (
        <BrainStarter
          onClose={() => setBrainOpen(false)}
          onFinished={registerBrainGame}
        />
      )}

      {recapOpen && <WeeklyRecap onClose={() => setRecapOpen(false)} />}
      {upgradeOpen && <UpgradeScreen onClose={() => setUpgradeOpen(false)} onActivate={() => { void activate(); setUpgradeOpen(false); }} />}
      {(focusOpen || pomodoroSession) && (
        <FocusMode onDone={(completed) => { setFocusOpen(false); if (completed) setConfetti(true); }} />
      )}

      <ConfettiBurst active={confetti} />
      {confetti && <ResetConfetti onReset={() => setConfetti(false)} />}
      <Toast toast={toast} onUndo={() => { toast?.onUndo?.(); dismissToast(); }} onDismiss={dismissToast} />
    </div>
  );
}

/* Clears the confetti flag after the burst finishes so it can fire again. */
function ResetConfetti({ onReset }: { onReset: () => void }) {
  useEffect(() => {
    const t = setTimeout(onReset, 2000);
    return () => clearTimeout(t);
  }, [onReset]);
  return null;
}
