import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Stable Android notification channel ID for mitzvah daily reminders. */
export const MITZVAH_REMINDERS_CHANNEL_ID = 'mitzvah-reminders';

/** Hebrew user-facing channel name. */
export const MITZVAH_REMINDERS_CHANNEL_NAME = 'תזכורות מצוות';

let channelReadyPromise: Promise<void> | null = null;

/**
 * Creates the mitzvah reminders Android channel once per process.
 * No-op on iOS. Must run before scheduling Android reminder notifications.
 */
export async function ensureMitzvahRemindersChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  if (!channelReadyPromise) {
    channelReadyPromise = Notifications.setNotificationChannelAsync(
      MITZVAH_REMINDERS_CHANNEL_ID,
      {
        name: MITZVAH_REMINDERS_CHANNEL_NAME,
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
      },
    ).then(() => undefined);
  }

  return channelReadyPromise;
}

/** Test helper: reset channel singleton between test runs. */
export function resetMitzvahRemindersChannelState(): void {
  channelReadyPromise = null;
}
