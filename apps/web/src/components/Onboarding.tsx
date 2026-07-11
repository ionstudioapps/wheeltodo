"use client";

import { useApp } from "@/context/AppContext";
import { TUTORIAL_TASKS } from "@/lib/tutorial";
import { SpinPill, SectionLabel, WheelMark, TaskWheel } from "@/components/ui/kit";

/* First-run welcome — the tutorial IS five pre-loaded tasks that teach by doing. */

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { seedTasks } = useApp();

  function begin() {
    seedTasks(TUTORIAL_TASKS.map(({ id, name, minutes, color, icon }) => ({ id, name, minutes, color, icon, category: icon })));
    onDone();
  }

  function skip() {
    onDone();
  }

  const taskList = (
    <div style={{ width: "100%", background: "var(--bg-card)", borderRadius: 20, padding: "14px 16px", boxShadow: "var(--shadow-card)" }}>
      <SectionLabel style={{ margin: "0 0 11px 2px", fontSize: 11 }}>Start here · 5 tasks</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {TUTORIAL_TASKS.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 26, height: 26, borderRadius: 999, background: t.color, color: "var(--bg-card)", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
              {t.step}
            </span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 400, color: "var(--text-primary)" }}>{t.name}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", flexShrink: 0 }}>{t.feature}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--bg-screen)", overflowY: "auto" }}>

      {/* ── Mobile ── */}
      <div className="wt-mobile-only wt-screen" style={{ minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 26px 48px" }}>
        <div style={{ marginBottom: 22 }}>
          <WheelMark size={78} spin />
        </div>
        <p style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 300, color: "var(--text-secondary)" }}>Hello.</p>
        <p className="script" style={{ margin: "0 0 26px", fontFamily: "var(--font-display)", fontSize: 62, lineHeight: 0.88, color: "var(--text-primary)" }}>
          Welcome<span style={{ color: "var(--accent)" }}>.</span>
        </p>
        <div style={{ marginBottom: 20, width: "100%" }}>{taskList}</div>
        <SpinPill full onClick={begin}>Spin to begin</SpinPill>
        <button onClick={skip} style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 300, color: "var(--text-muted)", padding: 6 }}>
          Skip — I&apos;ll add my own tasks
        </button>
      </div>

      {/* ── Desktop split ── */}
      <div className="wt-desktop-only wt-screen" style={{ display: "flex", minHeight: "100%" }}>
        <div style={{ flex: "0 0 46%", background: "var(--accent-soft)", padding: "52px 56px", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
            <WheelMark size={32} />
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>WheelToDo</span>
          </div>
          <p style={{ margin: "0 0 5px", fontSize: 16, fontWeight: 300, color: "var(--text-secondary)" }}>Hello.</p>
          <p className="script" style={{ margin: "0 0 22px", fontFamily: "var(--font-display)", fontSize: 72, lineHeight: 0.88, color: "var(--text-primary)" }}>
            Welcome<span style={{ color: "var(--accent)" }}>.</span>
          </p>
          <p style={{ margin: 0, maxWidth: 340, fontSize: 15.5, fontWeight: 300, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            We&apos;ve loaded 5 tasks to show you around. Each one teaches a feature. Spin when you&apos;re ready.
          </p>
          <div style={{ position: "absolute", right: -80, bottom: -80, opacity: 0.72, pointerEvents: "none" }}>
            <TaskWheel size={280} slices={TUTORIAL_TASKS.map((t) => ({ id: t.id, color: t.color, label: String(t.step) }))} />
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 52 }}>
          <div style={{ width: "100%", maxWidth: 380 }}>
            {taskList}
            <div style={{ height: 26 }} />
            <SpinPill full onClick={begin}>Spin to begin</SpinPill>
            <p style={{ marginTop: 13, textAlign: "center" }}>
              <button onClick={skip} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 300, color: "var(--text-muted)", padding: 4 }}>
                Skip — I&apos;ll add my own tasks
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
