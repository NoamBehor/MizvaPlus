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

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') {
    return 'granted';
  }
  if (status === 'denied') {
    return 'denied';
  }
  return 'undetermined';
}

export async function requestNotificationPermissions(): Promise<NotificationPermissionResult> {
  const existing = await getNotificationPermissionStatus();
  if (existing === 'granted') {
    return { status: 'granted', granted: true };
  }

  const { status } = await Notifications.requestPermissionsAsync();
  const granted = status === 'granted';
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

  return params.identifier;
}

export async function scheduleDateNotification(
  params: ScheduleDateNotificationParams,
): Promise<string> {
  await Notifications.scheduleNotificationAsync({
    identifier: params.identifier,
    content: {
      title: params.title,
      body: params.body,
      data: params.data,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: params.date,
    },
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
