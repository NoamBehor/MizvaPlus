import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  ensureMitzvahRemindersChannel,
  MITZVAH_REMINDERS_CHANNEL_ID,
} from '@/services/notificationChannels';
import { getDeviceLocalDailyTriggerFromIsraelReminder } from '@/utils/reminderTimezone';
import { isValidTimeString } from '@/utils/time';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'undetermined';

export type NotificationPermissionDecision =
  | 'already-granted'
  | 'blocked'
  | 'prompt';

export interface NotificationPermissionResult {
  status: NotificationPermissionStatus;
  granted: boolean;
}

export interface ScheduleNotificationParams {
  identifier: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  hour: number;
  minute: number;
}

export interface ScheduleDateNotificationParams {
  identifier: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  date: Date;
}

let notificationListenersRegistered = false;

function logNotificationDiagnostic(
  event: string,
  fields: { type?: unknown; channel?: unknown; identifier?: string },
): void {
  if (!__DEV__) {
    return;
  }

  console.log('[notifications]', event, fields);
}

export function resolveNotificationPermissionDecision(
  status: NotificationPermissionStatus,
  canAskAgain: boolean,
): { action: NotificationPermissionDecision; shouldPrompt: boolean } {
  if (status === 'granted') {
    return { action: 'already-granted', shouldPrompt: false };
  }
  if (!canAskAgain) {
    return { action: 'blocked', shouldPrompt: false };
  }
  return { action: 'prompt', shouldPrompt: true };
}

function normalizePermissionStatus(
  status: Notifications.PermissionStatus,
): NotificationPermissionStatus {
  if (status === 'granted') {
    return 'granted';
  }
  if (status === 'denied') {
    return 'denied';
  }
  return 'undetermined';
}

export function registerNotificationListeners(): void {
  if (notificationListenersRegistered) {
    return;
  }

  notificationListenersRegistered = true;

  Notifications.addNotificationReceivedListener((notification) => {
    const content = notification.request.content as Notifications.NotificationContent & {
      channelId?: string;
    };
    logNotificationDiagnostic('received', {
      type: content.data?.type,
      channel: content.channelId,
      identifier: notification.request.identifier,
    });
  });

  Notifications.addNotificationResponseReceivedListener((response) => {
    const content = response.notification.request.content as Notifications.NotificationContent & {
      channelId?: string;
    };
    logNotificationDiagnostic('response', {
      type: content.data?.type,
      channel: content.channelId,
      identifier: response.notification.request.identifier,
    });
  });
}

registerNotificationListeners();

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return normalizePermissionStatus(status);
}

export async function refreshOsNotificationPermission(): Promise<NotificationPermissionStatus> {
  return getNotificationPermissionStatus();
}

export async function requestNotificationPermissions(): Promise<NotificationPermissionResult> {
  const existing = await Notifications.getPermissionsAsync();
  const status = normalizePermissionStatus(existing.status);
  const decision = resolveNotificationPermissionDecision(
    status,
    existing.canAskAgain ?? true,
  );

  if (decision.action === 'already-granted') {
    return { status: 'granted', granted: true };
  }

  if (decision.action === 'blocked') {
    return { status: 'denied', granted: false };
  }

  const { status: requestedStatus } = await Notifications.requestPermissionsAsync();
  const granted = requestedStatus === 'granted';
  return {
    status: granted ? 'granted' : 'denied',
    granted,
  };
}

export async function scheduleDailyNotification(
  params: ScheduleNotificationParams,
): Promise<string> {
  await ensureMitzvahRemindersChannel();

  await Notifications.scheduleNotificationAsync({
    identifier: params.identifier,
    content: {
      title: params.title,
      body: params.body,
      data: params.data,
      ...(Platform.OS === 'android'
        ? { channelId: MITZVAH_REMINDERS_CHANNEL_ID }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: params.hour,
      minute: params.minute,
    },
  });

  logNotificationDiagnostic('scheduled', {
    type: params.data?.type,
    channel:
      Platform.OS === 'android' ? MITZVAH_REMINDERS_CHANNEL_ID : undefined,
    identifier: params.identifier,
  });

  return params.identifier;
}

export async function scheduleDateNotification(
  params: ScheduleDateNotificationParams,
): Promise<string> {
  await ensureMitzvahRemindersChannel();

  await Notifications.scheduleNotificationAsync({
    identifier: params.identifier,
    content: {
      title: params.title,
      body: params.body,
      data: params.data,
      ...(Platform.OS === 'android'
        ? { channelId: MITZVAH_REMINDERS_CHANNEL_ID }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: params.date,
    },
  });

  logNotificationDiagnostic('scheduled', {
    type: params.data?.type,
    channel:
      Platform.OS === 'android' ? MITZVAH_REMINDERS_CHANNEL_ID : undefined,
    identifier: params.identifier,
  });

  return params.identifier;
}

export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getAllScheduledNotificationIdentifiers(): Promise<string[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled
    .map((request) => request.identifier)
    .filter((identifier): identifier is string => Boolean(identifier));
}

export function buildDailyTriggerFromTime(reminderTime: string): {
  hour: number;
  minute: number;
} {
  return getDeviceLocalDailyTriggerFromIsraelReminder(reminderTime);
}

export function isReminderTimeValid(reminderTime?: string): reminderTime is string {
  return Boolean(reminderTime && isValidTimeString(reminderTime));
}

/** @deprecated Use notificationScheduler.buildMitzvahReminderId */
export function getMitzvahNotificationIdentifier(mitzvahId: string): string {
  return `mitzvah-reminder-${mitzvahId}`;
}
