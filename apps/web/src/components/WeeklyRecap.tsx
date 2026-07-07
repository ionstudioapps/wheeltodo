"use client";

import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { WIcon, SectionLabel } from "@/components/ui/kit";

const CONFETTI_VARS = ["--wheel-1", "--wheel-2", "--wheel-3", "--wheel-4", "--wheel-5", "--wheel-6", "--wheel-7"];

export function WeeklyRecap({ onClose }: { onClose: () => void }) {
  const { completedTasks } = useApp();

  const { rangeLabel, weekTasks, dayCounts, bestDayName, topTask, focusMins } = useMemo(() => {
    const now = new Date();
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 = Monday
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - dow); weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);

    const inWeek = completedTasks.filter((t) => {
      const d = new Date(t.completedAt);
      return d >= weekStart && d <= weekEnd;
    });

    const counts = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const day = new Date(weekStart); day.setDate(weekStart.getDate() + i);
      const key = day.toDateString();
      return inWeek.filter((t) => new Date(t.completedAt).toDateString() === key).length;
    });

    const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const bestIdx = counts.indexOf(Math.max(...counts));

    const nameCounts: Record<string, number> = {};
    inWeek.forEach((t) => { nameCounts[t.taskName] = (nameCounts[t.taskName] ?? 0) + 1; });
    const top = Object.entries(nameCounts).sort((a, b) => b[1] - a[1])[0];

    const fmt = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" });
    return {
      rangeLabel: `${fmt(weekStart)} – ${fmt(weekEnd)}`,
      weekTasks: inWeek,
      dayCounts: counts,
      bestDayName: Math.max(...counts) > 0 ? DAY_NAMES[bestIdx] : null,
      topTask: top ?? null,
      focusMins: inWeek.reduce((s, t) => s + t.minutesActual, 0),
    };
  }, [completedTasks]);

  const maxN = Math.max(...dayCounts, 1);
  const hours = Math.floor(focusMins / 60);
  const mins = focusMins % 60;
  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const pieces = Array.from({ length: 18 }, (_, i) => ({
    l: 3 + (i * 43) % 94, t: 44 + (i * 61) % 210, v: CONFETTI_VARS[i % CONFETTI_VARS.length],
    r: (i * 53) % 360, w: 5 + (i % 3) * 2, h: 9 + (i % 2) * 3,
  }));

  return (
    <div className="wt-screen" style={{ position: "fixed", inset: 0, zIndex: 60, background: "var(--bg-screen)", overflow: "hidden" }}>
      {/* scattered confetti */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {pieces.map((p, i) => (
          <span key={i} style={{ position: "absolute", left: `${p.l}%`, top: p.t, width: p.w, height: p.h, background: `var(${p.v})`, borderRadius: 2, transform: `rotate(${p.r}deg)`, opacity: 0.62 }} />
        ))}
      </div>

      {/* close */}
      <button onClick={onClose} aria-label="Close recap" className="wt-press" style={{
        position: "absolute", top: 54, right: 22, zIndex: 2, width: 36, height: 36, borderRadius: 999,
        border: 0, background: "var(--bg-sunk)", color: "var(--text-primary)", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <WIcon name="x" size={17} />
      </button>

      <div style={{ padding: "54px 22px 36px", position: "relative", zIndex: 1, height: "100%", overflowY: "auto", maxWidth: 560, margin: "0 auto" }}>
        <p style={{ margin: "0 0 3px", fontSize: 13.5, fontWeight: 300, color: "var(--text-secondary)", letterSpacing: "0.04em" }}>{rangeLabel}</p>
        <div className="script" style={{ margin: "0 0 24px", fontFamily: "var(--font-display)", fontSize: 64, lineHeight: 0.88, color: "var(--text-primary)" }}>
          This<br /><span style={{ color: "var(--accent)" }}>week.</span>
        </div>

        {/* stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 20, padding: "15px 16px 13px", boxShadow: "var(--shadow-card)" }}>
            <SectionLabel style={{ fontSize: 10.5, marginBottom: 6 }}>Tasks done</SectionLabel>
            <div style={{ fontSize: 46, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{weekTasks.length}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>this week</div>
          </div>
          <div style={{ background: "var(--bg-card)", borderRadius: 20, padding: "15px 16px 13px", boxShadow: "var(--shadow-card)" }}>
            <SectionLabel style={{ fontSize: 10.5, marginBottom: 6 }}>Focused</SectionLabel>
            <div style={{ fontSize: 46, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {hours}<span style={{ fontSize: 18, fontWeight: 400, color: "var(--text-secondary)" }}>h {mins}m</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>focus time</div>
          </div>
        </div>

        {/* bar chart */}
        <div style={{ background: "var(--bg-card)", borderRadius: 20, padding: "15px 18px 13px", boxShadow: "var(--shadow-card)", marginBottom: 14 }}>
          <SectionLabel style={{ fontSize: 10.5, marginBottom: 12 }}>By day</SectionLabel>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 50 }}>
            {dayCounts.map((n, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%" }}>
                <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <div style={{ width: "100%", borderRadius: 4, minHeight: 3, height: n > 0 ? `${(n / maxN) * 100}%` : 3, background: n > 0 ? "var(--accent)" : "var(--bg-sunk)" }} />
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--text-muted)" }}>{DAY_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* top task */}
        {topTask && (
          <div style={{ background: "var(--ink)", borderRadius: 20, padding: "15px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 42, height: 42, borderRadius: 999, background: "var(--wheel-1)", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <WIcon name="award" size={19} color="var(--ink)" stroke={1.8} />
            </span>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-on-ink)", opacity: 0.45, marginBottom: 3 }}>MOST DONE</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-on-ink)" }}>{topTask[0]}</div>
              <div style={{ fontSize: 12.5, fontWeight: 300, color: "var(--text-on-ink)", opacity: 0.55, marginTop: 1 }}>
                Finished {topTask[1]} time{topTask[1] !== 1 ? "s" : ""} this week
              </div>
            </div>
          </div>
        )}

        <p style={{ marginTop: 20, fontSize: 13, fontWeight: 300, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.55 }}>
          {bestDayName ? <>Your best day was {bestDayName}.<br />Keep the momentum going.</> : <>Nothing logged yet this week.<br />The wheel is ready when you are.</>}
        </p>
      </div>
    </div>
  );
}
