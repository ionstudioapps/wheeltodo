"use client";

import { useRef, useState } from "react";
import { useApp, type RestTask } from "@/context/AppContext";
import { WIcon, Sheet, SectionLabel } from "@/components/ui/kit";

/* Streak panel — opened from the flame icon. Shows the streak itself plus
   the Quick Rest activities, framed as the guilt-free way to keep a streak
   alive on a day when no task is getting done. */

const CATEGORY_VARS: Record<string, string> = {
  Physical: "--wheel-3", Mental: "--wheel-5", Social: "--wheel-2", Nourishment: "--wheel-4",
};
const categoryVar = (c: string) => CATEGORY_VARS[c] ?? "--wheel-6";

function QuickRestChip({ task, onToggle }: { task: RestTask; onToggle: () => void }) {
  const done = task.completedToday;
  const color = `var(${categoryVar(task.category)})`;
  return (
    <button onClick={onToggle} className="wt-press" style={{
      display: "inline-flex", alignItems: "center", gap: 7, borderRadius: "var(--r-tag)",
      padding: "9px 14px", border: "none", cursor: "pointer",
      background: done ? color : "var(--bg-card)",
      boxShadow: done ? "none" : "var(--shadow-card)",
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: 999, flexShrink: 0,
        background: done ? "var(--bg-card)" : color, opacity: done ? 0.9 : 0.35,
      }} />
      <span style={{ fontSize: 13.5, fontWeight: 500, color: done ? "var(--text-on-ink)" : "var(--text-primary)", whiteSpace: "nowrap" }}>
        {task.name}
      </span>
    </button>
  );
}

export function StreakPanel({ onClose }: { onClose: () => void }) {
  const { streak, bestStreak, hasActivityToday, restTasks, toggleRestTask } = useApp();
  const quickRest = restTasks.filter((t) => t.isPreset);

  const [justPreserved, setJustPreserved] = useState(false);
  const preservedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleToggle(task: RestTask) {
    const nowDone = !task.completedToday;
    toggleRestTask(task.id);
    if (nowDone && !hasActivityToday) {
      setJustPreserved(true);
      if (preservedTimer.current) clearTimeout(preservedTimer.current);
      preservedTimer.current = setTimeout(() => setJustPreserved(false), 3000);
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <span style={{ width: 44, height: 44, borderRadius: 999, background: "var(--c-coral-soft)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <WIcon name="flame" size={20} color="var(--accent)" />
        </span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.2 }}>
            {streak}-day streak
          </div>
          <div style={{ fontSize: 13, fontWeight: 300, color: "var(--text-secondary)" }}>
            Best so far: {bestStreak} day{bestStreak !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {justPreserved ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--c-sage-soft)", borderRadius: 14, padding: "12px 14px", marginTop: 14 }}>
          <WIcon name="sparkle" size={16} color="var(--action-success)" />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
            Your streak is preserved for today.
          </p>
        </div>
      ) : (
        <p style={{ margin: "14px 0 0", fontSize: 14, fontWeight: 300, color: "var(--text-secondary)", lineHeight: 1.55 }}>
          {hasActivityToday
            ? "Today already counts. The streak is safe."
            : "Nothing logged yet today. A task keeps the streak going — and so does rest."}
        </p>
      )}

      <div style={{ margin: "20px 0 0", paddingTop: 18, borderTop: "1px solid var(--border-hairline)" }}>
        <SectionLabel style={{ margin: "0 0 4px", fontSize: 12 }}>Quick rest</SectionLabel>
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 300, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Heavy day? One of these still counts as showing up — no guilt, same streak.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {quickRest.map((task) => (
            <QuickRestChip key={task.id} task={task} onToggle={() => handleToggle(task)} />
          ))}
        </div>
      </div>
    </Sheet>
  );
}
