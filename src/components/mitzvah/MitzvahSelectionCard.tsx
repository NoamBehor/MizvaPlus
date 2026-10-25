import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { colors } from '@/constants/colors';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import type { Mitzvah } from '@/types/mitzvah';
import { getMitzvahIcon } from '@/utils/mitzvah';
import { formatTimeForDisplay } from '@/utils/time';

interface MitzvahSelectionCardProps {
  mitzvah: Mitzvah;
  selected: boolean;
  onPress: () => void;
  reminderEnabled?: boolean;
  reminderTime?: string;
  onReminderToggle?: (enabled: boolean) => void;
  onEditReminderTime?: () => void;
}

export function MitzvahSelectionCard({
  mitzvah,
  selected,
  onPress,
  reminderEnabled = false,
  reminderTime,
  onReminderToggle,
  onEditReminderTime,
}: MitzvahSelectionCardProps) {
  const icon = getMitzvahIcon(mitzvah.id, mitzvah.category);
  const showReminderControls =
    selected &&
    mitzvah.category === 'daily' &&
    onReminderToggle !== undefined &&
    reminderTime !== undefined;

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`${selected ? 'נבחר' : 'לא נבחר'} ${mitzvah.title}`}
        testID={`my-mitzvot-card-${mitzvah.id}`}
        style={({ pressed }) => [pressed ? styles.cardPressed : null]}
      >
        <View
          style={[
            styles.card,
            selected ? styles.cardSelected : styles.cardIdle,
            selected ? shadows.statCard : shadows.pill,
            showReminderControls ? styles.cardWithReminder : null,
          ]}
        >
          <View
            style={[
              styles.stateIcon,
              selected ? styles.stateSelected : styles.stateIdle,
            ]}
          >
            <AppIcon
              name={selected ? 'check' : 'plus'}
              size={16}
              color={selected ? colors.white : colors.muted}
            />
          </View>
          <View style={[styles.lead, selected ? null : styles.leadIdle]}>
            <View style={styles.copy}>
              <Text
                style={[
                  typography.subtitle,
                  styles.title,
                  selected ? styles.titleSelected : styles.titleIdle,
                ]}
              >
                {mitzvah.title}
              </Text>
              <Text style={[typography.caption, styles.description]}>
                {mitzvah.description}
              </Text>
            </View>
            <View
              style={[
                styles.iconTile,
                selected ? styles.iconTileSelected : styles.iconTileIdle,
              ]}
            >
              <Text style={styles.emoji}>{icon}</Text>
            </View>
          </View>
        </View>
      </Pressable>

      {showReminderControls ? (
        <View
          style={[
            styles.reminderPanel,
            selected ? styles.reminderPanelSelected : null,
          ]}
        >
          <View style={styles.reminderRow}>
            <Text style={typography.label}>תזכורת יומית</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={onReminderToggle}
              accessibilityLabel={`תזכורת ל${mitzvah.title}`}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={colors.white}
            />
          </View>
          {reminderEnabled ? (
            <Pressable
              onPress={onEditReminderTime}
              accessibilityRole="button"
              accessibilityLabel={`עריכת שעת תזכורת ל${mitzvah.title}`}
              testID={`my-mitzvot-reminder-edit-${mitzvah.id}`}
              style={styles.timeRow}
            >
              <Text style={styles.pencil} accessibilityElementsHidden>
                ✏️
              </Text>
              <Text style={[typography.subtitle, styles.timeLabel]}>
                {formatTimeForDisplay(reminderTime)}
              </Text>
              <Text style={[typography.caption, styles.timeHint]}>
                עדכון שעון
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.sm + 2,
  },
  card: {
    minHeight: 76,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    direction: 'ltr',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
  },
  cardWithReminder: {
    borderBottomLeftRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
  },
  cardSelected: {
    backgroundColor: '#FFFDF9',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  cardIdle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  lead: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    direction: 'ltr',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
  },
  leadIdle: {
    opacity: 0.85,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.gold,
  },
  iconTileIdle: {
    backgroundColor: '#F8FAFC',
    borderColor: colors.border,
  },
  emoji: {
    fontSize: 22,
  },
  copy: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  titleSelected: {
    fontWeight: '700',
    color: colors.text,
  },
  titleIdle: {
    fontWeight: '600',
    color: colors.slate,
  },
  description: {
    marginTop: 2,
    lineHeight: 18,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  stateIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stateIdle: {
    backgroundColor: '#F1F5F9',
    borderColor: colors.border,
  },
  reminderPanel: {
    marginTop: -2,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm + 4,
    paddingTop: spacing.sm,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: colors.accent,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    backgroundColor: '#FFFDF9',
  },
  reminderPanelSelected: {},
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  pencil: {
    fontSize: 18,
  },
  timeLabel: {
    color: colors.secondary,
    fontVariant: ['tabular-nums'],
  },
  timeHint: {
    color: colors.muted,
  },
});
