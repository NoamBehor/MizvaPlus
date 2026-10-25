import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from '@/navigation/types';
import { isDevAuthBypassActive } from '@/services/auth/devAuthBypass';
import { useHolidayGuideNavigationStore } from '@/store/holidayGuideNavigationStore';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToMain(): void {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  }
}

export function navigateToAuth(): void {
  if (isDevAuthBypassActive()) {
    navigateToMain();
    return;
  }

  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  }
}

export function navigateToResetPassword(): void {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'ResetPassword' }],
    });
  }
}

export function navigateToMyMitzvot(params?: { openEdit?: boolean }): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('MyMitzvot', params);
  }
}

export function navigateToCalendar(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Main', { screen: 'Calendar' });
  }
}

export function navigateToProfile(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Main', { screen: 'Profile' });
  }
}

export function navigateToTrivia(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Main', { screen: 'Trivia' });
  }
}

export function navigateToMitzvahDetail(mitzvahId: string): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('MitzvahDetail', { mitzvahId });
  }
}

export function navigateToDeveloperDiagnostics(): void {
  if (__DEV__ && navigationRef.isReady()) {
    navigationRef.navigate('DeveloperDiagnostics');
  }
}

export function navigateToHomeHolidayGuide(holidayKey: string): void {
  if (!navigationRef.isReady()) {
    return;
  }

  useHolidayGuideNavigationStore.getState().requestHolidayGuide(holidayKey, true);
  navigationRef.navigate('Main', { screen: 'Home' });
}

export function navigateToLegalDocument(
  document: 'privacy' | 'accountDeletion',
): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('LegalDocument', { document });
  }
}

export function navigateToParashaPodcastPlayer(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('ParashaPodcastPlayer');
  }
}
