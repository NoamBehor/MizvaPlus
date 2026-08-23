import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BadgeGrid } from '@/components/profile/BadgeGrid';
import { Card } from '@/components/common/Card';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import { getGamificationStats } from '@/services/gamification';
import { navigateToAuth } from '@/navigation/navigationRef';
import { signOut } from '@/services/auth';
import { flushCloudSync, stopCloudSync } from '@/services/cloud/syncService';
import { onUserLogout } from '@/services/notificationScheduler';
import { useAppStore } from '@/store/appStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';

export function ProfileScreen() {
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const setAuthenticated = useAppStore((state) => state.setAuthenticated);
  const setOnboardingComplete = useAppStore((state) => state.setOnboardingComplete);
  const clearGamification = useGamificationStore((state) => state.clear);

  const quizAttempts = useGamificationStore((state) => state.quizAttempts);
  const badges = useGamificationStore((state) => state.badges);
  const completions = useMitzvahStore((state) => state.completions);

  const stats = useMemo(() => {
    if (!user) {
      return null;
    }
    return getGamificationStats(user.id);
  }, [user, quizAttempts, badges, completions]);

  const resetMitzvahStore = useMitzvahStore((state) => state.reset);

  const handleLogout = async () => {
    const userId = user?.id;

    try {
      if (userId) {
        await onUserLogout(userId);
        try {
          await flushCloudSync(userId);
        } catch (syncError) {
          console.error('Pre-logout sync failed:', syncError);
        }
      }
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }

    stopCloudSync();

    clearUser();
    clearGamification();
    setAuthenticated(false);
    setOnboardingComplete(false);
    resetMitzvahStore();

    navigateToAuth();
  };

  return (
    <ScreenContainer>
      <View className="mb-6">
        <Text style={typography.hero}>פרופיל</Text>
        <Text style={[typography.bodySmall, { marginTop: 8 }]}>
          פרטי החשבון והגדרות
        </Text>
      </View>

      {stats ? (
        <Card className="mb-4">
          <View className="mb-3 flex-row items-center justify-end">
            <Text style={typography.subtitle}>⭐ {stats.xp} XP</Text>
          </View>
          <Text style={[typography.body, { marginBottom: 8 }]}>
            רמה {stats.level}
          </Text>
          <Text style={[typography.body, { marginBottom: 4 }]}>
            🔥 {stats.streakCount} ימים ברצף
          </Text>
          <Text style={[typography.body, { marginBottom: 4 }]}>
            ✓ {stats.completedMitzvotCount} מצוות שהושלמו
          </Text>
          <Text style={[typography.body, { marginBottom: 4 }]}>
            🧠 {stats.quizCount} חידונים
          </Text>
          <Text style={typography.body}>
            🏆 {stats.unlockedBadgeCount} הישגים
          </Text>
        </Card>
      ) : null}

      <Card className="mb-4">
        <Text style={typography.label}>שם</Text>
        <Text style={[typography.subtitle, { marginTop: 4 }]}>
          {user?.displayName ?? '—'}
        </Text>

        <Text style={[typography.label, { marginTop: 16 }]}>אימייל</Text>
        <Text style={[typography.body, { marginTop: 4 }]}>
          {user?.email ?? '—'}
        </Text>
      </Card>

      <View className="mb-4">
        <Text style={[typography.title, { marginBottom: 12 }]}>הישגים</Text>
        <BadgeGrid />
      </View>

      <Pressable
        onPress={() => void handleLogout()}
        accessibilityRole="button"
        accessibilityLabel="התנתק"
        className="items-center rounded-2xl border py-4"
        style={{
          borderColor: colors.error,
          minHeight: 48,
        }}
      >
        <Text style={[typography.subtitle, { color: colors.error }]}>
          התנתק
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}
