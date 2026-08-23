/**
 * Expo dynamic config — build-time environment injection.
 *
 * Android Google Maps (P10.5-001):
 * - Env var: GOOGLE_MAPS_ANDROID_API_KEY (build-time secret, not in JS bundle)
 * - Injected via react-native-maps config plugin into AndroidManifest at prebuild/EAS build
 * - iOS uses Apple Maps (MapKit) by default — no Google Maps key required
 * - Restrict key in Google Cloud Console to package com.mitzvahapp.app + SHA-1 fingerprint(s)
 * - EAS: eas env:create --name GOOGLE_MAPS_ANDROID_API_KEY --environment production
 *
 * Supabase auth redirects (P10.5-003) — add to Dashboard > Auth > URL Configuration:
 * - mitzvahapp://reset-password
 * - mitzvahapp://confirm
 */
const googleMapsAndroidApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '';

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: 'Mitzvot Plus',
    slug: 'MizvaPlus',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'mitzvahapp',
    experiments: {
      tsconfigPaths: true,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.mitzvahapp.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'אפשר ל-Mitzvot Plus לגשת למיקום שלך כדי למצוא בתי כנסת בקרבתך.',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#FAF8F5',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      package: 'com.mitzvahapp.app',
      predictiveBackGestureEnabled: false,
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-notifications',
      '@react-native-community/datetimepicker',
      'expo-splash-screen',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'אפשר ל-Mitzvot Plus לגשת למיקום שלך כדי למצוא בתי כנסת בקרבתך.',
        },
      ],
      [
        'react-native-maps',
        googleMapsAndroidApiKey
          ? { androidGoogleMapsApiKey: googleMapsAndroidApiKey }
          : {},
      ],
    ],
    extra: {
      supportsRTL: true,
      /** False until GOOGLE_MAPS_ANDROID_API_KEY is provided at build time. */
      googleMapsAndroidConfigured: Boolean(googleMapsAndroidApiKey),
      eas: {
        projectId: "2d42486a-b211-4ac6-aa45-67ecdee229e1",
      },
    },
  },
};