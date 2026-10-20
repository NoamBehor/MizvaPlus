import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { Text } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';



import { useCloudSync } from '@/hooks/useCloudSync';
import { useMinyanProximityAlerts } from '@/hooks/useMinyanProximityAlerts';

import type { MainTabParamList } from '@/navigation/types';

import { colors } from '@/constants/colors';

import {
  HomeTabScreen,
  MapTabScreen,
  MyMitzvotTabScreen,
  ProfileTabScreen,
  TriviaTabScreen,
} from '@/navigation/tabScreenWrappers';

import { useUserStore } from '@/store/userStore';



const Tab = createBottomTabNavigator<MainTabParamList>();



/** Content height inside the tab bar (icons + labels), excluding safe area. */

export const TAB_BAR_CONTENT_HEIGHT = 48;



function TabIcon({ label, focused }: { label: string; focused: boolean }) {

  const icons: Record<string, string> = {

    Home: '🏠',

    MyMitzvot: '📿',

    Trivia: '🧠',

    Map: '🗺️',

    Profile: '👤',

  };



  return (

    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>

      {icons[label] ?? '•'}

    </Text>

  );

}



export function MainTabNavigator() {

  const userId = useUserStore((state) => state.user?.id);

  const insets = useSafeAreaInsets();

  useCloudSync(userId);
  useMinyanProximityAlerts();

  const tabBarPaddingTop = 8;

  const tabBarPaddingBottom = Math.max(insets.bottom, 8);



  return (

    <Tab.Navigator

      screenOptions={({ route }) => ({

        headerShown: false,

        tabBarActiveTintColor: colors.accent,

        tabBarInactiveTintColor: colors.muted,

        tabBarStyle: {

          backgroundColor: colors.surface,

          borderTopColor: colors.border,

          height: TAB_BAR_CONTENT_HEIGHT + tabBarPaddingTop + tabBarPaddingBottom,

          paddingBottom: tabBarPaddingBottom,

          paddingTop: tabBarPaddingTop,

        },

        tabBarLabelStyle: {

          fontSize: 11,

          fontWeight: '600',

          writingDirection: 'rtl',

          textAlign: 'center',

        },

        tabBarIcon: ({ focused }) => (

          <TabIcon label={route.name} focused={focused} />

        ),

        lazy: true,

        freezeOnBlur: true,

        detachInactiveScreens: true,

      })}

    >

      <Tab.Screen

        name="Home"

        component={HomeTabScreen}

        options={{ tabBarLabel: 'בית' }}

      />

      <Tab.Screen

        name="MyMitzvot"

        component={MyMitzvotTabScreen}

        options={{ tabBarLabel: 'המצוות שלי' }}

      />

      <Tab.Screen

        name="Trivia"

        component={TriviaTabScreen}

        options={{ tabBarLabel: 'טריוויה' }}

      />

      <Tab.Screen

        name="Map"

        component={MapTabScreen}

        options={{ tabBarLabel: 'מפה' }}

      />

      <Tab.Screen

        name="Profile"

        component={ProfileTabScreen}

        options={{ tabBarLabel: 'פרופיל' }}

      />

    </Tab.Navigator>

  );

}

