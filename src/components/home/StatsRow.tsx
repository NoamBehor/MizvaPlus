import { View } from 'react-native';

import { StreakCard } from '@/components/home/StreakCard';
import { XpCard } from '@/components/home/XpCard';
import { homeTheme } from '@/constants/homeTheme';
import type { MitzvahCompletion } from '@/types/mitzvah';

interface StatsRowProps {
  streakCount: number;
  xp: number;
  userId: string;
  completions: MitzvahCompletion[];
}

export function StatsRow({ streakCount, xp, userId, completions }: StatsRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 14,
        marginBottom: homeTheme.sectionGap,
        minWidth: 0,
      }}
    >
      <XpCard xp={xp} />
      <StreakCard streakCount={streakCount} userId={userId} completions={completions} />
    </View>
  );
}
