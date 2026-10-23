import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { BadgeGrid } from '@/components/profile/BadgeGrid';
import { MinyanProximityAlertSettings } from '@/components/profile/MinyanProximityAlertSettings';
import { ProfileAccountCard } from '@/components/profile/ProfileAccountCard';
import { ProfileEditNameModal } from '@/components/profile/ProfileEditNameModal';
import { ProfileManageMitzvotBanner } from '@/components/profile/ProfileManageMitzvotBanner';
import { ProfileXpCard } from '@/components/profile/ProfileXpCard';
import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { profileTheme } from '@/constants/profileTheme';
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
import { flushCloudSync, requestCloudSync, stopCloudSync } from '@/services/cloud/syncService';
import { onUserLogout } from '@/services/notificationScheduler';
import { updateProfile } from '@/services/profile';
import { useAppStore } from '@/store/appStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';

const DEV_DIAGNOSTICS_TAP_COUNT = 5;

export function ProfileScreen() {
  const fontsLoaded = useHomeFonts();
  const devTapCountRef = useRef(0);
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);
  const persistUser = useUserStore((state) => state.persistUser);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const setAuthenticated = useAppStore((state) => state.setAuthenticated);
  const [isAnonymousSession, setIsAnonymousSession] = useState(false);
  const [editNameVisible, setEditNameVisible] = useState(false);
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

  const handleEditProfile = () => {
    if (isGuest) {
      navigateToAuth();
      return;
    }
    setEditNameVisible(true);
  };

  const handleSaveDisplayName = async (displayName: string) => {
    if (!user) {
      throw new Error('No user');
    }
    const updated = await updateProfile(user.id, { displayName });
    setUser(updated);
    await persistUser();
    void requestCloudSync(user.id);
  };

  useEffect(() => {
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
  const isGuest = showDevPreviewStatus || showDevBypassStatus || isAnonymousSession;

  return (
    <ScreenContainer backgroundColor={profileTheme.canvas} horizontalPadding={spacing.md}>
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

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing.sm,
          marginBottom: profileTheme.sectionGap,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            accessibilityRole="header"
            style={[
              typography.hero,
              homeFontStyle(fontsLoaded, homeFonts.bold),
              { fontSize: 24, color: homeTheme.text },
            ]}
          >
            פרופיל
          </Text>
          <Pressable
            accessibilityRole="text"
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
            <Text style={[typography.bodySmall, { marginTop: 4, color: homeTheme.muted }]}>
              פרטי חשבון, התקדמות והגדרות אישיות
              {__DEV__ ? ' · dev diagnostics' : ''}
            </Text>
          </Pressable>
        </View>

        {isGuest ? (
          <View style={guestPill}>
            <View style={guestDot} />
            <Text
              style={[
                homeFontStyle(fontsLoaded, homeFonts.semibold),
                { color: '#92400E', fontSize: 11 },
              ]}
            >
              משתמש אורח
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ gap: profileTheme.sectionGap }}>
        {stats && levelProgress ? (
          <ProfileXpCard stats={stats} levelProgress={levelProgress} />
        ) : null}

        {user || isGuest ? (
          <ProfileAccountCard
            displayName={user?.displayName ?? ''}
            email={user?.email ?? ''}
            isGuest={isGuest}
            onEditPress={handleEditProfile}
          />
        ) : null}

        <ProfileManageMitzvotBanner />

        <MinyanProximityAlertSettings />

        <BadgeGrid stats={stats} />

        <View style={footerActions}>
          <Pressable
            onPress={() => void handleLogout()}
            accessibilityRole="button"
            accessibilityLabel="התנתק מהחשבון"
            style={({ pressed }) => [logoutButton, pressed && { transform: [{ scale: 0.99 }] }]}
          >
            <AppIcon name="logout" size={18} color="#BE123C" />
            <Text
              style={[
                homeFontStyle(fontsLoaded, homeFonts.semibold),
                { color: '#BE123C', fontSize: 14 },
              ]}
            >
              התנתק מהחשבון
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigateToLegalDocument('privacy')}
            accessibilityRole="button"
            accessibilityLabel="מדיניות פרטיות ותנאי שימוש"
            style={linkButton}
          >
            <Text
              style={[
                typography.caption,
                { color: homeTheme.muted, textDecorationLine: 'underline' },
              ]}
            >
              מדיניות פרטיות ותנאי שימוש
            </Text>
          </Pressable>

          <Pressable
            onPress={confirmDeleteAccount}
            accessibilityRole="button"
            accessibilityLabel="מחיקת חשבון לצמיתות"
            style={linkButton}
          >
            <Text
              style={[
                homeFontStyle(fontsLoaded, homeFonts.semibold),
                { color: '#E11D48', fontSize: 12 },
              ]}
            >
              מחיקת חשבון לצמיתות
            </Text>
          </Pressable>
        </View>
      </View>

      <ProfileEditNameModal
        visible={editNameVisible}
        initialName={user?.displayName ?? ''}
        onClose={() => setEditNameVisible(false)}
        onSave={handleSaveDisplayName}
      />
    </ScreenContainer>
  );
}

const guestPill = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  backgroundColor: 'rgba(254, 243, 199, 0.8)',
  borderWidth: 1,
  borderColor: '#FCD34D',
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 4,
};

const guestDot = {
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: '#F59E0B',
};

const footerActions = {
  alignItems: 'center' as const,
  gap: 4,
  paddingTop: spacing.xs,
  paddingBottom: spacing.md,
};

const logoutButton = {
  width: '100%' as const,
  backgroundColor: 'rgba(255, 241, 242, 0.8)',
  borderRadius: borderRadius.lg,
  borderWidth: 1,
  borderColor: '#FECDD3',
  minHeight: 52,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 8,
};

const linkButton = {
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  minHeight: 44,
  paddingVertical: spacing.xs,
};
