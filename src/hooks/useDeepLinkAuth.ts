import { useEffect } from 'react';
import { Linking } from 'react-native';

import { createSessionFromUrl } from '@/services/auth';

/**
 * Handles warm-start deep-link auth callbacks.
 * Cold-start links are processed in bootstrapAuthFromInitialDeepLink() before splash routing.
 */
export function useDeepLinkAuth(): void {
  useEffect(() => {
    const handleUrl = async (url: string) => {
      try {
        await createSessionFromUrl(url);
      } catch {
        // Invalid or expired links are surfaced on the target auth screen.
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
