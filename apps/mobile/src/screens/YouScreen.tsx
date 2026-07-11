import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Bell, Calendar, Check, Crosshair, Flame, LogOut, Sparkles } from 'lucide-react-native';
import { THEMES, type ThemeName } from '@todo/shared/themes';
import { useApp, type NotifPrefs } from '../context/AppContext';
import { FONTS } from '../theme/tokens';
import { SectionLabel, Sheet, SpinPill, Toggle, cardShadow, useTokens } from '../components/kit';
import { UpgradeScreen, BloomChip } from '../components/Upgrade';

/* "Hello, Maker." — overview stats, notifications, theme grid, plan, account. */

const THEME_SUBS: Record<ThemeName, string> = {
  'warm-start': 'Light',
  'slow-down': 'Dark',
  'light-a11y': 'High contrast · Light',
  'dark-a11y': 'High contrast · Dark',
};

const NOTIF_ROWS: { key: keyof NotifPrefs; title: string; desc: string }[] = [
  { key: 'nudge', title: 'Gentle nudge', desc: "One calm reminder if the day's untouched" },
  { key: 'focus', title: 'Focus alerts', desc: 'A quiet note when a session finishes' },
  { key: 'recap', title: 'Weekly recap', desc: 'Sunday evening · your week in numbers' },
];

function AuthSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens();
  const { login, signUp } = useApp();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!/.+@.+\..+/.test(email.trim())) { setErr('Enter a valid email address.'); return; }
    if (pw.length < 6) { setErr('Password should be at least 6 characters.'); return; }
    setErr(null);
    setLoading(true);
    const error = mode === 'login' ? await login(email.trim(), pw) : await signUp(email.trim(), pw);
    setLoading(false);
    if (error) setErr(error);
    else onClose();
  }

  const inputStyle = {
    height: 54, borderRadius: 18, paddingHorizontal: 16,
    backgroundColor: t.colors.bg.card, color: t.colors.text.primary,
    fontFamily: FONTS.sans, fontSize: 15,
    ...cardShadow(t.dark),
  } as const;

  return (
    <Sheet onClose={onClose}>
      <Text style={{ fontFamily: FONTS.sansLight, fontSize: 16, color: t.colors.text.secondary }}>
        {mode === 'login' ? 'Pick up where you left off.' : 'A few small things at a time.'}
      </Text>
      <Text style={{ fontFamily: FONTS.display, fontSize: 54, lineHeight: 66, color: t.colors.text.primary, marginBottom: 18 }}>
        {mode === 'login' ? 'Welcome' : 'Hello'}<Text style={{ color: t.colors.accent.main }}>.</Text>
      </Text>

      {/* Seg toggle */}
      <View style={{ backgroundColor: t.colors.bg.sunk, borderRadius: 100, padding: 4, flexDirection: 'row', marginBottom: 16 }}>
        {(['login', 'signup'] as const).map((m) => {
          const on = mode === m;
          return (
            <Pressable key={m} onPress={() => { setMode(m); setErr(null); }} style={{
              flex: 1, paddingVertical: 10, borderRadius: 100, alignItems: 'center',
              backgroundColor: on ? t.colors.bg.card : 'transparent',
              ...(on ? cardShadow(t.dark) : {}),
            }}>
              <Text style={{ fontFamily: on ? FONTS.sansSemi : FONTS.sans, fontSize: 14, color: on ? t.colors.text.primary : t.colors.text.muted }}>
                {m === 'login' ? 'Log in' : 'Sign up'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 13 }}>
        <TextInput
          value={email} onChangeText={setEmail} placeholder="you@email.com"
          placeholderTextColor={t.colors.text.muted} autoCapitalize="none" keyboardType="email-address"
          style={inputStyle}
        />
        <TextInput
          value={pw} onChangeText={setPw} secureTextEntry
          placeholder={mode === 'signup' ? 'Make it memorable' : 'Your password'}
          placeholderTextColor={t.colors.text.muted}
          style={inputStyle}
        />
        {err && <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: t.colors.action.danger }}>{err}</Text>}
        <SpinPill full disabled={loading} onPress={() => void submit()}>
          {loading ? 'One moment…' : mode === 'login' ? 'Log in' : 'Create account'}
        </SpinPill>
      </View>
      <Text style={{ fontFamily: FONTS.sansLight, fontSize: 11.5, lineHeight: 17, color: t.colors.text.muted, textAlign: 'center', marginTop: 16 }}>
        By continuing you agree to our Terms and Privacy Policy.
      </Text>
    </Sheet>
  );
}

export function YouScreen() {
  const t = useTokens();
  const {
    user, logout, streak, completedTasks, theme, setTheme,
    notifPrefs, setNotifPref, isPremium, activatePremium, resetOnboarding,
  } = useApp();

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const heroName = user?.name?.split(' ')[0] || 'Maker';
  const s = styles(t);

  const notifIcons = { nudge: Bell, focus: Crosshair, recap: Calendar } as const;
  const notifTints = {
    nudge: { bg: t.colors.softs.honey, fg: t.colors.wheel[3] },
    focus: { bg: t.colors.softs.blush, fg: t.colors.accent.main },
    recap: { bg: t.colors.softs.lavender, fg: t.colors.lavender },
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.screen }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 48 }}>
        {/* Hero */}
        <View style={{ paddingTop: 10, marginBottom: 26 }}>
          <Text style={{ fontFamily: FONTS.sansLight, fontSize: 16, color: t.colors.text.secondary, marginBottom: 2 }}>Hello,</Text>
          <Text style={{ fontFamily: FONTS.display, fontSize: 58, lineHeight: 66, color: t.colors.text.primary }}>
            {heroName}<Text style={{ color: t.colors.accent.main }}>.</Text>
          </Text>
        </View>

        {/* Overview */}
        <SectionLabel style={{ marginBottom: 14 }}>Overview</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 28 }}>
          <View style={[s.statCard, cardShadow(t.dark)]}>
            <View style={[s.statChip, { backgroundColor: t.colors.softs.coral }]}>
              <Flame size={18} color={t.colors.accent.main} strokeWidth={2} />
            </View>
            <Text style={s.statNum}>{streak}</Text>
            <Text style={s.statLabel}>DAY STREAK</Text>
          </View>
          <View style={[s.statCard, cardShadow(t.dark)]}>
            <View style={[s.statChip, { backgroundColor: t.colors.softs.sage }]}>
              <Check size={18} color={t.colors.action.success} strokeWidth={2.2} />
            </View>
            <Text style={s.statNum}>{completedTasks.length}</Text>
            <Text style={s.statLabel}>TASKS DONE</Text>
          </View>
        </View>

        {/* Notifications */}
        <SectionLabel style={{ marginBottom: 14 }}>Notifications</SectionLabel>
        <View style={[s.settingCard, cardShadow(t.dark), { marginBottom: 28 }]}>
          {NOTIF_ROWS.map((row, i) => {
            const Icon = notifIcons[row.key];
            const tint = notifTints[row.key];
            return (
              <View key={row.key} style={[s.settingRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.colors.hairline }]}>
                <View style={[s.settingChip, { backgroundColor: tint.bg }]}>
                  <Icon size={19} color={tint.fg} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.settingTitle}>{row.title}</Text>
                  <Text style={s.settingDesc}>{row.desc}</Text>
                </View>
                <Toggle value={notifPrefs[row.key]} onChange={(v) => setNotifPref(row.key, v)} />
              </View>
            );
          })}
        </View>

        {/* Theme */}
        <SectionLabel style={{ marginBottom: 14 }}>Theme</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          {Object.values(THEMES).map((th) => {
            const on = theme === th.name;
            return (
              <Pressable key={th.name} onPress={() => setTheme(th.name as ThemeName)} style={[{
                width: '47%', flexGrow: 1, borderRadius: 16, padding: 14,
                flexDirection: 'row', alignItems: 'center', gap: 11,
                backgroundColor: th.colors.bgCard,
                borderWidth: on ? 2 : 0, borderColor: th.colors.textPrimary,
              }, cardShadow(t.dark)]}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: th.colors.bgScreen, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: th.colors.accent }} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: FONTS.sansSemi, fontSize: 13.5, color: th.colors.textPrimary }}>{th.label}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: FONTS.sans, fontSize: 11, color: th.colors.textSecondary, marginTop: 2 }}>
                    {THEME_SUBS[th.name as ThemeName]}
                  </Text>
                </View>
                {on && (
                  <View style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 999, backgroundColor: th.colors.textPrimary, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={10} color={th.colors.bgCard} strokeWidth={3} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Plan */}
        <SectionLabel style={{ marginBottom: 14 }}>Plan</SectionLabel>
        <View style={[s.settingCard, cardShadow(t.dark), { padding: 18, marginBottom: 28 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 16, color: t.colors.text.primary }}>
              {isPremium ? 'Bloom' : 'Seed · Free'}
            </Text>
            {isPremium ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.colors.softs.sage, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: t.colors.action.success }} />
                <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 10.5, color: t.colors.action.success }}>Active</Text>
              </View>
            ) : (
              <BloomChip />
            )}
          </View>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: t.colors.text.secondary, marginBottom: isPremium ? 0 : 14 }}>
            {isPremium
              ? 'Unlimited spins, habits and AI · thank you for growing with us'
              : '5 spins/day · 3 habits · 1 AI breakdown/day'}
          </Text>
          {!isPremium && (
            <SpinPill full small onPress={() => setUpgradeOpen(true)}>More with Bloom</SpinPill>
          )}
        </View>

        {/* Replay the first-run walkthrough */}
        <Pressable onPress={resetOnboarding} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, marginBottom: 18 }}>
          <Sparkles size={15} color={t.colors.text.secondary} strokeWidth={2} />
          <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: t.colors.text.secondary }}>Replay the tour</Text>
        </Pressable>

        {/* Account */}
        <SectionLabel style={{ marginBottom: 14 }}>Account</SectionLabel>
        {user ? (
          <>
            <Text style={{ fontFamily: FONTS.sansLight, fontSize: 13, color: t.colors.text.secondary, marginBottom: 12 }}>{user.email}</Text>
            <Pressable onPress={() => void logout()} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 }}>
              <LogOut size={15} color={t.colors.text.muted} strokeWidth={2} />
              <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: t.colors.text.muted }}>Sign out</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: FONTS.sansLight, fontSize: 13, color: t.colors.text.muted, marginBottom: 12 }}>
              Running without an account. Sign in to sync across devices.
            </Text>
            <SpinPill full small onPress={() => setAuthOpen(true)}>Sign in</SpinPill>
          </>
        )}
      </ScrollView>

      {authOpen && <AuthSheet onClose={() => setAuthOpen(false)} />}
      <UpgradeScreen visible={upgradeOpen} onClose={() => setUpgradeOpen(false)} onActivate={() => { activatePremium(); setUpgradeOpen(false); }} />
    </View>
  );
}

const styles = (t: ReturnType<typeof useTokens>) => StyleSheet.create({
  statCard: { flex: 1, backgroundColor: t.colors.bg.card, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 20, gap: 14 },
  statChip: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  statNum: { fontFamily: FONTS.sansSemi, fontSize: 42, lineHeight: 46, color: t.colors.text.primary, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: FONTS.sansMedium, fontSize: 11, letterSpacing: 1, color: t.colors.text.secondary, marginTop: -8 },
  settingCard: { backgroundColor: t.colors.bg.card, borderRadius: 24, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  settingChip: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { fontFamily: FONTS.sansMedium, fontSize: 15, color: t.colors.text.primary },
  settingDesc: { fontFamily: FONTS.sansLight, fontSize: 12.5, lineHeight: 17, color: t.colors.text.secondary, marginTop: 2 },
});
