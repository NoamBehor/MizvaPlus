import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Stable Android notification channel ID for mitzvah daily reminders. */
export const MITZVAH_REMINDERS_CHANNEL_ID = 'mitzvah-reminders-v2';

/** v1 channel used a missing custom audio file named default. */
const LEGACY_MITZVAH_REMINDERS_CHANNEL_ID = 'mitzvah-reminders';

/** Hebrew user-facing channel name. */
export const MITZVAH_REMINDERS_CHANNEL_NAME = 'תזכורות מצוות';

let channelReadyPromise: Promise<void> | null = null;

/**
 * Creates the mitzvah reminders Android channel once per process.
 * No-op on iOS. Must run before scheduling Android reminder notifications.
 *
 * Android channels persist for the app install. Immutable properties such as
 * the audio resource cannot be updated in place. Recreating the same channel
 * ID also will not change those properties unless the channel is deleted first.
 *
 * This function deletes the v1 channel and creates v2 without a custom audio
 * property, so Android uses the system notification audio. Reinstalling the
 * development client also wipes channels, but is not required after this
 * change because the legacy channel is removed in code.
 */
export async function ensureMitzvahRemindersChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  if (!channelReadyPromise) {
    channelReadyPromise = (async () => {
      await Notifications.deleteNotificationChannelAsync(
        LEGACY_MITZVAH_REMINDERS_CHANNEL_ID,
      );
      await Notifications.setNotificationChannelAsync(
        MITZVAH_REMINDERS_CHANNEL_ID,
        {
          name: MITZVAH_REMINDERS_CHANNEL_NAME,
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          enableVibrate: true,
        },
      );
    })();
  }

  return channelReadyPromise;
}

/** Test helper: reset channel singleton between test runs. */
export function resetMitzvahRemindersChannelState(): void {
  channelReadyPromise = null;
}
