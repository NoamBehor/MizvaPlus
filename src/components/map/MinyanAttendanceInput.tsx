import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/colors';
import { MINYAN_REQUIRED_COUNT } from '@/constants/minyanLive';
import { typography } from '@/constants/theme';
import { previewMissingCount, validateAttendanceInput } from '@/services/minyanLive/minyanLiveMapper';

interface MinyanAttendanceInputProps {
  initialValue?: number;
  disabled?: boolean;
  onSubmit: (attendance: number) => void;
  submitLabel: string;
}

export function MinyanAttendanceInput({
  initialValue = 0,
  disabled = false,
  onSubmit,
  submitLabel,
}: MinyanAttendanceInputProps) {
  const [rawValue, setRawValue] = useState(String(initialValue));

  const parsedValue = useMemo(() => {
    const parsed = Number.parseInt(rawValue, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [rawValue]);

  const isValid = parsedValue !== null && validateAttendanceInput(parsedValue);
  const previewMissing =
    parsedValue !== null ? previewMissingCount(parsedValue) : MINYAN_REQUIRED_COUNT;

  return (
    <View className="gap-3">
      <Text style={typography.subtitle}>כמה אנשים נמצאים כרגע?</Text>

      <TextInput
        value={rawValue}
        onChangeText={(text) => {
          const digitsOnly = text.replace(/[^\d]/g, '').slice(0, 2);
          setRawValue(digitsOnly);
        }}
        keyboardType="number-pad"
        editable={!disabled}
        maxLength={2}
        className="rounded-xl border px-4 py-3 text-center"
        style={{
          borderColor: colors.border,
          backgroundColor: colors.white,
          color: colors.text,
          fontSize: 24,
          fontWeight: '700',
          writingDirection: 'ltr',
        }}
        accessibilityLabel="מספר נוכחים בבית הכנסת"
      />

      <Text style={[typography.body, { textAlign: 'center' }]}>
        {`חסרים ${previewMissing} למניין`}
      </Text>

      <Text style={[typography.caption, { textAlign: 'center', color: colors.muted }]}>
        {`ניתן להזין מספר שלם בין 0 ל-${MINYAN_REQUIRED_COUNT}`}
      </Text>

      <Pressable
        onPress={() => {
          if (parsedValue !== null && isValid) {
            onSubmit(parsedValue);
          }
        }}
        disabled={disabled || !isValid}
        className="rounded-xl px-4 py-3"
        style={{
          backgroundColor: disabled || !isValid ? colors.border : colors.accent,
          opacity: disabled ? 0.7 : 1,
        }}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || !isValid }}
      >
        <Text
          style={{
            color: colors.white,
            fontWeight: '700',
            fontSize: 16,
            textAlign: 'center',
            writingDirection: 'rtl',
          }}
        >
          {submitLabel}
        </Text>
      </Pressable>
    </View>
  );
}
