import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type PushRegistrationResult =
  | { ok: true; expoPushToken: string }
  | { ok: false; reason: 'not-a-device' | 'permission-denied' | 'expo-go' | 'error'; error?: unknown };

// expo-notifications' remote-push machinery was removed from Expo Go in SDK 53
// and the package throws during module evaluation on Android there — so it must
// be require()d lazily, never statically imported, and every entry point
// no-ops inside Expo Go. Development/production builds get full behaviour.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

type NotificationsModule = typeof import('expo-notifications');
let notificationsModule: NotificationsModule | null = null;

function getNotifications(): NotificationsModule | null {
  if (isExpoGo) return null;
  if (!notificationsModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications') as NotificationsModule;
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }
  return notificationsModule;
}

function getEasProjectId(): string | undefined {
  const anyConstants = Constants as any;
  return (
    anyConstants?.easConfig?.projectId ??
    anyConstants?.expoConfig?.extra?.eas?.projectId ??
    anyConstants?.expoConfig?.extra?.projectId
  );
}

export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  try {
    const Notifications = getNotifications();
    if (!Notifications) return { ok: false, reason: 'expo-go' };
    if (!Device.isDevice) return { ok: false, reason: 'not-a-device' };

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existingPerms: any = await Notifications.getPermissionsAsync();
    const existingGranted = existingPerms.status === 'granted';
    let finalGranted = existingGranted;
    if (!existingGranted) {
      const requested: any = await Notifications.requestPermissionsAsync();
      finalGranted = requested.status === 'granted';
    }

    if (!finalGranted) return { ok: false, reason: 'permission-denied' };

    const projectId = getEasProjectId();
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return { ok: true, expoPushToken: token.data };
  } catch (error) {
    return { ok: false, reason: 'error', error };
  }
}

// ─── Live Pomodoro Notification ───────────────────────────────────────────────

const POMODORO_CHANNEL_ID = 'pomodoro-timer';
const POMODORO_NOTIF_ID = 'pomodoro-live';

async function ensurePomodoroChannel(Notifications: NotificationsModule) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(POMODORO_CHANNEL_ID, {
      name: 'Pomodoro Timer',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: null,
      enableLights: false,
    });
  }
}

async function ensureNotificationPermission(Notifications: NotificationsModule): Promise<boolean> {
  if (!Device.isDevice) return false;
  const perms: any = await Notifications.getPermissionsAsync();
  if (perms.status === 'granted') return true;
  const requested: any = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

function formatRemaining(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export async function showPomodoroNotification(taskName: string, remainingSeconds: number): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const granted = await ensureNotificationPermission(Notifications);
  if (!granted) return;
  await ensurePomodoroChannel(Notifications);

  await Notifications.dismissNotificationAsync(POMODORO_NOTIF_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: POMODORO_NOTIF_ID,
    content: {
      title: `Focus: ${taskName}`,
      body: `${formatRemaining(remainingSeconds)} remaining`,
      data: { type: 'pomodoro' },
      sticky: true,
      autoDismiss: false,
    },
    trigger: null,
  });
}

export async function dismissPomodoroNotification(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  await Notifications.dismissNotificationAsync(POMODORO_NOTIF_ID).catch(() => {});
}

// ─── Focus complete ───────────────────────────────────────────────────────────

export async function showFocusCompleteNotification(taskName: string, minutes: number): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const granted = await ensureNotificationPermission(Notifications);
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Nice one.',
      body: `${taskName} · ${minutes} min.`,
      data: { type: 'focus-complete' },
    },
    trigger: null,
  }).catch(() => {});
}

// ─── Scheduled notifications (daily nudge + weekly recap) ─────────────────────

const NUDGE_ID = 'daily-nudge';
const RECAP_ID = 'weekly-recap';

/** Reconcile the OS-scheduled notifications with the in-app toggles. */
export async function syncScheduledNotifications(prefs: { nudge: boolean; recap: boolean }): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  await Notifications.cancelScheduledNotificationAsync(NUDGE_ID).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(RECAP_ID).catch(() => {});
  if (!prefs.nudge && !prefs.recap) return;

  const granted = await ensureNotificationPermission(Notifications);
  if (!granted) return;

  if (prefs.nudge) {
    await Notifications.scheduleNotificationAsync({
      identifier: NUDGE_ID,
      content: {
        title: 'The wheel is ready when you are.',
        body: 'One small task still counts today.',
        data: { type: 'nudge' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 0,
      },
    }).catch(() => {});
  }

  if (prefs.recap) {
    await Notifications.scheduleNotificationAsync({
      identifier: RECAP_ID,
      content: {
        title: 'Your week, wrapped.',
        body: 'See what you finished this week.',
        data: { type: 'recap' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday
        hour: 18,
        minute: 0,
      },
    }).catch(() => {});
  }
}
