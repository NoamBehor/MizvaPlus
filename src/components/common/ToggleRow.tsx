import { Switch, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: string;
  disabled?: boolean;
}

export function ToggleRow({
  label,
  value,
  onValueChange,
  icon,
  disabled = false,
}: ToggleRowProps) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.white}
      />
      <View className="flex-1 flex-row items-center justify-end gap-2">
        {icon ? <Text className="text-base">{icon}</Text> : null}
        <Text style={typography.label}>{label}</Text>
      </View>
    </View>
  );
}
