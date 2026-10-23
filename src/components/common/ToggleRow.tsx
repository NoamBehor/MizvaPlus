import { Switch, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: string;
  disabled?: boolean;
  accessibilityHint?: string;
}

export function ToggleRow({
  label,
  value,
  onValueChange,
  icon,
  disabled = false,
  accessibilityHint,
}: ToggleRowProps) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <View className="flex-1 flex-row items-center justify-start gap-2">
        {icon ? <Text className="text-base">{icon}</Text> : null}
        <Text style={typography.label}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.white}
      />
    </View>
  );
}
