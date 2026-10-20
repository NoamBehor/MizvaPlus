import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';

export type MapLocationTone = 'ok' | 'fallback' | 'loading' | 'unknown';

interface MapScreenHeaderProps {
  locationLabel?: string | null;
  locationTone?: MapLocationTone;
  synagogueCount?: number | null;
  isRefreshing?: boolean;
  onRefreshLocation?: () => void;
  onRefreshSynagogues?: () => void;
}

function locationChipColors(tone: MapLocationTone) {
  switch (tone) {
    case 'fallback':
      return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
    case 'loading':
      return { bg: colors.surface, text: colors.muted, border: colors.border };
    case 'ok':
      return { bg: '#E8F5E9', text: colors.success, border: '#A7D7B5' };
    default:
      return { bg: colors.surface, text: colors.muted, border: colors.border };
  }
}

export function MapScreenHeader({
  locationLabel,
  locationTone = 'unknown',
  synagogueCount,
  isRefreshing = false,
  onRefreshLocation,
  onRefreshSynagogues,
}: MapScreenHeaderProps) {
  const chip = locationChipColors(locationTone);

  return (
    <View className="px-4 pb-3 pt-2">
      <View
        className="overflow-hidden rounded-2xl border px-4 py-4"
        style={[
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRightWidth: 4,
            borderRightColor: colors.accent,
          },
        ]}
      >
        <Text style={typography.title}>בתי כנסת בקרבתך</Text>
        <Text style={[typography.bodySmall, { marginTop: spacing.xs }]}>
          מצאו מקומות תפילה, מניינים פעילים וניווט לפי המיקום שלכם
        </Text>

        <View className="mt-3 flex-row items-center justify-between gap-2">
          <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-2">
            {locationLabel ? (
              <View
                className="rounded-full border px-3 py-1.5"
                style={{
                  backgroundColor: chip.bg,
                  borderColor: chip.border,
                  maxWidth: '100%',
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: chip.text,
                      fontWeight: '600',
                    },
                  ]}
                  numberOfLines={2}
                >
                  {locationTone === 'loading' ? 'מאתרים מיקום…' : locationLabel}
                </Text>
              </View>
            ) : null}

            {typeof synagogueCount === 'number' ? (
              <View
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: colors.background }}
              >
                <Text style={[typography.caption, { fontWeight: '700' }]}>
                  {`${synagogueCount} בתי כנסת`}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row items-center gap-2">
            {onRefreshLocation ? (
              <Pressable
                onPress={onRefreshLocation}
                disabled={isRefreshing}
                accessibilityRole="button"
                accessibilityLabel="רענון מיקום"
                className="h-11 w-11 items-center justify-center rounded-xl border"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  opacity: isRefreshing ? 0.6 : 1,
                }}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Text style={{ fontSize: 18 }}>📍</Text>
                )}
              </Pressable>
            ) : null}
            {onRefreshSynagogues ? (
              <Pressable
                onPress={onRefreshSynagogues}
                disabled={isRefreshing}
                accessibilityRole="button"
                accessibilityLabel="רענון רשימת בתי כנסת"
                className="h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: colors.primary,
                  opacity: isRefreshing ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 18 }}>🔄</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
