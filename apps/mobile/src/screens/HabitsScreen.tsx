import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, type GestureResponderHandlers, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Check, GripVertical, Plus, Trash2 } from 'lucide-react-native';
import { useDragReorder } from '../hooks/useDragReorder';
import { useApp, COLORS, FREE_LIMITS, type RestCategory, type RestTask } from '../context/AppContext';
import { FONTS } from '../theme/tokens';
import {
  CategoryIcon, ConfettiBurst, Headline, Ring, SectionLabel, Sheet, SpinPill,
  TASK_CATEGORIES, TASK_ICON_PATHS, cardShadow, useTokens,
} from '../components/kit';
import { BloomChip, BloomNudge, UpgradeScreen } from '../components/Upgrade';
import { Toast, useToast } from '../components/Toast';
import { SkeletonRows } from '../components/Skeleton';

/* "Show up. Every day." — heatmap, stat cards, habit rows, 3-habit Seed cap. */

const SEED_KEY = 'wheelTodo.habitsSeeded';
const STARTERS: { name: string; mins: number; cat: RestCategory }[] = [
  { name: 'Stretch', mins: 10, cat: 'Physical' },
  { name: 'Read a book', mins: 15, cat: 'Mental' },
  { name: 'Drink water', mins: 1, cat: 'Physical' },
];

function categoryColor(t: ReturnType<typeof useTokens>, cat: RestCategory) {
  switch (cat) {
    case 'Physical': return t.colors.wheel[3];   // sage-ish
    case 'Mental': return t.colors.wheel[4];     // lavender-ish
    case 'Social': return t.colors.wheel[2];     // mint-ish
    case 'Nourishment': return t.colors.wheel[3];
    default: return t.colors.wheel[5];
  }
}

/* ── Heatmap ─────────────────────────────────────────────────────────────── */

// Each day is coloured by the habit that "owns" it — the first habit (in
// list order) completed that day — rather than a generic intensity ramp, so
// the heatmap reads as which habits are carrying the streak, not just how much.
function Heatmap({ dayData }: { dayData: Map<string, { count: number; color: string }> }) {
  const t = useTokens();
  const { width } = useWindowDimensions();
  const WEEKS = 13;
  const gap = 5;
  const cell = Math.floor((width - 44 - (WEEKS - 1) * gap) / WEEKS);

  const weeks = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysFromMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const gridEnd = new Date(today); gridEnd.setDate(today.getDate() - daysFromMonday + 6);
    const gridStart = new Date(gridEnd); gridStart.setDate(gridEnd.getDate() - WEEKS * 7 + 1);
    const out: { count: number; color?: string; future: boolean }[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: { count: number; color?: string; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + w * 7 + d);
        const entry = dayData.get(day.toDateString());
        col.push({ count: entry?.count ?? 0, color: entry?.color, future: day > today });
      }
      out.push(col);
    }
    return out;
  }, [dayData]);

  return (
    <View style={{ flexDirection: 'row', gap, justifyContent: 'space-between' }}>
      {weeks.map((col, w) => (
        <View key={w} style={{ gap }}>
          {col.map((c, d) => (
            <View key={d} style={{
              width: cell, height: cell, borderRadius: 4,
              backgroundColor: c.color ?? t.colors.bg.sunk,
              opacity: c.future ? 0.25 : c.color ? Math.min(0.55 + c.count * 0.15, 1) : 1,
            }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/* ── Habit row ───────────────────────────────────────────────────────────── */

function HabitRow({ habit, streakDays, week, gripHandlers, onToggle, onDelete }: {
  habit: RestTask; streakDays: number; week: boolean[]; gripHandlers?: GestureResponderHandlers;
  onToggle: () => void; onDelete: () => void;
}) {
  const t = useTokens();
  const done = habit.completedToday;
  const color = habit.color ?? categoryColor(t, habit.category);

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: t.colors.bg.card, borderRadius: 18, padding: 16,
      ...cardShadow(t.dark),
    }}>
      {gripHandlers && (
        <View {...gripHandlers} accessible accessibilityLabel={`Reorder ${habit.name}`} hitSlop={{ top: 12, bottom: 12, left: 12, right: 6 }} style={{ marginLeft: -5, marginRight: -7 }}>
          <GripVertical size={16} color={t.colors.text.muted} strokeWidth={1.8} />
        </View>
      )}
      <View style={{ width: 42, height: 42, borderRadius: 999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        {habit.icon && TASK_ICON_PATHS[habit.icon] ? (
          <CategoryIcon id={habit.icon} size={19} color={t.colors.bg.card} />
        ) : (
          <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 16, color: t.colors.bg.card }}>
            {habit.name.trim()[0]?.toUpperCase() ?? '?'}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: FONTS.sansMedium, fontSize: 16, color: done ? t.colors.text.muted : t.colors.text.primary }}>
          {habit.name}
        </Text>
        <Text style={{ fontFamily: FONTS.sansLight, fontSize: 13, marginTop: 1, color: t.colors.text.secondary }}>
          {`${habit.category === 'My Tasks' ? 'Custom' : habit.category} · ${streakDays > 0 ? `${streakDays} day streak` : 'No streak yet'}`}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 9 }}>
          {week.map((f, i) => (
            <View key={i} style={{
              width: 11, height: 11, borderRadius: 999,
              backgroundColor: f ? color : 'transparent',
              borderWidth: f ? 0 : 1.5, borderColor: t.colors.hairline,
            }} />
          ))}
        </View>
      </View>
      <Pressable hitSlop={8} onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Delete ${habit.name}`}>
        <Trash2 size={15} color={t.colors.text.muted} strokeWidth={1.8} />
      </Pressable>
      <Pressable hitSlop={8} onPress={onToggle} accessibilityRole="button" accessibilityState={{ checked: done }} accessibilityLabel={`Mark ${habit.name} ${done ? 'not done' : 'done'}`} style={{
        width: 30, height: 30, borderRadius: 999,
        backgroundColor: done ? color : 'transparent',
        borderWidth: done ? 0 : 1.5, borderColor: t.colors.hairline,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Check size={15} color={done ? t.colors.bg.card : t.colors.text.muted} strokeWidth={done ? 2.6 : 2} />
      </Pressable>
    </View>
  );
}

/* ── Main Habits screen ──────────────────────────────────────────────────── */

export function HabitsScreen() {
  const t = useTokens();
  const {
    restTasks, toggleRestTask, addRestTask, removeRestTask, reorderRestTasks,
    habitHistory, habitStreak, isPremium, activatePremium, user, refreshFromCloud, cloudLoading,
  } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshFromCloud();
    setRefreshing(false);
  }

  // One-shot celebration when the final habit of the day is checked off.
  const [celebrate, setCelebrate] = useState(false);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleToggleHabit(h: RestTask) {
    const completesAll = !h.completedToday && habits.every((x) => x.id === h.id || x.completedToday);
    toggleRestTask(h.id);
    if (completesAll) {
      setCelebrate(true);
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
      celebrateTimer.current = setTimeout(() => setCelebrate(false), 1800);
    }
  }

  const [addOpen, setAddOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('mind');
  const [color, setColor] = useState<string>(COLORS[0]);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  const habits = restTasks.filter((h) => !h.isPreset);
  const { setRowRef, getGripHandlers, dragIndex, dragY, shiftFor } = useDragReorder(habits, reorderRestTasks);

  function handleDeleteHabit(habit: RestTask) {
    removeRestTask(habit.id);
    showToast(`"${habit.name}" deleted`, () => {
      addRestTask(habit.name, habit.durationMinutes, habit.color, habit.icon, habit.category);
    });
  }

  // Seed three starter habits on first visit
  useEffect(() => {
    AsyncStorage.getItem(SEED_KEY).then((v) => {
      if (v) return;
      AsyncStorage.setItem(SEED_KEY, '1').catch(() => {});
      if (habits.length === 0) {
        STARTERS.forEach((st) => addRestTask(st.name, st.mins, undefined, undefined, st.cat));
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const heatmapDayData = useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    habits.forEach((h) => {
      const c = h.color ?? categoryColor(t, h.category);
      (habitHistory[h.id] ?? []).forEach((d) => {
        const existing = map.get(d);
        if (existing) existing.count += 1;
        else map.set(d, { count: 1, color: c });
      });
    });
    return map;
  }, [habits, habitHistory, t]);

  const weekFor = (id: string) => {
    const dates = new Set(habitHistory[id] ?? []);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysFromMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - daysFromMonday + i);
      return dates.has(d.toDateString());
    });
  };

  const doneToday = habits.filter((h) => h.completedToday).length;
  const allDone = habits.length > 0 && doneToday === habits.length;
  const bestStreak = Math.max(0, ...habits.map((h) => habitStreak(h.id)));
  const atCap = !isPremium && habits.length >= FREE_LIMITS.habits;
  const remaining = habits.length - doneToday;
  const s = styles(t);

  function handleAdd() {
    if (!name.trim()) return;
    addRestTask(name.trim(), 10, color, icon);
    setName('');
    setIcon('mind');
    setColor(COLORS[0]);
    setAddOpen(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.screen }}>
      <ConfettiBurst active={celebrate} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
        refreshControl={user ? (
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={t.colors.accent.main} />
        ) : undefined}
      >
        <View style={{ paddingTop: 10 }}>
          {allDone ? (
            <Headline lead={`All ${habits.length === 3 ? 'three' : habits.length}, done.`} script="See you tomorrow" size={42} />
          ) : doneToday > 0 ? (
            <Headline lead="Nice. Keep going." script="Show up" size={52} />
          ) : (
            <Headline lead="Show up." script="Every day" size={54} />
          )}
        </View>

        {allDone && (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <Ring progress={1} size={150} stroke={13} color={t.colors.action.success}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 36, color: t.colors.text.primary }}>{doneToday}/{habits.length}</Text>
                <SectionLabel style={{ fontSize: 11, marginTop: 4 }}>Today</SectionLabel>
              </View>
            </Ring>
          </View>
        )}

        {/* Heatmap — always visible, including after finishing the day */}
        <View style={{ paddingTop: allDone ? 0 : 24 }}>
          <Heatmap dayData={heatmapDayData} />
        </View>

        {/* Stat cards */}
        <View style={{ flexDirection: 'row', gap: 10, paddingTop: 24 }}>
          {([[`${doneToday}/${habits.length}`, 'TODAY'], [String(bestStreak), 'BEST STREAK'], [String(habits.length), 'HABITS']] as const).map(([n, l]) => (
            <View key={l} style={[s.statCard, cardShadow(t.dark)]}>
              <Text style={s.statNum}>{n}</Text>
              <Text style={s.statLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Today list */}
        <View style={{ paddingTop: 26 }}>
          <SectionLabel style={{ fontSize: 12, marginBottom: 12, marginLeft: 2 }}>Today</SectionLabel>
          <View style={{ gap: 10 }}>
            {habits.map((h, i) => (
              <Animated.View
                key={h.id}
                ref={setRowRef(i)}
                style={{
                  transform: [{ translateY: dragIndex === i ? dragY : shiftFor(i) }],
                  zIndex: dragIndex === i ? 10 : 0,
                  ...(dragIndex === i ? {
                    opacity: 0.96,
                    shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 16,
                    shadowOffset: { width: 0, height: 8 }, elevation: 8,
                  } : {}),
                }}
              >
                <HabitRow
                  habit={h}
                  streakDays={habitStreak(h.id)}
                  week={weekFor(h.id)}
                  gripHandlers={getGripHandlers(i)}
                  onToggle={() => handleToggleHabit(h)}
                  onDelete={() => handleDeleteHabit(h)}
                />
              </Animated.View>
            ))}

            {cloudLoading && habits.length === 0 && <SkeletonRows count={2} height={88} />}

            {habits.length === 0 && !cloudLoading && (
              <Text style={s.emptyLine}>Small and daily beats big and rare.</Text>
            )}

            {atCap ? (
              <>
                <View style={[s.cappedRow, cardShadow(t.dark)]}>
                  <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: t.colors.bg.sunk, alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={14} color={t.colors.text.muted} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 16, color: t.colors.text.muted }}>Add a habit</Text>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: t.colors.text.muted, marginTop: 2 }}>
                      {habits.length > FREE_LIMITS.habits
                        ? `Seed includes ${FREE_LIMITS.habits} — your ${habits.length} still count`
                        : `${FREE_LIMITS.habits} of ${FREE_LIMITS.habits} habit slots used`}
                    </Text>
                  </View>
                  <BloomChip />
                </View>
                <BloomNudge label="Unlimited habits with Bloom" onPress={() => setUpgradeOpen(true)} />
              </>
            ) : (
              <Pressable onPress={() => setAddOpen(true)} style={s.newHabitBtn}>
                <Plus size={18} color={t.colors.text.secondary} strokeWidth={2} />
                <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 15, color: t.colors.text.secondary }}>New habit</Text>
              </Pressable>
            )}
          </View>

          {!allDone && habits.length > 0 && remaining > 0 && (
            <Text style={s.footerLine}>{remaining} habit{remaining !== 1 ? 's' : ''} left to close your day.</Text>
          )}
        </View>
      </ScrollView>

      {/* New habit sheet */}
      {addOpen && (
        <Sheet onClose={() => setAddOpen(false)}>
          <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 22, color: t.colors.text.primary, marginBottom: 4 }}>New habit</Text>
          <Text style={{ fontFamily: FONTS.sansLight, fontSize: 14, color: t.colors.text.secondary, marginBottom: 16 }}>
            Small and daily beats big and rare.
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 11, height: 56,
            backgroundColor: t.colors.bg.input, borderRadius: 18, paddingHorizontal: 16,
            borderWidth: 2, borderColor: t.colors.accent.main,
          }}>
            <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 13, color: t.colors.bg.card }}>
                {name.trim()[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <TextInput
              autoFocus value={name} onChangeText={setName}
              placeholder="e.g. Meditate" placeholderTextColor={t.colors.text.muted}
              style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 16, color: t.colors.text.primary, paddingVertical: 0 }}
            />
          </View>
          <SectionLabel style={{ marginTop: 20, marginBottom: 9, fontSize: 12.5, color: t.colors.text.secondary }}>Category</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {TASK_CATEGORIES.map((ic) => {
              const on = icon === ic.id;
              return (
                <Pressable key={ic.id} onPress={() => setIcon(ic.id)} style={{
                  width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: on ? t.colors.accent.soft : t.colors.bg.input,
                  borderWidth: on ? 1.5 : 0, borderColor: color,
                }}>
                  <CategoryIcon id={ic.id} size={20} color={on ? color : t.colors.text.secondary} />
                </Pressable>
              );
            })}
          </View>
          <SectionLabel style={{ marginTop: 14, marginBottom: 9, fontSize: 12.5, color: t.colors.text.secondary }}>Colour</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {COLORS.map((c) => {
              const on = color === c;
              return (
                <Pressable key={c} onPress={() => setColor(c)} style={{
                  flex: 1, aspectRatio: 1, borderRadius: 999, backgroundColor: c,
                  borderWidth: on ? 2.5 : 0, borderColor: t.colors.bg.sheet,
                  transform: [{ scale: on ? 1.15 : 1 }],
                }} />
              );
            })}
          </View>
          <View style={{ marginTop: 22 }}>
            <SpinPill full onPress={handleAdd}>Add habit</SpinPill>
          </View>
        </Sheet>
      )}

      <UpgradeScreen visible={upgradeOpen} onClose={() => setUpgradeOpen(false)} onActivate={(b) => { activatePremium(b); setUpgradeOpen(false); }} />
      <Toast toast={toast} onUndo={() => { toast?.onUndo?.(); dismissToast(); }} onDismiss={dismissToast} />
    </View>
  );
}

const styles = (t: ReturnType<typeof useTokens>) => StyleSheet.create({
  statCard: { flex: 1, backgroundColor: t.colors.bg.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 16 },
  statNum: { fontFamily: FONTS.sansSemi, fontSize: 28, lineHeight: 32, color: t.colors.text.primary, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: FONTS.sansSemi, fontSize: 10.5, letterSpacing: 0.8, color: t.colors.text.secondary, marginTop: 6 },
  emptyLine: { fontFamily: FONTS.sansLight, fontSize: 14, lineHeight: 21, color: t.colors.text.muted, textAlign: 'center', marginVertical: 6 },
  cappedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, opacity: 0.6,
    backgroundColor: t.colors.bg.card, borderRadius: 24, padding: 16,
  },
  newHabitBtn: {
    height: 56, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.colors.hairline,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  footerLine: { fontFamily: FONTS.sansLight, fontSize: 13, color: t.colors.text.muted, textAlign: 'center', marginTop: 14 },
});
