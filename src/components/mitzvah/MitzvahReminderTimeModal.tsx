import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { colors } from '@/constants/colors';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { dateToTimeString, timeStringToDate } from '@/utils/time';

interface MitzvahReminderTimeModalProps {
  visible: boolean;
  title: string;
  value: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

export function MitzvahReminderTimeModal({
  visible,
  title,
  value,
  onConfirm,
  onCancel,
}: MitzvahReminderTimeModalProps) {
  const [pickerDate, setPickerDate] = useState(() => timeStringToDate(value));

  useEffect(() => {
    if (visible) {
      setPickerDate(timeStringToDate(value));
    }
  }, [visible, value]);

  const handleIosPickerChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (selectedDate) {
      setPickerDate(selectedDate);
    }
  };

  const handleAndroidChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (event.type === 'dismissed') {
      onCancel();
      return;
    }

    if (event.type === 'set' && selectedDate) {
      onConfirm(dateToTimeString(selectedDate));
    }
  };

  if (Platform.OS === 'android') {
    if (!visible) {
      return null;
    }

    return (
      <DateTimePicker
        value={pickerDate}
        mode="time"
        display="clock"
        design="material"
        is24Hour
        onChange={handleAndroidChange}
        locale="he-IL"
      />
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.titleRule} />
          <DateTimePicker
            value={pickerDate}
            mode="time"
            display="spinner"
            is24Hour
            onChange={handleIosPickerChange}
            locale="he-IL"
            style={styles.picker}
          />
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="ביטול"
              style={styles.actionButton}
            >
              <Text style={styles.actionLabel}>ביטול</Text>
            </Pressable>
            <View style={styles.actionDivider} />
            <Pressable
              onPress={() => onConfirm(dateToTimeString(pickerDate))}
              accessibilityRole="button"
              accessibilityLabel="אישור"
              style={styles.actionButton}
            >
              <Text style={styles.actionLabel}>אישור</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary,
    textAlign: 'center',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    writingDirection: 'rtl',
  },
  titleRule: {
    height: 2,
    backgroundColor: colors.secondary,
    opacity: 0.35,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  picker: {
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    writingDirection: 'rtl',
  },
});
