"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type AchievementValues } from "../utils/achievements";
import {
  dbLoad, dbUpsertTask, dbDeleteTask, dbInsertCompleted, dbDeleteCompleted,
  dbUpsertRestTask, dbDeleteRestTask, dbUpsertSettings, dbUpsertRestDay, dbDeleteRestDay, dbBulkPush,
} from "../utils/db";
import { THEMES, type ThemeName } from "@todo/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

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

export type RestCategory = "Physical" | "Mental" | "Social" | "Nourishment" | "My Tasks";
export type DailyMood = "drained" | "okay" | "restless" | null;
export type RestGoalTier = "easy" | "standard" | "dedicated";

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
  { id: "preset_1",  name: "Get a coffee",              isPreset: true, completedToday: false, durationMinutes: 5,  category: "Nourishment" },
  { id: "preset_2",  name: "Go for a walk",             isPreset: true, completedToday: false, durationMinutes: 20, category: "Physical"    },
  { id: "preset_3",  name: "Read",                      isPreset: true, completedToday: false, durationMinutes: 10, category: "Mental"      },
  { id: "preset_4",  name: "Stretch",                   isPreset: true, completedToday: false, durationMinutes: 10, category: "Physical"    },
  { id: "preset_5",  name: "Call a friend",             isPreset: true, completedToday: false, durationMinutes: 15, category: "Social"      },
  { id: "preset_6",  name: "Take a nap",                isPreset: true, completedToday: false, durationMinutes: 30, category: "Physical"    },
  { id: "preset_7",  name: "Cook something",            isPreset: true, completedToday: false, durationMinutes: 20, category: "Nourishment" },
  { id: "preset_8",  name: "Go for a run",              isPreset: true, completedToday: false, durationMinutes: 30, category: "Physical"    },
  { id: "preset_9",  name: "Journal",                   isPreset: true, completedToday: false, durationMinutes: 10, category: "Mental"      },
  { id: "preset_10", name: "Watch something you enjoy", isPreset: true, completedToday: false, durationMinutes: 30, category: "Mental"      },
];

// Default wheel colours — warm-start theme. Override per-theme via CSS --wheel-N vars.
export const COLORS = ["#EDB590", "#E59880", "#9DC4BC", "#F0D29D", "#ADA8CC", "#D4A5C8"];

const DEFAULT_CATEGORIES = ["Work", "Personal", "Learning", "Health"];

const defaultTasks: Task[] = [
  { id: "1", name: "Write blog post",  minutes: 25, color: "#E59880", icon: "PenLine"  },
  { id: "2", name: "Review code",      minutes: 15, color: "#EDB590", icon: "Code"     },
  { id: "3", name: "Design mockups",   minutes: 30, color: "#9DC4BC", icon: "Palette"  },
  { id: "4", name: "Team meeting",     minutes: 20, color: "#F0D29D", icon: "Users"    },
  { id: "5", name: "Email replies",    minutes: 10, color: "#ADA8CC", icon: "Mail"     },
  { id: "6", name: "Research",         minutes: 25, color: "#D4A5C8", icon: "BookOpen" },
];

// ─── Context type ─────────────────────────────────────────────────────────────

interface AppContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, "id">) => void;
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

  dailyGoal: number;
  setDailyGoal: (goal: number) => void;
  defaultTimerMinutes: number;
  setDefaultTimerMinutes: (m: number) => void;

  categories: string[];
  addCategory: (cat: string) => void;
  removeCategory: (cat: string) => void;

  streak: number;
  bestStreak: number;
  hasActivityToday: boolean;
  spinCount: number;
  incrementSpinCount: () => void;
  achievementValues: AchievementValues;

  restTasks: RestTask[];
  completedRestDays: Date[];
  partialRestDays: { date: Date; pct: number }[];
  toggleRestTask: (id: string) => void;
  addRestTask: (name: string, durationMinutes?: number) => void;
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

  isPremium: boolean;
  activatePremium: () => Promise<void>;

  logQuickWin: (name: string, minutes: number) => void;

  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  themeAuto: boolean;
  setThemeAuto: (auto: boolean) => void;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function ls<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

const KEYS = {
  tasks: "wt.tasks",
  completedTasks: "wt.completedTasks",
  categories: "wt.categories",
  spinCount: "wt.spinCount",
  restTasks: "wt.restTasks",
  restTasksDate: "wt.restTasksDate",
  completedRestDays: "wt.completedRestDays",
  partialRestDays: "wt.partialRestDays",
  todayMood: "wt.todayMood",
  todayMoodDate: "wt.todayMoodDate",
  restGoalTier: "wt.restGoalTier",
  dailyGoal: "wt.dailyGoal",
  defaultTimerMinutes: "wt.defaultTimerMinutes",
  hasSeenOnboarding: "wt.hasSeenOnboarding",
  isPremium: "wt.isPremium",
  theme: "wt.theme",
  themeAuto: "wt.themeAuto",
} as const;

function applyTheme(t: ThemeName) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  (Object.keys(THEMES) as ThemeName[]).forEach((name) => html.classList.remove(`theme-${name}`));
  if (t !== "warm-start") html.classList.add(`theme-${t}`);
}

function osTheme(): ThemeName {
  if (typeof window === "undefined") return "warm-start";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "slow-down" : "warm-start";
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [pomodoroSession, setPomodoroSession] = useState<PomodoroSession | null>(null);
  const [taskProgress, setTaskProgress] = useState<Record<string, number>>({});
  const [dailyGoal, setDailyGoalState] = useState(6);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [spinCount, setSpinCount] = useState(0);
  const [restTasks, setRestTasks] = useState<RestTask[]>(PRESET_REST_TASKS);
  const [completedRestDays, setCompletedRestDays] = useState<Date[]>([]);
  const [partialRestDays, setPartialRestDays] = useState<{ date: Date; pct: number }[]>([]);
  const [activeRestTimer, setActiveRestTimer] = useState<ActiveRestTimer | null>(null);
  const [todayMood, setTodayMoodState] = useState<DailyMood>(null);
  const [restGoalTier, setRestGoalTierState] = useState<RestGoalTier>("standard");
  const [defaultTimerMinutes, setDefaultTimerMinutesState] = useState(25);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [themeAuto, setThemeAutoState] = useState(true);
  const [theme, setThemeState] = useState<ThemeName>("warm-start");
  // Ref so mutation closures always read current userId without needing re-memoization
  const syncRef = useRef({ userId });
  useEffect(() => { syncRef.current = { userId }; }, [userId]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedTasks = ls<Task[]>(KEYS.tasks, defaultTasks);
    setTasks(savedTasks);

    const rawCompleted = ls<Array<CompletedTask & { completedAt: string }>>(KEYS.completedTasks, []);
    setCompletedTasks(rawCompleted.map((t) => ({ ...t, completedAt: new Date(t.completedAt) })));

    setCategories(ls<string[]>(KEYS.categories, DEFAULT_CATEGORIES));
    setSpinCount(ls<number>(KEYS.spinCount, 0));
    setDailyGoalState(ls<number>(KEYS.dailyGoal, 6));

    const todayStr = new Date().toDateString();
    const savedRestTasksDate = ls<string>(KEYS.restTasksDate, "");
    const savedRestTasks = ls<RestTask[]>(KEYS.restTasks, PRESET_REST_TASKS);
    const custom = savedRestTasks.filter((t) => !t.isPreset);
    if (savedRestTasksDate === todayStr) {
      const savedPresets = savedRestTasks.filter((t) => t.isPreset);
      const refreshed = PRESET_REST_TASKS.map((p) => ({
        ...p,
        completedToday: savedPresets.find((s) => s.id === p.id)?.completedToday ?? false,
        skippedToday: savedPresets.find((s) => s.id === p.id)?.skippedToday ?? false,
      }));
      setRestTasks([...refreshed, ...custom]);
    } else {
      setRestTasks([...PRESET_REST_TASKS, ...custom.map((t) => ({ ...t, completedToday: false }))]);
    }

    const rawCRD = ls<string[]>(KEYS.completedRestDays, []);
    setCompletedRestDays(rawCRD.map((d) => new Date(d)));

    const rawPRD = ls<Array<{ date: string; pct: number }>>(KEYS.partialRestDays, []);
    setPartialRestDays(rawPRD.map((d) => ({ date: new Date(d.date), pct: d.pct })));

    const savedMoodDate = ls<string>(KEYS.todayMoodDate, "");
    if (savedMoodDate === todayStr) {
      setTodayMoodState(ls<DailyMood>(KEYS.todayMood, null));
    }
    setRestGoalTierState(ls<RestGoalTier>(KEYS.restGoalTier, "standard"));
    setDefaultTimerMinutesState(ls<number>(KEYS.defaultTimerMinutes, 25));
    setHasSeenOnboarding(ls<boolean>(KEYS.hasSeenOnboarding, false));
    setIsPremium(ls<boolean>(KEYS.isPremium, false));

    const savedAuto = ls<boolean | null>(KEYS.themeAuto, null);
    const isAuto = savedAuto === null ? true : savedAuto; // first install → auto
    setThemeAutoState(isAuto);
    const resolved = isAuto ? osTheme() : ls<ThemeName>(KEYS.theme, "warm-start");
    setThemeState(resolved);
    applyTheme(resolved);

    setLoaded(true);

    // For logged-in users: load cloud data (sync available to all signed-in users)
    if (userId) {
      dbLoad(userId).then(({ tasks: dbTasks, completedTasks: dbCompleted, customRestTaskIds, restDays, settings }) => {
        if (dbTasks.length > 0) setTasks(dbTasks);
        if (dbCompleted.length > 0) setCompletedTasks(dbCompleted);

        if (restDays.length > 0) {
          setCompletedRestDays(
            restDays.filter((d) => d.is_complete).map((d) => new Date(d.date))
          );
          setPartialRestDays(
            restDays.filter((d) => !d.is_complete && d.partial_pct != null)
              .map((d) => ({ date: new Date(d.date), pct: d.partial_pct! }))
          );
        }

        if (settings) {
          setDailyGoalState(settings.daily_goal);
          setDefaultTimerMinutesState(settings.default_timer_minutes);
          setRestGoalTierState(settings.rest_goal_tier as RestGoalTier);
          const premium = settings.is_premium ?? false;
          setIsPremium(premium);
          lsSet(KEYS.isPremium, premium);
          if (settings.categories?.length) setCategories(settings.categories);
          if (settings.spin_count) setSpinCount(settings.spin_count);
        }
      }).catch(() => {});
    }
  }, [userId]);

  // Persist whenever state changes
  useEffect(() => { if (loaded) lsSet(KEYS.tasks, tasks); }, [tasks, loaded]);
  useEffect(() => { if (loaded) lsSet(KEYS.completedTasks, completedTasks); }, [completedTasks, loaded]);
  useEffect(() => { if (loaded) lsSet(KEYS.categories, categories); }, [categories, loaded]);
  useEffect(() => { if (loaded) lsSet(KEYS.spinCount, spinCount); }, [spinCount, loaded]);
  useEffect(() => { if (loaded) lsSet(KEYS.dailyGoal, dailyGoal); }, [dailyGoal, loaded]);
  useEffect(() => {
    if (!loaded) return;
    lsSet(KEYS.restTasks, restTasks);
    lsSet(KEYS.restTasksDate, new Date().toDateString());
  }, [restTasks, loaded]);
  useEffect(() => {
    if (!loaded) return;
    lsSet(KEYS.completedRestDays, completedRestDays.map((d) => d.toISOString()));
  }, [completedRestDays, loaded]);
  useEffect(() => {
    if (!loaded) return;
    lsSet(KEYS.partialRestDays, partialRestDays.map((d) => ({ date: d.date.toISOString(), pct: d.pct })));
  }, [partialRestDays, loaded]);
  useEffect(() => { if (loaded) lsSet(KEYS.restGoalTier, restGoalTier); }, [restGoalTier, loaded]);
  useEffect(() => { if (loaded) lsSet(KEYS.defaultTimerMinutes, defaultTimerMinutes); }, [defaultTimerMinutes, loaded]);
  useEffect(() => { if (loaded) lsSet(KEYS.hasSeenOnboarding, hasSeenOnboarding); }, [hasSeenOnboarding, loaded]);
  useEffect(() => { if (loaded) lsSet(KEYS.isPremium, isPremium); }, [isPremium, loaded]);

  // Listen for OS dark/light changes when auto is on
  useEffect(() => {
    if (!themeAuto) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange() {
      const next = mq.matches ? "slow-down" : "warm-start";
      setThemeState(next);
      applyTheme(next);
    }
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [themeAuto]);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    applyTheme(t);
    lsSet(KEYS.theme, t);
  }, []);

  const setThemeAuto = useCallback((auto: boolean) => {
    setThemeAutoState(auto);
    lsSet(KEYS.themeAuto, auto);
    if (auto) {
      const next = osTheme();
      setThemeState(next);
      applyTheme(next);
    }
  }, []);

  // Sync settings to Supabase for all signed-in users
  useEffect(() => {
    if (!loaded || !userId) return;
    dbUpsertSettings(userId, { dailyGoal, defaultTimerMinutes, restGoalTier, categories, spinCount });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyGoal, defaultTimerMinutes, restGoalTier, categories, spinCount, loaded, userId]);

  // ─── Task actions ────────────────────────────────────────────────────────────

  const addTask = (task: Omit<Task, "id">) => {
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
      color: ct.color, icon: ct.icon, category: ct.category,
    };
    setTasks((prev) => [...prev, restoredTask]);
    setCompletedTasks((prev) => prev.filter((t) => t.id !== completedTaskId));
    const { userId: uid } = syncRef.current;
    if (uid) {
      dbUpsertTask(uid, restoredTask, 0);
      dbDeleteCompleted(uid, completedTaskId);
    }
  };

  // ─── Pomodoro ────────────────────────────────────────────────────────────────

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
    const minutesActual = Math.max(
      1,
      Math.ceil((pomodoroSession.totalSeconds - pomodoroSession.remainingSeconds) / 60)
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

  const tickPomodoro = useCallback(() => {
    setPomodoroSession((s) =>
      s && s.isRunning && s.remainingSeconds > 0
        ? { ...s, remainingSeconds: s.remainingSeconds - 1 }
        : s
    );
  }, []);

  // ─── Rest timer ──────────────────────────────────────────────────────────────

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
          prev.map((t) => (t.id === s.taskId ? { ...t, completedToday: true, skippedToday: false } : t))
        );
        return null;
      }
      return { ...s, remainingSeconds: s.remainingSeconds - 1 };
    });
  }, []);

  const toggleRestTask = (id: string) => {
    setRestTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completedToday: !t.completedToday, skippedToday: false } : t))
    );
  };

  const addRestTask = (name: string, durationMinutes = 10) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newTask: RestTask = {
      id: `custom_${Date.now()}`,
      name: trimmed,
      isPreset: false,
      completedToday: false,
      durationMinutes,
      category: "My Tasks" as RestCategory,
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
    lsSet(KEYS.todayMood, mood);
    lsSet(KEYS.todayMoodDate, new Date().toDateString());
  }, []);

  const setRestGoalTier = useCallback((tier: RestGoalTier) => {
    setRestGoalTierState(tier);
  }, []);

  const setDailyGoal = (goal: number) => setDailyGoalState(goal);
  const setDefaultTimerMinutes = (m: number) => setDefaultTimerMinutesState(m);
  const markOnboardingSeen = useCallback(() => setHasSeenOnboarding(true), []);

  const logQuickWin = useCallback((name: string, minutes: number) => {
    const win: CompletedTask = {
      id: `qw_${Date.now()}`,
      taskId: `qw_${Date.now()}`,
      taskName: name,
      color: COLORS[0],
      icon: "Sparkles",
      minutesEstimated: minutes,
      minutesActual: minutes,
      completedAt: new Date(),
    };
    setCompletedTasks((prev) => [win, ...prev]);
    const { userId: uid } = syncRef.current;
    if (uid) dbInsertCompleted(uid, win);
  }, []);

  const activatePremium = useCallback(async () => {
    setIsPremium(true);
    lsSet(KEYS.isPremium, true);
    if (!userId) return;
    // Persist premium flag + push all current data to Supabase
    await dbUpsertSettings(userId, { isPremium: true, dailyGoal, defaultTimerMinutes, restGoalTier });
    const customRestTasks = restTasks.filter((t) => !t.isPreset);
    await dbBulkPush(userId, tasks, completedTasks, customRestTasks);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tasks, completedTasks, restTasks, dailyGoal, defaultTimerMinutes, restGoalTier]);

  const addCategory = (cat: string) => {
    const trimmed = cat.trim();
    if (trimmed && !categories.includes(trimmed)) setCategories((prev) => [...prev, trimmed]);
  };

  const removeCategory = (cat: string) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
  };

  const incrementSpinCount = useCallback(() => {
    setSpinCount((n) => n + 1);
  }, []);

  // ─── Derived values ───────────────────────────────────────────────────────────

  const restGoalMinutes = REST_GOAL_MINUTES[restGoalTier];

  const restMinutesToday = useMemo(() => {
    return restTasks.filter((t) => t.completedToday).reduce((sum, t) => sum + t.durationMinutes, 0);
  }, [restTasks]);

  // Sync rest goal completion
  useEffect(() => {
    if (!loaded) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString().slice(0, 10);
    const pct = restGoalMinutes > 0 ? Math.min(restMinutesToday / restGoalMinutes, 1) : 0;
    const goalMet = pct >= 1;
    const { userId: uid } = syncRef.current;

    setCompletedRestDays((prev) => {
      const alreadyIn = prev.some((d) => d.getTime() === today.getTime());
      if (goalMet && !alreadyIn) {
        if (uid) dbUpsertRestDay(uid, { date: todayIso, is_complete: true, partial_pct: null });
        return [...prev, today];
      }
      if (!goalMet && alreadyIn) {
        if (uid) dbDeleteRestDay(uid, todayIso);
        return prev.filter((d) => d.getTime() !== today.getTime());
      }
      return prev;
    });

    setPartialRestDays((prev) => {
      const filtered = prev.filter((d) => d.date.getTime() !== today.getTime());
      if (pct > 0 && pct < 1) {
        if (uid) dbUpsertRestDay(uid, { date: todayIso, is_complete: false, partial_pct: Math.round(pct * 100) });
        return [...filtered, { date: today, pct }];
      }
      return filtered;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restMinutesToday, restGoalMinutes, loaded]);

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
    completedTasks.forEach((t) => { const d = new Date(t.completedAt); d.setHours(0, 0, 0, 0); dates.add(d.getTime()); });
    completedRestDays.forEach((d) => { const day = new Date(d); day.setHours(0, 0, 0, 0); dates.add(day.getTime()); });
    const sorted = Array.from(dates).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const DAY = 86400000;
    let best = 1, current = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] === DAY) { current++; if (current > best) best = current; } else { current = 1; }
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
      if (completedRestDays.some((d) => d >= day && d < next)) { count++; } else { break; }
    }
    return count;
  }, [completedRestDays]);

  const achievementValues: AchievementValues = useMemo(() => ({
    streak,
    tasks: completedTasks.length,
    focus: completedTasks.reduce((s, t) => s + t.minutesActual, 0),
    speed: completedTasks.filter((t) => t.minutesActual <= t.minutesEstimated).length,
    rest: completedRestDays.length,
    spin: spinCount,
  }), [streak, completedTasks, completedRestDays, spinCount]);

  const bestRestStreak = useMemo(() => {
    const dates = new Set<number>();
    completedRestDays.forEach((d) => { const day = new Date(d); day.setHours(0, 0, 0, 0); dates.add(day.getTime()); });
    const sorted = Array.from(dates).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const DAY = 86400000;
    let best = 1, current = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] === DAY) { current++; if (current > best) best = current; } else { current = 1; }
    }
    return best;
  }, [completedRestDays]);

  const value: AppContextType = {
    tasks, addTask, updateTask, deleteTask,
    completedTasks, completeTask, uncompleteTask,
    pomodoroSession, taskProgress, startPomodoro, pausePomodoro, resumePomodoro, completePomodoro, tickPomodoro,
    dailyGoal, setDailyGoal,
    defaultTimerMinutes, setDefaultTimerMinutes,
    categories, addCategory, removeCategory,
    streak, bestStreak, hasActivityToday, spinCount, incrementSpinCount, achievementValues,
    restTasks, completedRestDays, partialRestDays, toggleRestTask, addRestTask, removeRestTask,
    activeRestTimer, startRestTimer, cancelRestTimer, tickRestTimer,
    todayMood, setTodayMood,
    restGoalTier, setRestGoalTier,
    restMinutesToday, restGoalMinutes,
    restStreak, bestRestStreak,
    hasSeenOnboarding, markOnboardingSeen,
    isPremium, activatePremium,
    logQuickWin,
    theme, setTheme, themeAuto, setThemeAuto,
  };

  return (
    <AppContext.Provider value={value}>
      {loaded ? children : null}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
