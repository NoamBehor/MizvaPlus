import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import { dateToTimeString, formatTimeForDisplay, timeStringToDate } from '@/utils/time';

interface ReminderTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
}

export function ReminderTimePicker({
  value,
  onChange,
  disabled = false,
}: ReminderTimePickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => timeStringToDate(value));

  const handleOpen = () => {
    if (disabled) {
      return;
    }
    setPickerDate(timeStringToDate(value));
    setIsVisible(true);
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setIsVisible(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setPickerDate(selectedDate);
    onChange(dateToTimeString(selectedDate));

    if (Platform.OS === 'ios') {
      return;
    }
  };

  const handleClose = () => {
    onChange(dateToTimeString(pickerDate));
    setIsVisible(false);
  };

  return (
    <View>
      <Pressable
        onPress={handleOpen}
        disabled={disabled}
        className="flex-row items-center justify-between rounded-xl border border-border px-4 py-3"
        style={{ backgroundColor: colors.background, opacity: disabled ? 0.5 : 1 }}
      >
        <Text className="text-lg text-muted">›</Text>
        <View className="items-end">
          <Text style={typography.caption}>שעה</Text>
          <Text style={typography.subtitle}>{formatTimeForDisplay(value)}</Text>
        </View>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal visible={isVisible} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <View
              className="rounded-t-3xl p-4"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="mb-4 flex-row items-center justify-between">
                <Pressable onPress={handleClose}>
                  <Text style={[typography.label, { color: colors.accent }]}>
                    סיום
                  </Text>
                </Pressable>
                <Text style={typography.subtitle}>בחר שעה (שעון ישראל)</Text>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="time"
                display="spinner"
                onChange={handleChange}
                locale="he-IL"
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {Platform.OS === 'android' && isVisible ? (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          display="default"
          onChange={handleChange}
          is24Hour
        />
      ) : null}
    </View>
  );
}
