"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp, FREE_LIMITS, type RestTask, type RestCategory } from "@/context/AppContext";
import { useSubscription } from "@/hooks/useSubscription";
import { WIcon, Headline, SpinPill, Sheet, SectionLabel, ConfettiField } from "@/components/ui/kit";
import { UpgradeScreen, BloomNudge } from "@/components/Upgrade";

/* Category → palette accent (CSS vars only) */
const CATEGORY_META: { id: RestCategory; label: string; colorVar: string }[] = [
  { id: "Physical", label: "Physical", colorVar: "--c-sage" },
  { id: "Mental", label: "Mental", colorVar: "--c-lavender" },
  { id: "Social", label: "Social", colorVar: "--c-mint" },
  { id: "Nourishment", label: "Nourish", colorVar: "--c-honey" },
];

function categoryVar(cat: RestCategory) {
  return CATEGORY_META.find((c) => c.id === cat)?.colorVar ?? "--c-lilac";
}

const SEED_KEY = "wt.habitsSeeded";
const STARTERS: { name: string; mins: number; cat: RestCategory }[] = [
  { name: "Stretch", mins: 10, cat: "Physical" },
  { name: "Read a book", mins: 15, cat: "Mental" },
  { name: "Drink water", mins: 1, cat: "Physical" },
];

/* ── Heatmap (13 weeks, intensity = habits done that day) ────────────────── */

function Heatmap({ countsByDay }: { countsByDay: Map<string, number> }) {
  const cells = useMemo(() => {
    const WEEKS = 13;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysFromMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const gridEnd = new Date(today); gridEnd.setDate(today.getDate() - daysFromMonday + 6);
    const gridStart = new Date(gridEnd); gridStart.setDate(gridEnd.getDate() - WEEKS * 7 + 1);

    const weeks: { level: number; future: boolean; label: string }[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: { level: number; future: boolean; label: string }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + w * 7 + d);
        const n = countsByDay.get(day.toDateString()) ?? 0;
        col.push({ level: Math.min(n, 4), future: day > today, label: day.toLocaleDateString() });
      }
      weeks.push(col);
    }
    return weeks;
  }, [countsByDay]);

  return (
    <div style={{ display: "flex", gap: 5, justifyContent: "space-between" }}>
      {cells.map((col, w) => (
        <div key={w} style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          {col.map((c, d) => (
            <span key={d} title={c.label} style={{
              width: "100%", aspectRatio: "1", borderRadius: 4,
              background: c.level === 0 ? "var(--bg-sunk)" : `var(--heat-${c.level})`,
              opacity: c.future ? 0.25 : 1,
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Progress ring ───────────────────────────────────────────────────────── */

function Ring({ progress, size = 64, stroke = 7, color = "var(--accent)", children }: {
  progress: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-sunk)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - progress)} style={{ transition: "stroke-dashoffset 400ms var(--ease-out)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

/* ── Habit row ───────────────────────────────────────────────────────────── */

function HabitRow({ habit, streakDays, week, onToggle, onDelete }: {
  habit: RestTask; streakDays: number; week: boolean[];
  onToggle: () => void; onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const done = habit.completedToday;
  const color = `var(${categoryVar(habit.category)})`;
  const initial = habit.name.trim()[0]?.toUpperCase() ?? "?";

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmDelete) onDelete();
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 2500); }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--bg-card)", borderRadius: "var(--r-row)", padding: "16px 16px", boxShadow: "var(--shadow-card)" }}>
      <span style={{ width: 42, height: 42, borderRadius: 999, background: habit.color ?? color, color: "var(--bg-card)", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600 }}>
        {initial}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: done ? "var(--text-muted)" : "var(--text-primary)" }}>{habit.name}</div>
        <div style={{ fontSize: 13, fontWeight: 300, color: confirmDelete ? "var(--action-danger)" : "var(--text-secondary)", marginTop: 1 }}>
          {confirmDelete
            ? "Tap again to delete"
            : `${habit.category === "My Tasks" ? "Custom" : habit.category} · ${streakDays > 0 ? `${streakDays} day streak` : "No streak yet"}`}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
          {week.map((f, i) => (
            <span key={i} style={{
              width: 11, height: 11, borderRadius: 999, flexShrink: 0,
              background: f ? (habit.color ?? color) : "transparent",
              boxShadow: f ? "none" : "inset 0 0 0 1.5px var(--border-hairline)",
            }} />
          ))}
        </div>
      </div>
      <button onClick={handleDelete} aria-label="Delete habit" style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: confirmDelete ? "var(--action-danger)" : "var(--text-muted)", flexShrink: 0 }}>
        <WIcon name="trash" size={15} stroke={1.8} />
      </button>
      <button onClick={onToggle} aria-label={done ? "Mark not done" : "Mark done"} className="wt-press" style={{
        width: 30, height: 30, borderRadius: 999, flexShrink: 0, border: "none", cursor: "pointer",
        background: done ? (habit.color ?? color) : "transparent",
        boxShadow: done ? "none" : "inset 0 0 0 1.5px var(--border-hairline)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
        <WIcon name="check" size={15} stroke={done ? 2.6 : 2} color={done ? "var(--bg-card)" : "var(--text-muted)"} />
      </button>
    </div>
  );
}

/* ── Main HabitsTab ──────────────────────────────────────────────────────── */

export function HabitsTab() {
  const { restTasks, toggleRestTask, addRestTask, removeRestTask, habitHistory, habitStreak } = useApp();
  const { isPremium, activate } = useSubscription();

  const [addOpen, setAddOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [name, setName] = useState("");
  const [cat, setCat] = useState<RestCategory>("Physical");

  const habits = restTasks.filter((t) => !t.isPreset);

  // Seed three starter habits on first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(SEED_KEY)) return;
    localStorage.setItem(SEED_KEY, "1");
    if (habits.length === 0) {
      STARTERS.forEach((s) => addRestTask(s.name, s.mins, undefined, undefined, s.cat));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    habits.forEach((h) => {
      (habitHistory[h.id] ?? []).forEach((d) => map.set(d, (map.get(d) ?? 0) + 1));
    });
    return map;
  }, [habits, habitHistory]);

  const weekFor = (id: string) => {
    const dates = new Set(habitHistory[id] ?? []);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysFromMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - daysFromMonday + i);
      return dates.has(d.toDateString());
    });
  };

  const doneToday = habits.filter((h) => h.completedToday).length;
  const allDone = habits.length > 0 && doneToday === habits.length;
  const bestStreak = Math.max(0, ...habits.map((h) => habitStreak(h.id)));
  const atCap = !isPremium && habits.length >= FREE_LIMITS.habits;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addRestTask(name.trim(), 10, undefined, undefined, cat);
    setName("");
    setCat("Physical");
    setAddOpen(false);
  }

  const remaining = habits.length - doneToday;

  return (
    <div className="wt-page wt-page--narrow" style={{ position: "relative" }}>
      {allDone && <ConfettiField count={24} />}

      <div style={{ position: "relative", zIndex: 2, paddingTop: 10 }}>
        {allDone ? (
          <Headline lead={`All ${habits.length === 3 ? "three" : habits.length}, done.`} script="See you tomorrow" size={42} />
        ) : doneToday > 0 ? (
          <Headline lead="Nice. Keep going." script="Show up" size={52} />
        ) : (
          <Headline lead="Show up." script="Every day" size={56} />
        )}

        {/* All-done ring */}
        {allDone && (
          <div style={{ display: "flex", justifyContent: "center", padding: "30px 0 6px" }}>
            <Ring progress={1} size={150} stroke={13} color="var(--action-success)">
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 38, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1 }}>{doneToday}/{habits.length}</div>
                <SectionLabel style={{ fontSize: 12, marginTop: 4 }}>Today</SectionLabel>
              </div>
            </Ring>
          </div>
        )}

        {/* Heatmap */}
        {!allDone && (
          <div style={{ paddingTop: 24 }}>
            <Heatmap countsByDay={countsByDay} />
          </div>
        )}

        {/* Stat cards */}
        <div style={{ paddingTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            [`${doneToday}/${habits.length}`, "TODAY"],
            [String(bestStreak), "BEST STREAK"],
            [String(habits.length), "HABITS"],
          ].map(([n, l]) => (
            <div key={l} style={{ background: "var(--bg-card)", borderRadius: 20, padding: "16px 14px", boxShadow: "var(--shadow-card)" }}>
              <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{n}</div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--text-secondary)", marginTop: 6 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Today list */}
        <div style={{ paddingTop: 26 }}>
          <SectionLabel style={{ margin: "0 0 12px 2px", fontSize: 12 }}>Today</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {habits.map((h) => (
              <HabitRow
                key={h.id}
                habit={h}
                streakDays={habitStreak(h.id)}
                week={weekFor(h.id)}
                onToggle={() => toggleRestTask(h.id)}
                onDelete={() => removeRestTask(h.id)}
              />
            ))}

            {habits.length === 0 && (
              <p style={{ margin: "4px 0 6px", fontSize: 14, fontWeight: 300, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
                Small and daily beats big and rare.
              </p>
            )}

            {atCap ? (
              <>
                <div style={{ background: "var(--bg-card)", borderRadius: "var(--r-card)", padding: "14px 16px", boxShadow: "var(--shadow-card)", display: "flex", alignItems: "center", gap: 14, opacity: 0.6 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 999, background: "var(--bg-sunk)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <WIcon name="plus" size={14} color="var(--text-muted)" />
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontSize: 16, fontWeight: 500, color: "var(--text-muted)" }}>Add a habit</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{FREE_LIMITS.habits} of {FREE_LIMITS.habits} habit slots used</span>
                  </span>
                  <span style={{ background: "var(--c-lavender)", borderRadius: "var(--r-tag)", padding: "4px 10px", flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-on-ink)", letterSpacing: "0.06em" }}>BLOOM</span>
                  </span>
                </div>
                <BloomNudge label="Unlimited habits with Bloom" onClick={() => setUpgradeOpen(true)} />
              </>
            ) : (
              <button onClick={() => setAddOpen(true)} className="wt-press" style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 56,
                borderRadius: "var(--r-row)", border: "1.5px dashed var(--border-hairline)",
                color: "var(--text-secondary)", fontSize: 15, fontWeight: 500, background: "transparent", cursor: "pointer",
              }}>
                <WIcon name="plus" size={18} /> New habit
              </button>
            )}
          </div>

          {!allDone && habits.length > 0 && remaining > 0 && (
            <p style={{ margin: "16px 0 0", fontSize: 13, fontWeight: 300, color: "var(--text-muted)", textAlign: "center" }}>
              {remaining} habit{remaining !== 1 ? "s" : ""} left to close your day.
            </p>
          )}
        </div>
      </div>

      {/* New habit sheet */}
      {addOpen && (
        <Sheet onClose={() => setAddOpen(false)}>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 600, color: "var(--text-primary)" }}>New habit</h2>
          <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 300, color: "var(--text-secondary)" }}>Small and daily beats big and rare.</p>
          <form onSubmit={handleAdd}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--bg-input)", borderRadius: "var(--r-row)", padding: "0 16px", height: 56, boxShadow: "inset 0 0 0 2px var(--accent)" }}>
              <span style={{ width: 30, height: 30, borderRadius: 999, background: `var(${categoryVar(cat)})`, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--bg-card)", fontSize: 13, fontWeight: 600 }}>
                {name.trim()[0]?.toUpperCase() ?? "?"}
              </span>
              <input
                autoFocus type="text" placeholder="e.g. Meditate" value={name} onChange={(e) => setName(e.target.value)}
                style={{ flex: 1, minWidth: 0, fontSize: 16, color: "var(--text-primary)", background: "transparent", border: "none", outline: "none", fontFamily: "inherit" }}
              />
            </div>
            <SectionLabel style={{ margin: "20px 2px 9px", fontSize: 12.5, letterSpacing: "0.04em", color: "var(--text-secondary)", textTransform: "uppercase" }}>Category</SectionLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CATEGORY_META.map((c) => {
                const on = cat === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => setCat(c.id)} style={{
                    display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 999,
                    border: "none", cursor: "pointer",
                    background: on ? "var(--ink)" : "var(--bg-input)",
                    color: on ? "var(--text-on-ink)" : "var(--text-secondary)",
                    fontSize: 14, fontWeight: 500, transition: "background 120ms ease",
                  }}>
                    <span style={{ width: 11, height: 11, borderRadius: 999, background: `var(${c.colorVar})` }} /> {c.label}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 22 }}>
              <SpinPill full type="submit">Add habit</SpinPill>
            </div>
          </form>
        </Sheet>
      )}

      {upgradeOpen && <UpgradeScreen onClose={() => setUpgradeOpen(false)} onActivate={() => { void activate(); setUpgradeOpen(false); }} />}
    </div>
  );
}
