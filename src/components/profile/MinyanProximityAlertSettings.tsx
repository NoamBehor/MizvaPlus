import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as Location from 'expo-location';

import { AppIcon } from '@/components/common/AppIcon';
import { Card } from '@/components/common/Card';
import { ToggleRow } from '@/components/common/ToggleRow';
import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { profileTheme } from '@/constants/profileTheme';
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

  const fontsLoaded = useHomeFonts();

  return (
    <Card
      elevated
      style={{
        backgroundColor: colors.white,
        borderColor: '#F1F5F9',
        borderRadius: homeTheme.cardRadius,
        marginBottom: 0,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: profileTheme.brandSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="map" size={20} color={profileTheme.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              homeFontStyle(fontsLoaded, homeFonts.bold),
              {
                color: homeTheme.text,
                fontSize: 14,
                textAlign: 'right',
                writingDirection: 'rtl',
              },
            ]}
          >
            התרעות ומיקום חכם
          </Text>
          <Text
            style={[
              typography.bodySmall,
              {
                marginTop: spacing.xs,
                color: homeTheme.muted,
                textAlign: 'right',
                writingDirection: 'rtl',
              },
            ]}
          >
            קבלו התראה מיידית כשאתם בקרבת בית כנסת עם בקשת מניין דחופה (עד{' '}
            {MINYAN_PROXIMITY_ALERT_RADIUS_METERS} מטר), כשהאפליקציה פעילה ברקע.
            התראות לא יישלחו כשהאפליקציה סגורה לחלוטין.
          </Text>
        </View>
      </View>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          marginTop: spacing.sm,
          paddingTop: spacing.xs,
        }}
      >
        <ToggleRow
          label="התראות על מניין בקרבת מקום"
          value={enabled}
          onValueChange={(value) => {
            void handleToggle(value);
          }}
          disabled={isLoading}
          icon="📍"
        />
      </View>

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
