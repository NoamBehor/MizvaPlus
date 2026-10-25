import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { MapSynagogueFilter } from '@/utils/mapSynagogues';

export type { MapSynagogueFilter };

interface MapFilterChipsProps {
  filter: MapSynagogueFilter;
  synagogueCount: number;
  activeMinyanCount: number;
  onFilterChange: (filter: MapSynagogueFilter) => void;
}

export function MapFilterChips({
  filter,
  synagogueCount,
  activeMinyanCount,
  onFilterChange,
}: MapFilterChipsProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      <Pressable
        onPress={() => onFilterChange('all')}
        accessibilityRole="button"
        accessibilityLabel={`הכל, ${synagogueCount} בתי כנסת`}
        accessibilityState={{ selected: filter === 'all' }}
        className="flex-row items-center gap-1 rounded-full px-3.5 py-1.5"
        style={{
          backgroundColor: filter === 'all' ? colors.primary : colors.background,
        }}
      >
        <Text
          style={[
            typography.caption,
            {
              color: filter === 'all' ? colors.white : colors.text,
              fontWeight: '700',
            },
          ]}
        >
          הכל
        </Text>
        <View
          className="rounded-full px-1.5"
          style={{
            backgroundColor: filter === 'all' ? colors.navyMid : colors.border,
          }}
        >
          <Text
            style={[
              typography.caption,
              {
                color: filter === 'all' ? colors.white : colors.text,
                fontWeight: '700',
                fontSize: 10,
              },
            ]}
          >
            {synagogueCount}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => onFilterChange('activeMinyan')}
        accessibilityRole="button"
        accessibilityLabel={`מניין פעיל, ${activeMinyanCount}`}
        accessibilityState={{ selected: filter === 'activeMinyan' }}
        className="flex-row items-center gap-1.5 rounded-full border px-3.5 py-1.5"
        style={{
          backgroundColor:
            filter === 'activeMinyan' ? '#FFFBEB' : colors.background,
          borderColor: filter === 'activeMinyan' ? '#FDE68A' : colors.border,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.goldDeep,
          }}
        />
        <Text
          style={[
            typography.caption,
            {
              color: colors.text,
              fontWeight: filter === 'activeMinyan' ? '700' : '600',
            },
          ]}
        >
          מניין פעיל
        </Text>
      </Pressable>
    </View>
  );
}
