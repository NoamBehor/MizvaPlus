import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '@/components/common/ScreenContainer';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import { resendConfirmationEmail } from '@/services/auth';

type EmailConfirmationScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'EmailConfirmation'
>;

const RESEND_COOLDOWN_MS = 60000;

export function EmailConfirmationScreen({
  navigation,
  route,
}: EmailConfirmationScreenProps) {
  const { email } = route.params;
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastResendAt = useRef(0);

  const handleResend = async () => {
    const now = Date.now();
    if (now - lastResendAt.current < RESEND_COOLDOWN_MS) {
      setError('נשלחו יותר מדי בקשות. נסה שוב בעוד כמה דקות');
      return;
    }

    setError(null);
    setResendSuccess(false);
    setIsResending(true);

    try {
      await resendConfirmationEmail(email);
      lastResendAt.current = Date.now();
      setResendSuccess(true);
    } catch (resendError) {
      const message =
        resendError instanceof Error
          ? resendError.message
          : 'אירעה שגיאה. נסה שוב.';
      setError(message);
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.replace('Auth');
  };

  return (
    <ScreenContainer scrollable={false}>
      <View className="flex-1 justify-center py-8">
        <View className="mb-8">
          <Text style={typography.hero}>אימות כתובת האימייל</Text>
          <Text style={[typography.body, { marginTop: 16 }]}>
            שלחנו קישור אימות לכתובת האימייל שלך.
            {'\n'}
            אנא בדוק את תיבת הדואר שלך ואשר את החשבון.
          </Text>
        </View>

        <View
          className="mb-6 rounded-2xl border p-4"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          <Text style={typography.label}>כתובת האימייל</Text>
          <Text
            style={[typography.body, { marginTop: 4 }]}
            accessibilityLabel={`אימייל: ${email}`}
          >
            {email}
          </Text>
        </View>

        {resendSuccess ? (
          <View
            className="mb-4 rounded-xl p-3"
            style={{ backgroundColor: '#E8F5E9' }}
          >
            <Text style={[typography.bodySmall, { color: colors.success }]}>
              אימייל אימות נשלח בהצלחה
            </Text>
          </View>
        ) : null}

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
          onPress={() => void handleResend()}
          disabled={isResending}
          accessibilityRole="button"
          accessibilityLabel="שלח שוב את המייל"
          className="items-center rounded-2xl py-4"
          style={{
            backgroundColor: colors.primary,
            opacity: isResending ? 0.7 : 1,
            minHeight: 48,
          }}
        >
          {isResending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={[typography.subtitle, { color: colors.white }]}>
              שלח שוב את המייל
            </Text>
          )}
        </Pressable>

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
      </View>
    </ScreenContainer>
  );
}
