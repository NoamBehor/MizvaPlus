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

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  return 'denied';
}

export async function refreshOsNotificationPermission(): Promise<NotificationPermissionStatus> {
  return 'denied';
}

export async function requestNotificationPermissions(): Promise<NotificationPermissionResult> {
  return { status: 'denied', granted: false };
}

export async function enableNotifications(): Promise<NotificationPermissionResult> {
  return { status: 'denied', granted: false };
}

export async function scheduleDailyNotification(
  _params: ScheduleNotificationParams,
): Promise<string | null> {
  return null;
}

export async function scheduleDateNotification(
  _params: ScheduleDateNotificationParams,
): Promise<string | null> {
  return null;
}

export async function cancelNotification(_identifier: string): Promise<void> {
  // No-op on web.
}

export async function cancelAllNotifications(): Promise<void> {
  // No-op on web.
}

export async function getAllScheduledNotificationIdentifiers(): Promise<string[]> {
  return [];
}

export function buildDailyTriggerFromTime(time: string): { hour: number; minute: number } {
  const [hourPart, minutePart] = time.split(':');
  return {
    hour: Number.parseInt(hourPart ?? '8', 10),
    minute: Number.parseInt(minutePart ?? '0', 10),
  };
}

export function isReminderTimeValid(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}
