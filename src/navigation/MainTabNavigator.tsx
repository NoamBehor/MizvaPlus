import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/common/AppIcon';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useMinyanProximityAlerts } from '@/hooks/useMinyanProximityAlerts';
import type { MainTabParamList } from '@/navigation/types';
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
export const TAB_BAR_CONTENT_HEIGHT = 58;

const TAB_ICONS: Record<keyof MainTabParamList, { icon: AppIconName; focused: AppIconName }> = {
  Home: { icon: 'home', focused: 'homeFocused' },
  MyMitzvot: { icon: 'mitzvot', focused: 'mitzvotFocused' },
  Trivia: { icon: 'trivia', focused: 'trivia' },
  Map: { icon: 'map', focused: 'mapFocused' },
  Profile: { icon: 'profile', focused: 'profileFocused' },
};

function TabIcon({
  route,
  focused,
  color,
}: {
  route: keyof MainTabParamList;
  focused: boolean;
  color: string;
}) {
  const icons = TAB_ICONS[route];
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 28 }}>
      <AppIcon name={focused ? icons.focused : icons.icon} size={22} color={color} />
      {focused ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: homeTheme.primary,
          }}
        />
      ) : null}
    </View>
  );
}

export function MainTabNavigator() {
  const fontsLoaded = useHomeFonts();
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
        tabBarActiveTintColor: homeTheme.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderTopColor: 'rgba(226, 232, 240, 0.9)',
          height: TAB_BAR_CONTENT_HEIGHT + tabBarPaddingTop + tabBarPaddingBottom,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: tabBarPaddingTop,
          direction: 'rtl',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          writingDirection: 'rtl',
          textAlign: 'center',
          ...homeFontStyle(fontsLoaded, homeFonts.semibold),
        },
        tabBarIcon: ({ focused, color }) => (
          <TabIcon route={route.name} focused={focused} color={color} />
        ),
        lazy: true,
        freezeOnBlur: true,
        detachInactiveScreens: true,
      })}
    >
      <Tab.Screen name="Home" component={HomeTabScreen} options={{ tabBarLabel: 'בית' }} />
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
        options={{ tabBarLabel: 'מפה ומניין' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileTabScreen}
        options={{ tabBarLabel: 'פרופיל' }}
      />
    </Tab.Navigator>
  );
}
