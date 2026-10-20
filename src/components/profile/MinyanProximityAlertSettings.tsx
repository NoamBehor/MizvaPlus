import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import * as Location from 'expo-location';

import { Card } from '@/components/common/Card';
import { ToggleRow } from '@/components/common/ToggleRow';
import { colors } from '@/constants/colors';
import { MINYAN_PROXIMITY_ALERT_RADIUS_METERS } from '@/constants/minyanProximity';
import { spacing, typography } from '@/constants/theme';
import {
  getMinyanProximityPreferences,
  setMinyanProximityEnabled,
} from '@/services/minyanProximity/minyanProximityStorage';
import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
} from '@/services/notifications';

export function MinyanProximityAlertSettings() {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    void getMinyanProximityPreferences().then((preferences) => {
      setEnabled(preferences.enabled);
      setIsLoading(false);
    });
  }, []);

  const handleToggle = useCallback(async (nextValue: boolean) => {
    setStatusMessage(null);

    if (!nextValue) {
      setEnabled(false);
      await setMinyanProximityEnabled(false);
      return;
    }

    const notificationPermission = await getNotificationPermissionStatus();
    if (notificationPermission !== 'granted') {
      const result = await requestNotificationPermissions();
      if (!result.granted) {
        setStatusMessage('כדי לקבל התראות, יש לאפשר התראות בהגדרות המכשיר.');
        return;
      }
    }

    const locationPermission = await Location.getForegroundPermissionsAsync();
    if (locationPermission.status !== 'granted') {
      const requested = await Location.requestForegroundPermissionsAsync();
      if (requested.status !== 'granted') {
        setStatusMessage('כדי לזהות מניינים בקרבת מקום, יש לאפשר גישה למיקום.');
        return;
      }
    }

    setEnabled(true);
    await setMinyanProximityEnabled(true);
    setStatusMessage(
      `התראות יישלחו כשאתם במרחק של עד ${MINYAN_PROXIMITY_ALERT_RADIUS_METERS} מטר מבקשת מניין פעילה, כשהאפליקציה פתוחה או ברקע קצר. לא נאסף מיקום כשהאפליקציה סגורה (מיקום ברקע חסום בהגדרות האפליקציה).`,
    );
  }, []);

  return (
    <Card className="mb-4" elevated>
      <Text style={typography.subtitle}>התראות ומיקום</Text>
      <Text
        style={[
          typography.bodySmall,
          {
            marginTop: spacing.xs,
            color: colors.muted,
            textAlign: 'right',
            writingDirection: 'rtl',
          },
        ]}
      >
        קבלו התראה כשאתם בקרבת בית כנסת עם בקשת מניין פעילה (עד{' '}
        {MINYAN_PROXIMITY_ALERT_RADIUS_METERS} מטר), כשהאפליקציה פעילה. התראות
        לא יישלחו כשהאפליקציה סגורה לחלוטין.
      </Text>

      <ToggleRow
        label="התראות על מניין בקרבת מקום"
        value={enabled}
        onValueChange={(value) => {
          void handleToggle(value);
        }}
        disabled={isLoading}
        icon="📍"
      />

      {statusMessage ? (
        <Text
          style={[
            typography.caption,
            {
              marginTop: spacing.sm,
              color: colors.muted,
              textAlign: 'right',
              writingDirection: 'rtl',
            },
          ]}
        >
          {statusMessage}
        </Text>
      ) : null}
    </Card>
  );
}
