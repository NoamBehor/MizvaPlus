import { NavigationContainer } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { View } from 'react-native';

import { ParashaPodcastMiniPlayer } from '@/components/podcast/ParashaPodcastMiniPlayer';
import { ParashaPodcastProvider } from '@/context/ParashaPodcastContext';
import { useAuthSession } from '@/hooks/useAuthSession';

import { useDeepLinkAuth } from '@/hooks/useDeepLinkAuth';

import { useSupabaseAuthRefresh } from '@/hooks/useSupabaseAuthRefresh';

import { MainTabNavigator } from '@/navigation/MainTabNavigator';

import { navigationRef } from '@/navigation/navigationRef';

import type { RootStackParamList } from '@/navigation/types';

import { AuthScreen } from '@/screens/auth/AuthScreen';

import { EmailConfirmationScreen } from '@/screens/auth/EmailConfirmationScreen';

import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';

import { ResetPasswordScreen } from '@/screens/auth/ResetPasswordScreen';

import { OnboardingScreen } from '@/screens/onboarding/OnboardingScreen';

import { SplashScreen } from '@/screens/onboarding/SplashScreen';

import { MitzvahDetailScreen } from '@/screens/mitzvot/MitzvahDetailScreen';
import { PrayerReaderScreen } from '@/screens/prayer/PrayerReaderScreen';
import { ParashaPodcastPlayerScreen } from '@/screens/podcast/ParashaPodcastPlayerScreen';
import { DiagnosticsScreen } from '@/screens/dev/DiagnosticsScreen';
import { LegalDocumentScreen } from '@/screens/legal/LegalDocumentScreen';



const Stack = createNativeStackNavigator<RootStackParamList>();



export function RootNavigator() {

  useAuthSession();

  useDeepLinkAuth();

  useSupabaseAuthRefresh();



  return (

    <ParashaPodcastProvider>
      <View style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef}>

      <Stack.Navigator

        initialRouteName="Splash"

        screenOptions={{ headerShown: false }}

      >

        <Stack.Screen name="Splash" component={SplashScreen} />

        <Stack.Screen name="Auth" component={AuthScreen} />

        <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen} />

        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

        <Stack.Screen name="Onboarding" component={OnboardingScreen} />

        <Stack.Screen name="Main" component={MainTabNavigator} />

        <Stack.Screen name="MitzvahDetail" component={MitzvahDetailScreen} />

        <Stack.Screen name="PrayerReader" component={PrayerReaderScreen} />

        <Stack.Screen
          name="ParashaPodcastPlayer"
          component={ParashaPodcastPlayerScreen}
        />

        <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />

        {__DEV__ ? (
          <Stack.Screen
            name="DeveloperDiagnostics"
            component={DiagnosticsScreen}
            options={{ headerShown: true, title: 'Developer Diagnostics' }}
          />
        ) : null}

      </Stack.Navigator>

    </NavigationContainer>
        <ParashaPodcastMiniPlayer />
      </View>
    </ParashaPodcastProvider>

  );

}


