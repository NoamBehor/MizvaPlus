import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { MapFilterChips } from '@/components/map/MapFilterChips';
import { colors } from '@/constants/colors';
import { appRootLayoutStyle } from '@/constants/layoutDirection';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import type { MapSynagogueFilter } from '@/utils/mapSynagogues';

export type MapLocationTone = 'ok' | 'fallback' | 'loading' | 'unknown';

interface MapScreenHeaderProps {
  locationLabel?: string | null;
  locationTone?: MapLocationTone;
  synagogueCount?: number | null;
  activeMinyanCount?: number;
  filter?: MapSynagogueFilter;
  onFilterChange?: (filter: MapSynagogueFilter) => void;
  onRefreshLocation?: () => void;
  isRefreshing?: boolean;
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
  onRefreshLocation,
  isRefreshing = false,
}: MapScreenHeaderProps) {
  const chip = locationChipColors(locationTone);
  const knownCount = typeof synagogueCount === 'number' ? synagogueCount : 0;
  const showLocationRow = Boolean(locationLabel) || Boolean(onRefreshLocation);

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
      <Text
        style={[
          typography.title,
          {
            fontSize: 26,
            lineHeight: 32,
            color: colors.text,
          },
        ]}
        accessibilityRole="header"
      >
        בתי כנסת בקרבתך
      </Text>
      <Text
        style={[
          typography.caption,
          {
            marginTop: spacing.xs,
            color: colors.muted,
            lineHeight: 18,
          },
        ]}
      >
        מצאו מקומות תפילה, מניינים פעילים וניווט לפי המיקום שלכם
      </Text>

      {showLocationRow ? (
        <View
          className="mt-2.5 flex-row items-center gap-2"
          style={{ width: '100%' }}
        >
          {locationLabel ? (
            <View
              className="min-w-0 flex-1 rounded-full border px-3 py-1.5"
              style={{
                backgroundColor: chip.bg,
                borderColor: chip.border,
              }}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: chip.text,
                    fontWeight: '600',
                    fontSize: 12,
                    textAlign: 'right',
                  },
                ]}
                numberOfLines={2}
              >
                {locationTone === 'loading' ? 'מאתרים מיקום…' : locationLabel}
              </Text>
            </View>
          ) : (
            <View className="flex-1" />
          )}

          {onRefreshLocation ? (
            <Pressable
              onPress={onRefreshLocation}
              disabled={isRefreshing}
              accessibilityRole="button"
              accessibilityLabel="רענון מיקום ובתי כנסת"
              accessibilityState={{ busy: isRefreshing, disabled: isRefreshing }}
              className="h-9 w-9 items-center justify-center rounded-xl border"
              style={[
                shadows.pill,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg,
                  opacity: isRefreshing ? 0.55 : 1,
                  flexShrink: 0,
                },
              ]}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color={colors.secondary} />
              ) : (
                <AppIcon name="refresh" size={18} color={colors.secondary} />
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}

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
