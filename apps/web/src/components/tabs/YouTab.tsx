"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { THEMES, type ThemeName, getSupabaseClient } from "@todo/shared";
import { useApp, type NotifPrefs } from "@/context/AppContext";
import { useSubscription } from "@/hooks/useSubscription";
import { WIcon, Toggle, SectionLabel, SpinPill } from "@/components/ui/kit";
import { UpgradeScreen } from "@/components/Upgrade";

interface YouTabProps {
  user: User | null;
  onSignOut: () => void;
}

const THEME_SUBS: Record<ThemeName, string> = {
  "warm-start": "Light",
  "slow-down": "Dark",
  "light-a11y": "High contrast · Light",
  "dark-a11y": "High contrast · Dark",
};

const NOTIF_ROWS: { key: keyof NotifPrefs; icon: string; chipVar: string; iconVar: string; title: string; desc: string }[] = [
  { key: "nudge", icon: "bell", chipVar: "--c-honey-soft", iconVar: "--c-honey", title: "Gentle nudge", desc: "One calm reminder if the day's untouched" },
  { key: "focus", icon: "focus", chipVar: "--c-blush-soft", iconVar: "--accent", title: "Focus alerts", desc: "A quiet note when a session finishes" },
  { key: "recap", icon: "calendar", chipVar: "--c-lavender-soft", iconVar: "--c-lavender", title: "Weekly recap", desc: "Sunday evening · your week in numbers" },
];

export function YouTab({ user, onSignOut }: YouTabProps) {
  const { theme, setTheme, streak, completedTasks, notifPrefs, setNotifPref, resetOnboarding } = useApp();
  const { isPremium, activate, deactivate, planBilling, setPlanBilling } = useSubscription();
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState((user?.user_metadata?.display_name as string | undefined) ?? "");
  const [newPassword, setNewPassword] = useState("");

  const heroName = (user?.user_metadata?.display_name as string | undefined)
    ?? user?.email?.split("@")[0]
    ?? "Maker";

  async function handleSignOut() {
    try { const sb = getSupabaseClient(); await sb.auth.signOut(); } catch { /* offline sign-out is fine */ }
    onSignOut();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const sb = getSupabaseClient();
      const updates: Parameters<typeof sb.auth.updateUser>[0] = {};
      if (displayName.trim()) updates.data = { display_name: displayName.trim() };
      if (newPassword.length >= 6) updates.password = newPassword;
      if (!updates.data && !updates.password) { setMsg("No changes."); setSaving(false); return; }
      const { error } = await sb.auth.updateUser(updates);
      if (error) setMsg(error.message); else { setMsg("Saved."); setNewPassword(""); }
    } catch { setMsg("Something went wrong."); }
    finally { setSaving(false); }
  }

  function handleNotifToggle(key: keyof NotifPrefs, value: boolean) {
    setNotifPref(key, value);
    if (value && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "13px 16px", borderRadius: "var(--r-row)", background: "var(--bg-input)",
    border: "none", fontSize: 14, color: "var(--text-primary)", outline: "none", fontFamily: "inherit",
  };

  const settingsCard = (
    <div style={{ background: "var(--bg-card)", borderRadius: "var(--r-card)", boxShadow: "var(--shadow-card)", overflow: "hidden" }}>
      {NOTIF_ROWS.map((row, i) => (
        <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", boxShadow: i > 0 ? "inset 0 1px 0 var(--border-hairline)" : "none" }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: `var(${row.chipVar})`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <WIcon name={row.icon} size={20} color={`var(${row.iconVar})`} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 15, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.3 }}>{row.title}</span>
            <span style={{ display: "block", fontSize: 13, fontWeight: 300, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>{row.desc}</span>
          </span>
          <Toggle value={notifPrefs[row.key]} onChange={(v) => handleNotifToggle(row.key, v)} label={row.title} />
        </div>
      ))}
    </div>
  );

  const themeGrid = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {(Object.values(THEMES)).map((t) => {
        const on = theme === t.name;
        return (
          <button key={t.name} onClick={() => setTheme(t.name as ThemeName)} className="wt-press" style={{
            position: "relative", border: "none", textAlign: "left", borderRadius: 16, padding: "15px 14px",
            display: "flex", alignItems: "center", gap: 11, cursor: "pointer",
            background: t.colors.bgCard, boxShadow: "var(--shadow-card)",
            outline: on ? `2px solid ${t.colors.textPrimary}` : "1px solid transparent",
          }}>
            <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, background: t.colors.bgScreen, display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 0 0 1px var(--bg-overlay)" }}>
              <span style={{ width: 16, height: 16, borderRadius: 9999, background: t.colors.accent, boxShadow: "0 1px 2px var(--bg-overlay)" }} />
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.2, whiteSpace: "nowrap", color: t.colors.textPrimary }}>{t.label}</span>
              <span style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.3, color: t.colors.textSecondary }}>{THEME_SUBS[t.name as ThemeName]}</span>
            </span>
            {on && (
              <span style={{ position: "absolute", top: 10, right: 10, width: 18, height: 18, borderRadius: 9999, background: t.colors.textPrimary, color: t.colors.bgCard, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <WIcon name="check" size={10} stroke={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const otherBilling = planBilling === "annual" ? "monthly" : "annual";
  const planCard = isPremium ? (
    <div style={{ background: "var(--bg-card)", borderRadius: "var(--r-card)", padding: "18px 20px", boxShadow: "var(--shadow-card)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 16, color: "var(--text-primary)", fontWeight: 500 }}>
          Bloom{planBilling ? ` · ${planBilling}` : ""}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--c-sage-soft)", borderRadius: "var(--r-tag)", padding: "4px 10px" }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--c-sage)" }} />
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--action-success)" }}>Active</span>
        </span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>Unlimited spins, habits and AI · thank you for growing with us</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, borderTop: "1px solid var(--border-hairline)", paddingTop: 10 }}>
        <button
          onClick={() => setPlanBilling(otherBilling)}
          style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "7px 0", fontSize: 13.5, fontWeight: 500, color: "var(--text-primary)" }}
        >
          Switch to {otherBilling} billing
        </button>
        {confirmDowngrade ? (
          <div style={{ padding: "7px 0" }}>
            <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Move to Seed? Your extra habits and tasks stay — the free caps only limit adding new ones.
            </p>
            <div style={{ display: "flex", gap: 14 }}>
              <button onClick={() => { deactivate(); setConfirmDowngrade(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13, fontWeight: 600, color: "var(--action-danger)" }}>
                Yes, move to Seed
              </button>
              <button onClick={() => setConfirmDowngrade(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13, color: "var(--text-secondary)" }}>
                Keep Bloom
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDowngrade(true)}
            style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "7px 0", fontSize: 13.5, color: "var(--text-muted)" }}
          >
            Downgrade to Seed
          </button>
        )}
      </div>
    </div>
  ) : (
    <div style={{ background: "var(--bg-card)", borderRadius: "var(--r-card)", padding: "18px 20px", boxShadow: "var(--shadow-card)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 16, color: "var(--text-primary)", fontWeight: 500 }}>Seed · Free</span>
        <span style={{ background: "var(--c-lavender)", borderRadius: "var(--r-tag)", padding: "4px 10px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-on-ink)", letterSpacing: "0.06em" }}>BLOOM</span>
        </span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>5 spins/day · 3 habits · 1 AI breakdown/day</div>
      <SpinPill full onClick={() => setUpgradeOpen(true)} style={{ height: 48, fontSize: 15 }}>More with Bloom</SpinPill>
    </div>
  );

  const accountBlock = user ? (
    <div>
      <SectionLabel style={{ marginBottom: 14 }}>Account</SectionLabel>
      <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 300, color: "var(--text-secondary)" }}>{user.email}</p>
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="text" placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />
        <input type="password" placeholder="New password (leave blank to keep)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" style={inputStyle} />
        {msg && <p style={{ margin: 0, fontSize: 13, color: msg === "Saved." ? "var(--action-success)" : "var(--action-danger)" }}>{msg}</p>}
        <SpinPill full type="submit" disabled={saving} style={{ height: 48, fontSize: 15 }}>
          {saving ? "Saving…" : "Save changes"}
        </SpinPill>
      </form>
    </div>
  ) : (
    <p style={{ margin: 0, fontSize: 13, fontWeight: 300, color: "var(--text-muted)" }}>Running without an account.</p>
  );

  return (
    <div className="wt-page">
      {/* Hero */}
      <div style={{ paddingTop: 10, marginBottom: 30 }}>
        <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 300, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>Hello,</p>
        <p className="script" style={{ marginTop: 0, marginRight: 0, marginBottom: 0, fontFamily: "var(--font-display)", fontSize: 70, lineHeight: 0.85, color: "var(--text-primary)" }}>
          {heroName}<span style={{ color: "var(--accent)" }}>.</span>
        </p>
      </div>

      <div className="wt-tasks-layout" style={{ gap: 28 }}>
        <div className="wt-tasks-main" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {/* Overview */}
          <div>
            <SectionLabel style={{ marginBottom: 14 }}>Overview</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ background: "var(--bg-card)", borderRadius: "var(--r-card)", padding: "22px 22px 20px", boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", gap: 14 }}>
                <span style={{ width: 38, height: 38, borderRadius: 9999, background: "var(--c-coral-soft)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <WIcon name="flame" size={18} color="var(--accent)" />
                </span>
                <div>
                  <div style={{ fontSize: 48, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}>{streak}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)", marginTop: 4 }}>Day streak</div>
                </div>
              </div>
              <div style={{ background: "var(--bg-card)", borderRadius: "var(--r-card)", padding: "22px 22px 20px", boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", gap: 14 }}>
                <span style={{ width: 38, height: 38, borderRadius: 9999, background: "var(--c-sage-soft)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <WIcon name="check" size={18} stroke={2.2} color="var(--action-success)" />
                </span>
                <div>
                  <div style={{ fontSize: 48, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}>{completedTasks.length}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)", marginTop: 4 }}>Tasks done</div>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <SectionLabel style={{ marginBottom: 14 }}>Notifications</SectionLabel>
            {settingsCard}
          </div>

          {/* Account */}
          {accountBlock}

          <button onClick={resetOnboarding} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-secondary)", fontSize: 14, padding: "8px 0" }}>
            <WIcon name="sparkle" size={15} />
            Replay the tour
          </button>

          <button onClick={handleSignOut} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-muted)", fontSize: 14, padding: "8px 0" }}>
            <WIcon name="logout" size={15} />
            Sign out
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28, minWidth: 0, flex: "0 1 360px" }}>
          {/* Theme */}
          <div>
            <SectionLabel style={{ marginBottom: 14 }}>Theme</SectionLabel>
            {themeGrid}
          </div>

          {/* Plan */}
          <div>
            <SectionLabel style={{ marginBottom: 14 }}>Plan</SectionLabel>
            {planCard}
          </div>
        </div>
      </div>

      {upgradeOpen && <UpgradeScreen onClose={() => setUpgradeOpen(false)} onActivate={(b) => { void activate(b); setUpgradeOpen(false); }} />}
    </div>
  );
}
