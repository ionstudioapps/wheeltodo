import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, type GestureResponderHandlers, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Check, GripVertical, Plus, Trash2 } from 'lucide-react-native';
import { useDragReorder } from '../hooks/useDragReorder';
import { useApp, FREE_LIMITS, type RestCategory, type RestTask } from '../context/AppContext';
import { FONTS } from '../theme/tokens';
import { ConfettiBurst, Headline, Ring, SectionLabel, Sheet, SpinPill, cardShadow, useTokens } from '../components/kit';
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

const CATEGORY_META: { id: RestCategory; label: string; softKey: 'sage' | 'lavender' | 'mint' | 'honey' }[] = [
  { id: 'Physical', label: 'Physical', softKey: 'sage' },
  { id: 'Mental', label: 'Mental', softKey: 'lavender' },
  { id: 'Social', label: 'Social', softKey: 'mint' },
  { id: 'Nourishment', label: 'Nourish', softKey: 'honey' },
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

function Heatmap({ countsByDay }: { countsByDay: Map<string, number> }) {
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
    const out: { level: number; future: boolean }[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: { level: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + w * 7 + d);
        const n = countsByDay.get(day.toDateString()) ?? 0;
        col.push({ level: Math.min(n, 4), future: day > today });
      }
      out.push(col);
    }
    return out;
  }, [countsByDay]);

  return (
    <View style={{ flexDirection: 'row', gap, justifyContent: 'space-between' }}>
      {weeks.map((col, w) => (
        <View key={w} style={{ gap }}>
          {col.map((c, d) => (
            <View key={d} style={{
              width: cell, height: cell, borderRadius: 4,
              backgroundColor: c.level === 0 ? t.colors.bg.sunk : t.colors.heat[c.level - 1],
              opacity: c.future ? 0.25 : 1,
            }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/* ── Quick rest chip ──────────────────────────────────────────────────────
   The ten preset rest activities (Get a coffee, Go for a walk, ...) — a
   no-commitment, one-tap way to log rest without adding a tracked habit.
   Still counts toward restMinutesToday / the day's streak. ────────────── */

function QuickRestChip({ task, onToggle }: { task: RestTask; onToggle: () => void }) {
  const t = useTokens();
  const done = task.completedToday;
  const color = categoryColor(t, task.category);
  return (
    <Pressable onPress={onToggle} style={{
      flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999,
      paddingVertical: 9, paddingLeft: 10, paddingRight: 14,
      backgroundColor: done ? color : t.colors.bg.card,
      ...(done ? {} : cardShadow(t.dark)),
    }}>
      <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: done ? t.colors.bg.card : color, opacity: done ? 0.9 : 0.35 }} />
      <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13.5, color: done ? t.colors.text.onInk : t.colors.text.primary }}>
        {task.name}
      </Text>
      <Text style={{ fontFamily: FONTS.sans, fontSize: 11.5, color: done ? t.colors.text.onInk : t.colors.text.muted, opacity: done ? 0.75 : 1 }}>
        {task.durationMinutes}m
      </Text>
    </Pressable>
  );
}

/* ── Habit row ───────────────────────────────────────────────────────────── */

function HabitRow({ habit, streakDays, week, gripHandlers, onToggle, onDelete }: {
  habit: RestTask; streakDays: number; week: boolean[]; gripHandlers?: GestureResponderHandlers;
  onToggle: () => void; onDelete: () => void;
}) {
  const t = useTokens();
  const done = habit.completedToday;
  const color = categoryColor(t, habit.category);

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: t.colors.bg.card, borderRadius: 18, padding: 16,
      ...cardShadow(t.dark),
    }}>
      {gripHandlers && (
        <View {...gripHandlers} hitSlop={{ top: 12, bottom: 12, left: 12, right: 6 }} style={{ marginLeft: -5, marginRight: -7 }}>
          <GripVertical size={16} color={t.colors.text.muted} strokeWidth={1.8} />
        </View>
      )}
      <View style={{ width: 42, height: 42, borderRadius: 999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 16, color: t.colors.bg.card }}>
          {habit.name.trim()[0]?.toUpperCase() ?? '?'}
        </Text>
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
      <Pressable hitSlop={8} onPress={onDelete}>
        <Trash2 size={15} color={t.colors.text.muted} strokeWidth={1.8} />
      </Pressable>
      <Pressable hitSlop={8} onPress={onToggle} style={{
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
  const [cat, setCat] = useState<RestCategory>('Physical');
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  const habits = restTasks.filter((h) => !h.isPreset);
  const quickRest = restTasks.filter((h) => h.isPreset);
  const { setRowRef, makePanResponder, dragIndex, dragY, shiftFor } = useDragReorder(habits, reorderRestTasks);

  function handleDeleteHabit(habit: RestTask) {
    removeRestTask(habit.id);
    showToast(`"${habit.name}" deleted`, () => {
      addRestTask(habit.name, habit.durationMinutes, habit.category);
    });
  }

  // Seed three starter habits on first visit
  useEffect(() => {
    AsyncStorage.getItem(SEED_KEY).then((v) => {
      if (v) return;
      AsyncStorage.setItem(SEED_KEY, '1').catch(() => {});
      if (habits.length === 0) {
        STARTERS.forEach((st) => addRestTask(st.name, st.mins, st.cat));
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    habits.forEach((h) => {
      (habitHistory[h.id] ?? []).forEach((d) => map.set(d, (map.get(d) ?? 0) + 1));
    });
    return map;
  }, [habits, habitHistory]);

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
    addRestTask(name.trim(), 10, cat);
    setName('');
    setCat('Physical');
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
          <Heatmap countsByDay={countsByDay} />
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

        {/* Quick rest — no-commitment, one-tap presets */}
        <View style={{ paddingTop: 26 }}>
          <SectionLabel style={{ fontSize: 12, marginBottom: 4, marginLeft: 2 }}>Quick rest</SectionLabel>
          <Text style={{ fontFamily: FONTS.sansLight, fontSize: 13, color: t.colors.text.muted, marginBottom: 12, marginLeft: 2 }}>
            Rest counts. Same streak.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {quickRest.map((task) => (
              <QuickRestChip key={task.id} task={task} onToggle={() => toggleRestTask(task.id)} />
            ))}
          </View>
        </View>

        {/* Today list */}
        <View style={{ paddingTop: 26 }}>
          <SectionLabel style={{ fontSize: 12, marginBottom: 12, marginLeft: 2 }}>Today</SectionLabel>
          <View style={{ gap: 10 }}>
            {habits.map((h, i) => (
              <Animated.View
                key={h.id}
                ref={(r) => setRowRef(i, r as unknown as View)}
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
                  gripHandlers={makePanResponder(i).panHandlers}
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
            <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: categoryColor(t, cat), alignItems: 'center', justifyContent: 'center' }}>
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
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORY_META.map((c) => {
              const on = cat === c.id;
              return (
                <Pressable key={c.id} onPress={() => setCat(c.id)} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 7,
                  paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
                  backgroundColor: on ? t.colors.ink : t.colors.bg.input,
                }}>
                  <View style={{ width: 11, height: 11, borderRadius: 999, backgroundColor: categoryColor(t, c.id) }} />
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: on ? t.colors.text.onInk : t.colors.text.secondary }}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: 22 }}>
            <SpinPill full onPress={handleAdd}>Add habit</SpinPill>
          </View>
        </Sheet>
      )}

      <UpgradeScreen visible={upgradeOpen} onClose={() => setUpgradeOpen(false)} onActivate={() => { activatePremium(); setUpgradeOpen(false); }} />
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
