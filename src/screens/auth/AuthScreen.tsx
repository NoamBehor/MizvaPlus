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

import {
  AuthFailure,
  signInWithDevTestAccount,
  signInWithEmail,
  signUpWithEmail,
} from '@/services/auth';

import { logAuthFailureDiagnostics } from '@/services/auth/authDiagnostics';

import { completeAuthenticatedSignIn } from '@/services/auth/completeAuthenticatedSignIn';

import { isDevAuthBypassActive } from '@/services/auth/devAuthBypass';
import { isDevTestAccountConfigured } from '@/services/auth/devTestCredentials';

import { useAppStore } from '@/store/appStore';



type AuthScreenProps = NativeStackScreenProps<RootStackParamList, 'Auth'>;

type AuthMode = 'login' | 'register';



const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;



function validateLogin(email: string, password: string): string | null {

  if (!email.trim()) {

    return 'נא להזין כתובת אימייל';

  }

  if (!EMAIL_PATTERN.test(email.trim())) {

    return 'כתובת אימייל לא תקינה';

  }

  if (!password) {

    return 'נא להזין סיסמה';

  }

  return null;

}



function validateRegister(

  displayName: string,

  email: string,

  password: string,

  confirmPassword: string,

): string | null {

  if (!displayName.trim()) {

    return 'נא להזין שם תצוגה';

  }

  const loginError = validateLogin(email, password);

  if (loginError) {

    return loginError;

  }

  if (password !== confirmPassword) {

    return 'הסיסמאות אינן תואמות';

  }

  return null;

}



export function AuthScreen({ navigation }: AuthScreenProps) {

  const [mode, setMode] = useState<AuthMode>('login');

  const [displayName, setDisplayName] = useState('');

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);



  const isSupabaseConfigured = useAppStore((state) => state.isSupabaseConfigured);

  const devTestAccountConfigured = __DEV__ && isDevTestAccountConfigured();



  const finishSignIn = async (

    userId: string,

    userEmail: string,

    userDisplayName: string,

  ) => {

    try {

      await completeAuthenticatedSignIn(userId, userEmail, userDisplayName);

    } catch (initError) {

      if (initError instanceof AuthFailure) {

        throw initError;

      }

      const details = {

        code: null,

        message:

          initError instanceof Error ? initError.message : String(initError),

        status: null,

        phase: 'post_auth_init' as const,

        userExistsHint: 'unknown' as const,

        sessionCreated: true,

        rootAuthGateHasSession: true,

        sessionClearedAfterSignIn: null,

      };

      logAuthFailureDiagnostics('auth_post_sign_in_init_failure', details);

      throw new AuthFailure(

        initError instanceof Error ? initError.message : 'אירעה שגיאה. נסה שוב.',

        details,

      );

    }



    const onboardingComplete = useAppStore.getState().onboardingComplete;

    navigation.replace(onboardingComplete ? 'Main' : 'Onboarding');

  };



  const handleSubmit = async () => {

    setError(null);



    if (!isSupabaseConfigured) {

      setError(

        'Supabase אינו מוגדר. הגדר את EXPO_PUBLIC_SUPABASE_URL ו-EXPO_PUBLIC_SUPABASE_ANON_KEY בקובץ .env',

      );

      return;

    }



    const validationError =

      mode === 'login'

        ? validateLogin(email, password)

        : validateRegister(displayName, email, password, confirmPassword);



    if (validationError) {

      setError(validationError);

      return;

    }



    setIsSubmitting(true);



    try {

      if (mode === 'login') {

        const { user } = await signInWithEmail(email, password);

        await finishSignIn(

          user.id,

          user.email ?? email,

          user.user_metadata?.display_name ?? email.split('@')[0],

        );

        return;

      }



      const signUpResult = await signUpWithEmail(

        email,

        password,

        displayName.trim(),

      );



      if (signUpResult.status === 'confirmation_pending') {

        navigation.navigate('EmailConfirmation', { email: signUpResult.email });

        return;

      }



      await finishSignIn(

        signUpResult.user.id,

        email,

        displayName.trim(),

      );

    } catch (authError) {

      const message =

        authError instanceof Error

          ? authError.message

          : 'אירעה שגיאה. נסה שוב.';

      setError(message);

    } finally {

      setIsSubmitting(false);

    }

  };



  const toggleMode = () => {

    setError(null);

    setMode((current) => (current === 'login' ? 'register' : 'login'));

  };



  const handleForgotPassword = () => {

    navigation.navigate('ForgotPassword');

  };



  const handleDevQuickSignIn = async () => {

    setError(null);



    if (!isSupabaseConfigured) {

      setError(

        'Supabase אינו מוגדר. הגדר את EXPO_PUBLIC_SUPABASE_URL ו-EXPO_PUBLIC_SUPABASE_ANON_KEY בקובץ .env',

      );

      return;

    }



    if (!devTestAccountConfigured) {

      setError('לא הוגדר חשבון בדיקה לפיתוח');

      return;

    }



    setIsSubmitting(true);



    try {

      const { user } = await signInWithDevTestAccount();

      await finishSignIn(

        user.id,

        user.email ?? '',

        user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'משתמש',

      );

    } catch (authError) {

      const message =

        authError instanceof Error

          ? authError.message

          : 'אירעה שגיאה. נסה שוב.';

      setError(message);

    } finally {

      setIsSubmitting(false);

    }

  };



  const submitLabel =

    mode === 'login' ? 'התחבר' : 'הירשם';



  const loadingLabel =

    mode === 'login' ? 'מתחבר...' : 'נרשם...';



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

            <Text style={typography.hero}>

              {mode === 'login' ? 'ברוך שובך' : 'הצטרפות'}

            </Text>

            <Text style={[typography.bodySmall, { marginTop: 8 }]}>

              {mode === 'login'

                ? 'התחבר כדי להמשיך את המסע הרוחני שלך'

                : 'צור חשבון והתחל לעקוב אחר המצוות שלך'}

            </Text>

          </View>



          {!isSupabaseConfigured ? (

            <View

              className="mb-6 rounded-2xl border p-4"

              style={{

                backgroundColor: '#FFF5F5',

                borderColor: colors.error,

              }}

            >

              <Text style={[typography.label, { color: colors.error }]}>

                שגיאת הגדרה

              </Text>

              <Text style={[typography.bodySmall, { marginTop: 4, color: colors.error }]}>

                Supabase אינו מוגדר. הגדר את משתני הסביבה בקובץ .env לפני

                השימוש באפליקציה.

              </Text>

            </View>

          ) : null}



          {mode === 'register' ? (

            <View className="mb-4">

              <Text style={typography.label}>שם תצוגה</Text>

              <TextInput

                value={displayName}

                onChangeText={setDisplayName}

                placeholder="השם שלך"

                placeholderTextColor={colors.muted}

                autoCapitalize="words"

                textAlign="right"

                accessibilityLabel="שם תצוגה"

                className="mt-2 rounded-xl border border-border px-4 py-3"

                style={{

                  backgroundColor: colors.surface,

                  color: colors.text,

                  fontSize: 16,

                  minHeight: 48,

                }}

              />

            </View>

          ) : null}



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



          <View className="mb-4">

            <Text style={typography.label}>סיסמה</Text>

            <TextInput

              value={password}

              onChangeText={setPassword}

              placeholder="••••••••"

              placeholderTextColor={colors.muted}

              secureTextEntry

              textAlign="right"

              accessibilityLabel="סיסמה"

              className="mt-2 rounded-xl border border-border px-4 py-3"

              style={{

                backgroundColor: colors.surface,

                color: colors.text,

                fontSize: 16,

                minHeight: 48,

              }}

            />

          </View>



          {mode === 'register' ? (

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

            onPress={() => void handleSubmit()}

            disabled={isSubmitting}

            accessibilityRole="button"

            accessibilityLabel={submitLabel}

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

                  {loadingLabel}

                </Text>

              </View>

            ) : (

              <Text style={[typography.subtitle, { color: colors.white }]}>

                {submitLabel}

              </Text>

            )}

          </Pressable>



          {mode === 'login' ? (

            <Pressable

              onPress={handleForgotPassword}

              accessibilityRole="button"

              accessibilityLabel="שכחתי סיסמה"

              className="mt-4 items-center py-2"

              style={{ minHeight: 44 }}

            >

              <Text style={[typography.bodySmall, { color: colors.secondary }]}>

                שכחתי סיסמה?

              </Text>

            </Pressable>

          ) : null}



          {__DEV__ && !isDevAuthBypassActive() && mode === 'login' ? (

            <Pressable

              onPress={() => void handleDevQuickSignIn()}

              disabled={isSubmitting}

              accessibilityRole="button"

              accessibilityLabel="כניסה מהירה לפיתוח"

              className="mt-4 items-center rounded-2xl border px-4 py-3"

              style={{

                borderColor: colors.border,

                backgroundColor: colors.surface,

                opacity: isSubmitting ? 0.7 : 1,

                minHeight: 48,

              }}

            >

              <Text style={[typography.body, { color: colors.secondary }]}>

                {devTestAccountConfigured

                  ? 'כניסה מהירה לפיתוח'

                  : 'לא הוגדר חשבון בדיקה לפיתוח'}

              </Text>

            </Pressable>

          ) : null}



          <Pressable

            onPress={toggleMode}

            accessibilityRole="button"

            accessibilityLabel={

              mode === 'login' ? 'עבור להרשמה' : 'עבור להתחברות'

            }

            className="mt-6 items-center py-2"

            style={{ minHeight: 44 }}

          >

            <Text style={[typography.body, { color: colors.accent }]}>

              {mode === 'login'

                ? 'אין לך חשבון? הירשם'

                : 'יש לך חשבון? התחבר'}

            </Text>

          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('LegalDocument', { document: 'privacy' })}
            accessibilityRole="button"
            accessibilityLabel="מדיניות פרטיות"
            className="mt-2 items-center py-2"
            style={{ minHeight: 44 }}
          >
            <Text style={[typography.bodySmall, { color: colors.accent }]}>
              מדיניות פרטיות
            </Text>
          </Pressable>

        </ScrollView>

      </KeyboardAvoidingView>

    </ScreenContainer>

  );

}


