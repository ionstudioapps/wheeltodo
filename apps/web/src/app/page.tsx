"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AppProvider, useApp } from "@/context/AppContext";
import { AuthPage } from "@/components/auth/AuthPage";
import { AppShell, type TabId } from "@/components/layout/AppShell";
import { TasksTab } from "@/components/tabs/TasksTab";
import { HabitsTab } from "@/components/tabs/HabitsTab";
import { YouTab } from "@/components/tabs/YouTab";
import { Onboarding } from "@/components/Onboarding";
import { getSupabaseClient } from "@todo/shared";

// ─── Authenticated app ────────────────────────────────────────────────────────

function AppContent({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>("tasks");
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const { hasSeenOnboarding, markOnboardingSeen } = useApp();

  return (
    <>
      {!hasSeenOnboarding && <Onboarding onDone={markOnboardingSeen} />}
      <AppShell
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddTask={() => setAddTaskOpen(true)}
        onSignOut={onSignOut}
      >
        {activeTab === "tasks"  && <TasksTab addTaskOpen={addTaskOpen} onAddTaskOpenChange={setAddTaskOpen} />}
        {activeTab === "habits" && <HabitsTab />}
        {activeTab === "you"    && <YouTab user={user} onSignOut={onSignOut} />}
      </AppShell>
    </>
  );
}

function AuthenticatedApp({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  return (
    <AppProvider userId={user?.id}>
      <AppContent user={user} onSignOut={onSignOut} />
    </AppProvider>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [supabase] = useState<ReturnType<typeof getSupabaseClient> | null>(() => {
    try { return getSupabaseClient(); } catch { return null; }
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const [guest, setGuest] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("wt.guest") === "1"
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg-screen)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 40, color: "var(--text-muted)", display: "inline-block", animation: "wt-idle-spin 1.2s linear infinite" }}>◎</span>
      </div>
    );
  }

  // Signed out and not in guest mode → login page (magic link first)
  if (!user && !guest && supabase) {
    return (
      <div>
        <AuthPage onAuthenticated={() => { /* session listener updates user */ }} />
        <div style={{ position: "fixed", bottom: 18, left: 0, right: 0, textAlign: "center" }}>
          <button
            onClick={() => { localStorage.setItem("wt.guest", "1"); setGuest(true); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 300, color: "var(--text-muted)", padding: 6 }}
          >
            Continue without an account
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthenticatedApp
      user={user}
      onSignOut={() => {
        localStorage.removeItem("wt.guest");
        setGuest(false);
        setUser(null);
      }}
    />
  );
}
