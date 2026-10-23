import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { profileTheme } from '@/constants/profileTheme';
import { borderRadius, spacing, typography } from '@/constants/theme';

interface ProfileEditNameModalProps {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onSave: (displayName: string) => Promise<void>;
}

export function ProfileEditNameModal({
  visible,
  initialName,
  onClose,
  onSave,
}: ProfileEditNameModalProps) {
  const fontsLoaded = useHomeFonts();
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setError(null);
      setIsSaving(false);
    }
  }, [visible, initialName]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('יש להזין שם תצוגה');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      onClose();
    } catch {
      setError('לא הצלחנו לשמור. נסה שוב.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={overlay}
      >
        <Pressable style={overlayBackdrop} onPress={onClose} accessibilityLabel="סגור" />
        <View style={sheet} accessibilityViewIsModal>
          <Text
            accessibilityRole="header"
            style={[
              homeFontStyle(fontsLoaded, homeFonts.bold),
              { fontSize: 18, color: homeTheme.text, textAlign: 'center', marginBottom: spacing.md },
            ]}
          >
            עריכת פרופיל
          </Text>
          <Text style={[typography.caption, { marginBottom: spacing.xs, textAlign: 'right' }]}>
            שם תצוגה
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="שם משתמש"
            autoFocus
            editable={!isSaving}
            style={input}
            textAlign="right"
            accessibilityLabel="שם תצוגה"
          />
          {error ? (
            <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>
              {error}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
            <Pressable
              onPress={onClose}
              disabled={isSaving}
              accessibilityRole="button"
              style={[actionBtn, { flex: 1, backgroundColor: '#F1F5F9' }]}
            >
              <Text style={homeFontStyle(fontsLoaded, homeFonts.semibold)}>ביטול</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSave()}
              disabled={isSaving}
              accessibilityRole="button"
              style={[actionBtn, { flex: 1, backgroundColor: profileTheme.brand }]}
            >
              <Text
                style={[
                  homeFontStyle(fontsLoaded, homeFonts.semibold),
                  { color: colors.white },
                ]}
              >
                {isSaving ? 'שומר…' : 'שמירה'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const overlay = {
  flex: 1,
  justifyContent: 'center' as const,
  padding: spacing.lg,
};

const overlayBackdrop = {
  ...({ position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 }),
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
};

const sheet = {
  backgroundColor: colors.white,
  borderRadius: borderRadius.xl,
  padding: spacing.lg,
  marginTop: 'auto' as const,
  marginBottom: 'auto' as const,
};

const input = {
  borderWidth: 1,
  borderColor: profileTheme.cardBorder,
  borderRadius: borderRadius.md,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  fontSize: 16,
  minHeight: 48,
  backgroundColor: '#F8FAFC',
};

const actionBtn = {
  minHeight: 48,
  borderRadius: borderRadius.lg,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
