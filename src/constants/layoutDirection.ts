import { I18nManager, Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Root layout direction for the Hebrew app.
 * Mirrors flex rows and start/end without relying on a dev-client reload for I18nManager.
 */
export const appRootLayoutStyle: ViewStyle = {
  flex: 1,
  direction: I18nManager.isRTL || Platform.OS === 'web' ? 'rtl' : 'ltr',
};

/** Progress bars, timestamps, and map attribution stay LTR. */
export const ltrLayoutStyle: ViewStyle = {
  direction: 'ltr',
};

export const rtlTextInputStyle: TextStyle = {
  textAlign: 'right',
  writingDirection: 'rtl',
};
