import { type TextStyle, type ViewStyle } from 'react-native';

/**
 * Root layout direction for the Hebrew app.
 * Always RTL so rows and titles start on the right without waiting
 * for I18nManager to apply on the next native process start.
 */
export const appRootLayoutStyle: ViewStyle = {
  flex: 1,
  direction: 'rtl',
};

/** Progress bars, timestamps, and map attribution stay LTR. */
export const ltrLayoutStyle: ViewStyle = {
  direction: 'ltr',
};

export const rtlTextInputStyle: TextStyle = {
  textAlign: 'right',
  writingDirection: 'rtl',
};
