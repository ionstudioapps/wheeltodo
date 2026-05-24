"use client";

import { useMemo, useState } from "react";
import { Sparkles, X, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";

// ─── Suggestion pools ─────────────────────────────────────────────────────────

interface Suggestion {
  name: string;
  minutes: number;
}

const TASK_SUGGESTIONS: Suggestion[] = [
  { name: "Drink a glass of water",       minutes: 2 },
  { name: "Open the window",              minutes: 1 },
  { name: "Write down 3 priorities",      minutes: 5 },
  { name: "Clear your desk",              minutes: 5 },
  { name: "Take a 5-minute walk",         minutes: 5 },
  { name: "Make your bed",                minutes: 3 },
  { name: "Check in with a teammate",     minutes: 3 },
  { name: "Review your calendar",         minutes: 3 },
  { name: "Stretch for 2 minutes",        minutes: 2 },
  { name: "Step outside briefly",         minutes: 3 },
  { name: "Make a hot drink",             minutes: 4 },
  { name: "Close unused browser tabs",    minutes: 2 },
];

const REST_SUGGESTIONS: Suggestion[] = [
  { name: "Step outside for 5 minutes",        minutes: 5 },
  { name: "Make a cup of tea",                 minutes: 5 },
  { name: "Close your eyes for 2 minutes",     minutes: 2 },
  { name: "Drink a glass of water",            minutes: 2 },
  { name: "Take 5 deep breaths",               minutes: 2 },
  { name: "Stretch your neck and shoulders",   minutes: 3 },
  { name: "Look out a window for a minute",    minutes: 1 },
  { name: "Text someone you care about",       minutes: 3 },
  { name: "Put on a song you like",            minutes: 1 },
  { name: "Step away from your screen",        minutes: 3 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function pickDaily(pool: Suggestion[], n: number): Suggestion[] {
  // Seeded shuffle using today's date — same 3 picks all day, fresh tomorrow
  const seed =
    new Date().getFullYear() * 10000 +
    (new Date().getMonth() + 1) * 100 +
    new Date().getDate();
  const copy = [...pool];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = ((s * 1664525 + 1013904223) >>> 0);
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

interface StoredState {
  dismissed: boolean;
  done: string[];
  date: string;
}

function loadState(mode: "tasks" | "rest"): StoredState {
  const today = todayKey();
  try {
    const raw = localStorage.getItem(`wt.gentle-push.${mode}`);
    const parsed: StoredState = JSON.parse(raw ?? "{}");
    if (parsed.date !== today) return { dismissed: false, done: [], date: today };
    return parsed;
  } catch {
    return { dismissed: false, done: [], date: today };
  }
}

function saveState(mode: "tasks" | "rest", state: StoredState) {
  localStorage.setItem(`wt.gentle-push.${mode}`, JSON.stringify(state));
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GentlePushProps {
  mode: "tasks" | "rest";
}

export function GentlePush({ mode }: GentlePushProps) {
  const { logQuickWin } = useApp();
  const [state, setState] = useState<StoredState>(() => loadState(mode));

  const suggestions = useMemo(
    () => pickDaily(mode === "tasks" ? TASK_SUGGESTIONS : REST_SUGGESTIONS, 3),
    [mode],
  );

  const allDone = suggestions.every((s) => state.done.includes(s.name));
  if (state.dismissed || allDone) return null;

  function handleTap(s: Suggestion) {
    if (state.done.includes(s.name)) return;
    const next = { ...state, done: [...state.done, s.name] };
    setState(next);
    saveState(mode, next);
    logQuickWin(s.name, s.minutes);
  }

  function handleDismiss() {
    const next = { ...state, dismissed: true };
    setState(next);
    saveState(mode, next);
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={13} strokeWidth={2} style={{ color: 'var(--accent)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            A gentle push to start
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="transition-opacity hover:opacity-60"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {suggestions.map((s) => {
          const done = state.done.includes(s.name);
          return (
            <button
              key={s.name}
              onClick={() => handleTap(s)}
              disabled={done}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left w-full transition-all"
              style={{
                background: done ? 'var(--success)' + '18' : 'var(--bg-input)',
              }}
            >
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                style={{
                  borderColor: done ? 'var(--success)' : 'var(--border)',
                  background: done ? 'var(--success)' : 'transparent',
                }}
              >
                {done && <Check size={10} strokeWidth={3} color="white" />}
              </div>
              <span
                className="flex-1 text-sm font-medium transition-all"
                style={{
                  color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: done ? 'line-through' : 'none',
                }}
              >
                {s.name}
              </span>
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                {s.minutes}m
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
