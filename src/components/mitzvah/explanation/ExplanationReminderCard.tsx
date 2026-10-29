import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ReminderTimePicker } from '@/components/common/ReminderTimePicker';
import { ToggleRow } from '@/components/common/ToggleRow';
import { AppIcon } from '@/components/common/AppIcon';
import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';

interface ExplanationReminderCardProps {
  reminderEnabled: boolean;
  trackingEnabled: boolean;
  timeLabel: string | null;
  pickerValue: string;
  editing: boolean;
  preferenceReady: boolean;
  permissionMessage: string | null;
  onToggleEdit: () => void;
  onReminderChange: (enabled: boolean) => void;
  onTimeChange: (time: string) => void;
}

export function ExplanationReminderCard({
  reminderEnabled,
  trackingEnabled,
  timeLabel,
  pickerValue,
  editing,
  preferenceReady,
  permissionMessage,
  onToggleEdit,
  onReminderChange,
  onTimeChange,
}: ExplanationReminderCardProps) {
  const fontsLoaded = useHomeFonts();
  const showTime = reminderEnabled && timeLabel;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <View style={styles.iconTile}>
            <AppIcon name="bell" size={20} color={homeTheme.goldDeep} />
          </View>
          <View style={styles.copy}>
            <Text
              style={[
                typography.caption,
                homeFontStyle(fontsLoaded, homeFonts.semibold),
                styles.kicker,
              ]}
            >
              תזכורת
            </Text>
            <Text
              style={[
                homeFontStyle(fontsLoaded, homeFonts.extrabold),
                showTime ? styles.time : styles.off,
              ]}
            >
              {showTime ? timeLabel : 'תזכורת כבויה'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onToggleEdit}
          disabled={!preferenceReady}
          accessibilityRole="button"
          accessibilityLabel="ערוך תזכורת"
          accessibilityState={{
            expanded: editing,
            disabled: !preferenceReady,
          }}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.editButton,
                !preferenceReady && styles.disabled,
                pressed && preferenceReady && styles.pressed,
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  homeFontStyle(fontsLoaded, homeFonts.semibold),
                  styles.editLabel,
                ]}
              >
                ערוך
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {preferenceReady ? (
        <ToggleRow
          label="תזכורת"
          value={reminderEnabled}
          disabled={!trackingEnabled}
          onValueChange={onReminderChange}
        />
      ) : null}

      {permissionMessage ? (
        <Text
          style={[
            typography.bodySmall,
            homeFontStyle(fontsLoaded, homeFonts.regular),
            styles.error,
          ]}
        >
          {permissionMessage}
        </Text>
      ) : null}

      {editing && preferenceReady && reminderEnabled ? (
        <View style={styles.picker}>
          <Text
            style={[
              typography.caption,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              styles.pickerLabel,
            ]}
          >
            שעת תזכורת
          </Text>
          <ReminderTimePicker
            value={pickerValue}
            onChange={onTimeChange}
            disabled={!trackingEnabled}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: homeTheme.goldSoft,
    borderRadius: homeTheme.cardRadius,
    borderWidth: 1,
    borderColor: homeTheme.goldBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: homeTheme.goldBorder,
  },
  copy: {
    flex: 1,
    alignItems: 'flex-start',
  },
  kicker: {
    color: homeTheme.muted,
  },
  time: {
    fontSize: 18,
    lineHeight: 24,
    color: homeTheme.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  off: {
    fontSize: 16,
    lineHeight: 22,
    color: homeTheme.muted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  editButton: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: homeTheme.surface,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    justifyContent: 'center',
  },
  editLabel: {
    color: colors.sacredAmber,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  error: {
    color: colors.error,
    marginTop: spacing.sm,
  },
  picker: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  pickerLabel: {
    color: homeTheme.muted,
  },
});
