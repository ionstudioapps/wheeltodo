import { getSupabaseClient } from './supabase';

function sb() {
  return getSupabaseClient();
}

// ─── Shared DB types ──────────────────────────────────────────────────────────

export interface DbTask {
  id: string;
  name: string;
  minutes: number;
  color: string;
  icon: string;
  category?: string;
}

export interface DbCompletedTask {
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

export interface DbRestTask {
  id: string;
  name: string;
  isPreset: boolean;
  durationMinutes: number;
  category: string;
  skippedToday?: boolean;
  color?: string;
  icon?: string;
}

export type DbRestGoalTier = 'easy' | 'standard' | 'dedicated';

export interface DbSettings {
  is_premium: boolean;
  daily_goal: number;
  default_timer_minutes: number;
  rest_goal_tier: string;
}

// ─── Load ─────────────────────────────────────────────────────────────────────

export async function dbLoad(userId: string) {
  const [tasksRes, completedRes, restRes, historyRes, settingsRes] = await Promise.all([
    sb().from('tasks').select('*').eq('user_id', userId).order('created_at'),
    sb().from('completed_tasks').select('*').eq('user_id', userId).order('completed_at', { ascending: false }),
    sb().from('rest_tasks').select('*').eq('user_id', userId).eq('is_preset', false),
    sb().from('habit_history').select('habit_id, day').eq('user_id', userId),
    sb().from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks: DbTask[] = (tasksRes.data ?? []).map((r: any) => ({
    id: r.id, name: r.name, minutes: r.minutes,
    color: r.color, icon: r.icon, category: r.category ?? undefined,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completedTasks: DbCompletedTask[] = (completedRes.data ?? []).map((r: any) => ({
    id: r.id, taskId: r.task_id, taskName: r.task_name,
    color: r.color, icon: r.icon, category: r.category ?? undefined,
    minutesEstimated: r.minutes_estimated, minutesActual: r.minutes_actual,
    completedAt: new Date(r.completed_at),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customRestTasks: DbRestTask[] = (restRes.data ?? []).map((r: any) => ({
    id: r.id, name: r.name, isPreset: false,
    durationMinutes: r.duration_minutes, category: r.category,
    color: r.color ?? undefined, icon: r.icon ?? undefined,
  }));

  // habit_id → array of day strings (Date#toDateString format, matching local state)
  const habitHistory: Record<string, string[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (historyRes.data ?? []).forEach((r: any) => {
    (habitHistory[r.habit_id] ??= []).push(r.day);
  });

  return {
    tasks,
    completedTasks,
    customRestTasks,
    habitHistory,
    settings: settingsRes.data as DbSettings | null,
  };
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function dbUpsertTask(userId: string, task: DbTask, position: number) {
  sb().from('tasks').upsert(
    { id: task.id, user_id: userId, name: task.name, minutes: task.minutes,
      color: task.color, icon: task.icon, category: task.category ?? null, position },
    { onConflict: 'id,user_id' }
  ).then(() => {}, () => {});
}

export function dbDeleteTask(userId: string, taskId: string) {
  sb().from('tasks').delete().eq('id', taskId).eq('user_id', userId)
    .then(() => {}, () => {});
}

// ─── Completed tasks ──────────────────────────────────────────────────────────

export function dbInsertCompleted(userId: string, ct: DbCompletedTask) {
  sb().from('completed_tasks').insert({
    id: ct.id, user_id: userId, task_id: ct.taskId, task_name: ct.taskName,
    color: ct.color, icon: ct.icon, category: ct.category ?? null,
    minutes_estimated: ct.minutesEstimated, minutes_actual: ct.minutesActual,
    completed_at: ct.completedAt.toISOString(),
  }).then(() => {}, () => {});
}

export function dbDeleteCompleted(userId: string, ctId: string) {
  sb().from('completed_tasks').delete().eq('id', ctId).eq('user_id', userId)
    .then(() => {}, () => {});
}

// ─── Rest tasks ───────────────────────────────────────────────────────────────

export function dbUpsertRestTask(userId: string, rt: DbRestTask) {
  sb().from('rest_tasks').upsert(
    { id: rt.id, user_id: userId, name: rt.name,
      duration_minutes: rt.durationMinutes, is_preset: false, category: rt.category,
      color: rt.color ?? null, icon: rt.icon ?? null },
    { onConflict: 'id,user_id' }
  ).then(() => {}, () => {});
}

export function dbDeleteRestTask(userId: string, rtId: string) {
  sb().from('rest_tasks').delete().eq('id', rtId).eq('user_id', userId)
    .then(() => {}, () => {});
  sb().from('habit_history').delete().eq('habit_id', rtId).eq('user_id', userId)
    .then(() => {}, () => {});
}

// ─── Habit history ────────────────────────────────────────────────────────────

// `day` uses Date#toDateString format to match local habitHistory state.
export function dbSetHabitDay(userId: string, habitId: string, day: string, done: boolean) {
  if (done) {
    sb().from('habit_history').upsert(
      { user_id: userId, habit_id: habitId, day },
      { onConflict: 'user_id,habit_id,day' }
    ).then(() => {}, () => {});
  } else {
    sb().from('habit_history').delete()
      .eq('user_id', userId).eq('habit_id', habitId).eq('day', day)
      .then(() => {}, () => {});
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function dbUpsertSettings(userId: string, patch: {
  dailyGoal?: number;
  defaultTimerMinutes?: number;
  restGoalTier?: DbRestGoalTier;
  isPremium?: boolean;
}) {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (patch.dailyGoal !== undefined) row.daily_goal = patch.dailyGoal;
  if (patch.defaultTimerMinutes !== undefined) row.default_timer_minutes = patch.defaultTimerMinutes;
  if (patch.restGoalTier !== undefined) row.rest_goal_tier = patch.restGoalTier;
  if (patch.isPremium !== undefined) row.is_premium = patch.isPremium;
  sb().from('user_settings').upsert(row, { onConflict: 'user_id' })
    .then(() => {}, () => {});
}

// ─── Bulk push ────────────────────────────────────────────────────────────────

export async function dbBulkPush(
  userId: string,
  tasks: DbTask[],
  completedTasks: DbCompletedTask[],
  customRestTasks: DbRestTask[],
) {
  await Promise.all([
    tasks.length
      ? sb().from('tasks').upsert(
          tasks.map((t, i) => ({ id: t.id, user_id: userId, name: t.name, minutes: t.minutes,
            color: t.color, icon: t.icon, category: t.category ?? null, position: i })),
          { onConflict: 'id,user_id' }
        )
      : Promise.resolve(),
    completedTasks.length
      ? sb().from('completed_tasks').upsert(
          completedTasks.map((ct) => ({
            id: ct.id, user_id: userId, task_id: ct.taskId, task_name: ct.taskName,
            color: ct.color, icon: ct.icon, category: ct.category ?? null,
            minutes_estimated: ct.minutesEstimated, minutes_actual: ct.minutesActual,
            completed_at: ct.completedAt.toISOString(),
          })),
          { onConflict: 'id,user_id' }
        )
      : Promise.resolve(),
    customRestTasks.length
      ? sb().from('rest_tasks').upsert(
          customRestTasks.map((rt) => ({ id: rt.id, user_id: userId, name: rt.name,
            duration_minutes: rt.durationMinutes, is_preset: false, category: rt.category,
            color: rt.color ?? null, icon: rt.icon ?? null })),
          { onConflict: 'id,user_id' }
        )
      : Promise.resolve(),
  ]);
}
