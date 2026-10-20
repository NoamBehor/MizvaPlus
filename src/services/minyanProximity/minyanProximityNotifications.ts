import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  ensureMinyanProximityChannel,
  MINYAN_PROXIMITY_CHANNEL_ID,
} from '@/services/notificationChannels';
import type { MinyanProximityCandidate } from '@/services/minyanProximity/minyanProximityEvaluation';

function buildNotificationIdentifier(reportId: string, expiresAt: string): string {
  return `minyan-proximity-${reportId}-${expiresAt}`;
}

export async function presentMinyanProximityAlert(
  candidate: MinyanProximityCandidate,
): Promise<void> {
  await ensureMinyanProximityChannel();

  const distanceLabel =
    candidate.distanceMeters < 1000
      ? `${Math.round(candidate.distanceMeters)} מטר`
      : `${(candidate.distanceMeters / 1000).toFixed(1)} ק"מ`;

  await Notifications.scheduleNotificationAsync({
    identifier: buildNotificationIdentifier(candidate.reportId, candidate.expiresAt),
    content: {
      title: 'מניין בקרבת מקום',
      body: `בית כנסת ${candidate.synagogueName} מבקש עזרה למניין (${distanceLabel}).`,
      data: {
        type: 'minyan_proximity',
        reportId: candidate.reportId,
        synagogueOsmKey: candidate.synagogueOsmKey,
      },
      ...(Platform.OS === 'android'
        ? { channelId: MINYAN_PROXIMITY_CHANNEL_ID }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      repeats: false,
    },
  });
}
