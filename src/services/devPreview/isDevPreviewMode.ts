import { Platform } from 'react-native';

/**
 * True only in development web builds. Never active in production.
 */
export function isDevPreviewMode(): boolean {
  return __DEV__ && Platform.OS === 'web';
}
