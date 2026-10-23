import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { HomeSheet } from '@/components/home/HomeSheet';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';
import {
  navigateToMitzvahDetail,
  navigateToMyMitzvot,
  navigateToProfile,
} from '@/navigation/navigationRef';
import { getNotificationPermissionStatus } from '@/services/notifications';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { getCalendarDateKey, parseDateKey } from '@/utils/timezone';

const HEBREW_WEEKDAYS = [
  'יום ראשון',
  'יום שני',
  'יום שלישי',
  'יום רביעי',
  'יום חמישי',
  'יום שישי',
  'שבת',
] as const;

interface GreetingHeaderProps {
  displayName?: string;
  hebrewDate?: string | null;
}

export function GreetingHeader({ displayName, hebrewDate }: GreetingHeaderProps) {
  const fontsLoaded = useHomeFonts();
  const mitzvot = useMitzvahStore((state) => state.mitzvot);
  const preferences = useMitzvahStore((state) => state.preferences);
  const permission = useMitzvahStore((state) => state.osNotificationPermission);
  const setOsNotificationPermission = useMitzvahStore(
    (state) => state.setOsNotificationPermission,
  );
  const [remindersOpen, setRemindersOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void getNotificationPermissionStatus().then((status) => {
      if (active) {
        setOsNotificationPermission(status);
      }
    });
    return () => {
      active = false;
    };
  }, [setOsNotificationPermission]);

  const reminders = useMemo(
    () =>
      mitzvot
        .map((mitzvah) => {
          const preference = preferences[mitzvah.id];
          if (!preference?.enabled || !preference.reminderEnabled || !preference.reminderTime) {
            return null;
          }
          return {
            id: mitzvah.id,
            title: mitzvah.title,
            time: preference.reminderTime,
          };
        })
        .filter((item): item is { id: string; title: string; time: string } => item !== null),
    [mitzvot, preferences],
  );

  const showBadge =
    permission === 'denied' ||
    permission === 'undetermined' ||
    reminders.length > 0;
  const weekday = HEBREW_WEEKDAYS[parseDateKey(getCalendarDateKey()).getDay()] ?? '';
  const dateLabel = hebrewDate ? `${weekday}, ${hebrewDate}` : weekday;
  const initial = displayName?.trim().charAt(0) || 'מ';
  const greeting = displayName ? `שלום, ${displayName}` : 'שלום';
  const reminderLabel = showBadge ? 'התראות, יש עדכון' : 'התראות';

  return (
    <View style={{ marginBottom: homeTheme.sectionGap }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
          <View>
            <LinearGradient
              colors={['#1D4ED8', '#2563EB', '#6366F1']}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                padding: 2,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 14,
                  backgroundColor: homeTheme.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={[
                    homeFontStyle(fontsLoaded, homeFonts.bold),
                    { fontSize: 18, color: homeTheme.primary },
                  ]}
                >
                  {initial}
                </Text>
              </View>
            </LinearGradient>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{
                position: 'absolute',
                bottom: -2,
                left: -2,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: homeTheme.success,
                borderWidth: 2,
                borderColor: homeTheme.canvas,
              }}
            />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                numberOfLines={1}
                style={[
                  typography.caption,
                  homeFontStyle(fontsLoaded, homeFonts.semibold),
                  { color: homeTheme.muted, flexShrink: 1 },
                ]}
              >
                {dateLabel}
              </Text>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#F59E0B',
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                style={[
                  typography.subtitle,
                  homeFontStyle(fontsLoaded, homeFonts.extrabold),
                  { color: homeTheme.text, fontSize: 20, flexShrink: 1 },
                ]}
              >
                {greeting}
              </Text>
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{ fontSize: 16, color: '#F59E0B' }}
              >
                ✨
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={reminderLabel}
            onPress={() => setRemindersOpen(true)}
            hitSlop={4}
            style={iconButton}
          >
            <AppIcon name="bell" color={homeTheme.muted} />
            {showBadge ? (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: homeTheme.danger,
                  borderWidth: 1.5,
                  borderColor: homeTheme.surface,
                }}
              />
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="הגדרות"
            onPress={navigateToProfile}
            hitSlop={4}
            style={iconButton}
          >
            <AppIcon name="settings" color={homeTheme.muted} />
          </Pressable>
        </View>
      </View>

      <HomeSheet
        visible={remindersOpen}
        title="התראות"
        onClose={() => setRemindersOpen(false)}
      >
        {permission !== 'granted' ? (
          <Text style={[typography.bodySmall, { color: homeTheme.muted }]}>
            התראות המכשיר לא פעילות. אפשר להפעיל תזכורת מתוך המצווה.
          </Text>
        ) : null}
        {reminders.length === 0 ? (
          <Text style={[typography.bodySmall, { color: homeTheme.muted }]}>
            אין תזכורות פעילות להיום.
          </Text>
        ) : (
          reminders.map((reminder) => (
            <Pressable
              key={reminder.id}
              accessibilityRole="button"
              accessibilityLabel={`${reminder.title}, תזכורת בשעה ${reminder.time}`}
              onPress={() => {
                setRemindersOpen(false);
                navigateToMitzvahDetail(reminder.id);
              }}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                paddingVertical: spacing.sm,
              }}
            >
              <Text style={[typography.label, { color: homeTheme.text }]}>
                {reminder.title}
              </Text>
              <Text style={[typography.caption, { color: homeTheme.muted }]}>
                {reminder.time}
              </Text>
            </Pressable>
          ))
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="מעבר למצוות שלי"
          onPress={() => {
            setRemindersOpen(false);
            navigateToMyMitzvot();
          }}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={[typography.label, { color: homeTheme.primary }]}>
            למצוות שלי
          </Text>
        </Pressable>
      </HomeSheet>
    </View>
  );
}

const iconButton = {
  width: 40,
  height: 40,
  borderRadius: 16,
  backgroundColor: homeTheme.surface,
  borderWidth: 1,
  borderColor: 'rgba(226, 232, 240, 0.9)',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
