import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StartupBookAnimation } from '@/components/onboarding/StartupBookAnimation';
import { startupTheme } from '@/constants/startupTheme';
import { typography } from '@/constants/theme';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { isDevAuthBypassActive } from '@/services/auth/devAuthBypass';
import type { RootStackParamList } from '@/navigation/types';

type SplashScreenProps = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: SplashScreenProps) {
  const insets = useSafeAreaInsets();
  const {
    isInitialized,
    isAuthenticated,
    onboardingComplete,
    deepLinkBootstrapComplete,
    passwordRecoveryPending,
    invalidRecoveryLink,
  } = useAppInitialization();

  const [animationComplete, setAnimationComplete] = useState(false);
  const hasNavigated = useRef(false);

  const isAppReady = isInitialized && deepLinkBootstrapComplete;

  const handleAnimationComplete = useCallback(() => {
    setAnimationComplete(true);
  }, []);

  useEffect(() => {
    if (
      !isInitialized ||
      !deepLinkBootstrapComplete ||
      !animationComplete ||
      hasNavigated.current
    ) {
      return;
    }

    hasNavigated.current = true;

    if (passwordRecoveryPending) {
      navigation.replace('ResetPassword');
      return;
    }

    if (invalidRecoveryLink) {
      navigation.replace('ForgotPassword');
      return;
    }

    if (!isAuthenticated) {
      if (isDevAuthBypassActive()) {
        navigation.replace('Main');
        return;
      }
      navigation.replace('Auth');
      return;
    }

    if (onboardingComplete) {
      navigation.replace('Main');
      return;
    }

    navigation.replace('Onboarding');
  }, [
    animationComplete,
    deepLinkBootstrapComplete,
    invalidRecoveryLink,
    isAuthenticated,
    isInitialized,
    navigation,
    onboardingComplete,
    passwordRecoveryPending,
  ]);

  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{
        backgroundColor: startupTheme.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <StartupBookAnimation
        isAppReady={isAppReady}
        onAnimationComplete={handleAnimationComplete}
      />

      <Text
        style={[
          typography.caption,
          {
            position: 'absolute',
            bottom: Math.max(insets.bottom + 24, 40),
            color: startupTheme.subtitleColor,
            opacity: 0.55,
          },
        ]}
        accessibilityRole="text"
        accessibilityLabel="טוען"
      >
        טוען...
      </Text>
    </View>
  );
}
