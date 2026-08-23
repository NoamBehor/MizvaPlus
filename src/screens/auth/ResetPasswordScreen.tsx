import { useEffect, useState } from 'react';
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
import { getCurrentSession, updatePassword } from '@/services/auth';
import { processSyncQueue, synchronizeUserData } from '@/services/cloud/syncService';
import { createProfile, getCurrentProfile } from '@/services/profile';
import { useAppStore } from '@/store/appStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';

type ResetPasswordScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ResetPassword'
>;

const MIN_PASSWORD_LENGTH = 6;

function validatePasswords(
  password: string,
  confirmPassword: string,
): string | null {
  if (!password) {
    return 'נא להזין סיסמה חדשה';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return 'הסיסמה חייבת להכיל לפחות 6 תווים';
  }
  if (!confirmPassword) {
    return 'נא לאמת הסיסמה';
  }
  if (password !== confirmPassword) {
    return 'הסיסמאות אינן תואמות';
  }
  return null;
}

export function ResetPasswordScreen({ navigation }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setAuthenticated = useAppStore((state) => state.setAuthenticated);
  const initializeApp = useAppStore((state) => state.initialize);
  const setUser = useUserStore((state) => state.setUser);
  const initializeMitzvot = useMitzvahStore((state) => state.initialize);
  const initializeGamification = useGamificationStore((state) => state.initialize);

  useEffect(() => {
    void getCurrentSession().then((session) => {
      if (!session?.user) {
        setError('הקישור לאיפוס הסיסמה לא תקין או שפג תוקפו. בקש קישור חדש.');
      }
    });
  }, []);

  const handleSubmit = async () => {
    setError(null);

    const validationError = validatePasswords(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePassword(password);

      const session = await getCurrentSession();

      if (!session?.user) {
        setError('הקישור לאיפוס הסיסמה לא תקין. בקש קישור חדש.');
        return;
      }

      const user = session.user;
      let profile = await getCurrentProfile(user.id);

      if (!profile) {
        profile = await createProfile(
          user.id,
          user.email ?? '',
          user.user_metadata?.display_name ??
            user.email?.split('@')[0] ??
            'משתמש',
        );
      }

      setUser(profile);
      setAuthenticated(true);
      await initializeApp(user.id);
      await initializeMitzvot(user.id);
      await initializeGamification(user.id);

      try {
        await synchronizeUserData(user.id);
      } catch {
        await processSyncQueue(user.id);
      }

      const onboardingComplete = useAppStore.getState().onboardingComplete;
      navigation.replace(onboardingComplete ? 'Main' : 'Onboarding');
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
            <Text style={typography.hero}>סיסמה חדשה</Text>
            <Text style={[typography.bodySmall, { marginTop: 8 }]}>
              הזן סיסמה חדשה לחשבון שלך
            </Text>
          </View>

          <View className="mb-4">
            <Text style={typography.label}>סיסמה חדשה</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry
              textAlign="right"
              accessibilityLabel="סיסמה חדשה"
              className="mt-2 rounded-xl border border-border px-4 py-3"
              style={{
                backgroundColor: colors.surface,
                color: colors.text,
                fontSize: 16,
                minHeight: 48,
              }}
            />
          </View>

          <View className="mb-4">
            <Text style={typography.label}>אימות סיסמה</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry
              textAlign="right"
              accessibilityLabel="אימות סיסמה"
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
            accessibilityLabel="עדכן סיסמה"
            className="items-center rounded-2xl py-4"
            style={{
              backgroundColor: colors.primary,
              opacity: isSubmitting ? 0.7 : 1,
              minHeight: 48,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[typography.subtitle, { color: colors.white }]}>
                עדכן סיסמה
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
