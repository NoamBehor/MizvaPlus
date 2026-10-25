import { Text, View } from 'react-native';

import { MapFilterChips } from '@/components/map/MapFilterChips';
import { colors } from '@/constants/colors';
import { appRootLayoutStyle } from '@/constants/layoutDirection';
import { shadows, spacing, typography } from '@/constants/theme';
import type { MapSynagogueFilter } from '@/utils/mapSynagogues';

export type MapLocationTone = 'ok' | 'fallback' | 'loading' | 'unknown';

interface MapScreenHeaderProps {
  locationLabel?: string | null;
  locationTone?: MapLocationTone;
  synagogueCount?: number | null;
  activeMinyanCount?: number;
  filter?: MapSynagogueFilter;
  onFilterChange?: (filter: MapSynagogueFilter) => void;
}

function locationChipColors(tone: MapLocationTone) {
  switch (tone) {
    case 'fallback':
      return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
    case 'loading':
      return { bg: colors.surface, text: colors.muted, border: colors.border };
    case 'ok':
      return { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' };
    default:
      return { bg: colors.surface, text: colors.muted, border: colors.border };
  }
}

export function MapScreenHeader({
  locationLabel,
  locationTone = 'unknown',
  synagogueCount,
  activeMinyanCount = 0,
  filter = 'all',
  onFilterChange,
}: MapScreenHeaderProps) {
  const chip = locationChipColors(locationTone);
  const knownCount = typeof synagogueCount === 'number' ? synagogueCount : 0;

  return (
    <View
      className="px-5 pb-3 pt-2"
      style={[
        appRootLayoutStyle,
        {
          flex: undefined,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          ...shadows.pill,
        },
      ]}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text style={[typography.title, { fontSize: 22 }]} numberOfLines={1}>
            בתי כנסת בקרבתך
          </Text>
          <Text style={[typography.caption, { marginTop: spacing.xs }]}>
            מצאו מקומות תפילה, מניינים פעילים וניווט לפי המיקום שלכם
          </Text>
        </View>

        {locationLabel ? (
          <View
            className="rounded-full border px-2.5 py-1"
            style={{
              backgroundColor: chip.bg,
              borderColor: chip.border,
              maxWidth: 132,
              flexShrink: 0,
            }}
          >
            <Text
              style={[
                typography.caption,
                {
                  color: chip.text,
                  fontWeight: '600',
                  fontSize: 11,
                },
              ]}
              numberOfLines={2}
            >
              {locationTone === 'loading' ? 'מאתרים מיקום…' : locationLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {onFilterChange ? (
        <View className="mt-3">
          <MapFilterChips
            filter={filter}
            synagogueCount={knownCount}
            activeMinyanCount={activeMinyanCount}
            onFilterChange={onFilterChange}
          />
        </View>
      ) : null}
    </View>
  );
}
