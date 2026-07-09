import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from 'react';
import { getSupabaseClient, dbLoad, dbUpsertTask, dbDeleteTask, dbInsertCompleted, dbDeleteCompleted, dbUpsertRestTask, dbDeleteRestTask, dbUpsertSettings } from '@todo/shared';
import type { ThemeName } from '@todo/shared/themes';
import { ACHIEVEMENT_DEFS, getUnlockedTierIds, type AchievementValues } from '../utils/achievements';

export interface Task {
  id: string;
  name: string;
  minutes: number;
  color: string;
  icon: string;
  category?: string;
}

export interface CompletedTask {
  id: string;
  taskId: string;
  taskName: string;
  color: string;
  icon: string;
  category?: string;
  minutesEstimated: number;
  minutesActual: number;
  completedAt: Date;
}

export interface PomodoroSession {
  taskId: string;
  taskName: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

export type RestCategory = 'Physical' | 'Mental' | 'Social' | 'Nourishment' | 'My Tasks';
export type DailyMood = 'drained' | 'okay' | 'restless' | null;
export type RestGoalTier = 'easy' | 'standard' | 'dedicated';

export const REST_GOAL_MINUTES: Record<RestGoalTier, number> = {
  easy: 15,
  standard: 30,
  dedicated: 45,
};

export interface RestTask {
  id: string;
  name: string;
  isPreset: boolean;
  completedToday: boolean;
  durationMinutes: number;
  category: RestCategory;
  skippedToday?: boolean;
}

export interface ActiveRestTimer {
  taskId: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

export const PRESET_REST_TASKS: RestTask[] = [
  { id: 'preset_1',  name: 'Get a coffee',             isPreset: true, completedToday: false, durationMinutes: 5,  category: 'Nourishment' },
  { id: 'preset_2',  name: 'Go for a walk',            isPreset: true, completedToday: false, durationMinutes: 20, category: 'Physical'    },
  { id: 'preset_3',  name: 'Read',                     isPreset: true, completedToday: false, durationMinutes: 10, category: 'Mental'      },
  { id: 'preset_4',  name: 'Stretch',                  isPreset: true, completedToday: false, durationMinutes: 10, category: 'Physical'    },
  { id: 'preset_5',  name: 'Call a friend',            isPreset: true, completedToday: false, durationMinutes: 15, category: 'Social'      },
  { id: 'preset_6',  name: 'Take a nap',               isPreset: true, completedToday: false, durationMinutes: 30, category: 'Physical'    },
  { id: 'preset_7',  name: 'Cook something',           isPreset: true, completedToday: false, durationMinutes: 20, category: 'Nourishment' },
  { id: 'preset_8',  name: 'Go for a run',             isPreset: true, completedToday: false, durationMinutes: 30, category: 'Physical'    },
  { id: 'preset_9',  name: 'Journal',                  isPreset: true, completedToday: false, durationMinutes: 10, category: 'Mental'      },
  { id: 'preset_10', name: 'Watch something you enjoy',isPreset: true, completedToday: false, durationMinutes: 30, category: 'Mental'      },
];

interface AppContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  completedTasks: CompletedTask[];
  completeTask: (taskId: string, minutesActual: number) => void;
  uncompleteTask: (completedTaskId: string) => void;

  pomodoroSession: PomodoroSession | null;
  taskProgress: Record<string, number>;
  startPomodoro: (task: Task) => void;
  pausePomodoro: () => void;
  resumePomodoro: () => void;
  completePomodoro: () => void;
  tickPomodoro: () => void;

  defaultTimerMinutes: number;
  setDefaultTimerMinutes: (minutes: number) => void;
  dailyGoal: number;
  setDailyGoal: (goal: number) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  wheelSoundEnabled: boolean;
  setWheelSoundEnabled: (enabled: boolean) => void;

  user: { name: string; email: string; initials: string; avatarId?: string } | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  updateUser: (name: string, email: string, avatarId?: string) => void;

  categories: string[];
  addCategory: (cat: string) => void;
  removeCategory: (cat: string) => void;

  streak: number;
  bestStreak: number;
  hasActivityToday: boolean;
  achievementValues: AchievementValues;
  unlockedTierIds: string[];
  spinCount: number;
  incrementSpinCount: () => void;

  seenAchievements: string[];
  markAchievementSeen: (label: string) => void;

  pendingAchievementToast: string | null;
  clearAchievementToast: () => void;

  restTasks: RestTask[];
  completedRestDays: Date[];
  partialRestDays: { date: Date; pct: number }[];
  toggleRestTask: (id: string) => void;
  addRestTask: (name: string, durationMinutes?: number, category?: RestCategory) => void;
  removeRestTask: (id: string) => void;

  activeRestTimer: ActiveRestTimer | null;
  startRestTimer: (taskId: string) => void;
  cancelRestTimer: () => void;
  tickRestTimer: () => void;

  todayMood: DailyMood;
  setTodayMood: (mood: DailyMood) => void;

  restGoalTier: RestGoalTier;
  setRestGoalTier: (tier: RestGoalTier) => void;
  restMinutesToday: number;
  restGoalMinutes: number;
  restStreak: number;
  bestRestStreak: number;

  hasSeenOnboarding: boolean;
  markOnboardingSeen: () => void;

  // ── Design-port additions (parity with apps/web) ──
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  isPremium: boolean;
  activatePremium: () => void;
  seedTasks: (tasks: Task[]) => void;
  cancelPomodoro: () => void;
  spinsToday: number;
  aiUsesToday: number;
  registerAiUse: () => void;
  voiceUsesThisMonth: number;
  registerVoiceUse: () => void;
  lastBrainGameAt: string | null;
  registerBrainGame: () => void;
  habitHistory: Record<string, string[]>;
  habitStreak: (habitId: string) => number;
  notifPrefs: NotifPrefs;
  setNotifPref: (key: keyof NotifPrefs, value: boolean) => void;
}

export interface NotifPrefs {
  nudge: boolean;
  focus: boolean;
  recap: boolean;
}

// Seed (free) tier caps — Bloom removes all of them (Brain Starter goes 1/week → 1/day).
export const FREE_LIMITS = {
  spinsPerDay: 5,
  tasksOnWheel: 8,
  habits: 3,
  aiBreakdownsPerDay: 1,
  voicePerMonth: 1,
  brainGamesPerWeek: 1,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  tasks: 'wheelTodo.tasks',
  completedTasks: 'wheelTodo.completedTasks',
  user: 'wheelTodo.user',
  categories: 'wheelTodo.categories',
  seenAchievements: 'wheelTodo.seenAchievements',
  spinCount: 'wheelTodo.spinCount',
  restTasks: 'wheelTodo.restTasks',
  restTasksDate: 'wheelTodo.restTasksDate',
  completedRestDays: 'wheelTodo.completedRestDays',
  partialRestDays: 'wheelTodo.partialRestDays',
  todayMood: 'wheelTodo.todayMood',
  todayMoodDate: 'wheelTodo.todayMoodDate',
  restGoalTier: 'wheelTodo.restGoalTier',
  hasSeenOnboarding: 'wheelTodo.hasSeenOnboarding',
  theme: 'wheelTodo.theme',
  isPremium: 'wheelTodo.isPremium',
  spinsToday: 'wheelTodo.spinsToday',
  spinsTodayDate: 'wheelTodo.spinsTodayDate',
  aiUsesToday: 'wheelTodo.aiUsesToday',
  aiUsesTodayDate: 'wheelTodo.aiUsesTodayDate',
  voiceUsesMonth: 'wheelTodo.voiceUsesMonth',
  voiceUsesMonthKey: 'wheelTodo.voiceUsesMonthKey',
  lastBrainGameAt: 'wheelTodo.lastBrainGameAt',
  habitHistory: 'wheelTodo.habitHistory',
  notifPrefs: 'wheelTodo.notifPrefs',
} as const;

const DEFAULT_CATEGORIES = ['Work', 'Personal', 'Learning', 'Health'];

export const COLORS = [
  '#EDB590', '#E59880', '#9DC4BC', '#F0D29D', '#ADA8CC', '#D4A5C8', '#BCD4A5', '#EDBDAC',
];

const defaultTasks: Task[] = [
  { id: '1', name: 'Write blog post',  minutes: 25, color: '#E59880', icon: 'PenLine'   },
  { id: '2', name: 'Review code',      minutes: 15, color: '#EDB590', icon: 'Code'      },
  { id: '3', name: 'Design mockups',   minutes: 30, color: '#9DC4BC', icon: 'Palette'   },
  { id: '4', name: 'Team meeting',     minutes: 20, color: '#F0D29D', icon: 'Users'     },
  { id: '5', name: 'Email replies',    minutes: 10, color: '#ADA8CC', icon: 'Mail'      },
  { id: '6', name: 'Research',         minutes: 25, color: '#D4A5C8', icon: 'BookOpen'  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [pomodoroSession, setPomodoroSession] = useState<PomodoroSession | null>(null);
  const [taskProgress, setTaskProgress] = useState<Record<string, number>>({});
  const [defaultTimerMinutes, setDefaultTimerMinutes] = useState(25);
  const [dailyGoal, setDailyGoal] = useState(6);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [wheelSoundEnabled, setWheelSoundEnabled] = useState(true);
  const [user, setUser] = useState<{ name: string; email: string; initials: string; avatarId?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const syncRef = useRef<{ userId: string | null }>({ userId: null });
  useEffect(() => { syncRef.current = { userId: supabaseUserId }; }, [supabaseUserId]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [seenAchievements, setSeenAchievements] = useState<string[]>([]);
  const [pendingAchievementToast, setPendingAchievementToast] = useState<string | null>(null);
  const [restTasks, setRestTasks] = useState<RestTask[]>(PRESET_REST_TASKS);
  const [completedRestDays, setCompletedRestDays] = useState<Date[]>([]);
  const [partialRestDays, setPartialRestDays] = useState<{ date: Date; pct: number }[]>([]);
  const [spinCount, setSpinCount] = useState(0);
  const [activeRestTimer, setActiveRestTimer] = useState<ActiveRestTimer | null>(null);
  const [todayMood, setTodayMoodState] = useState<DailyMood>(null);
  const [restGoalTier, setRestGoalTierState] = useState<RestGoalTier>('standard');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [theme, setThemeState] = useState<ThemeName>('warm-start');
  const [isPremium, setIsPremium] = useState(false);
  const [spinsToday, setSpinsToday] = useState(0);
  const [aiUsesToday, setAiUsesToday] = useState(0);
  const [voiceUsesThisMonth, setVoiceUsesThisMonth] = useState(0);
  const [lastBrainGameAt, setLastBrainGameAt] = useState<string | null>(null);
  const [habitHistory, setHabitHistory] = useState<Record<string, string[]>>({});
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ nudge: true, focus: true, recap: true });

  useEffect(() => {
    const load = async () => {
      try {
        const [[, tasksRaw], [, completedRaw], [, userRaw], [, categoriesRaw]] = await AsyncStorage.multiGet([
          STORAGE_KEYS.tasks,
          STORAGE_KEYS.completedTasks,
          STORAGE_KEYS.user,
          STORAGE_KEYS.categories,
        ]);
        if (tasksRaw) setTasks(JSON.parse(tasksRaw));
        if (completedRaw) {
          setCompletedTasks(
            (JSON.parse(completedRaw) as any[]).map((t) => ({
              ...t,
              completedAt: new Date(t.completedAt),
            }))
          );
        }
        if (userRaw) setUser(JSON.parse(userRaw));
        if (categoriesRaw) setCategories(JSON.parse(categoriesRaw));
        const [, seenRaw] = await AsyncStorage.getItem(STORAGE_KEYS.seenAchievements).then(v => ['', v] as const).catch(() => ['', null] as const);
        if (seenRaw) setSeenAchievements(JSON.parse(seenRaw));

        const [[, restTasksRaw], [, restTasksDateRaw], [, completedRestDaysRaw],
               [, partialRestDaysRaw], [, todayMoodRaw], [, todayMoodDateRaw],
               [, restGoalTierRaw]] = await AsyncStorage.multiGet([
          STORAGE_KEYS.restTasks,
          STORAGE_KEYS.restTasksDate,
          STORAGE_KEYS.completedRestDays,
          STORAGE_KEYS.partialRestDays,
          STORAGE_KEYS.todayMood,
          STORAGE_KEYS.todayMoodDate,
          STORAGE_KEYS.restGoalTier,
        ]);
        const todayStr = new Date().toDateString();
        if (restTasksRaw) {
          const parsed = JSON.parse(restTasksRaw) as RestTask[];
          const custom = parsed.filter((t) => !t.isPreset);
          if (restTasksDateRaw === todayStr) {
            const savedPresets = parsed.filter((t) => t.isPreset);
            const refreshedPresets = PRESET_REST_TASKS.map((p) => ({
              ...p,
              completedToday: savedPresets.find((s) => s.id === p.id)?.completedToday ?? false,
              skippedToday: savedPresets.find((s) => s.id === p.id)?.skippedToday ?? false,
            }));
            setRestTasks([...refreshedPresets, ...custom]);
          } else {
            setRestTasks([
              ...PRESET_REST_TASKS,
              ...custom.map((t) => ({ ...t, completedToday: false, skippedToday: false })),
            ]);
          }
        }
        if (completedRestDaysRaw) {
          setCompletedRestDays(
            (JSON.parse(completedRestDaysRaw) as string[]).map((d) => new Date(d))
          );
        }
        if (partialRestDaysRaw) {
          setPartialRestDays(
            (JSON.parse(partialRestDaysRaw) as { date: string; pct: number }[]).map((d) => ({
              date: new Date(d.date),
              pct: d.pct,
            }))
          );
        }
        if (todayMoodRaw && todayMoodDateRaw === todayStr) {
          setTodayMoodState(JSON.parse(todayMoodRaw) as DailyMood);
        }
        if (restGoalTierRaw) setRestGoalTierState(JSON.parse(restGoalTierRaw) as RestGoalTier);

        const spinRaw = await AsyncStorage.getItem(STORAGE_KEYS.spinCount);
        if (spinRaw) setSpinCount(JSON.parse(spinRaw));

        const [[, onboardingRaw]] =
          await AsyncStorage.multiGet([
            STORAGE_KEYS.hasSeenOnboarding,
          ]);
        if (onboardingRaw) setHasSeenOnboarding(JSON.parse(onboardingRaw));

        // Design-port additions
        const [[, themeRaw], [, premiumRaw], [, spinsRaw], [, spinsDateRaw],
               [, aiRaw], [, aiDateRaw], [, voiceRaw], [, voiceKeyRaw],
               [, brainRaw], [, habitHistRaw], [, notifRaw]] = await AsyncStorage.multiGet([
          STORAGE_KEYS.theme, STORAGE_KEYS.isPremium,
          STORAGE_KEYS.spinsToday, STORAGE_KEYS.spinsTodayDate,
          STORAGE_KEYS.aiUsesToday, STORAGE_KEYS.aiUsesTodayDate,
          STORAGE_KEYS.voiceUsesMonth, STORAGE_KEYS.voiceUsesMonthKey,
          STORAGE_KEYS.lastBrainGameAt, STORAGE_KEYS.habitHistory, STORAGE_KEYS.notifPrefs,
        ]);
        if (themeRaw) setThemeState(JSON.parse(themeRaw) as ThemeName);
        if (premiumRaw) setIsPremium(JSON.parse(premiumRaw));
        if (spinsRaw && spinsDateRaw && JSON.parse(spinsDateRaw) === todayStr) setSpinsToday(JSON.parse(spinsRaw));
        if (aiRaw && aiDateRaw && JSON.parse(aiDateRaw) === todayStr) setAiUsesToday(JSON.parse(aiRaw));
        const monthKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
        if (voiceRaw && voiceKeyRaw && JSON.parse(voiceKeyRaw) === monthKey) setVoiceUsesThisMonth(JSON.parse(voiceRaw));
        if (brainRaw) setLastBrainGameAt(JSON.parse(brainRaw));
        if (habitHistRaw) setHabitHistory(JSON.parse(habitHistRaw));
        if (notifRaw) setNotifPrefs(JSON.parse(notifRaw));
      } catch {
        // keep defaults on parse failure
      } finally {
        setLoaded(true);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks)).catch(() => {});
  }, [tasks, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.completedTasks, JSON.stringify(completedTasks)).catch(() => {});
  }, [completedTasks, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (user) {
      AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user)).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEYS.user).catch(() => {});
    }
  }, [user, loaded]);

  const addTask = (task: Omit<Task, 'id'>) => {
    const newTask = { ...task, id: Date.now().toString() };
    setTasks((prev) => [...prev, newTask]);
    const { userId: uid } = syncRef.current;
    if (uid) dbUpsertTask(uid, newTask, 0);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      const { userId: uid } = syncRef.current;
      if (uid) {
        const updated = next.find((t) => t.id === id);
        if (updated) dbUpsertTask(uid, updated, next.indexOf(updated));
      }
      return next;
    });
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const { userId: uid } = syncRef.current;
    if (uid) dbDeleteTask(uid, id);
  };

  const completeTask = (taskId: string, minutesActual: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const completed: CompletedTask = {
      id: Date.now().toString(),
      taskId: task.id,
      taskName: task.name,
      color: task.color,
      icon: task.icon,
      category: task.category,
      minutesEstimated: task.minutes,
      minutesActual,
      completedAt: new Date(),
    };
    setCompletedTasks((prev) => [completed, ...prev]);
    const { userId: uid } = syncRef.current;
    if (uid) dbInsertCompleted(uid, completed);
  };

  const uncompleteTask = (completedTaskId: string) => {
    const ct = completedTasks.find((t) => t.id === completedTaskId);
    if (!ct) return;
    const restoredTask: Task = {
      id: ct.taskId, name: ct.taskName, minutes: ct.minutesEstimated,
      color: ct.color, icon: ct.icon ?? 'BookOpen', category: ct.category,
    };
    setTasks((prev) => [...prev, restoredTask]);
    setCompletedTasks((prev) => prev.filter((t) => t.id !== completedTaskId));
    const { userId: uid } = syncRef.current;
    if (uid) {
      dbUpsertTask(uid, restoredTask, 0);
      dbDeleteCompleted(uid, completedTaskId);
    }
  };

  const startPomodoro = (task: Task) => {
    const totalSeconds = task.minutes * 60;
    if (pomodoroSession && pomodoroSession.taskId !== task.id) {
      setTaskProgress((prev) => ({ ...prev, [pomodoroSession.taskId]: pomodoroSession.remainingSeconds }));
    }
    const savedRemaining = taskProgress[task.id];
    setPomodoroSession({
      taskId: task.id,
      taskName: task.name,
      totalSeconds,
      remainingSeconds: savedRemaining ?? totalSeconds,
      isRunning: true,
    });
  };

  const pausePomodoro = () => {
    setPomodoroSession((s) => (s ? { ...s, isRunning: false } : null));
  };

  const resumePomodoro = () => {
    setPomodoroSession((s) => (s ? { ...s, isRunning: true } : null));
  };

  const completePomodoro = () => {
    if (!pomodoroSession) return;
    const { taskId } = pomodoroSession;
    const minutesActual = Math.ceil(
      (pomodoroSession.totalSeconds - pomodoroSession.remainingSeconds) / 60
    );
    completeTask(taskId, minutesActual);
    deleteTask(taskId);
    setPomodoroSession(null);
    setTaskProgress((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  const cancelPomodoro = useCallback(() => {
    setPomodoroSession((s) => {
      if (s) setTaskProgress((prev) => ({ ...prev, [s.taskId]: s.remainingSeconds }));
      return null;
    });
  }, []);

  const tickPomodoro = useCallback(() => {
    setPomodoroSession((s) =>
      s && s.isRunning && s.remainingSeconds > 0
        ? { ...s, remainingSeconds: s.remainingSeconds - 1 }
        : s
    );
  }, []);

  // Restore Supabase session on mount.
  // getSupabaseClient throws when EXPO_PUBLIC_SUPABASE_* env vars are absent —
  // the app must still run offline/local-first in that case.
  useEffect(() => {
    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) {
        const name = u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? 'User';
        const initials = name.slice(0, 2).toUpperCase();
        setUser({ name, email: u.email ?? '', initials });
        setSupabaseUserId(u.id);
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (u) {
        const name = u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? 'User';
        const initials = name.slice(0, 2).toUpperCase();
        setUser({ name, email: u.email ?? '', initials });
        setSupabaseUserId(u.id);
      } else {
        setUser(null);
        setSupabaseUserId(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load cloud data when user signs in
  useEffect(() => {
    if (!supabaseUserId || !loaded) return;
    dbLoad(supabaseUserId).then(({ tasks: dbTasks, completedTasks: dbCompleted, settings }) => {
      if (dbTasks.length > 0) setTasks(dbTasks);
      if (dbCompleted.length > 0) {
        setCompletedTasks(dbCompleted.map((ct) => ({ ...ct, completedAt: new Date(ct.completedAt) })));
      }
      if (settings) {
        setDailyGoal(settings.daily_goal);
        setDefaultTimerMinutes(settings.default_timer_minutes);
        setRestGoalTierState(settings.rest_goal_tier as RestGoalTier);
      }
    }).catch(() => {});
  }, [supabaseUserId, loaded]);

  // Sync settings whenever they change
  useEffect(() => {
    if (!loaded || !supabaseUserId) return;
    dbUpsertSettings(supabaseUserId, { dailyGoal, defaultTimerMinutes, restGoalTier });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyGoal, defaultTimerMinutes, restGoalTier, loaded, supabaseUserId]);

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? error.message : null;
    } catch {
      return 'Accounts are unavailable right now. You can keep using the app offline.';
    }
  };

  const signUp = async (email: string, password: string): Promise<string | null> => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      return error ? error.message : null;
    } catch {
      return 'Accounts are unavailable right now. You can keep using the app offline.';
    }
  };

  const updateUser = (name: string, email: string, avatarId?: string) => {
    const initials = name.trim().slice(0, 2).toUpperCase() || 'U';
    const updated = { name: name.trim(), email: email.trim(), initials, avatarId };
    setUser(updated);
    AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updated)).catch(() => {});
  };

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories)).catch(() => {});
  }, [categories, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.seenAchievements, JSON.stringify(seenAchievements)).catch(() => {});
  }, [seenAchievements, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const todayStr = new Date().toDateString();
    AsyncStorage.multiSet([
      [STORAGE_KEYS.restTasks, JSON.stringify(restTasks)],
      [STORAGE_KEYS.restTasksDate, todayStr],
    ]).catch(() => {});
  }, [restTasks, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(
      STORAGE_KEYS.completedRestDays,
      JSON.stringify(completedRestDays.map((d) => d.toISOString()))
    ).catch(() => {});
  }, [completedRestDays, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(
      STORAGE_KEYS.partialRestDays,
      JSON.stringify(partialRestDays.map((d) => ({ date: d.date.toISOString(), pct: d.pct })))
    ).catch(() => {});
  }, [partialRestDays, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.restGoalTier, JSON.stringify(restGoalTier)).catch(() => {});
  }, [restGoalTier, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.hasSeenOnboarding, JSON.stringify(hasSeenOnboarding)).catch(() => {});
  }, [hasSeenOnboarding, loaded]);

  const restGoalMinutes = REST_GOAL_MINUTES[restGoalTier];

  const restMinutesToday = useMemo(() => {
    return restTasks
      .filter((t) => t.completedToday)
      .reduce((sum, t) => sum + t.durationMinutes, 0);
  }, [restTasks]);

  // Sync rest goal completion whenever restMinutesToday or goal changes
  useEffect(() => {
    if (!loaded) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pct = restGoalMinutes > 0 ? Math.min(restMinutesToday / restGoalMinutes, 1) : 0;
    const goalMet = pct >= 1;

    setCompletedRestDays((prev) => {
      const alreadyIn = prev.some((d) => d.getTime() === today.getTime());
      if (goalMet && !alreadyIn) return [...prev, today];
      if (!goalMet && alreadyIn) return prev.filter((d) => d.getTime() !== today.getTime());
      return prev;
    });

    setPartialRestDays((prev) => {
      const filtered = prev.filter((d) => d.date.getTime() !== today.getTime());
      if (pct > 0 && pct < 1) return [...filtered, { date: today, pct }];
      return filtered;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restMinutesToday, restGoalMinutes, loaded]);

  // Rest timer
  const startRestTimer = useCallback((taskId: string) => {
    setRestTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task) return prev;
      setActiveRestTimer({
        taskId,
        totalSeconds: task.durationMinutes * 60,
        remainingSeconds: task.durationMinutes * 60,
        isRunning: true,
      });
      return prev;
    });
  }, []);

  const cancelRestTimer = useCallback(() => {
    setActiveRestTimer(null);
  }, []);

  const tickRestTimer = useCallback(() => {
    setActiveRestTimer((s) => {
      if (!s || !s.isRunning) return s;
      if (s.remainingSeconds <= 1) {
        setRestTasks((prev) =>
          prev.map((t) => t.id === s.taskId ? { ...t, completedToday: true, skippedToday: false } : t)
        );
        return null;
      }
      return { ...s, remainingSeconds: s.remainingSeconds - 1 };
    });
  }, []);

  const toggleRestTask = (id: string) => {
    setRestTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (task) {
        const nowDone = !task.completedToday;
        const todayStr = new Date().toDateString();
        setHabitHistory((h) => {
          const existing = h[id] ?? [];
          const next = {
            ...h,
            [id]: nowDone ? Array.from(new Set([...existing, todayStr])) : existing.filter((d) => d !== todayStr),
          };
          AsyncStorage.setItem(STORAGE_KEYS.habitHistory, JSON.stringify(next)).catch(() => {});
          return next;
        });
      }
      return prev.map((t) => t.id === id ? { ...t, completedToday: !t.completedToday, skippedToday: false } : t);
    });
  };

  const addRestTask = (name: string, durationMinutes = 10, category?: RestCategory) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newTask: RestTask = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
      isPreset: false,
      completedToday: false,
      durationMinutes,
      category: category ?? ('My Tasks' as RestCategory),
    };
    setRestTasks((prev) => [...prev, newTask]);
    const { userId: uid } = syncRef.current;
    if (uid) dbUpsertRestTask(uid, newTask);
  };

  const removeRestTask = (id: string) => {
    const task = restTasks.find((t) => t.id === id);
    if (!task || task.isPreset) return;
    setRestTasks((prev) => prev.filter((t) => t.id !== id));
    const { userId: uid } = syncRef.current;
    if (uid) dbDeleteRestTask(uid, id);
  };

  const setTodayMood = useCallback((mood: DailyMood) => {
    setTodayMoodState(mood);
    const todayStr = new Date().toDateString();
    AsyncStorage.multiSet([
      [STORAGE_KEYS.todayMood, JSON.stringify(mood)],
      [STORAGE_KEYS.todayMoodDate, todayStr],
    ]).catch(() => {});
  }, []);

  const setRestGoalTier = useCallback((tier: RestGoalTier) => {
    setRestGoalTierState(tier);
  }, []);

  const markAchievementSeen = (label: string) => {
    setSeenAchievements((prev) => prev.includes(label) ? prev : [...prev, label]);
  };

  const clearAchievementToast = useCallback(() => {
    setPendingAchievementToast(null);
  }, []);

  const addCategory = (cat: string) => {
    const trimmed = cat.trim();
    if (trimmed && !categories.includes(trimmed)) setCategories((prev) => [...prev, trimmed]);
  };

  const removeCategory = (cat: string) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
  };

  const logout = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch { /* offline sign-out is fine */ }
    setUser(null);
    setPomodoroSession(null);
  };

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.spinCount, JSON.stringify(spinCount)).catch(() => {});
  }, [spinCount, loaded]);

  const incrementSpinCount = useCallback(() => {
    setSpinCount((n) => n + 1);
    setSpinsToday((n) => {
      AsyncStorage.multiSet([
        [STORAGE_KEYS.spinsToday, JSON.stringify(n + 1)],
        [STORAGE_KEYS.spinsTodayDate, JSON.stringify(new Date().toDateString())],
      ]).catch(() => {});
      return n + 1;
    });
  }, []);

  // ── Design-port additions ──

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    AsyncStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(t)).catch(() => {});
  }, []);

  const activatePremium = useCallback(() => {
    setIsPremium(true);
    AsyncStorage.setItem(STORAGE_KEYS.isPremium, JSON.stringify(true)).catch(() => {});
  }, []);

  const seedTasks = useCallback((seeded: Task[]) => {
    setTasks(seeded);
    const { userId: uid } = syncRef.current;
    if (uid) seeded.forEach((t, i) => dbUpsertTask(uid, t, i));
  }, []);

  const registerAiUse = useCallback(() => {
    setAiUsesToday((n) => {
      AsyncStorage.multiSet([
        [STORAGE_KEYS.aiUsesToday, JSON.stringify(n + 1)],
        [STORAGE_KEYS.aiUsesTodayDate, JSON.stringify(new Date().toDateString())],
      ]).catch(() => {});
      return n + 1;
    });
  }, []);

  const registerVoiceUse = useCallback(() => {
    setVoiceUsesThisMonth((n) => {
      AsyncStorage.multiSet([
        [STORAGE_KEYS.voiceUsesMonth, JSON.stringify(n + 1)],
        [STORAGE_KEYS.voiceUsesMonthKey, JSON.stringify(`${new Date().getFullYear()}-${new Date().getMonth()}`)],
      ]).catch(() => {});
      return n + 1;
    });
  }, []);

  const registerBrainGame = useCallback(() => {
    const now = new Date().toISOString();
    setLastBrainGameAt(now);
    AsyncStorage.setItem(STORAGE_KEYS.lastBrainGameAt, JSON.stringify(now)).catch(() => {});
  }, []);

  const habitStreak = useCallback((habitId: string) => {
    const dates = new Set(habitHistory[habitId] ?? []);
    if (dates.size === 0) return 0;
    let count = 0;
    const day = new Date();
    if (!dates.has(day.toDateString())) day.setDate(day.getDate() - 1);
    while (dates.has(day.toDateString())) {
      count++;
      day.setDate(day.getDate() - 1);
    }
    return count;
  }, [habitHistory]);

  const setNotifPref = useCallback((key: keyof NotifPrefs, value: boolean) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(STORAGE_KEYS.notifPrefs, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const hasActivityToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const hasTask = completedTasks.some((t) => { const d = new Date(t.completedAt); return d >= today && d < tomorrow; });
    const hasRest = completedRestDays.some((d) => d >= today && d < tomorrow);
    return hasTask || hasRest;
  }, [completedTasks, completedRestDays]);

  const streak = useMemo(() => {
    if (completedTasks.length === 0 && completedRestDays.length === 0) return 0;
    let count = 0;
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const day = new Date(base);
      day.setDate(day.getDate() - i);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const hasTask = completedTasks.some((t) => { const d = new Date(t.completedAt); return d >= day && d < next; });
      const hasRest = completedRestDays.some((d) => d >= day && d < next);
      if (hasTask || hasRest) { count++; } else { break; }
    }
    return count;
  }, [completedTasks, completedRestDays]);

  const bestStreak = useMemo(() => {
    const dates = new Set<number>();
    completedTasks.forEach((t) => {
      const d = new Date(t.completedAt);
      d.setHours(0, 0, 0, 0);
      dates.add(d.getTime());
    });
    completedRestDays.forEach((d) => {
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      dates.add(day.getTime());
    });
    const sorted = Array.from(dates).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const DAY = 86400000;
    let best = 1;
    let current = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] === DAY) {
        current++;
        if (current > best) best = current;
      } else {
        current = 1;
      }
    }
    return best;
  }, [completedTasks, completedRestDays]);

  const restStreak = useMemo(() => {
    if (completedRestDays.length === 0) return 0;
    let count = 0;
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const day = new Date(base);
      day.setDate(day.getDate() - i);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const hasRest = completedRestDays.some((d) => d >= day && d < next);
      if (hasRest) { count++; } else { break; }
    }
    return count;
  }, [completedRestDays]);

  const bestRestStreak = useMemo(() => {
    const dates = new Set<number>();
    completedRestDays.forEach((d) => {
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      dates.add(day.getTime());
    });
    const sorted = Array.from(dates).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const DAY = 86400000;
    let best = 1;
    let current = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] === DAY) {
        current++;
        if (current > best) best = current;
      } else {
        current = 1;
      }
    }
    return best;
  }, [completedRestDays]);

  const achievementValues = useMemo((): AchievementValues => ({
    streak,
    tasks: completedTasks.length,
    focus: completedTasks.reduce((s, t) => s + t.minutesActual, 0),
    speed: completedTasks.filter((t) => t.minutesActual < t.minutesEstimated).length,
    rest: completedRestDays.length,
    spin: spinCount,
  }), [streak, completedTasks, completedRestDays, spinCount]);

  const unlockedTierIds = useMemo(() => getUnlockedTierIds(achievementValues), [achievementValues]);

  // Fire achievement toast from any state update
  const prevUnlockedRef = useRef<string[]>([]);
  useEffect(() => {
    if (!loaded) return;
    const prev = prevUnlockedRef.current;
    const newlyUnlocked = unlockedTierIds.filter((id) => !prev.includes(id));
    if (newlyUnlocked.length > 0) {
      for (const def of ACHIEVEMENT_DEFS) {
        for (const tier of def.tiers) {
          if (newlyUnlocked.includes(tier.id) && !seenAchievements.includes(tier.badge)) {
            setSeenAchievements((p) => p.includes(tier.badge) ? p : [...p, tier.badge]);
            setPendingAchievementToast(tier.badge);
            return;
          }
        }
      }
    }
    prevUnlockedRef.current = unlockedTierIds;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedTierIds, loaded]);

  const value: AppContextType = {
    tasks, addTask, updateTask, deleteTask,
    completedTasks, completeTask, uncompleteTask,
    pomodoroSession, taskProgress, startPomodoro, pausePomodoro, resumePomodoro, completePomodoro, tickPomodoro,
    defaultTimerMinutes, setDefaultTimerMinutes,
    dailyGoal, setDailyGoal,
    notificationsEnabled, setNotificationsEnabled,
    wheelSoundEnabled, setWheelSoundEnabled,
    user, authLoading, login, signUp, logout, updateUser,
    categories, addCategory, removeCategory,
    streak, bestStreak, hasActivityToday, achievementValues, unlockedTierIds, spinCount, incrementSpinCount,
    seenAchievements, markAchievementSeen,
    pendingAchievementToast, clearAchievementToast,
    restTasks, completedRestDays, partialRestDays, toggleRestTask, addRestTask, removeRestTask,
    activeRestTimer, startRestTimer, cancelRestTimer, tickRestTimer,
    todayMood, setTodayMood,
    restGoalTier, setRestGoalTier,
    restMinutesToday, restGoalMinutes,
    restStreak, bestRestStreak,
    hasSeenOnboarding, markOnboardingSeen: () => setHasSeenOnboarding(true),
    theme, setTheme, isPremium, activatePremium, seedTasks, cancelPomodoro,
    spinsToday, aiUsesToday, registerAiUse,
    voiceUsesThisMonth, registerVoiceUse,
    lastBrainGameAt, registerBrainGame,
    habitHistory, habitStreak, notifPrefs, setNotifPref,
  };

  return <AppContext.Provider value={value}>{loaded ? children : null}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
