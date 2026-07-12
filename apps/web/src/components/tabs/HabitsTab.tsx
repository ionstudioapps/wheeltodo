"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, COLORS, FREE_LIMITS, type RestTask, type RestCategory } from "@/context/AppContext";
import { useSubscription } from "@/hooks/useSubscription";
import { WIcon, Headline, SpinPill, Sheet, SectionLabel, ConfettiBurst, Ring, TASK_CATEGORIES, TASK_ICON_PATHS } from "@/components/ui/kit";
import { UpgradeScreen, BloomNudge } from "@/components/Upgrade";
import { Toast, useToast } from "@/components/ui/Toast";
import { useDragReorder } from "@/hooks/useDragReorder";

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

// Each day is coloured by the habit that "owns" it — the first habit (in
// list order) completed that day — rather than a generic intensity ramp, so
// the heatmap reads as which habits are carrying the streak, not just how much.
function Heatmap({ dayData }: { dayData: Map<string, { count: number; color: string }> }) {
  const cells = useMemo(() => {
    const WEEKS = 13;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysFromMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const gridEnd = new Date(today); gridEnd.setDate(today.getDate() - daysFromMonday + 6);
    const gridStart = new Date(gridEnd); gridStart.setDate(gridEnd.getDate() - WEEKS * 7 + 1);

    const weeks: { count: number; color?: string; future: boolean; label: string }[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: { count: number; color?: string; future: boolean; label: string }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + w * 7 + d);
        const entry = dayData.get(day.toDateString());
        col.push({ count: entry?.count ?? 0, color: entry?.color, future: day > today, label: day.toLocaleDateString() });
      }
      weeks.push(col);
    }
    return weeks;
  }, [dayData]);

  return (
    <div style={{ display: "flex", gap: 5, justifyContent: "space-between" }}>
      {cells.map((col, w) => (
        <div key={w} style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          {col.map((c, d) => (
            <span key={d} title={c.label} style={{
              width: "100%", aspectRatio: "1", borderRadius: 4,
              background: c.color ?? "var(--bg-sunk)",
              opacity: c.future ? 0.25 : c.color ? Math.min(0.55 + c.count * 0.15, 1) : 1,
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Habit row ───────────────────────────────────────────────────────────── */

function HabitRow({ habit, streakDays, week, dragging, dropTarget, onToggle, onDelete, onGripPointerDown }: {
  habit: RestTask; streakDays: number; week: boolean[]; dragging?: boolean; dropTarget?: boolean;
  onToggle: () => void; onDelete: () => void; onGripPointerDown?: (e: React.PointerEvent) => void;
}) {
  const done = habit.completedToday;
  const color = habit.color ?? `var(${categoryVar(habit.category)})`;
  const iconPaths = habit.icon ? TASK_ICON_PATHS[habit.icon] : undefined;
  const initial = habit.name.trim()[0]?.toUpperCase() ?? "?";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, background: "var(--bg-card)", borderRadius: "var(--r-row)",
      padding: "16px 16px", boxShadow: "var(--shadow-card)",
      opacity: dragging ? 0.5 : 1,
      borderTop: dropTarget ? "2px solid var(--accent)" : "2px solid transparent",
    }}>
      <span
        onPointerDown={onGripPointerDown}
        style={{ cursor: onGripPointerDown ? "grab" : "default", touchAction: "none", color: "var(--text-muted)", flexShrink: 0, display: "flex" }}
      >
        <WIcon name="grip" size={16} stroke={1.6} />
      </span>
      <span style={{ width: 42, height: 42, borderRadius: 999, background: color, color: "var(--bg-card)", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600 }}>
        {iconPaths ? (
          <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            {iconPaths.map((d, k) => <path key={k} d={d} />)}
          </svg>
        ) : initial}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: done ? "var(--text-muted)" : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{habit.name}</div>
        <div style={{ fontSize: 13, fontWeight: 300, color: "var(--text-secondary)", marginTop: 1 }}>
          {`${habit.category === "My Tasks" ? "Custom" : habit.category} · ${streakDays > 0 ? `${streakDays} day streak` : "No streak yet"}`}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
          {week.map((f, i) => (
            <span key={i} style={{
              width: 11, height: 11, borderRadius: 999, flexShrink: 0,
              background: f ? color : "transparent",
              boxShadow: f ? "none" : "inset 0 0 0 1.5px var(--border-hairline)",
            }} />
          ))}
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="Delete habit" style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)", flexShrink: 0 }}>
        <WIcon name="trash" size={15} stroke={1.8} />
      </button>
      <button onClick={onToggle} aria-label={done ? "Mark not done" : "Mark done"} className="wt-press" style={{
        width: 30, height: 30, borderRadius: 999, flexShrink: 0, border: "none", cursor: "pointer",
        background: done ? color : "transparent",
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
  const { restTasks, toggleRestTask, addRestTask, removeRestTask, reorderRestTasks, habitHistory, habitStreak, cloudLoading } = useApp();
  const { isPremium, activate } = useSubscription();

  const [addOpen, setAddOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>("mind");
  const [color, setColor] = useState<string>(COLORS[0]);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  // One-shot celebration when the final habit of the day is checked off.
  const [celebrate, setCelebrate] = useState(false);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleToggleHabit(h: RestTask) {
    const completesAll = !h.completedToday && habits.every((x) => x.id === h.id || x.completedToday);
    toggleRestTask(h.id);
    if (completesAll) {
      setCelebrate(true);
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
      celebrateTimer.current = setTimeout(() => setCelebrate(false), 1800);
    }
  }

  function handleDeleteHabit(habit: RestTask) {
    removeRestTask(habit.id);
    showToast(`"${habit.name}" deleted`, () => {
      addRestTask(habit.name, habit.durationMinutes, habit.color, habit.icon, habit.category);
    });
  }

  const habits = restTasks.filter((t) => !t.isPreset);
  const { containerRef: habitListRef, dragIndex: habitDragIndex, overIndex: habitOverIndex, startDrag: startHabitDrag } = useDragReorder(habits, reorderRestTasks);

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

  const heatmapDayData = useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    habits.forEach((h) => {
      const color = h.color ?? `var(${categoryVar(h.category)})`;
      (habitHistory[h.id] ?? []).forEach((d) => {
        const existing = map.get(d);
        if (existing) existing.count += 1;
        else map.set(d, { count: 1, color });
      });
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
    addRestTask(name.trim(), 10, color, icon);
    setName("");
    setIcon("mind");
    setColor(COLORS[0]);
    setAddOpen(false);
  }

  const remaining = habits.length - doneToday;

  return (
    <div className="wt-page wt-page--narrow" style={{ position: "relative" }}>
      <ConfettiBurst active={celebrate} />

      <div style={{ position: "relative", zIndex: 2, paddingTop: 10 }}>
        {allDone ? (
          <Headline lead={`All ${habits.length === 3 ? "three" : habits.length}, done.`} script="See you tomorrow" size={46} />
        ) : doneToday > 0 ? (
          <Headline lead="Nice. Keep going." script="Show up" size={56} />
        ) : (
          <Headline lead="Show up." script="Every day" size={60} />
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

        {/* Heatmap — always visible, including after finishing the day */}
        <div style={{ paddingTop: 24 }}>
          <Heatmap dayData={heatmapDayData} />
        </div>

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
          <div ref={habitListRef} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {habits.map((h, i) => (
              <HabitRow
                key={h.id}
                habit={h}
                streakDays={habitStreak(h.id)}
                week={weekFor(h.id)}
                dragging={habitDragIndex === i}
                dropTarget={habitDragIndex !== null && habitOverIndex === i && habitOverIndex !== habitDragIndex}
                onToggle={() => handleToggleHabit(h)}
                onDelete={() => handleDeleteHabit(h)}
                onGripPointerDown={() => startHabitDrag(i)}
              />
            ))}

            {cloudLoading && habits.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-hidden>
                {[88, 88].map((h, i) => (
                  <div key={i} className="wt-skeleton" style={{ height: h, animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            )}

            {habits.length === 0 && !cloudLoading && (
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
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {habits.length > FREE_LIMITS.habits
                        ? `Seed includes ${FREE_LIMITS.habits} — your ${habits.length} still count`
                        : `${FREE_LIMITS.habits} of ${FREE_LIMITS.habits} habit slots used`}
                    </span>
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
              <span style={{ width: 30, height: 30, borderRadius: 999, background: color, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--bg-card)", fontSize: 13, fontWeight: 600 }}>
                {name.trim()[0]?.toUpperCase() ?? "?"}
              </span>
              <input
                autoFocus type="text" placeholder="e.g. Meditate" value={name} onChange={(e) => setName(e.target.value)}
                style={{ flex: 1, minWidth: 0, fontSize: 16, color: "var(--text-primary)", background: "transparent", border: "none", outline: "none", fontFamily: "inherit" }}
              />
            </div>
            <SectionLabel style={{ margin: "20px 2px 9px", fontSize: 12.5, letterSpacing: "0.04em", color: "var(--text-secondary)", textTransform: "uppercase" }}>Category</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 7 }}>
              {TASK_CATEGORIES.map((ic) => {
                const on = icon === ic.id;
                return (
                  <button key={ic.id} type="button" onClick={() => setIcon(ic.id)} title={ic.label} style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: "100%", aspectRatio: "1", borderRadius: 13, border: "none", cursor: "pointer",
                    background: on ? "var(--accent-soft)" : "var(--bg-input)",
                    outline: on ? `1.5px solid ${color}` : "none",
                    transition: "background 140ms ease",
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke={on ? color : "var(--text-secondary)"}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                      {TASK_ICON_PATHS[ic.id].map((d, k) => <path key={k} d={d} />)}
                    </svg>
                  </button>
                );
              })}
            </div>
            <SectionLabel style={{ margin: "20px 2px 9px", fontSize: 12.5, letterSpacing: "0.04em", color: "var(--text-secondary)", textTransform: "uppercase" }}>Colour</SectionLabel>
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
            <div style={{ marginTop: 22 }}>
              <SpinPill full type="submit">Add habit</SpinPill>
            </div>
          </form>
        </Sheet>
      )}

      {upgradeOpen && <UpgradeScreen onClose={() => setUpgradeOpen(false)} onActivate={(b) => { void activate(b); setUpgradeOpen(false); }} />}
      <Toast toast={toast} onUndo={() => { toast?.onUndo?.(); dismissToast(); }} onDismiss={dismissToast} />
    </div>
  );
}
