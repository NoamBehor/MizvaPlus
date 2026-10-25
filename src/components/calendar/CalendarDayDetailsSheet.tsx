import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarDayDetails } from '@/components/calendar/CalendarDayDetails';
import { calendarTheme } from '@/constants/calendarTheme';
import { spacing } from '@/constants/theme';
import type { CalendarDayInfo } from '@/types/calendar';

interface CalendarDayDetailsSheetProps {
  visible: boolean;
  dayInfo: CalendarDayInfo | null;
  onClose: () => void;
}

export function CalendarDayDetailsSheet({
  visible,
  dayInfo,
  onClose,
}: CalendarDayDetailsSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="סגור פרטי יום"
          onPress={onClose}
          style={styles.dismiss}
        />
        {dayInfo ? (
          <View
            accessibilityViewIsModal
            testID="calendar-day-details-sheet"
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}
          >
            <View style={styles.handle} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.scrollContent}
            >
              <CalendarDayDetails dayInfo={dayInfo} onNavigate={onClose} />
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: calendarTheme.sheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    marginBottom: spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
});
