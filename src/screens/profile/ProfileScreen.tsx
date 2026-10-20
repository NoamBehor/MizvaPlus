import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { BadgeGrid } from '@/components/profile/BadgeGrid';
import { MinyanProximityAlertSettings } from '@/components/profile/MinyanProximityAlertSettings';
import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { colors } from '@/constants/colors';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { getLevelProgress } from '@/types/gamification';
import { getGamificationStats } from '@/services/gamification';
import {
  navigateToAuth,
  navigateToDeveloperDiagnostics,
  navigateToLegalDocument,
  navigateToMain,
} from '@/navigation/navigationRef';
import { getCurrentSession, signOut } from '@/services/auth';
import { deleteCurrentAccount } from '@/services/auth/deleteAccount';
import { isAnonymousAuthUser } from '@/services/auth/devAnonymousAuth';
import {
  getDevAuthBannerLabel,
  isDevAuthBypassActive,
} from '@/services/auth/devAuthBypass';
import {
  DEV_PREVIEW_AUTH_LABEL,
  DEV_PREVIEW_BANNER,
  isDevPreviewMode,
  resetDevPreviewSession,
} from '@/services/devPreview';
import { flushCloudSync, stopCloudSync } from '@/services/cloud/syncService';
import { onUserLogout } from '@/services/notificationScheduler';
import { useAppStore } from '@/store/appStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';

const DEV_DIAGNOSTICS_TAP_COUNT = 5;

export function ProfileScreen() {
  const devTapCountRef = useRef(0);
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const setAuthenticated = useAppStore((state) => state.setAuthenticated);
  const [isAnonymousSession, setIsAnonymousSession] = useState(false);
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

  const levelProgress = useMemo(
    () => (stats ? getLevelProgress(stats.xp) : null),
    [stats],
  );

  const resetMitzvahStore = useMitzvahStore((state) => state.reset);

  const finishLocalSignOut = async () => {
    stopCloudSync();
    clearUser();
    clearGamification();
    setAuthenticated(false);
    setOnboardingComplete(false);
    resetMitzvahStore();

    if (isDevPreviewMode()) {
      await resetDevPreviewSession();
      navigateToMain();
      return;
    }

    if (isDevAuthBypassActive()) {
      navigateToMain();
    } else {
      navigateToAuth();
    }
  };

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

    await finishLocalSignOut();
  };

  const handleDeleteAccount = async () => {
    const userId = user?.id;

    try {
      await deleteCurrentAccount();
      if (userId) {
        await onUserLogout(userId);
      }
      await signOut();
    } catch (error) {
      console.error('Account deletion failed:', error);
      Alert.alert('מחיקת חשבון', 'לא הצלחנו למחוק את החשבון. נסה שוב.');
      return;
    }

    await finishLocalSignOut();
  };

  const confirmDeleteAccount = () => {
    Alert.alert('מחיקת חשבון', 'החשבון והנתונים יימחקו לצמיתות.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק לצמיתות',
        style: 'destructive',
        onPress: () => {
          void handleDeleteAccount();
        },
      },
    ]);
  };

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    void getCurrentSession().then((session) => {
      setIsAnonymousSession(isAnonymousAuthUser(session));
    });
  }, [isAuthenticated]);

  const showDevPreviewStatus = isDevPreviewMode() && !isAuthenticated;
  const showDevBypassStatus =
    isDevAuthBypassActive() && (!isDevPreviewMode() || isAuthenticated);
  const devAuthBanner = getDevAuthBannerLabel({
    isAuthenticated,
    isAnonymous: isAnonymousSession,
  });

  return (
    <ScreenContainer>
      {showDevPreviewStatus ? (
        <View
          className="mb-4 rounded-2xl px-4 py-3"
          style={{ backgroundColor: colors.accent }}
        >
          <Text style={[typography.label, { color: colors.white }]}>
            {DEV_PREVIEW_BANNER}
          </Text>
          <Text style={[typography.bodySmall, { color: colors.white, marginTop: 4 }]}>
            {DEV_PREVIEW_AUTH_LABEL}
          </Text>
        </View>
      ) : null}

      {showDevBypassStatus ? (
        <View
          className="mb-4 rounded-2xl px-4 py-3"
          style={{ backgroundColor: colors.accent }}
        >
          <Text style={[typography.label, { color: colors.white }]}>
            {devAuthBanner}
          </Text>
        </View>
      ) : null}

      <View className="mb-6">
        <Text style={typography.hero}>פרופיל</Text>
        <Pressable
          onPress={() => {
            if (!__DEV__) {
              return;
            }
            devTapCountRef.current += 1;
            if (devTapCountRef.current >= DEV_DIAGNOSTICS_TAP_COUNT) {
              devTapCountRef.current = 0;
              navigateToDeveloperDiagnostics();
            }
          }}
        >
          <Text style={[typography.bodySmall, { marginTop: 8 }]}>
            פרטי החשבון והגדרות
            {__DEV__ ? ' · dev diagnostics' : ''}
          </Text>
        </Pressable>
      </View>

      {stats && levelProgress ? (
        <Card className="mb-4" elevated>
          <View
            className="flex-row items-center justify-between"
            style={{ marginBottom: spacing.md }}
          >
            <View
              style={{
                backgroundColor: '#FEF3C7',
                borderRadius: borderRadius.lg,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              }}
            >
              <Text style={[typography.caption, { color: colors.primary }]}>
                רמה {levelProgress.currentLevel}
              </Text>
            </View>
            <Text style={typography.subtitle}>⭐ {stats.xp} XP</Text>
          </View>

          <ProgressBar
            percentage={levelProgress.progressPercentage}
            label={
              levelProgress.xpForNextLevel !== null
                ? `עוד ${levelProgress.xpForNextLevel - stats.xp} XP לרמה הבאה`
                : 'רמה מקסימלית'
            }
          />

          <View
            style={{
              marginTop: spacing.md,
              gap: spacing.sm,
              flexDirection: 'row',
              flexWrap: 'wrap',
            }}
          >
            {[
              { icon: '🔥', label: `${stats.streakCount} ימים ברצף` },
              { icon: '✓', label: `${stats.completedMitzvotCount} מצוות` },
              { icon: '🧠', label: `${stats.quizCount} חידונים` },
              { icon: '🏆', label: `${stats.unlockedBadgeCount} הישגים` },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: borderRadius.lg,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Text style={typography.bodySmall}>
                  {item.icon} {item.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <MinyanProximityAlertSettings />

      {!showDevPreviewStatus ? (
        <Card className="mb-4" elevated>
          <Text style={typography.label}>שם</Text>
          <Text style={[typography.subtitle, { marginTop: 4 }]}>
            {user?.displayName ?? '—'}
          </Text>

          <Text style={[typography.label, { marginTop: 16 }]}>אימייל</Text>
          <Text style={[typography.body, { marginTop: 4 }]}>
            {user?.email ?? '—'}
          </Text>
        </Card>
      ) : null}

      <View className="mb-4">
        <Text style={[typography.title, { marginBottom: 12 }]}>הישגים</Text>
        <BadgeGrid />
      </View>

      <Pressable
        onPress={() => void handleLogout()}
        accessibilityRole="button"
        accessibilityLabel="התנתק"
        className="items-center py-4"
        style={{
          backgroundColor: '#FEF2F2',
          borderRadius: borderRadius.xl,
          borderWidth: 1,
          borderColor: '#FECACA',
          minHeight: 52,
        }}
      >
        <Text style={[typography.subtitle, { color: colors.error }]}>
          התנתק
        </Text>
      </Pressable>

      <Pressable
        onPress={() => navigateToLegalDocument('privacy')}
        accessibilityRole="button"
        accessibilityLabel="מדיניות פרטיות"
        className="items-center py-4 mt-3"
        style={{ minHeight: 52 }}
      >
        <Text style={[typography.body, { color: colors.accent }]}>מדיניות פרטיות</Text>
      </Pressable>

      <Pressable
        onPress={confirmDeleteAccount}
        accessibilityRole="button"
        accessibilityLabel="מחיקת חשבון"
        className="items-center py-4"
        style={{ minHeight: 52 }}
      >
        <Text style={[typography.body, { color: colors.error }]}>מחיקת חשבון</Text>
      </Pressable>
    </ScreenContainer>
  );
}
