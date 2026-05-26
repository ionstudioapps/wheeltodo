"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AppProvider, useApp } from "@/context/AppContext";
import { AuthPage } from "@/components/auth/AuthPage";
import { AppShell, type TabId } from "@/components/layout/AppShell";
import { SpinTab } from "@/components/tabs/SpinTab";
import { TasksTab } from "@/components/tabs/TasksTab";
import { RestTab } from "@/components/tabs/RestTab";
import { HistoryTab } from "@/components/tabs/HistoryTab";
import { Onboarding } from "@/components/Onboarding";
import { getSupabaseClient } from "@todo/shared";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// ─── Authenticated app ────────────────────────────────────────────────────────

function AppContent({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>("spin");
  const { hasSeenOnboarding, markOnboardingSeen } = useApp();

  return (
    <>
      {!hasSeenOnboarding && <Onboarding onDone={markOnboardingSeen} />}
      <AppShell user={user} activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={onSignOut}>
        {activeTab === "spin"    && <SpinTab onNavigateToTasks={() => setActiveTab("tasks")} />}
        {activeTab === "tasks"   && <TasksTab />}
        {activeTab === "rest"    && <RestTab />}
        {activeTab === "history" && <HistoryTab />}
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipAuth, setSkipAuth] = useState(false);

  useEffect(() => {
    let supabase: ReturnType<typeof getSupabaseClient> | null = null;
    try {
      supabase = getSupabaseClient();
    } catch {
      // Supabase env not configured — skip auth and go straight to app
      setSkipAuth(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <span className="text-4xl text-[#aaaaaa] animate-spin inline-block">◎</span>
      </div>
    );
  }

  // Login is optional — show the app immediately, gate only premium features.
  return (
    <ErrorBoundary>
      <AuthenticatedApp user={user} onSignOut={() => setUser(null)} />
    </ErrorBoundary>
  );
}
