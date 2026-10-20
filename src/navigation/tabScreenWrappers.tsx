import { TabScreenFocusGuard } from '@/navigation/TabScreenFocusGuard';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { MapScreen } from '@/screens/map/MapScreen';
import { MyMitzvotScreen } from '@/screens/mitzvot/MyMitzvotScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { TriviaScreen } from '@/screens/trivia/TriviaScreen';

export function HomeTabScreen() {
  return (
    <TabScreenFocusGuard>
      <HomeScreen />
    </TabScreenFocusGuard>
  );
}

export function MyMitzvotTabScreen() {
  return (
    <TabScreenFocusGuard>
      <MyMitzvotScreen />
    </TabScreenFocusGuard>
  );
}

export function TriviaTabScreen() {
  return (
    <TabScreenFocusGuard>
      <TriviaScreen />
    </TabScreenFocusGuard>
  );
}

export function MapTabScreen() {
  return (
    <TabScreenFocusGuard>
      <MapScreen />
    </TabScreenFocusGuard>
  );
}

export function ProfileTabScreen() {
  return (
    <TabScreenFocusGuard>
      <ProfileScreen />
    </TabScreenFocusGuard>
  );
}
