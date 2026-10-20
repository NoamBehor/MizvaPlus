import './global.css';

import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import { appRootLayoutStyle } from '@/constants/layoutDirection';
import { RootNavigator } from '@/navigation/RootNavigator';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'he');
  }, []);

  return (
    <SafeAreaProvider>
      <View style={appRootLayoutStyle}>
        <AppErrorBoundary>
          <StatusBar style="dark" />
          <RootNavigator />
        </AppErrorBoundary>
      </View>
    </SafeAreaProvider>
  );
}
