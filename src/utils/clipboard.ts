import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export async function copyTextToClipboard(text: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    throw new Error('Clipboard API is not available in this browser.');
  }

  await Clipboard.setStringAsync(text);
}
