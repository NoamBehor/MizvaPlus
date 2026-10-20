/**
 * Google Maps JavaScript API key for web map rendering only.
 * Restrict in Google Cloud Console with HTTP referrer restrictions.
 */
export function getGoogleMapsWebApiKey(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY ?? '';
}

export function isGoogleMapsWebApiKeyConfigured(): boolean {
  return Boolean(getGoogleMapsWebApiKey());
}
