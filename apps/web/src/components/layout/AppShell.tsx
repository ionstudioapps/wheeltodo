"use client";

import { type ReactNode } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useApp } from "@/context/AppContext";
import { WIcon, WheelMark } from "@/components/ui/kit";

export type TabId = "tasks" | "habits" | "you";

interface AppShellProps {
  children: ReactNode;
  user: SupabaseUser | null;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  onAddTask: () => void;
  onSignOut: () => void;
}

const NAV_ITEMS: { id: TabId; label: string; icon: string }[] = [
  { id: "tasks", label: "Tasks", icon: "wheelTab" },
  { id: "habits", label: "Habits", icon: "grid" },
  { id: "you", label: "You", icon: "user" },
];

function userInitials(user: SupabaseUser | null) {
  const name = (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? "";
  const parts = name.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "IO";
}

function displayName(user: SupabaseUser | null) {
  return (user?.user_metadata?.display_name as string | undefined)
    ?? user?.email?.split("@")[0]
    ?? "Maker";
}

export function AppShell({ children, user, activeTab, setActiveTab, onAddTask }: AppShellProps) {
  const { streak, tasks, completedTasks } = useApp();
  const initials = userInitials(user);

  // Tutorial progress (Seed onboarding tasks are seeded with tut_ ids)
  const tutRemaining = tasks.filter((t) => t.id.startsWith("tut_")).length;
  const tutDone = new Set(completedTasks.filter((t) => t.taskId.startsWith("tut_")).map((t) => t.taskId)).size;
  const tutActive = tutRemaining > 0 && tutDone < 5;

  return (
    <div id="app" style={{ display: "flex", height: "100dvh", background: "var(--bg-screen)", color: "var(--text-primary)", overflow: "hidden" }}>

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="wt-desktop-only" style={{
        width: 214, flexShrink: 0, background: "var(--bg-card)",
        borderRight: "1px solid var(--border-hairline)",
        display: "flex", flexDirection: "column", padding: "28px 0 22px",
      }}>
        <div style={{ padding: "0 20px 26px", display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <WIcon name="wheelTab" size={16} color="var(--text-on-ink)" stroke={2.2} />
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>WheelToDo</span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "0 10px" }}>
          {NAV_ITEMS.map(({ id, label, icon }) => {
            const on = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12,
                cursor: "pointer", border: "none", textAlign: "left", width: "100%",
                background: on ? "var(--bg-screen)" : "transparent",
                color: on ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: 14, fontWeight: on ? 600 : 500,
                transition: "background 100ms ease, color 100ms ease",
              }}>
                <WIcon name={icon} size={17} stroke={1.8} />
                {label}
              </button>
            );
          })}
        </nav>

        {tutActive && (
          <div style={{ padding: "0 12px 14px" }}>
            <div style={{ background: "var(--c-coral-soft)", borderRadius: 14, padding: "11px 13px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 7, letterSpacing: "0.06em" }}>
                TUTORIAL · {tutDone}/5
              </div>
              <div style={{ height: 3, borderRadius: 99, background: "var(--bg-overlay)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(tutDone / 5) * 100}%`, background: "var(--accent)", borderRadius: 99 }} />
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: "0 10px" }}>
          <button onClick={() => setActiveTab("you")} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12,
            cursor: "pointer", border: "none", background: "transparent", width: "100%", textAlign: "left",
          }}>
            <span style={{ width: 30, height: 30, borderRadius: 999, background: "var(--c-lavender)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--text-on-ink)", flexShrink: 0 }}>
              {initials}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName(user)}
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>

        {/* Mobile top bar */}
        <header className="wt-mobile-only" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px 4px", flexShrink: 0 }}>
          <button
            onClick={() => setActiveTab("habits")}
            aria-label="View streak"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 500, color: "var(--text-secondary)", padding: 0 }}
          >
            <WIcon name="flame" size={18} color="var(--accent)" />
            <span style={{ color: "var(--text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{streak}</span>
          </button>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <button onClick={onAddTask} aria-label="Add task" className="wt-press" style={{ width: 42, height: 42, border: 0, background: "transparent", borderRadius: 999, color: "var(--text-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <WIcon name="plus" size={22} />
            </button>
            <button onClick={() => setActiveTab("you")} aria-label="Profile" className="wt-press" style={{
              width: 42, height: 42, borderRadius: 999, background: "var(--c-lavender)", color: "var(--text-on-ink)",
              border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              boxShadow: "inset 0 0 0 3px var(--bg-screen), 0 0 0 1px var(--c-lavender)",
            }}>
              {initials}
            </button>
          </span>
        </header>

        {/* Desktop top bar */}
        <header className="wt-desktop-only" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 52px 0", flexShrink: 0 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px 6px 10px", borderRadius: 9999, background: "var(--c-coral-soft)", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
            <WIcon name="flame" size={16} color="var(--accent)" />
            <span style={{ color: "var(--text-primary)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{streak}</span>
            <span>day streak</span>
          </span>
          <button onClick={onAddTask} aria-label="Add task" className="wt-press" style={{ width: 40, height: 40, border: "none", background: "transparent", borderRadius: 9999, color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <WIcon name="plus" size={20} />
          </button>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {children}
          {/* Clearance for the fixed mobile tab bar */}
          <div className="wt-mobile-only" style={{ height: 96 }} />
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="wt-mobile-only" style={{
          position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--bg-card)",
          boxShadow: "var(--shadow-tab)", display: "grid", gridTemplateColumns: "repeat(3,1fr)",
          padding: "10px 0 max(14px, env(safe-area-inset-bottom, 0px))",
        }}>
          {NAV_ITEMS.map(({ id, label, icon }) => {
            const on = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                background: "none", border: "none", cursor: "pointer", padding: 0,
                color: on ? "var(--text-primary)" : "var(--text-muted)", transition: "color 0.15s",
              }}>
                <WIcon name={icon} size={24} stroke={1.8} />
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export { userInitials, displayName, WheelMark };
