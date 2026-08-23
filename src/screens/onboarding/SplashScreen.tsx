import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import type { RootStackParamList } from '@/navigation/types';

type SplashScreenProps = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: SplashScreenProps) {
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

  const bookOpacity = useSharedValue(0);
  const bookScale = useSharedValue(0.7);
  const coverRotation = useSharedValue(0);
  const pageRotation = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(16);

  useEffect(() => {
    const markAnimationComplete = () => {
      setAnimationComplete(true);
    };

    bookOpacity.value = withTiming(1, { duration: 600 });
    bookScale.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });

    coverRotation.value = withDelay(
      700,
      withTiming(-75, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
    );

    pageRotation.value = withDelay(
      1200,
      withSequence(
        withTiming(-22, { duration: 350 }),
        withTiming(0, { duration: 350 }),
        withTiming(-18, { duration: 350 }),
        withTiming(0, { duration: 350 }),
        withTiming(-14, { duration: 300 }),
        withTiming(0, { duration: 300 }),
      ),
    );

    titleOpacity.value = withDelay(
      2200,
      withTiming(1, { duration: 600 }, () => {
        runOnJS(markAnimationComplete)();
      }),
    );
    titleTranslateY.value = withDelay(
      2200,
      withTiming(0, { duration: 600 }),
    );
  }, [
    bookOpacity,
    bookScale,
    coverRotation,
    pageRotation,
    titleOpacity,
    titleTranslateY,
  ]);

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

  const bookStyle = useAnimatedStyle(() => ({
    opacity: bookOpacity.value,
    transform: [{ scale: bookScale.value }],
  }));

  const coverStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateY: `${coverRotation.value}deg` },
    ],
  }));

  const pageStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateY: `${pageRotation.value}deg` },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ backgroundColor: colors.background }}
    >
      <Animated.View style={bookStyle} className="items-center">
        <View className="relative h-40 w-32">
          <View
            className="absolute inset-0 rounded-lg"
            style={{
              backgroundColor: '#5C3D2E',
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 8,
            }}
          />

          <View
            className="absolute left-1 top-1 h-[152px] w-[116px] rounded-md"
            style={{ backgroundColor: '#F5F0E8' }}
          />

          <Animated.View
            style={pageStyle}
            className="absolute left-2 top-2 h-[144px] w-[108px] rounded-sm"
          >
            <View
              className="h-full w-full rounded-sm border"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            />
          </Animated.View>

          <Animated.View
            style={[
              coverStyle,
              {
                position: 'absolute',
                right: 0,
                top: 0,
                height: 160,
                width: 64,
                borderRadius: 8,
                backgroundColor: '#8B5E3C',
                borderWidth: 1,
                borderColor: colors.accent,
              },
            ]}
          >
            <View
              className="absolute left-2 top-[60px] h-10 w-1 rounded-full"
              style={{ backgroundColor: colors.accent, opacity: 0.6 }}
            />
          </Animated.View>
        </View>

        <Animated.View style={[titleStyle, { marginTop: 32, alignItems: 'center' }]}>
          <Text style={[typography.title, { color: colors.primary, fontSize: 28 }]}>
            Mitzvot Plus
          </Text>
          <Text style={[typography.body, { marginTop: 8, color: colors.secondary }]}>
            המצוות שלך. בכל יום.
          </Text>
        </Animated.View>
      </Animated.View>

      <View className="absolute bottom-16">
        <Text style={typography.caption}>טוען...</Text>
      </View>
    </View>
  );
}
