/**
 * Expo dynamic config — build-time environment injection.
 *
 * Android Google Maps (P10.5-001):
 * - Env var: GOOGLE_MAPS_ANDROID_API_KEY (build-time secret, not in JS bundle)
 * - Injected via react-native-maps config plugin into AndroidManifest at prebuild/EAS build
 * - iOS uses Apple Maps (MapKit) by default — no Google Maps key required
 * - Restrict key in Google Cloud Console to package com.mitzvahapp.app + SHA-1 fingerprint(s)
 * - EAS: eas env:create --name GOOGLE_MAPS_ANDROID_API_KEY --environment production
 * - Local debug builds also need the debug keystore SHA-1 on that Android key
 *
 * Supabase auth redirects (P10.5-003) — add to Dashboard > Auth > URL Configuration:
 * - mitzvahapp://reset-password
 * - mitzvahapp://confirm
 */

function loadLocalEnvFile() {
  try {
    const fs = require('node:fs');
    const path = require('node:path');
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      return {};
    }

    const loaded = {};
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const eq = trimmed.indexOf('=');
      if (eq === -1) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      loaded[key] = value;
    }
    return loaded;
  } catch {
    return {};
  }
}

const localEnv = loadLocalEnvFile();
const googleMapsAndroidApiKey =
  process.env.GOOGLE_MAPS_ANDROID_API_KEY ??
  localEnv.GOOGLE_MAPS_ANDROID_API_KEY ??
  '';
const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';
const devTestEmailRaw = process.env.DEV_TEST_EMAIL ?? localEnv.DEV_TEST_EMAIL ?? '';
const devTestPasswordRaw =
  process.env.DEV_TEST_PASSWORD ?? localEnv.DEV_TEST_PASSWORD ?? '';
const devTestEmail = isProductionBuild ? '' : devTestEmailRaw;
const devTestPassword = isProductionBuild ? '' : devTestPasswordRaw;
const devTestAuthConfigured = Boolean(devTestEmail && devTestPassword);
const playSupportEmail =
  process.env.PLAY_SUPPORT_EMAIL ?? localEnv.PLAY_SUPPORT_EMAIL ?? '';

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
      blockedPermissions: [
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.RECORD_AUDIO',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
        'com.google.android.gms.permission.AD_ID',
        'android.permission.SYSTEM_ALERT_WINDOW',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-font',
      'expo-asset',
      'expo-audio',
      'expo-notifications',
      '@react-native-community/datetimepicker',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          resizeMode: 'contain',
          backgroundColor: '#FAF8F5',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            buildToolsVersion: '36.0.0',
          },
        },
      ],
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
      /**
       * Development-only Supabase test credentials (from .env, never EXPO_PUBLIC_*).
       * Read at runtime only when __DEV__ is true.
       */
      devTestAuthConfigured,
      devTestEmail,
      devTestPassword,
      playSupportEmail,
      eas: {
        projectId: "2d42486a-b211-4ac6-aa45-67ecdee229e1",
      },
    },
  },
};