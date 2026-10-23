import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { homeTheme } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';

interface HomeSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function HomeSheet({ visible, title, onClose, children }: HomeSheetProps) {
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
          accessibilityLabel="סגור"
          onPress={onClose}
          style={styles.dismiss}
        />
        <View
          accessibilityViewIsModal
          style={styles.sheet}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="סגור"
              onPress={onClose}
              hitSlop={12}
              style={styles.close}
            >
              <Text style={styles.closeLabel}>סגור</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: homeTheme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    ...typography.subtitle,
    color: homeTheme.text,
    flex: 1,
  },
  close: {
    minHeight: 44,
    justifyContent: 'center',
  },
  closeLabel: {
    ...typography.label,
    color: homeTheme.primary,
  },
});
