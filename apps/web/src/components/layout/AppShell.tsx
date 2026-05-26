"use client";

import { useState, type ReactNode } from "react";
import { RotateCcw, ListTodo, Moon, BarChart2, LogOut, User, X, Flame, Minus, Plus, Trophy, Clock, Zap, Check } from "lucide-react";
import { getSupabaseClient, THEMES, type ThemeName } from "@todo/shared";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useApp, type RestGoalTier, REST_GOAL_MINUTES } from "@/context/AppContext";
import { ACHIEVEMENT_DEFS, getUnlockedTierIds } from "@/utils/achievements";

export type TabId = "spin" | "tasks" | "rest" | "history";

const NAV_ITEMS: {
  id: TabId;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;
}[] = [
  { id: "spin",    label: "Spin",    Icon: RotateCcw },
  { id: "tasks",   label: "Tasks",   Icon: ListTodo  },
  { id: "rest",    label: "Rest",    Icon: Moon      },
  { id: "history", label: "History", Icon: BarChart2 },
];

interface AppShellProps {
  children: ReactNode;
  user: SupabaseUser | null;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  onSignOut: () => void;
}

export function AppShell({ children, user, activeTab, setActiveTab, onSignOut }: AppShellProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const { streak } = useApp();

  async function handleSignOut() {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // ignore if supabase not configured
    }
    onSignOut();
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-screen)' }}>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0" style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>
        {/* Brand */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base select-none" style={{ background: 'var(--bg-screen)' }}>
              ◎
            </div>
            <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>Wheel Todo</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: activeTab === id ? 'var(--bg-screen)' : 'transparent',
                color: activeTab === id ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <Icon size={17} strokeWidth={activeTab === id ? 2.2 : 1.8} />
              {label}
            </button>
          ))}
          {/* Streak badge */}
          {streak > 0 && (
            <button
              onClick={() => setActiveTab("history")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              <Flame size={17} strokeWidth={2} />
              {streak}-day streak
            </button>
          )}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setProfileOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--bg-screen)' }}>
              <User size={14} strokeWidth={1.8} />
            </div>
            <span className="truncate flex-1 text-left text-xs">
              {user?.email ?? "Account"}
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 pt-4 pb-2 shrink-0" style={{ background: 'var(--bg-screen)' }}>
          <div className="flex items-center gap-2">
            <span className="text-base select-none">◎</span>
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Wheel Todo</span>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <button
                onClick={() => setActiveTab("history")}
                className="flex items-center gap-1 rounded-full px-2.5 py-1"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <Flame size={12} strokeWidth={2} style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{streak}</span>
              </button>
            )}
            <button
              onClick={() => setProfileOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <User size={14} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </header>

        {/* Page */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* ── Mobile bottom nav ──────────────────────────── */}
        <nav className="md:hidden flex shrink-0 safe-area-bottom" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
            >
              <Icon
                size={20}
                strokeWidth={activeTab === id ? 2.2 : 1.8}
                style={{ color: activeTab === id ? 'var(--accent)' : 'var(--text-muted)' }}
              />
              <span
                className="text-[10px] font-semibold"
                style={{ color: activeTab === id ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {label}
              </span>
            </button>
          ))}
        </nav>
      </main>

      {/* ── Profile modal ─────────────────────────────── */}
      {profileOpen && (
        <ProfileModal user={user} onClose={() => setProfileOpen(false)} onSignOut={handleSignOut} />
      )}
    </div>
  );
}

// ─── Stepper helper ───────────────────────────────────────────────────────────

function Stepper({ value, min, max, step = 1, onChange, format }: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition-colors"
        style={{ background: 'var(--bg-screen)' }}
      >
        <Minus size={14} strokeWidth={2.5} />
      </button>
      <span className="w-14 text-center text-base font-bold" style={{ color: 'var(--text-primary)' }}>
        {format ? format(value) : value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition-colors"
        style={{ background: 'var(--bg-screen)' }}
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ─── Profile modal ────────────────────────────────────────────────────────────

interface ProfileModalProps {
  user: SupabaseUser | null;
  onClose: () => void;
  onSignOut: () => void;
}

const TIMER_STEPS = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];

type LucideIconComp = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const ACHIEVEMENT_ICON_MAP: Record<string, LucideIconComp> = {
  Flame: Flame,
  Trophy: Trophy,
  Clock: Clock,
  Zap: Zap,
  Moon: Moon,
  RotateCcw: RotateCcw,
};

const REST_TIERS: { id: RestGoalTier; label: string; description: string }[] = [
  { id: "easy",       label: "Easy",       description: `${REST_GOAL_MINUTES.easy} min`      },
  { id: "standard",   label: "Standard",   description: `${REST_GOAL_MINUTES.standard} min`  },
  { id: "dedicated",  label: "Dedicated",  description: `${REST_GOAL_MINUTES.dedicated} min` },
];

function ProfileModal({ user, onClose, onSignOut }: ProfileModalProps) {
  const {
    dailyGoal, setDailyGoal,
    defaultTimerMinutes, setDefaultTimerMinutes,
    restGoalTier, setRestGoalTier,
    categories, addCategory, removeCategory,
    completedTasks,
    achievementValues,
    theme, setTheme, themeAuto, setThemeAuto,
  } = useApp();

  const unlockedIds = getUnlockedTierIds(achievementValues);

  const [tab, setTab] = useState<"account" | "settings">("account");
  const [displayName, setDisplayName] = useState(
    (user?.user_metadata?.display_name as string | undefined) ?? ""
  );
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newCat, setNewCat] = useState("");

  const totalHours = completedTasks.reduce((s, t) => s + t.minutesActual, 0) / 60;
  const onTimePct = completedTasks.length > 0
    ? Math.round((completedTasks.filter((t) => t.minutesActual <= t.minutesEstimated).length / completedTasks.length) * 100)
    : 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const supabase = getSupabaseClient();
      const updates: Parameters<typeof supabase.auth.updateUser>[0] = {};
      if (displayName.trim()) updates.data = { display_name: displayName.trim() };
      if (newPassword.length >= 6) updates.password = newPassword;
      if (!updates.data && !updates.password) { setMessage("No changes to save."); return; }
      const { error } = await supabase.auth.updateUser(updates);
      if (error) { setMessage(error.message); } else { setMessage("Saved!"); setNewPassword(""); }
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function stepTimer(dir: 1 | -1) {
    const idx = TIMER_STEPS.indexOf(defaultTimerMinutes);
    const nextIdx = idx === -1
      ? (dir === 1 ? 0 : TIMER_STEPS.length - 1)
      : Math.max(0, Math.min(TIMER_STEPS.length - 1, idx + dir));
    setDefaultTimerMinutes(TIMER_STEPS[nextIdx]);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-0">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Profile</h2>
          <button onClick={onClose} className="transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-6 mt-4 rounded-xl p-1" style={{ background: 'var(--bg-screen)' }}>
          {(["account", "settings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize"
              style={{
                background: tab === t ? 'var(--bg-card)' : 'transparent',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: tab === t ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 pb-6 pt-4 space-y-4">
          {tab === "account" ? (
            <>
              {/* Stats row */}
              <div className="rounded-2xl flex py-4" style={{ background: 'var(--bg-input)' }}>
                <div className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{completedTasks.length}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Tasks done</span>
                </div>
                <div className="w-px" style={{ background: 'var(--border)' }} />
                <div className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalHours.toFixed(1)}h</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Focused</span>
                </div>
                <div className="w-px" style={{ background: 'var(--border)' }} />
                <div className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{onTimePct}%</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>On time</span>
                </div>
              </div>

              {/* Achievements */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Achievements</p>
                <div className="space-y-2">
                  {ACHIEVEMENT_DEFS.map((def) => {
                    const val = achievementValues[def.key];
                    const AchievIcon = ACHIEVEMENT_ICON_MAP[def.iconName];
                    const unlockedCount = def.tiers.filter((t) => unlockedIds.includes(t.id)).length;
                    return (
                      <div key={def.key} className="rounded-2xl p-3.5" style={{ background: 'var(--bg-input)' }}>
                        <div className="flex items-center gap-3 mb-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: def.color + "30" }}
                          >
                            {AchievIcon && (
                              <span style={{ color: def.color }}>
                                <AchievIcon size={16} strokeWidth={2} />
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{def.label}</p>
                            <p className="text-xs leading-tight" style={{ color: 'var(--text-muted)' }}>{def.description(val)}</p>
                          </div>
                          <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {unlockedCount}/{def.tiers.length}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          {def.tiers.map((tier) => {
                            const isUnlocked = unlockedIds.includes(tier.id);
                            return (
                              <div key={tier.id} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: isUnlocked ? def.color : 'var(--bg-track)' }}
                                />
                                <span
                                  className="text-[9px] text-center leading-tight font-medium"
                                  style={{ color: isUnlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}
                                >
                                  {tier.badge}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {user ? (
                <>
                  <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                  <form onSubmit={handleSave} className="flex flex-col gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--text-muted)' }}>Display name</label>
                      <input
                        type="text"
                        placeholder="Your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition"
                        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--text-muted)' }}>New password</label>
                      <input
                        type="password"
                        placeholder="Leave blank to keep current"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition"
                        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    {message && (
                      <p className={`text-sm ${message === "Saved!" ? "text-green-600" : "text-red-600"}`}>{message}</p>
                    )}
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full text-white font-semibold text-sm rounded-full py-3 transition disabled:opacity-50"
                      style={{ background: 'var(--text-primary)' }}
                    >
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                  </form>
                </>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Running without an account. Add Supabase credentials to enable sign-in.</p>
              )}

              <button
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-2 text-sm transition-colors py-2"
                style={{ color: 'var(--text-muted)' }}
              >
                <LogOut size={15} strokeWidth={2} />
                Sign out
              </button>
            </>
          ) : (
            <>
              {/* Default timer */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Default timer</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pre-filled when adding tasks</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => stepTimer(-1)}
                    disabled={defaultTimerMinutes <= TIMER_STEPS[0]}
                    className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition-colors"
                    style={{ background: 'var(--bg-screen)' }}
                  >
                    <Minus size={14} strokeWidth={2.5} />
                  </button>
                  <span className="w-14 text-center text-base font-bold" style={{ color: 'var(--text-primary)' }}>{defaultTimerMinutes}m</span>
                  <button
                    type="button"
                    onClick={() => stepTimer(1)}
                    disabled={defaultTimerMinutes >= TIMER_STEPS[TIMER_STEPS.length - 1]}
                    className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition-colors"
                    style={{ background: 'var(--bg-screen)' }}
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <div className="h-px" style={{ background: 'var(--bg-track)' }} />

              {/* Daily goal */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Daily goal</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tasks to complete each day</p>
                </div>
                <Stepper value={dailyGoal} min={1} max={20} onChange={setDailyGoal} />
              </div>

              <div className="h-px" style={{ background: 'var(--bg-track)' }} />

              {/* Theme */}
              <div>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Theme</p>

                {/* Auto toggle */}
                <button
                  onClick={() => setThemeAuto(!themeAuto)}
                  className="flex items-center justify-between w-full rounded-xl px-3.5 py-2.5 mb-3 transition-colors"
                  style={{ background: 'var(--bg-input)' }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Use device theme</span>
                  <div
                    className="relative w-10 h-6 rounded-full transition-colors"
                    style={{ background: themeAuto ? 'var(--accent)' : 'var(--bg-track)' }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                      style={{ transform: themeAuto ? 'translateX(18px)' : 'translateX(2px)' }}
                    />
                  </div>
                </button>

                {/* Theme cards */}
                <div
                  className="grid grid-cols-2 gap-2 transition-opacity"
                  style={{ opacity: themeAuto ? 0.4 : 1, pointerEvents: themeAuto ? 'none' : 'auto' }}
                >
                  {(Object.values(THEMES) as typeof THEMES[ThemeName][]).map((t) => {
                    const isActive = !themeAuto && theme === t.name;
                    const conicStops = (t.colors.wheel as readonly string[])
                      .map((c, i, a) => `${c} ${(i / a.length) * 100}% ${((i + 1) / a.length) * 100}%`)
                      .join(', ');
                    return (
                      <button
                        key={t.name}
                        onClick={() => setTheme(t.name)}
                        className="rounded-2xl p-3 flex flex-col gap-2.5 border-2 transition-all text-left relative"
                        style={{
                          background: t.colors.bgScreen,
                          borderColor: isActive ? t.colors.accent : t.colors.bgInput,
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-full shrink-0"
                          style={{ background: `conic-gradient(${conicStops})` }}
                        />
                        <div>
                          <span className="text-xs font-bold block leading-tight" style={{ color: t.colors.textPrimary }}>{t.label}</span>
                          <span className="text-[10px] leading-tight" style={{ color: t.colors.textSecondary }}>{t.dark ? 'Dark' : 'Light'}</span>
                        </div>
                        {isActive && (
                          <div
                            className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background: t.colors.accent }}
                          >
                            <Check size={9} strokeWidth={3} color={t.dark ? '#000' : '#fff'} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px" style={{ background: 'var(--bg-track)' }} />

              {/* Rest goal tier */}
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Rest goal</p>
                <div className="flex gap-2">
                  {REST_TIERS.map(({ id, label, description }) => (
                    <button
                      key={id}
                      onClick={() => setRestGoalTier(id)}
                      className="flex-1 rounded-xl py-2.5 flex flex-col items-center gap-0.5 border-2 transition-colors"
                      style={{
                        background: 'var(--bg-input)',
                        borderColor: restGoalTier === id ? 'var(--text-primary)' : 'transparent',
                      }}
                    >
                      <span className="text-xs font-bold" style={{ color: restGoalTier === id ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px" style={{ background: 'var(--bg-track)' }} />

              {/* Task labels */}
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Task labels</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {categories.map((cat) => (
                    <div key={cat} className="flex items-center gap-1 rounded-full px-3 py-1.5" style={{ background: 'var(--bg-screen)' }}>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{cat}</span>
                      <button
                        onClick={() => removeCategory(cat)}
                        className="transition-colors ml-0.5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New label…"
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCat.trim()) {
                        addCategory(newCat.trim());
                        setNewCat("");
                      }
                    }}
                    maxLength={30}
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition"
                    style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={() => { if (newCat.trim()) { addCategory(newCat.trim()); setNewCat(""); } }}
                    disabled={!newCat.trim()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 transition-opacity"
                    style={{ background: 'var(--text-primary)' }}
                  >
                    <Plus size={16} strokeWidth={2.5} className="text-white" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
