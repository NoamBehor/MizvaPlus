import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from '@/navigation/types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToAuth(): void {
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

export function navigateToMyMitzvot(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Main', { screen: 'MyMitzvot' });
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
