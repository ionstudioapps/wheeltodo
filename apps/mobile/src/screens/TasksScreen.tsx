import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, type GestureResponderHandlers, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ArrowRight, ArrowUpRight, Check, GripVertical, Mic, Plus, Sparkles, Trash2, Wand2, X } from 'lucide-react-native';
import { useDragReorder } from '../hooks/useDragReorder';
import { useApp, COLORS, FREE_LIMITS, type Task } from '../context/AppContext';
import { FONTS } from '../theme/tokens';
import {
  CategoryIcon, ConfettiBurst, Headline, SectionLabel, Sheet, SpinPill,
  TASK_CATEGORIES, TASK_ICON_PATHS, TaskWheel, WheelHub, cardShadow, formatMmSs, useTokens,
} from '../components/kit';
import { FocusMode } from '../components/FocusMode';
import { SkeletonRows } from '../components/Skeleton';
import { WeeklyRecap } from '../components/WeeklyRecap';
import { BrainStarter } from '../components/BrainStarter';
import { BloomChip, BloomNudge, UpgradeScreen } from '../components/Upgrade';
import { Toast, useToast } from '../components/Toast';
import { fnUrl, fnHeaders } from '../utils/functions';

interface Suggestion { name: string; minutes: number; category?: string }

const RECAP_PROMPT_KEY = 'wheelTodo.recapPromptDismissed';

/* ── Task avatar ─────────────────────────────────────────────────────────── */

function TaskAvatar({ task, size = 38 }: { task: Task; size?: number }) {
  const t = useTokens();
  const hasIcon = task.icon && TASK_ICON_PATHS[task.icon];
  return (
    <View style={{
      width: size, height: size, borderRadius: 999, backgroundColor: task.color,
      alignItems: 'center', justifyContent: 'center',
    }}>
      {hasIcon ? (
        <CategoryIcon id={task.icon} size={size * 0.45} color={t.colors.bg.card} />
      ) : (
        <Text style={{ fontFamily: FONTS.sansSemi, fontSize: size * 0.4, color: t.colors.bg.card }}>
          {task.name.trim()[0]?.toUpperCase() ?? '?'}
        </Text>
      )}
    </View>
  );
}

/* ── Task row ────────────────────────────────────────────────────────────── */

function TaskRow({ task, dim, remainingLabel, gripHandlers, onComplete, onDelete, onEdit }: {
  task: Task; dim?: boolean; remainingLabel?: string; gripHandlers?: GestureResponderHandlers;
  onComplete: () => void; onDelete: () => void; onEdit: () => void;
}) {
  const t = useTokens();

  return (
    <Pressable onPress={onEdit} style={{
      flexDirection: 'row', alignItems: 'center', gap: 13,
      backgroundColor: dim ? t.colors.bg.sunk : t.colors.bg.card,
      borderRadius: 18, paddingHorizontal: 15, paddingVertical: 14,
      ...(dim ? {} : cardShadow(t.dark)),
    }}>
      {gripHandlers && (
        <View {...gripHandlers} hitSlop={{ top: 12, bottom: 12, left: 12, right: 6 }} style={{ marginLeft: -4, marginRight: -6 }}>
          <GripVertical size={16} color={t.colors.text.muted} strokeWidth={1.8} />
        </View>
      )}
      <TaskAvatar task={task} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: FONTS.sansMedium, fontSize: 16, color: t.colors.text.primary }}>
          {task.name}
        </Text>
        <Text style={{ fontFamily: FONTS.sansLight, fontSize: 13, marginTop: 1, color: t.colors.text.secondary }}>
          {remainingLabel ?? `${task.minutes} min`}
        </Text>
      </View>
      <Pressable hitSlop={8} onPress={onDelete}>
        <Trash2 size={16} color={t.colors.text.muted} strokeWidth={1.8} />
      </Pressable>
      <Pressable hitSlop={8} onPress={onComplete} style={{
        width: 26, height: 26, borderRadius: 999, borderWidth: 1.5, borderColor: t.colors.hairline,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Check size={13} color={t.colors.text.muted} strokeWidth={2} />
      </Pressable>
    </Pressable>
  );
}

/* ── Add / edit task sheet ───────────────────────────────────────────────── */

const DURATIONS = [
  { v: 15, l: '15m' }, { v: 30, l: '30m' }, { v: 45, l: '45m' }, { v: 60, l: '1hr' },
];

function TaskSheet({ task, onAdd, onSave, onClose }: {
  task?: Task;
  onAdd: (name: string, mins: number, color: string, icon: string) => void;
  onSave: (id: string, name: string, mins: number, color: string, icon: string) => void;
  onClose: () => void;
}) {
  const t = useTokens();
  const { defaultTimerMinutes, tasks: allTasks } = useApp();
  const isEdit = !!task;
  const [name, setName] = useState(task?.name ?? '');
  const [mins, setMins] = useState(task?.minutes ?? defaultTimerMinutes);
  const [color, setColor] = useState(task?.color ?? COLORS[allTasks.length % COLORS.length]);
  const [icon, setIcon] = useState(task?.icon && TASK_ICON_PATHS[task.icon] ? task.icon : 'work');

  function submit() {
    const v = name.trim();
    if (!v) return;
    if (isEdit && task) onSave(task.id, v, mins, color, icon);
    else onAdd(v, mins, color, icon);
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 22, color: t.colors.text.primary, marginBottom: 3 }}>
        {isEdit ? 'Edit task' : 'New task'}
      </Text>
      <Text style={{ fontFamily: FONTS.sansLight, fontSize: 14, color: t.colors.text.secondary, marginBottom: 14 }}>
        {isEdit ? 'Update the details below.' : "It'll join the wheel for today."}
      </Text>

      {/* Name input */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 11, height: 54,
        backgroundColor: t.colors.bg.input, borderRadius: 18, paddingHorizontal: 16,
        borderWidth: 2, borderColor: t.colors.accent.main,
      }}>
        <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: FONTS.sansBold, fontSize: 12, color: t.colors.bg.card }}>
            {name.trim()[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <TextInput
          autoFocus value={name} onChangeText={setName}
          placeholder="What needs doing?" placeholderTextColor={t.colors.text.muted}
          style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 16, color: t.colors.text.primary, paddingVertical: 0 }}
        />
      </View>

      {/* Duration */}
      <SectionLabel style={{ marginTop: 14, marginBottom: 8, fontSize: 11.5 }}>How long?</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {DURATIONS.map((d) => {
          const on = mins === d.v;
          return (
            <Pressable key={d.v} onPress={() => setMins(d.v)} style={{
              flex: 1, height: 44, borderRadius: 100, alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? t.colors.ink : t.colors.bg.input,
            }}>
              <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 14, color: on ? t.colors.text.onInk : t.colors.text.secondary }}>
                {d.l}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Colour */}
      <SectionLabel style={{ marginTop: 14, marginBottom: 8, fontSize: 11.5 }}>Colour</SectionLabel>
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

      {/* Category */}
      <SectionLabel style={{ marginTop: 14, marginBottom: 8, fontSize: 11.5 }}>Category</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 7 }}>
        {TASK_CATEGORIES.map((ic) => {
          const on = icon === ic.id;
          return (
            <Pressable key={ic.id} onPress={() => setIcon(ic.id)} style={{
              flex: 1, aspectRatio: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? t.colors.accent.soft : t.colors.bg.input,
              borderWidth: on ? 1.5 : 0, borderColor: color,
            }}>
              <CategoryIcon id={ic.id} size={20} color={on ? color : t.colors.text.secondary} />
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 18 }}>
        <SpinPill full onPress={submit}>{isEdit ? 'Save changes' : 'Add task'}</SpinPill>
      </View>
    </Sheet>
  );
}

/* ── AI sheets (breakdown + tell-me-your-day) ────────────────────────────── */

type AiPhase = 'input' | 'loading' | 'results' | 'error';

function AiSheet({ mode, task, onClose, onAdd, onGenerated }: {
  mode: 'breakdown' | 'voice';
  task?: Task;
  onClose: () => void;
  onAdd: (items: Suggestion[]) => void;
  onGenerated?: () => void;
}) {
  const t = useTokens();
  const [phase, setPhase] = useState<AiPhase>('input');
  const [text, setText] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  async function run() {
    if (!text.trim()) return;
    setPhase('loading');
    try {
      const res = mode === 'breakdown'
        ? await fetch(fnUrl('break-task'), {
            method: 'POST', headers: fnHeaders(),
            body: JSON.stringify({ taskName: task?.name, taskMinutes: task?.minutes, goal: text.trim(), constraints: '' }),
          })
        : await fetch(fnUrl('voice-tasks'), {
            method: 'POST', headers: fnHeaders(),
            body: JSON.stringify({ transcript: text.trim() }),
          });
      if (!res.ok) throw new Error('failed');
      const data = await res.json() as { subtasks?: Suggestion[]; tasks?: Suggestion[]; error?: string };
      if (data.error) throw new Error(data.error);
      const out = (mode === 'breakdown' ? data.subtasks : data.tasks) ?? [];
      onGenerated?.();
      setItems(out);
      setSelected(new Set(out.map((_, i) => i)));
      setPhase('results');
    } catch {
      setPhase('error');
    }
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  const Icon = mode === 'breakdown' ? Wand2 : Mic;

  return (
    <Sheet onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <Icon size={16} color={t.colors.accent.main} strokeWidth={2} />
        <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 20, color: t.colors.text.primary }}>
          {mode === 'breakdown' ? 'Break it down' : 'Tell me your day'}
        </Text>
      </View>
      {mode === 'breakdown' && (
        <Text numberOfLines={1} style={{ fontFamily: FONTS.sansLight, fontSize: 14, color: t.colors.text.secondary, marginBottom: 14 }}>
          {task?.name}
        </Text>
      )}

      {phase === 'input' && (
        <View style={{ gap: 14, marginTop: mode === 'voice' ? 12 : 0 }}>
          <Text style={{ fontFamily: FONTS.sansLight, fontSize: 14, lineHeight: 20, color: t.colors.text.secondary }}>
            {mode === 'breakdown'
              ? 'What does "done" look like?'
              : 'Type or dictate everything you need to get done — it becomes tasks on the wheel. (Tip: use the mic key on your keyboard.)'}
          </Text>
          <TextInput
            autoFocus multiline value={text} onChangeText={setText}
            placeholder={mode === 'breakdown' ? 'e.g. A published post with intro, 3 sections and a conclusion' : 'e.g. finish the report, book dentist, 30 min reading…'}
            placeholderTextColor={t.colors.text.muted}
            style={{
              minHeight: 84, borderRadius: 18, padding: 14, textAlignVertical: 'top',
              backgroundColor: t.colors.bg.input, color: t.colors.text.primary,
              fontFamily: FONTS.sans, fontSize: 14, lineHeight: 21,
            }}
          />
          <SpinPill full onPress={() => void run()}>
            {mode === 'breakdown' ? 'Generate subtasks' : 'Make my tasks'}
          </SpinPill>
        </View>
      )}

      {phase === 'loading' && (
        <View style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
          <Text style={{ fontSize: 28, color: t.colors.accent.main }}>◎</Text>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: t.colors.text.secondary }}>Thinking…</Text>
        </View>
      )}

      {phase === 'error' && (
        <View style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }}>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: t.colors.text.secondary, textAlign: 'center' }}>
            Couldn&apos;t reach the AI. Try again in a moment.
          </Text>
          <Pressable onPress={() => setPhase('input')} style={{ backgroundColor: t.colors.bg.input, borderRadius: 100, paddingHorizontal: 20, paddingVertical: 10 }}>
            <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 14, color: t.colors.text.primary }}>Try again</Text>
          </Pressable>
        </View>
      )}

      {phase === 'results' && items.length > 0 && (
        <>
          <View style={{ gap: 8, marginVertical: 14 }}>
            {items.map((it, i) => {
              const on = selected.has(i);
              return (
                <Pressable key={i} onPress={() => toggle(i)} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: t.colors.bg.input, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12,
                }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 999,
                    backgroundColor: on ? t.colors.action.success : 'transparent',
                    borderWidth: on ? 0 : 1.5, borderColor: t.colors.hairline,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {on && <Check size={12} color={t.colors.bg.card} strokeWidth={2.6} />}
                  </View>
                  <Text style={{ flex: 1, fontFamily: FONTS.sansMedium, fontSize: 14, color: t.colors.text.primary }}>{it.name}</Text>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: t.colors.text.muted }}>{it.minutes}m</Text>
                </Pressable>
              );
            })}
          </View>
          <SpinPill full disabled={selected.size === 0} onPress={() => { onAdd(items.filter((_, i) => selected.has(i))); onClose(); }}>
            {`Add ${selected.size} task${selected.size !== 1 ? 's' : ''}`}
          </SpinPill>
        </>
      )}
    </Sheet>
  );
}

/* ── Main Tasks screen ───────────────────────────────────────────────────── */

export function TasksScreen() {
  const t = useTokens();
  const {
    tasks, addTask, updateTask, deleteTask, completeTask, reorderTasks, startPomodoro,
    incrementSpinCount, pomodoroSession, taskProgress, completedTasks,
    dailyGoal, streak, spinsToday, aiUsesToday, registerAiUse,
    voiceUsesThisMonth, registerVoiceUse, lastBrainGameAt, registerBrainGame,
    isPremium, activatePremium, user, refreshFromCloud, cloudLoading,
    wheelSoundEnabled, notifPrefs,
  } = useApp();

  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [breakdownTask, setBreakdownTask] = useState<Task | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [brainOpen, setBrainOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  // If a focus session was already running/paused when this mounted (restored
  // from storage), keep FocusMode visible through completion — otherwise it
  // would vanish the instant an auto-completed session clears pomodoroSession,
  // and the user never sees the "In bloom." moment.
  const [focusOpen, setFocusOpen] = useState(() => pomodoroSession !== null);
  const [confetti, setConfetti] = useState(false);
  const [picked, setPicked] = useState<Task | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  const { setRowRef, makePanResponder, dragIndex, dragY, shiftFor } = useDragReorder(tasks, reorderTasks);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshFromCloud();
    setRefreshing(false);
  }

  // Sunday auto-prompt for the weekly recap. Dismissal is remembered per
  // Sunday; hidden entirely when the recap notification toggle is off.
  const [showRecapPrompt, setShowRecapPrompt] = useState(false);
  useEffect(() => {
    const today = new Date();
    if (today.getDay() !== 0 || !notifPrefs.recap) { setShowRecapPrompt(false); return; }
    AsyncStorage.getItem(RECAP_PROMPT_KEY).then((v) => {
      setShowRecapPrompt(v !== today.toDateString());
    }).catch(() => {});
  }, [notifPrefs.recap]);
  function dismissRecapPrompt() {
    AsyncStorage.setItem(RECAP_PROMPT_KEY, new Date().toDateString()).catch(() => {});
    setShowRecapPrompt(false);
  }

  const rotation = useRef(new Animated.Value(0)).current;
  const rotationRef = useRef(0);
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spinsLeft = isPremium ? Infinity : Math.max(0, FREE_LIMITS.spinsPerDay - spinsToday);
  const taskSlotsLeft = isPremium ? Infinity : Math.max(0, FREE_LIMITS.tasksOnWheel - tasks.length);

  const todayCompleted = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return completedTasks.filter((c) => {
      const d = new Date(c.completedAt); d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
  }, [completedTasks]);

  // Brain Starter: Seed 1/week · Bloom 1/day. Time-dependent by design.
  const brainAvailable = (() => {
    if (!lastBrainGameAt) return true;
    const last = new Date(lastBrainGameAt);
    const now = Date.now();
    if (isPremium) return last.toDateString() !== new Date(now).toDateString();
    return now - last.getTime() > 7 * 86400000;
  })();

  function spinWheel() {
    if (tasks.length === 0 || spinning) return;
    if (!isPremium && spinsLeft === 0) { setLimitOpen(true); return; }
    setSpinning(true);
    setPicked(null);
    const idx = Math.floor(Math.random() * tasks.length);
    const sliceAngle = 360 / tasks.length;
    const target = 360 - (idx * sliceAngle + sliceAngle / 2);
    const currentNorm = ((rotationRef.current % 360) + 360) % 360;
    let delta = target - currentNorm;
    if (delta <= 0) delta += 360;
    const final = rotationRef.current + 6 * 360 + delta;

    // Haptic tick each time a slice boundary passes the pointer — dense at
    // launch, distinct clicks as the wheel decelerates. Throttled so early
    // crossings don't merge into one long buzz. Respects the wheel-sound toggle.
    let tickListener: string | null = null;
    if (wheelSoundEnabled) {
      let lastIdx = Math.floor((((rotationRef.current % 360) + 360) % 360) / sliceAngle);
      let lastHapticAt = 0;
      tickListener = rotation.addListener(({ value }) => {
        const i = Math.floor((((value % 360) + 360) % 360) / sliceAngle);
        if (i === lastIdx) return;
        lastIdx = i;
        const now = Date.now();
        if (now - lastHapticAt < 50) return;
        lastHapticAt = now;
        Haptics.selectionAsync().catch(() => {});
      });
    }

    Animated.timing(rotation, {
      // Quartic ease-out: fast launch, long decelerating tail so the final
      // ticks land one by one.
      toValue: final, duration: 3600, useNativeDriver: true, easing: Easing.out(Easing.poly(4)),
    }).start(() => {
      if (tickListener) rotation.removeListener(tickListener);
      rotationRef.current = final;
      setSpinning(false);
      setPicked(tasks[idx]);
      incrementSpinCount();
    });
  }

  function celebrate() {
    setConfetti(true);
    if (confettiTimer.current) clearTimeout(confettiTimer.current);
    confettiTimer.current = setTimeout(() => setConfetti(false), 1800);
  }

  function handleDone(task: Task) {
    const remaining = taskProgress[task.id];
    const minutesActual = remaining !== undefined
      ? Math.max(1, Math.ceil((task.minutes * 60 - remaining) / 60))
      : Math.max(1, task.minutes);
    completeTask(task.id, minutesActual);
    deleteTask(task.id);
    celebrate();
    if (picked?.id === task.id) setPicked(null);
  }

  function handleStartFocus(task: Task) {
    setPicked(null);
    if (task.minutes === 0) { handleDone(task); return; }
    startPomodoro(task);
    setFocusOpen(true);
  }

  function handleDeleteTask(task: Task) {
    deleteTask(task.id);
    showToast(`"${task.name}" deleted`, () => {
      addTask({ name: task.name, minutes: task.minutes, color: task.color, icon: task.icon, category: task.category });
    });
  }

  function handleAdd(name: string, mins: number, color: string, icon: string) {
    if (taskSlotsLeft === 0) { setUpgradeOpen(true); return; }
    addTask({ name, minutes: mins, color, icon, category: icon });
  }

  function addCapped(items: Suggestion[], icon = 'work') {
    const capped = items.slice(0, taskSlotsLeft === Infinity ? undefined : taskSlotsLeft);
    capped.forEach((it, i) => addTask({
      name: it.name, minutes: it.minutes,
      color: COLORS[(tasks.length + i) % COLORS.length],
      icon, category: it.category ?? icon,
    }));
    if (capped.length < items.length) setUpgradeOpen(true);
  }

  function handleBreakdownOpen() {
    if (!tasks[0]) return;
    if (!isPremium && aiUsesToday >= FREE_LIMITS.aiBreakdownsPerDay) { setUpgradeOpen(true); return; }
    registerAiUse();
    setBreakdownTask(tasks[0]);
  }

  function handleVoiceOpen() {
    if (!isPremium && voiceUsesThisMonth >= FREE_LIMITS.voicePerMonth) { setUpgradeOpen(true); return; }
    setVoiceOpen(true);
  }

  function handleBrainOpen() {
    if (brainAvailable) { setBrainOpen(true); return; }
    if (!isPremium) setUpgradeOpen(true);
  }

  const slices = tasks.map((task) => ({
    id: task.id, color: task.color,
    label: task.name.trim()[0]?.toUpperCase(),
    iconPaths: task.icon ? TASK_ICON_PATHS[task.icon] : undefined,
  }));

  const s = styles(t);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.screen }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
        refreshControl={user ? (
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={t.colors.accent.main} />
        ) : undefined}
      >
        {/* Headline */}
        <View style={{ paddingTop: 10 }}>
          <Headline lead="Not sure where to start?" script="Spin" size={56} />
        </View>

        {/* Sunday recap prompt */}
        {showRecapPrompt && (
          <View style={[s.banner, cardShadow(t.dark), { marginTop: 16 }]}>
            <View style={s.bannerBadge}>
              <Sparkles size={18} color={t.colors.accent.main} strokeWidth={2} />
            </View>
            <Pressable style={{ flex: 1 }} onPress={() => { setRecapOpen(true); dismissRecapPrompt(); }}>
              <Text style={s.bannerTitle}>It&apos;s Sunday — your week, wrapped.</Text>
              <Text style={s.bannerSub}>See what you finished this week.</Text>
            </Pressable>
            <Pressable hitSlop={8} onPress={dismissRecapPrompt} accessibilityLabel="Dismiss">
              <X size={16} color={t.colors.text.muted} strokeWidth={2} />
            </Pressable>
          </View>
        )}

        {/* Wheel */}
        {tasks.length > 0 && (
          <View style={{ alignItems: 'center', marginTop: 18, gap: 18 }}>
            <TaskWheel
              slices={slices} size={300} rotation={rotation}
              hub={<WheelHub done={todayCompleted.length} total={todayCompleted.length + tasks.length} />}
              onSlicePress={(sl) => { const task = tasks.find((x) => x.id === sl.id); if (task && !spinning) setPicked(task); }}
            />
            <SpinPill onPress={spinWheel} disabled={spinning || (!isPremium && spinsLeft === 0)}>
              {spinning ? 'Spinning…' : !isPremium && spinsLeft === 0 ? 'All done for today' : 'Spin the wheel'}
            </SpinPill>

            {/* Seed spin dots */}
            {!isPremium && (
              <View style={[s.dotsWrap, cardShadow(t.dark)]}>
                {Array.from({ length: FREE_LIMITS.spinsPerDay }, (_, i) => (
                  <View key={i} style={{
                    width: 9, height: 9, borderRadius: 999,
                    backgroundColor: i < spinsToday ? t.colors.bg.sunk : t.colors.accent.main,
                    borderWidth: i < spinsToday ? 1.5 : 0, borderColor: t.colors.hairline,
                  }} />
                ))}
                <Text style={s.dotsText}>
                  {spinsLeft > 0 ? `${spinsLeft} of ${FREE_LIMITS.spinsPerDay} left` : 'Resets at midnight'}
                </Text>
              </View>
            )}

            {/* Meta line */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={s.metaText}>{streak}-day streak · {todayCompleted.length} to {dailyGoal}</Text>
              <Pressable hitSlop={8} onPress={() => setRecapOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={s.metaLink}>This week</Text>
                <ArrowUpRight size={14} color={t.colors.text.primary} strokeWidth={2} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Loading skeleton — signed-in user, first cloud pull, nothing local */}
        {cloudLoading && tasks.length === 0 && (
          <View style={{ paddingTop: 26 }}>
            <SkeletonRows count={3} height={66} />
          </View>
        )}

        {/* Empty state */}
        {tasks.length === 0 && !cloudLoading && (
          <View style={{ alignItems: 'center', gap: 14, paddingVertical: 40 }}>
            <Text style={s.emptyText}>Nothing on the wheel yet.{'\n'}Add a task to get it going.</Text>
            <SpinPill onPress={() => setTaskSheetOpen(true)}>
              <Plus size={18} color={t.colors.action.onPrimary} strokeWidth={2.2} />
              <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 17, color: t.colors.action.onPrimary }}> Add your first task</Text>
            </SpinPill>
            <Pressable onPress={handleVoiceOpen} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, padding: 6 }}>
              <Mic size={15} color={t.colors.text.secondary} strokeWidth={2} />
              <Text style={s.metaText}>Or tell me your day — I&apos;ll make the tasks</Text>
            </Pressable>
          </View>
        )}

        {/* Task list */}
        {tasks.length > 0 && (
          <View style={{ paddingTop: 26 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <SectionLabel style={{ fontSize: 12 }}>Today · {tasks.length} task{tasks.length !== 1 ? 's' : ''}</SectionLabel>
              <Pressable hitSlop={8} onPress={() => setTaskSheetOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Plus size={16} color={t.colors.text.secondary} strokeWidth={2} />
                <Text style={s.metaText}>add</Text>
              </Pressable>
            </View>
            <View style={{ gap: 9 }}>
              {tasks.map((task, i) => (
                <Animated.View
                  key={task.id}
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
                  <TaskRow
                    task={task}
                    dim={picked?.id === task.id}
                    remainingLabel={taskProgress[task.id] != null ? `${formatMmSs(taskProgress[task.id])} left` : undefined}
                    gripHandlers={makePanResponder(i).panHandlers}
                    onComplete={() => handleDone(task)}
                    onDelete={() => handleDeleteTask(task)}
                    onEdit={() => setEditingTask(task)}
                  />
                </Animated.View>
              ))}
            </View>

            {/* AI quick actions */}
            <View style={{ flexDirection: 'row', gap: 9, marginTop: 12 }}>
              <Pressable onPress={handleBreakdownOpen} style={s.dashedBtn}>
                <Wand2 size={15} color={t.colors.text.secondary} strokeWidth={2} />
                <Text style={s.dashedText}>Break into steps</Text>
                {!isPremium && aiUsesToday >= FREE_LIMITS.aiBreakdownsPerDay && <BloomChip />}
              </Pressable>
              <Pressable onPress={handleVoiceOpen} style={s.dashedBtn}>
                <Mic size={15} color={t.colors.text.secondary} strokeWidth={2} />
                <Text style={s.dashedText}>Tell me your day</Text>
                {!isPremium && voiceUsesThisMonth >= FREE_LIMITS.voicePerMonth && <BloomChip />}
              </Pressable>
            </View>

            {/* Brain starter */}
            <Pressable onPress={handleBrainOpen} style={[s.brainBtn, { opacity: brainAvailable || !isPremium ? 1 : 0.5 }]}>
              <Sparkles size={15} color={t.colors.lavender} strokeWidth={2} />
              <Text style={s.brainText}>
                {brainAvailable
                  ? 'Brain starter · a 30-second warm-up'
                  : isPremium ? 'Brain starter · back tomorrow' : 'Brain starter · 1 a week on Seed'}
              </Text>
              {!brainAvailable && !isPremium && <BloomChip />}
            </Pressable>
          </View>
        )}

        {/* Done today */}
        {todayCompleted.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <SectionLabel style={{ fontSize: 12, marginBottom: 12 }}>Done</SectionLabel>
            <View style={{ gap: 9 }}>
              {todayCompleted.slice(0, 5).map((c) => (
                <View key={c.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 13,
                  backgroundColor: t.colors.bg.sunk, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 14,
                }}>
                  <View style={{ width: 38, height: 38, borderRadius: 999, backgroundColor: c.color, opacity: 0.7, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 15, color: t.colors.bg.card }}>
                      {c.taskName.trim()[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.sansMedium, fontSize: 16, color: t.colors.text.muted, textDecorationLine: 'line-through' }}>
                      {c.taskName}
                    </Text>
                    <Text style={{ fontFamily: FONTS.sansLight, fontSize: 13, color: t.colors.text.secondary, marginTop: 1 }}>
                      {c.minutesActual} min
                    </Text>
                  </View>
                  <View style={{ width: 26, height: 26, borderRadius: 999, backgroundColor: t.colors.action.success, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color={t.colors.bg.card} strokeWidth={2.6} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Overlays ── */}

      {/* Result sheet */}
      {picked && !spinning && (
        <Sheet onClose={() => setPicked(null)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 14 }}>
            <TaskAvatar task={picked} size={46} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={2} style={{ fontFamily: FONTS.sansSemi, fontSize: 18, color: t.colors.text.primary }}>{picked.name}</Text>
              <Text style={{ fontFamily: FONTS.sansLight, fontSize: 13, marginTop: 1, color: t.colors.text.secondary }}>
                {picked.minutes} min focus block
              </Text>
            </View>
          </View>
          <SpinPill full onPress={() => handleStartFocus(picked)}>
            {picked.minutes === 0 ? 'Mark done · no focus needed' : (
              <>
                <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 17, color: t.colors.action.onPrimary }}>Start focus </Text>
                <ArrowRight size={19} color={t.colors.action.onPrimary} strokeWidth={2} />
              </>
            )}
          </SpinPill>
          <Pressable onPress={() => { setPicked(null); spinWheel(); }} style={{ alignItems: 'center', paddingVertical: 14 }}>
            <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: t.colors.text.secondary }}>Spin again</Text>
          </Pressable>
        </Sheet>
      )}

      {/* Spin limit sheet */}
      {limitOpen && (
        <Sheet onClose={() => setLimitOpen(false)}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 52, lineHeight: 56, color: t.colors.text.primary, marginBottom: 14 }}>
            5 spins{'\n'}<Text style={{ color: t.colors.accent.main }}>done.</Text>
          </Text>
          <Text style={{ fontFamily: FONTS.sansLight, fontSize: 16, lineHeight: 24, color: t.colors.text.secondary, marginBottom: 24 }}>
            Your wheel resets at midnight. Plenty more tomorrow.
          </Text>
          <BloomNudge label="Unlimited spins with Bloom" onPress={() => { setLimitOpen(false); setUpgradeOpen(true); }} />
          <View style={{ height: 14 }} />
          <SpinPill full onPress={() => setLimitOpen(false)}>Got it</SpinPill>
        </Sheet>
      )}

      {(taskSheetOpen || editingTask) && (
        <TaskSheet
          task={editingTask ?? undefined}
          onAdd={handleAdd}
          onSave={(id, name, mins, color, icon) => { updateTask(id, { name, minutes: mins, color, icon }); setEditingTask(null); }}
          onClose={() => { setTaskSheetOpen(false); setEditingTask(null); }}
        />
      )}

      {breakdownTask && (
        <AiSheet mode="breakdown" task={breakdownTask}
          onClose={() => setBreakdownTask(null)}
          onAdd={(items) => addCapped(items, breakdownTask.icon)} />
      )}

      {voiceOpen && (
        <AiSheet mode="voice"
          onClose={() => setVoiceOpen(false)}
          onGenerated={registerVoiceUse}
          onAdd={(items) => addCapped(items)} />
      )}

      <BrainStarter visible={brainOpen} onClose={() => setBrainOpen(false)} onFinished={registerBrainGame} />
      <WeeklyRecap visible={recapOpen} onClose={() => setRecapOpen(false)} />
      <UpgradeScreen visible={upgradeOpen} onClose={() => setUpgradeOpen(false)} onActivate={(b) => { activatePremium(b); setUpgradeOpen(false); }} />
      <FocusMode
        visible={focusOpen || !!pomodoroSession}
        onDone={(completed) => { setFocusOpen(false); if (completed) celebrate(); }}
      />

      <ConfettiBurst active={confetti} />
      <Toast toast={toast} onUndo={() => { toast?.onUndo?.(); dismissToast(); }} onDismiss={dismissToast} />
    </View>
  );
}

const styles = (t: ReturnType<typeof useTokens>) => StyleSheet.create({
  banner: { backgroundColor: t.colors.bg.card, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerBadge: { width: 38, height: 38, borderRadius: 999, backgroundColor: t.colors.softs.coral, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontFamily: FONTS.sansSemi, fontSize: 14.5, color: t.colors.text.primary },
  bannerSub: { fontFamily: FONTS.sansLight, fontSize: 13, lineHeight: 18, color: t.colors.text.secondary, marginTop: 2 },
  dotsWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: t.colors.bg.card, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 7,
  },
  dotsText: { fontFamily: FONTS.sans, fontSize: 12, color: t.colors.text.secondary, marginLeft: 3 },
  metaText: { fontFamily: FONTS.sans, fontSize: 14, color: t.colors.text.secondary },
  metaLink: { fontFamily: FONTS.sansMedium, fontSize: 14, color: t.colors.text.primary },
  emptyText: { fontFamily: FONTS.sansLight, fontSize: 15, lineHeight: 23, color: t.colors.text.secondary, textAlign: 'center' },
  dashedBtn: {
    flex: 1, height: 48, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.colors.hairline,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  dashedText: { fontFamily: FONTS.sansMedium, fontSize: 13, color: t.colors.text.secondary },
  brainBtn: {
    marginTop: 9, height: 44, borderRadius: 18, backgroundColor: t.colors.softs.lavender,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  brainText: { fontFamily: FONTS.sansMedium, fontSize: 13.5, color: t.colors.text.primary },
});
