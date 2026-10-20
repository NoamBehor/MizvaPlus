import { View } from 'react-native';

import { StreakCard } from '@/components/home/StreakCard';
import { XpCard } from '@/components/home/XpCard';

interface StatsRowProps {
  streakCount: number;
  xp: number;
}

export function StatsRow({ streakCount, xp }: StatsRowProps) {
  return (
    <View className="mb-4 flex-row gap-3" style={{ minWidth: 0 }}>
      <StreakCard streakCount={streakCount} />
      <XpCard xp={xp} />
    </View>
  );
}
