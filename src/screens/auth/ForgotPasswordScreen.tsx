import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '@/components/common/ScreenContainer';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import { resetPasswordForEmail } from '@/services/auth';

type ForgotPasswordScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ForgotPassword'
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEUTRAL_MESSAGE =
  'אם קיים חשבון עם הכתובת הזו, נשלח אליך קישור לאיפוס הסיסמה.';

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!email.trim()) {
      setError('נא להזין כתובת אימייל');
      return;
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('כתובת אימייל לא תקינה');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPasswordForEmail(email);
      setIsSuccess(true);
    } catch (resetError) {
      const message =
        resetError instanceof Error
          ? resetError.message
          : 'אירעה שגיאה. נסה שוב.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.replace('Auth');
  };

  return (
    <ScreenContainer scrollable={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8">
            <Text style={typography.hero}>איפוס סיסמה</Text>
            <Text style={[typography.bodySmall, { marginTop: 8 }]}>
              הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
            </Text>
          </View>

          {isSuccess ? (
            <View
              className="mb-6 rounded-2xl border p-4"
              style={{
                backgroundColor: '#E8F5E9',
                borderColor: colors.success,
              }}
            >
              <Text style={[typography.body, { color: colors.success }]}>
                {NEUTRAL_MESSAGE}
              </Text>
            </View>
          ) : (
            <>
              <View className="mb-4">
                <Text style={typography.label}>אימייל</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textAlign="right"
                  accessibilityLabel="אימייל"
                  className="mt-2 rounded-xl border border-border px-4 py-3"
                  style={{
                    backgroundColor: colors.surface,
                    color: colors.text,
                    fontSize: 16,
                    minHeight: 48,
                  }}
                />
              </View>

              {error ? (
                <View
                  className="mb-4 rounded-xl p-3"
                  style={{ backgroundColor: '#FFF5F5' }}
                >
                  <Text style={[typography.bodySmall, { color: colors.error }]}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => void handleSubmit()}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="שלח קישור לאיפוס סיסמה"
                className="items-center rounded-2xl py-4"
                style={{
                  backgroundColor: colors.primary,
                  opacity: isSubmitting ? 0.7 : 1,
                  minHeight: 48,
                }}
              >
                {isSubmitting ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color={colors.white} />
                    <Text style={[typography.subtitle, { color: colors.white }]}>
                      שולח קישור...
                    </Text>
                  </View>
                ) : (
                  <Text style={[typography.subtitle, { color: colors.white }]}>
                    שלח קישור לאיפוס
                  </Text>
                )}
              </Pressable>
            </>
          )}

          <Pressable
            onPress={handleBackToLogin}
            accessibilityRole="button"
            accessibilityLabel="חזרה להתחברות"
            className="mt-6 items-center py-2"
            style={{ minHeight: 44 }}
          >
            <Text style={[typography.body, { color: colors.accent }]}>
              חזרה להתחברות
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
