"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Timer, Plus, Trash2, Sparkles, Lock, Mic } from "lucide-react";
import { useApp, COLORS, type Task } from "@/context/AppContext";
import { Confetti } from "@/components/Confetti";
import { GentlePush } from "@/components/GentlePush";
import { useSubscription } from "@/hooks/useSubscription";
import { fnUrl, fnHeaders } from "@/lib/functions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMmSs(seconds: number) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

// ─── FAQ Accordion ────────────────────────────────────────────────────────────

function TasksFaqAccordion() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left">
        <HelpCircle size={15} strokeWidth={2} className="shrink-0" style={{ color: 'var(--accent)' }} />
        <span className="flex-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>How do tasks work?</span>
        {open
          ? <ChevronUp size={15} strokeWidth={2} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          : <ChevronDown size={15} strokeWidth={2} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Click the timer icon to start a focus session. Click the task name to edit it. Use the bin icon to delete.
        </div>
      )}
    </div>
  );
}

// ─── Upgrade Modal ───────────────────────────────────────────────────────────

function UpgradeModal({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mb-5 mx-auto md:hidden" style={{ background: 'var(--border)' }} />
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4 mx-auto" style={{ background: 'var(--accent)' }}>
          <Sparkles size={26} strokeWidth={1.8} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--text-primary)' }}>AI Task Breakdown</h2>
        <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Premium members can break any task into smaller, focused subtasks using AI — instantly.
        </p>
        <button
          onClick={() => { onUpgrade(); onClose(); }}
          className="w-full text-white font-semibold text-base rounded-full py-3.5 active:scale-[0.98] transition"
          style={{ background: 'var(--text-primary)' }}
        >
          Unlock Premium
        </button>
        <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
          Demo mode — no payment required yet
        </p>
      </div>
    </div>
  );
}

// ─── Breakdown Modal ──────────────────────────────────────────────────────────

interface SubtaskSuggestion {
  name: string;
  minutes: number;
}

type BreakdownPhase = "questions" | "loading" | "results" | "error";

function BreakdownModal({
  task,
  onClose,
  onAdd,
}: {
  task: Task;
  onClose: () => void;
  onAdd: (subtasks: SubtaskSuggestion[]) => void;
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
        body: JSON.stringify({
          taskName: task.name,
          taskMinutes: task.minutes,
          goal: goal.trim(),
          constraints: constraints.trim(),
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as { subtasks?: SubtaskSuggestion[]; error?: string };
      if (data.error) throw new Error(data.error);
      const items = data.subtasks ?? [];
      setSuggestions(items);
      setSelected(new Set(items.map((_, i) => i)));
      setPhase("results");
    } catch {
      setError("Could not generate subtasks. Check your ANTHROPIC_API_KEY and try again.");
      setPhase("error");
    }
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const selectedCount = selected.size;

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mb-5 mx-auto md:hidden" style={{ background: 'var(--border)' }} />
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Break down task</h2>
        </div>
        <p className="text-sm mb-5 truncate" style={{ color: 'var(--text-muted)' }}>"{task.name}"</p>

        {phase === "questions" && (
          <form onSubmit={(e) => { e.preventDefault(); void fetchBreakdown(); }} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: 'var(--text-muted)' }}>
                What does "done" look like? *
              </label>
              <textarea
                autoFocus
                required
                rows={2}
                placeholder="e.g. A published blog post with intro, 3 sections, and a conclusion"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none transition"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: 'var(--text-muted)' }}>
                Any tools, context, or constraints? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Using Figma, needs to match the existing design system, no external assets"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none transition"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
              />
            </div>
            <button
              type="submit"
              className="w-full text-white font-semibold text-base rounded-full py-3.5 active:scale-[0.98] transition mt-1"
              style={{ background: 'var(--text-primary)' }}
            >
              Generate subtasks
            </button>
          </form>
        )}

        {phase === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <span className="text-3xl animate-spin inline-block" style={{ color: 'var(--accent)' }}>◎</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Thinking…</p>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>{error}</p>
            <button
              onClick={() => void fetchBreakdown()}
              className="px-4 py-2 rounded-full text-sm font-semibold"
              style={{ background: 'var(--bg-track)', color: 'var(--text-primary)' }}
            >
              Retry
            </button>
          </div>
        )}

        {phase === "results" && suggestions.length > 0 && (
          <>
            <div className="space-y-2 mb-5">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors"
                  style={{ background: 'var(--bg-input)' }}
                >
                  <span
                    className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      background: selected.has(i) ? 'var(--text-primary)' : 'transparent',
                      borderColor: selected.has(i) ? 'var(--text-primary)' : 'var(--border)',
                    }}
                  >
                    {selected.has(i) && <span className="text-white text-xs font-bold">✓</span>}
                  </span>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{s.minutes}m</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setPhase("questions")}
                className="px-4 py-3.5 rounded-full text-sm font-semibold transition"
                style={{ background: 'var(--bg-track)', color: 'var(--text-primary)' }}
              >
                Back
              </button>
              <button
                onClick={() => { onAdd(suggestions.filter((_, i) => selected.has(i))); onClose(); }}
                disabled={selectedCount === 0}
                className="flex-1 text-white font-semibold text-base rounded-full py-3.5 active:scale-[0.98] transition disabled:opacity-40"
                style={{ background: 'var(--text-primary)' }}
              >
                Add {selectedCount} task{selectedCount !== 1 ? "s" : ""}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Voice Modal ─────────────────────────────────────────────────────────────

type VoicePhase = "recording" | "processing" | "results" | "error" | "unsupported";

interface VoiceTask {
  name: string;
  minutes: number;
  category?: string;
}

function VoiceModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (tasks: VoiceTask[]) => void;
}) {
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const [phase, setPhase] = useState<VoicePhase>(() => {
    if (typeof window === "undefined") return "unsupported";
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition
      ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    return SR ? "recording" : "unsupported";
  });
  const [transcript, setTranscript] = useState("");
  const [tasks, setTasks] = useState<VoiceTask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "recording") return;
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition
      ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SR as any)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e: { results: SpeechRecognitionResultList }) => {
      const full = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setTranscript(full);
    };

    recognition.onerror = () => {
      setError("Microphone access was denied or an error occurred.");
      setPhase("error");
    };

    recognition.start();
    recognitionRef.current = recognition;

    return () => { recognition.abort(); };
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
      setTasks(items);
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
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const selectedCount = selected.size;

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mb-5 mx-auto md:hidden" style={{ background: 'var(--border)' }} />
        <div className="flex items-center gap-2 mb-1">
          <Mic size={16} strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>What's on your plate?</h2>
        </div>

        {phase === "unsupported" && (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
            Voice input isn't supported in this browser. Try Chrome or Edge.
          </p>
        )}

        {phase === "recording" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Tell me everything you need to get done — I'll turn it into tasks.
            </p>
            <div
              className="min-h-[80px] rounded-xl px-4 py-3 text-sm leading-relaxed"
              style={{ background: 'var(--bg-input)', color: transcript ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              {transcript || "Listening…"}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                <span className="text-xs font-semibold">Recording</span>
              </div>
              <button
                onClick={handleDone}
                className="flex-1 text-white font-semibold text-sm rounded-full py-3 active:scale-[0.98] transition"
                style={{ background: 'var(--text-primary)' }}
              >
                Done — make my tasks
              </button>
            </div>
          </div>
        )}

        {phase === "processing" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <span className="text-3xl animate-spin inline-block" style={{ color: 'var(--accent)' }}>◎</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Extracting tasks…</p>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>{error}</p>
            <button
              onClick={() => { setTranscript(""); setPhase("recording"); }}
              className="px-4 py-2 rounded-full text-sm font-semibold"
              style={{ background: 'var(--bg-track)', color: 'var(--text-primary)' }}
            >
              Try again
            </button>
          </div>
        )}

        {phase === "results" && tasks.length > 0 && (
          <>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Select the tasks to add to your wheel.
            </p>
            <div className="space-y-2 mb-5">
              {tasks.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors"
                  style={{ background: 'var(--bg-input)' }}
                >
                  <span
                    className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      background: selected.has(i) ? 'var(--text-primary)' : 'transparent',
                      borderColor: selected.has(i) ? 'var(--text-primary)' : 'var(--border)',
                    }}
                  >
                    {selected.has(i) && <span className="text-white text-xs font-bold">✓</span>}
                  </span>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.minutes}m</span>
                    {t.category && (
                      <span className="text-xs mt-0.5" style={{ color: 'var(--accent)' }}>{t.category}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => { setTranscript(""); setPhase("recording"); }}
                className="px-4 py-3.5 rounded-full text-sm font-semibold transition"
                style={{ background: 'var(--bg-track)', color: 'var(--text-primary)' }}
              >
                Redo
              </button>
              <button
                onClick={() => { onAdd(tasks.filter((_, i) => selected.has(i))); onClose(); }}
                disabled={selectedCount === 0}
                className="flex-1 text-white font-semibold text-base rounded-full py-3.5 active:scale-[0.98] transition disabled:opacity-40"
                style={{ background: 'var(--text-primary)' }}
              >
                Add {selectedCount} task{selectedCount !== 1 ? "s" : ""}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Add/Edit Task Modal ──────────────────────────────────────────────────────

interface TaskModalProps {
  task?: Task;
  categories: string[];
  isPremium: boolean;
  onAdd: (name: string, mins: number, category: string) => void;
  onSave: (id: string, name: string, mins: number, category: string) => void;
  onClose: () => void;
  onAddCategory: (cat: string) => void;
}

const CAT_CORRECTIONS_KEY = "wt.cat-corrections";
type CatCorrection = { task: string; category: string };

function loadCorrections(): CatCorrection[] {
  try { return JSON.parse(localStorage.getItem(CAT_CORRECTIONS_KEY) ?? "[]") as CatCorrection[]; }
  catch { return []; }
}
function saveCorrection(task: string, category: string) {
  const next = [...loadCorrections().filter((e) => e.task !== task), { task, category }].slice(-50);
  localStorage.setItem(CAT_CORRECTIONS_KEY, JSON.stringify(next));
}

function TaskModal({ task, categories, isPremium, onAdd, onSave, onClose, onAddCategory }: TaskModalProps) {
  const { defaultTimerMinutes } = useApp();
  const isEdit = !!task;
  const defaultMins = task?.minutes ?? defaultTimerMinutes;
  const [name, setName] = useState(task?.name ?? "");
  const [hours, setHours] = useState(Math.floor(defaultMins / 60));
  const [mins, setMins] = useState(defaultMins % 60);
  const [category, setCategory] = useState(task?.category ?? "");
  const [userSetCategory, setUserSetCategory] = useState(isEdit);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    if (isEdit || userSetCategory || name.trim().length < 3) {
      setSuggestion(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setSuggestionLoading(true);
      try {
        const corrections = loadCorrections();
        let suggested: string | null = null;

        if (isPremium) {
          // Haiku: higher accuracy, uses few-shot corrections server-side
          const res = await fetch(fnUrl("suggest-category"), {
            method: "POST",
            headers: fnHeaders(),
            body: JSON.stringify({ taskName: name.trim(), categories, examples: corrections }),
          });
          const data = (await res.json()) as { category: string | null };
          suggested = data.category;
        } else {
          // Universal Sentence Encoder: runs in-browser, no API call
          const { suggestCategoryUSE } = await import("@/lib/categorySuggest");
          suggested = await suggestCategoryUSE(name.trim(), categories, corrections);
        }

        if (!cancelled && suggested) {
          setSuggestion(suggested);
          setCategory(suggested);
        }
      } catch { /* silent */ }
      if (!cancelled) setSuggestionLoading(false);
    }, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [name, categories, isEdit, userSetCategory, isPremium]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = name.trim();
    if (!v) return;
    const total = Math.max(1, hours * 60 + mins);
    if (category) saveCorrection(v, category);
    if (isEdit && task) {
      onSave(task.id, v, total, category);
    } else {
      onAdd(v, total, category);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mb-5 mx-auto md:hidden" style={{ background: 'var(--border)' }} />
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{isEdit ? "Edit task" : "Add task"}</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>{isEdit ? "Update the details below." : "What needs doing?"}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            autoFocus
            type="text"
            placeholder="Task name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-base focus:outline-none transition"
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
          />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Duration</p>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, Math.min(8, parseInt(e.target.value) || 0)))}
                  min={0}
                  max={8}
                  className="w-20 rounded-xl px-3 py-3 text-2xl font-bold text-center focus:outline-none transition"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
                <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>hours</span>
              </div>
              <span className="text-2xl font-bold mb-4" style={{ color: 'var(--text-muted)' }}>:</span>
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  value={mins}
                  onChange={(e) => setMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  min={0}
                  max={59}
                  className="w-20 rounded-xl px-3 py-3 text-2xl font-bold text-center focus:outline-none transition"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
                <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>mins</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Category</p>
              {suggestionLoading && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Suggesting…</span>
              )}
              {!suggestionLoading && suggestion && !userSetCategory && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                  <Sparkles size={10} strokeWidth={2} />suggested
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => {
                    setCategory(category === cat ? "" : cat);
                    setUserSetCategory(true);
                    setSuggestion(null);
                  }}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                  style={{
                    background: category === cat ? 'var(--text-primary)' : 'var(--bg-track)',
                    color: category === cat ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {cat}
                </button>
              ))}
              {addingCat ? (
                <input
                  autoFocus
                  type="text"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCat.trim()) {
                      onAddCategory(newCat.trim());
                      setCategory(newCat.trim());
                      setUserSetCategory(true);
                      setSuggestion(null);
                      setNewCat("");
                      setAddingCat(false);
                    } else if (e.key === "Escape") {
                      setAddingCat(false);
                    }
                  }}
                  onBlur={() => { setNewCat(""); setAddingCat(false); }}
                  placeholder="Label…"
                  className="px-3 py-1.5 rounded-full text-sm focus:outline-none w-24"
                  style={{ background: 'var(--bg-track)' }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCat(true)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                  style={{ background: 'var(--bg-track)', color: 'var(--accent)' }}
                >
                  + Add
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full text-white font-semibold text-base rounded-full py-3.5 active:scale-[0.98] transition mt-1"
            style={{ background: 'var(--text-primary)' }}
          >
            {isEdit ? "Save changes" : "Add task"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  isActive: boolean;
  displayTime: string;
  isPremium: boolean;
  onFocus: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onBreakdown: () => void;
}

function TaskRow({ task, isActive, displayTime, isPremium, onFocus, onComplete, onDelete, onEdit, onBreakdown }: TaskRowProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-opacity ${isActive ? "opacity-60" : ""}`}
      style={{ background: 'var(--bg-card)' }}
    >
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
      <div className="flex-1 min-w-0">
        <button
          onClick={onEdit}
          className="text-base font-medium text-left truncate w-full transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          {task.name}
        </button>
        {task.category && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{task.category}</p>
        )}
      </div>
      <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>{displayTime}</span>
      <button
        onClick={onBreakdown}
        title={isPremium ? "Break into subtasks" : "Premium: Break into subtasks"}
        className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors shrink-0"
      >
        {isPremium
          ? <Sparkles size={16} strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
          : <Lock size={14} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
        }
      </button>
      <button
        onClick={onFocus}
        title="Start focus session"
        className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors shrink-0"
      >
        <Timer size={18} strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
      </button>
      <button
        onClick={onComplete}
        title="Mark done"
        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-green-50 transition-colors shrink-0"
      >
        <span className="text-sm font-bold text-green-600">✓</span>
      </button>
      <button
        onClick={onDelete}
        title="Delete"
        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-50 transition-colors shrink-0"
      >
        <Trash2 size={15} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  );
}

// ─── Focus card ───────────────────────────────────────────────────────────────

function FocusCard({ onComplete }: { onComplete: () => void }) {
  const { pomodoroSession, pausePomodoro, resumePomodoro, completePomodoro, tickPomodoro, tasks } = useApp();
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
  }, [pomodoroSession?.taskId]);

  useEffect(() => {
    if (!pomodoroSession?.isRunning) return;
    const id = setInterval(tickPomodoro, 1000);
    return () => clearInterval(id);
  }, [pomodoroSession?.isRunning, tickPomodoro]);

  useEffect(() => {
    if (pomodoroSession?.remainingSeconds === 0 && !completedRef.current) {
      completedRef.current = true;
      completePomodoro();
      onComplete();
    }
  }, [pomodoroSession?.remainingSeconds, completePomodoro, onComplete]);

  if (!pomodoroSession) return null;

  const activeTask = tasks.find((t) => t.id === pomodoroSession.taskId);
  const progress = (pomodoroSession.totalSeconds - pomodoroSession.remainingSeconds) / pomodoroSession.totalSeconds;

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--text-primary)' }}>
      <div className="flex items-center gap-2 mb-1">
        {activeTask && (
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeTask.color }} />
        )}
        <p className="text-base font-semibold text-white truncate flex-1">{pomodoroSession.taskName}</p>
        <button
          onClick={() => { if (!completedRef.current) { completedRef.current = true; completePomodoro(); onComplete(); } }}
          className="text-xs font-semibold text-white/60 hover:text-white bg-white/10 rounded-full px-3 py-1 transition-colors shrink-0"
        >
          Done ✓
        </button>
      </div>
      {activeTask?.category && (
        <span className="inline-block bg-white/10 text-white/70 text-xs font-semibold rounded-full px-3 py-1 mb-3">
          {activeTask.category}
        </span>
      )}
      <p className="text-5xl font-light text-white mt-2 mb-3 tabular-nums">
        {formatMmSs(pomodoroSession.remainingSeconds)}
      </p>
      <div className="h-0.5 bg-white/20 rounded-full mb-4">
        <div
          className="h-0.5 rounded-full transition-all"
          style={{ width: `${Math.round(progress * 100)}%`, background: 'var(--accent)' }}
        />
      </div>
      <div className="flex gap-2.5">
        <button
          onClick={pomodoroSession.isRunning ? pausePomodoro : resumePomodoro}
          className="flex-1 h-11 bg-white/10 text-white font-medium text-sm rounded-full hover:bg-white/20 transition-colors"
        >
          {pomodoroSession.isRunning ? "Pause" : "Resume"}
        </button>
      </div>
    </div>
  );
}

// ─── Main TasksTab ────────────────────────────────────────────────────────────

export function TasksTab() {
  const {
    tasks, addTask, updateTask, deleteTask, completeTask, startPomodoro,
    pomodoroSession, taskProgress, completedTasks, dailyGoal, categories, addCategory,
  } = useApp();
  const { isPremium, loaded: subLoaded, activate } = useSubscription();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [breakdownTask, setBreakdownTask] = useState<Task | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCompleted = completedTasks.filter((t) => {
    const d = new Date(t.completedAt); d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const totalMinutesDone = todayCompleted.reduce((s, t) => s + t.minutesActual, 0);
  const goalPct = dailyGoal > 0 ? Math.min(Math.round((todayCompleted.length / dailyGoal) * 100), 100) : 0;

  function handleAdd(name: string, mins: number, category: string) {
    const color = COLORS[tasks.length % COLORS.length];
    addTask({ name, minutes: mins, color, icon: "BookOpen", category });
  }

  function handleSave(id: string, name: string, mins: number, category: string) {
    updateTask(id, { name, minutes: mins, category });
    setEditingTask(null);
  }

  function handleBreakdown(task: Task) {
    if (!subLoaded) return;
    if (isPremium) {
      setBreakdownTask(task);
    } else {
      setShowUpgrade(true);
    }
  }

  function handleAddSubtasks(subtasks: { name: string; minutes: number }[], parentTask: Task) {
    const colorCycle = COLORS;
    subtasks.forEach((s, i) => {
      addTask({
        name: s.name,
        minutes: s.minutes,
        color: colorCycle[i % colorCycle.length],
        icon: "BookOpen",
        category: parentTask.category,
      });
    });
  }

  function handleAddVoiceTasks(voiceTasks: VoiceTask[]) {
    voiceTasks.forEach((t, i) => {
      addTask({
        name: t.name,
        minutes: t.minutes,
        color: COLORS[(tasks.length + i) % COLORS.length],
        icon: "BookOpen",
        category: t.category ?? "",
      });
    });
  }

  function handleFocus(task: Task) {
    if (pomodoroSession && pomodoroSession.taskId !== task.id) {
      if (!window.confirm(`Switch focus from "${pomodoroSession.taskName}" to "${task.name}"?`)) return;
    }
    startPomodoro(task);
  }

  function handleDone(task: Task) {
    const remaining = taskProgress[task.id];
    const minutesActual = remaining !== undefined
      ? Math.max(1, Math.ceil((task.minutes * 60 - remaining) / 60))
      : task.minutes;
    completeTask(task.id, minutesActual);
    deleteTask(task.id);
    setConfetti(true);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Your tasks are set.</h1>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>Time to get to work.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => isPremium ? setVoiceOpen(true) : setShowUpgrade(true)}
            title={isPremium ? "Add tasks by voice" : "Premium: Add tasks by voice"}
            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition"
            style={{ background: 'var(--bg-card)' }}
          >
            {isPremium
              ? <Mic size={18} strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
              : <Mic size={18} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
            }
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="w-11 h-11 rounded-full text-white flex items-center justify-center active:scale-95 transition"
            style={{ background: 'var(--text-primary)' }}
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* FAQ */}
      <TasksFaqAccordion />

      {/* Gentle push */}
      <GentlePush mode="tasks" />

      {/* Stats */}
      {todayCompleted.length > 0 && (
        <div className="rounded-2xl flex py-5" style={{ background: 'var(--bg-card)' }}>
          <div className="flex-1 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalMinutesDone}m</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Done</span>
          </div>
          <div className="w-px" style={{ background: 'var(--border)' }} />
          <div className="flex-1 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{todayCompleted.length}/{dailyGoal}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Tasks</span>
          </div>
          <div className="w-px" style={{ background: 'var(--border)' }} />
          <div className="flex-1 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{goalPct}%</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Goal</span>
          </div>
        </div>
      )}

      {/* Confetti */}
      <Confetti active={confetti} onDone={() => setConfetti(false)} />

      {/* Focus card */}
      <FocusCard onComplete={() => setConfetti(true)} />

      {/* Task list */}
      {tasks.length > 0 && (
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Today's tasks</p>
      )}
      <div className="space-y-2">
        {tasks.map((task) => {
          const isActive = pomodoroSession?.taskId === task.id;
          const displayTime = taskProgress[task.id] != null
            ? formatMmSs(taskProgress[task.id])
            : `${task.minutes}m`;
          return (
            <TaskRow
              key={task.id}
              task={task}
              isActive={isActive}
              displayTime={displayTime}
              isPremium={isPremium}
              onFocus={() => handleFocus(task)}
              onComplete={() => handleDone(task)}
              onDelete={() => deleteTask(task.id)}
              onEdit={() => setEditingTask(task)}
              onBreakdown={() => handleBreakdown(task)}
            />
          );
        })}
        {tasks.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
            No tasks yet.{" "}
            <button onClick={() => setModalOpen(true)} className="font-semibold hover:underline" style={{ color: 'var(--text-primary)' }}>
              Add one
            </button>
            .
          </div>
        )}
      </div>

      {(modalOpen || editingTask) && (
        <TaskModal
          task={editingTask ?? undefined}
          categories={categories}
          isPremium={isPremium}
          onAdd={handleAdd}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingTask(null); }}
          onAddCategory={addCategory}
        />
      )}

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          onUpgrade={activate}
        />
      )}

      {breakdownTask && (
        <BreakdownModal
          task={breakdownTask}
          onClose={() => setBreakdownTask(null)}
          onAdd={(subtasks) => handleAddSubtasks(subtasks, breakdownTask)}
        />
      )}

      {voiceOpen && (
        <VoiceModal
          onClose={() => setVoiceOpen(false)}
          onAdd={handleAddVoiceTasks}
        />
      )}
    </div>
  );
}
