import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Award, X } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { FONTS } from '../theme/tokens';
import { SectionLabel, cardShadow, useTokens } from './kit';

/* "This week." — full-screen recap with stat cards, by-day chart and top task. */

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function WeeklyRecap({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const { completedTasks } = useApp();

  const data = useMemo(() => {
    const now = new Date();
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - dow); weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);

    const inWeek = completedTasks.filter((task) => {
      const d = new Date(task.completedAt);
      return d >= weekStart && d <= weekEnd;
    });

    const counts = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const day = new Date(weekStart); day.setDate(weekStart.getDate() + i);
      const key = day.toDateString();
      return inWeek.filter((task) => new Date(task.completedAt).toDateString() === key).length;
    });

    const nameCounts: Record<string, number> = {};
    inWeek.forEach((task) => { nameCounts[task.taskName] = (nameCounts[task.taskName] ?? 0) + 1; });
    const top = Object.entries(nameCounts).sort((a, b) => b[1] - a[1])[0] ?? null;

    const fmt = (d: Date) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    const bestIdx = counts.indexOf(Math.max(...counts));
    return {
      range: `${fmt(weekStart)} – ${fmt(weekEnd)}`,
      count: inWeek.length,
      counts,
      bestDay: Math.max(...counts) > 0 ? DAY_NAMES[bestIdx] : null,
      top,
      mins: inWeek.reduce((s, task) => s + task.minutesActual, 0),
    };
  }, [completedTasks]);

  const maxN = Math.max(...data.counts, 1);
  const hours = Math.floor(data.mins / 60);
  const mins = data.mins % 60;
  const s = styles(t);

  const pieces = Array.from({ length: 18 }, (_, i) => ({
    l: 3 + (i * 43) % 94, top: 44 + (i * 61) % 210,
    c: t.colors.wheel[i % 7], r: (i * 53) % 360,
    w: 5 + (i % 3) * 2, h: 9 + (i % 2) * 3,
  }));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {pieces.map((p, i) => (
            <View key={i} style={{
              position: 'absolute', left: `${p.l}%`, top: p.top, width: p.w, height: p.h,
              backgroundColor: p.c, borderRadius: 2, opacity: 0.62,
              transform: [{ rotate: `${p.r}deg` }],
            }} />
          ))}
        </View>

        <Pressable onPress={onClose} hitSlop={10} style={[s.close, { top: insets.top + 8 }]}>
          <X size={17} color={t.colors.text.primary} strokeWidth={2} />
        </Pressable>

        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 48 }}>
          <Text style={s.range}>{data.range}</Text>
          <Text style={s.headline}>This{'\n'}<Text style={{ color: t.colors.accent.main }}>week.</Text></Text>

          {/* Stat cards */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
            <View style={s.statCard}>
              <SectionLabel style={{ fontSize: 10.5, marginBottom: 6 }}>Tasks done</SectionLabel>
              <Text style={s.statNum}>{data.count}</Text>
              <Text style={s.statSub}>this week</Text>
            </View>
            <View style={s.statCard}>
              <SectionLabel style={{ fontSize: 10.5, marginBottom: 6 }}>Focused</SectionLabel>
              <Text style={s.statNum}>
                {hours}<Text style={s.statUnit}>h {mins}m</Text>
              </Text>
              <Text style={s.statSub}>focus time</Text>
            </View>
          </View>

          {/* By-day chart */}
          <View style={s.chartCard}>
            <SectionLabel style={{ fontSize: 10.5, marginBottom: 12 }}>By day</SectionLabel>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 60 }}>
              {data.counts.map((n, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
                  <View style={{
                    width: '100%', borderRadius: 4, minHeight: 3,
                    height: n > 0 ? `${Math.max((n / maxN) * 82, 6)}%` : 3,
                    backgroundColor: n > 0 ? t.colors.accent.main : t.colors.bg.sunk,
                  }} />
                  <Text style={s.dayLabel}>{DAY_LABELS[i]}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Top task */}
          {data.top && (
            <View style={s.topCard}>
              <View style={s.topBadge}>
                <Award size={19} color={t.colors.ink} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.topLabel}>MOST DONE</Text>
                <Text style={s.topName}>{data.top[0]}</Text>
                <Text style={s.topSub}>Finished {data.top[1]} time{data.top[1] !== 1 ? 's' : ''} this week</Text>
              </View>
            </View>
          )}

          <Text style={s.footer}>
            {data.bestDay
              ? `Your best day was ${data.bestDay}.\nKeep the momentum going.`
              : 'Nothing logged yet this week.\nThe wheel is ready when you are.'}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = (t: ReturnType<typeof useTokens>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.colors.bg.screen },
  close: {
    position: 'absolute', right: 22, zIndex: 2, width: 36, height: 36, borderRadius: 999,
    backgroundColor: t.colors.bg.sunk, alignItems: 'center', justifyContent: 'center',
  },
  range: { fontFamily: FONTS.sansLight, fontSize: 13.5, letterSpacing: 0.5, color: t.colors.text.secondary, marginBottom: 3 },
  headline: { fontFamily: FONTS.display, fontSize: 66, lineHeight: 70, color: t.colors.text.primary, marginBottom: 24, marginLeft: -10, paddingLeft: 10 },
  statCard: { flex: 1, backgroundColor: t.colors.bg.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 15, ...cardShadow(t.dark) },
  statNum: { fontFamily: FONTS.sansSemi, fontSize: 42, lineHeight: 46, color: t.colors.text.primary, fontVariant: ['tabular-nums'] },
  statUnit: { fontFamily: FONTS.sans, fontSize: 18, color: t.colors.text.secondary },
  statSub: { fontFamily: FONTS.sans, fontSize: 12, color: t.colors.text.secondary, marginTop: 3 },
  chartCard: { backgroundColor: t.colors.bg.card, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 15, marginBottom: 14, ...cardShadow(t.dark) },
  dayLabel: { fontFamily: FONTS.sansSemi, fontSize: 9.5, color: t.colors.text.muted },
  topCard: { backgroundColor: t.colors.ink, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  topBadge: { width: 42, height: 42, borderRadius: 999, backgroundColor: t.colors.wheel[0], alignItems: 'center', justifyContent: 'center' },
  topLabel: { fontFamily: FONTS.sansBold, fontSize: 10.5, letterSpacing: 1.2, color: t.colors.text.onInk, opacity: 0.45, marginBottom: 3 },
  topName: { fontFamily: FONTS.sansSemi, fontSize: 15, color: t.colors.text.onInk },
  topSub: { fontFamily: FONTS.sansLight, fontSize: 12.5, color: t.colors.text.onInk, opacity: 0.55, marginTop: 1 },
  footer: { fontFamily: FONTS.sansLight, fontSize: 13, lineHeight: 20, color: t.colors.text.muted, textAlign: 'center', marginTop: 20 },
});
