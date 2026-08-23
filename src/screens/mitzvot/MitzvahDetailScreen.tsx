import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { MitzvahAudioControls } from '@/components/mitzvah/MitzvahAudioControls';
import { ReminderTimePicker } from '@/components/common/ReminderTimePicker';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { ToggleRow } from '@/components/common/ToggleRow';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import { getMitzvahById } from '@/services/mitzvot';
import { stopSpeaking } from '@/services/audio';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';
import {
  getMitzvahCategoryLabel,
  getMitzvahContentText,
  getMitzvahIcon,
} from '@/utils/mitzvah';
import { formatReminderTimeForDisplay } from '@/utils/reminderTimezone';
import { useHebrewCalendar } from '@/hooks/useHebrewCalendar';
import { useUserLocation } from '@/hooks/useUserLocation';
import { isCalendarMitzvahActiveToday } from '@/services/calendarMitzvot';

type MitzvahDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'MitzvahDetail'
>;

export function MitzvahDetailScreen({
  navigation,
  route,
}: MitzvahDetailScreenProps) {
  const { mitzvahId } = route.params;
  const mitzvah = getMitzvahById(mitzvahId);

  const user = useUserStore((state) => state.user);
  const preference = useMitzvahStore((state) => state.preferences[mitzvahId]);
  const isCompletedToday = useMitzvahStore((state) => state.isCompletedToday);
  const markMitzvahComplete = useMitzvahStore(
    (state) => state.markMitzvahComplete,
  );
  const setReminder = useMitzvahStore((state) => state.setReminder);
  const setReminderTime = useMitzvahStore((state) => state.setReminderTime);
  const permissionDeniedMessage = useMitzvahStore(
    (state) => state.permissionDeniedMessage,
  );
  const clearPermissionMessage = useMitzvahStore(
    (state) => state.clearPermissionMessage,
  );
  const { location } = useUserLocation();
  const locationInput = location
    ? {
        latitude: location.coordinates.latitude,
        longitude: location.coordinates.longitude,
      }
    : undefined;
  const { dayInfo } = useHebrewCalendar(locationInput);

  const [showReminderConfig, setShowReminderConfig] = useState(false);
  const [completionFeedback, setCompletionFeedback] = useState<string | null>(
    null,
  );
  const [isCompleting, setIsCompleting] = useState(false);

  const completed =
    user ? isCompletedToday(user.id, mitzvahId) : false;

  useFocusEffect(
    useCallback(() => {
      return () => {
        stopSpeaking();
      };
    }, []),
  );

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleComplete = async () => {
    if (!user || completed || isCompleting) {
      return;
    }

    setIsCompleting(true);
    setCompletionFeedback(null);

    try {
      await markMitzvahComplete(user.id, mitzvahId);

      if (isCompletedToday(user.id, mitzvahId)) {
        setCompletionFeedback('✓ המצווה הושלמה');
      }
    } finally {
      setIsCompleting(false);
    }
  };

  if (!mitzvah || !user) {
    return (
      <ScreenContainer>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          className="mb-4"
          style={{ minHeight: 48, alignItems: 'flex-end' }}
        >
          <Text style={typography.label}>← חזרה</Text>
        </Pressable>
        <Text style={typography.body}>המצווה לא נמצאה.</Text>
      </ScreenContainer>
    );
  }

  const icon = getMitzvahIcon(mitzvah.id, mitzvah.category);
  const categoryLabel = getMitzvahCategoryLabel(mitzvah.category);
  const contentText = getMitzvahContentText(mitzvah);

  const isActiveToday = dayInfo
    ? isCalendarMitzvahActiveToday(mitzvah, dayInfo)
    : mitzvah.category === 'daily';

  const reminderEnabled = preference?.reminderEnabled ?? false;
  const reminderTime = preference?.reminderTime;

  return (
    <ScreenContainer>
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="חזרה"
        className="mb-4"
        style={{ minHeight: 48, alignItems: 'flex-end' }}
      >
        <Text style={typography.label}>← חזרה</Text>
      </Pressable>

      <View className="mb-4 items-end">
        <View
          className="mb-3 rounded-full px-3 py-1"
          style={{ backgroundColor: colors.border }}
        >
          <Text style={typography.caption}>{categoryLabel}</Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Text style={typography.hero}>{mitzvah.title}</Text>
          <Text style={{ fontSize: 36 }}>{icon}</Text>
        </View>

        <Text style={[typography.bodySmall, { marginTop: 8 }]}>
          {mitzvah.description}
        </Text>
        {dayInfo && mitzvah.category !== 'daily' ? (
          <Text
            style={[
              typography.caption,
              { marginTop: 8, color: isActiveToday ? colors.success : colors.accent },
            ]}
          >
            {isActiveToday
              ? `פעיל היום · ${dayInfo.hebrewDate.displayString}`
              : `לא פעיל היום · ${dayInfo.hebrewDate.displayString}`}
          </Text>
        ) : null}
      </View>

      <View
        className="mb-6"
        style={{ height: 1, backgroundColor: colors.border }}
      />

      <View className="mb-6">
        <Text style={[typography.subtitle, { marginBottom: 12 }]}>
          📖 תוכן
        </Text>
        <Text style={typography.body}>{contentText}</Text>
      </View>

      <View
        className="mb-6"
        style={{ height: 1, backgroundColor: colors.border }}
      />

      <View className="mb-6">
        <Text style={[typography.subtitle, { marginBottom: 12 }]}>
          🔊 השמעה
        </Text>
        <MitzvahAudioControls content={contentText} />
      </View>

      <View
        className="mb-6"
        style={{ height: 1, backgroundColor: colors.border }}
      />

      <View className="mb-6">
        <Text style={[typography.subtitle, { marginBottom: 8 }]}>
          🔔 תזכורת
        </Text>

        {reminderEnabled && reminderTime ? (
          <Text style={[typography.body, { color: colors.accent }]}>
            {formatReminderTimeForDisplay(reminderTime)}
          </Text>
        ) : (
          <Text style={typography.bodySmall}>🔔 תזכורת כבויה</Text>
        )}

        <Pressable
          onPress={() => setShowReminderConfig((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel="הגדר תזכורת"
          className="mt-3 rounded-xl px-4 py-3"
          style={{
            backgroundColor: colors.border,
            minHeight: 48,
            alignItems: 'center',
          }}
        >
          <Text style={typography.label}>הגדר תזכורת</Text>
        </Pressable>

        {showReminderConfig && preference ? (
          <View className="mt-4 rounded-xl border border-border p-3">
            <ToggleRow
              label="תזכורת"
              value={preference.reminderEnabled}
              onValueChange={(enabled) => {
                clearPermissionMessage();
                void setReminder(mitzvahId, enabled);
              }}
              disabled={!preference.enabled}
            />

            {permissionDeniedMessage ? (
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.error, marginTop: 8, textAlign: 'center' },
                ]}
              >
                {permissionDeniedMessage}
              </Text>
            ) : null}

            {preference.reminderEnabled ? (
              <View className="mt-3">
                <Text style={[typography.caption, { marginBottom: 8 }]}>
                  שעת תזכורת
                </Text>
                <ReminderTimePicker
                  value={
                    preference.reminderTime ??
                    mitzvah.defaultTime ??
                    '07:30'
                  }
                  onChange={(time) => void setReminderTime(mitzvahId, time)}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View
        className="mb-6"
        style={{ height: 1, backgroundColor: colors.border }}
      />

      <View className="mb-4">
        {completed ? (
          <View className="items-center rounded-2xl p-4" style={{ backgroundColor: '#F4F1EA' }}>
            <Text
              style={[
                typography.subtitle,
                { color: colors.success, marginBottom: 4 },
              ]}
            >
              ✓ הושלם היום
            </Text>
            <Text style={typography.bodySmall}>
              {mitzvah.xpReward} XP הוענקו
            </Text>
          </View>
        ) : (
          <View>
            <Text
              style={[
                typography.subtitle,
                { color: colors.accent, marginBottom: 12, textAlign: 'center' },
              ]}
            >
              ⭐ +{mitzvah.xpReward} XP
            </Text>

            <Pressable
              onPress={() => void handleComplete()}
              disabled={isCompleting || !preference?.enabled}
              accessibilityRole="button"
              accessibilityLabel="סיימתי את המצווה"
              className="items-center rounded-2xl py-4"
              style={{
                backgroundColor: colors.primary,
                minHeight: 52,
                opacity: isCompleting || !preference?.enabled ? 0.7 : 1,
              }}
            >
              <Text style={[typography.subtitle, { color: colors.white }]}>
                {isCompleting ? 'שומר...' : 'סיימתי את המצווה'}
              </Text>
            </Pressable>

            {!preference?.enabled ? (
              <Text
                style={[
                  typography.caption,
                  { marginTop: 8, textAlign: 'center' },
                ]}
              >
                הפעל מעקב על מצווה זו כדי לסמן השלמה
              </Text>
            ) : null}
          </View>
        )}

        {completionFeedback ? (
          <View className="mt-4 items-center">
            <Text style={[typography.subtitle, { color: colors.success }]}>
              {completionFeedback}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.accent }]}>
              +{mitzvah.xpReward} XP
            </Text>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
