import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { Text } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';



import { useCloudSync } from '@/hooks/useCloudSync';

import type { MainTabParamList } from '@/navigation/types';

import { colors } from '@/constants/colors';

import { HomeScreen } from '@/screens/home/HomeScreen';

import { MapScreen } from '@/screens/map/MapScreen';

import { MyMitzvotScreen } from '@/screens/mitzvot/MyMitzvotScreen';

import { ProfileScreen } from '@/screens/profile/ProfileScreen';

import { TriviaScreen } from '@/screens/trivia/TriviaScreen';

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

        },

        tabBarIcon: ({ focused }) => (

          <TabIcon label={route.name} focused={focused} />

        ),

      })}

    >

      <Tab.Screen

        name="Home"

        component={HomeScreen}

        options={{ tabBarLabel: 'בית' }}

      />

      <Tab.Screen

        name="MyMitzvot"

        component={MyMitzvotScreen}

        options={{ tabBarLabel: 'המצוות שלי' }}

      />

      <Tab.Screen

        name="Trivia"

        component={TriviaScreen}

        options={{ tabBarLabel: 'טריוויה' }}

      />

      <Tab.Screen

        name="Map"

        component={MapScreen}

        options={{ tabBarLabel: 'מפה' }}

      />

      <Tab.Screen

        name="Profile"

        component={ProfileScreen}

        options={{ tabBarLabel: 'פרופיל' }}

      />

    </Tab.Navigator>

  );

}

