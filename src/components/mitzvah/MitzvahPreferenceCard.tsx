import { Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { ReminderTimePicker } from '@/components/common/ReminderTimePicker';
import { ToggleRow } from '@/components/common/ToggleRow';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { Mitzvah, UserMitzvahPreference } from '@/types/mitzvah';
import { formatReminderTimeForDisplay } from '@/utils/reminderTimezone';

interface MitzvahPreferenceCardProps {
  mitzvah: Mitzvah;
  preference: UserMitzvahPreference;
  onTrackingChange: (enabled: boolean) => void;
  onReminderChange: (enabled: boolean) => void;
  onReminderTimeChange: (time: string) => void;
  permissionDeniedMessage?: string | null;
  onClearPermissionMessage?: () => void;
  showCompletion?: boolean;
  isCompleted?: boolean;
  onToggleCompletion?: () => void;
}

export function MitzvahPreferenceCard({
  mitzvah,
  preference,
  onTrackingChange,
  onReminderChange,
  onReminderTimeChange,
  permissionDeniedMessage = null,
  onClearPermissionMessage,
  showCompletion = false,
  isCompleted = false,
  onToggleCompletion,
}: MitzvahPreferenceCardProps) {
  const reminderStatusText = preference.reminderEnabled
    ? `🔔 תזכורת יומית`
  : '🔕 תזכורת כבויה';

  return (
    <Card className="mb-4">
      <View className="gap-1">
        <Text style={typography.subtitle}>{mitzvah.title}</Text>
        <Text style={typography.bodySmall}>{mitzvah.description}</Text>
      </View>

      <View className="mt-4 border-t border-border pt-2">
        <ToggleRow
          label="מעקב"
          value={preference.enabled}
          onValueChange={onTrackingChange}
        />

        <ToggleRow
          label="תזכורת"
          value={preference.reminderEnabled}
          onValueChange={(enabled) => {
            onClearPermissionMessage?.();
            onReminderChange(enabled);
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

        {preference.enabled ? (
          <View className="mt-1 px-1">
            <Text style={typography.bodySmall}>{reminderStatusText}</Text>
            {preference.reminderEnabled && preference.reminderTime ? (
              <Text
                style={[
                  typography.subtitle,
                  { color: colors.accent, marginTop: 4 },
                ]}
              >
                {formatReminderTimeForDisplay(preference.reminderTime)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {preference.enabled && preference.reminderEnabled ? (
          <View className="mt-3">
            <Text style={[typography.caption, { marginBottom: 8 }]}>
              שעת תזכורת
            </Text>
            <ReminderTimePicker
              value={preference.reminderTime ?? mitzvah.defaultTime ?? '07:30'}
              onChange={onReminderTimeChange}
            />
          </View>
        ) : null}
      </View>

      {showCompletion && preference.enabled && onToggleCompletion ? (
        <View className="mt-4 border-t border-border pt-3">
          <ToggleRow
            label={isCompleted ? 'הושלם היום' : 'סמן כהושלם'}
            value={isCompleted}
            onValueChange={() => onToggleCompletion()}
            icon={isCompleted ? '✓' : '○'}
          />
        </View>
      ) : null}
    </Card>
  );
}
