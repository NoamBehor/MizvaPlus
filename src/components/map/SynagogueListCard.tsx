import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { MINYAN_REQUIRED_COUNT } from '@/constants/minyanLive';
import { borderRadius, shadows, typography } from '@/constants/theme';
import type { ActiveMinyanReport } from '@/services/minyanLive/minyanLiveTypes';
import type { Synagogue } from '@/types/synagogue';
import { formatDistanceMeters } from '@/utils/distance';
import { synagogueNeedsMinyan } from '@/utils/mapSynagogues';

interface SynagogueListCardProps {
  synagogue: Synagogue;
  rank?: number;
  selected?: boolean;
  onPress: (synagogue: Synagogue) => void;
  minyan?: ActiveMinyanReport;
}

export function SynagogueListCard({
  synagogue,
  rank,
  selected = false,
  onPress,
  minyan,
}: SynagogueListCardProps) {
  const distanceLabel =
    typeof synagogue.distanceMeters === 'number'
      ? formatDistanceMeters(synagogue.distanceMeters)
      : null;
  const needsMinyan = synagogueNeedsMinyan(minyan);

  return (
    <Pressable
      onPress={() => onPress(synagogue)}
      accessibilityRole="button"
      accessibilityLabel={`${rank ? `מקום ${rank}, ` : ''}${synagogue.name}${distanceLabel ? `, ${distanceLabel}` : ''}`}
      accessibilityState={{ selected }}
      className="flex-row items-center gap-3 rounded-2xl border px-3.5 py-3"
      style={{
        backgroundColor: needsMinyan
          ? '#FFFBEB'
          : selected
            ? '#F8FAFC'
            : colors.surface,
        borderColor: needsMinyan
          ? colors.goldDeep
          : selected
            ? colors.primary
            : colors.border,
        borderWidth: needsMinyan || selected ? 2 : 1,
        ...shadows.pill,
      }}
    >
      {typeof rank === 'number' ? (
        <View
          className="items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: borderRadius.full,
            backgroundColor: needsMinyan
              ? '#FEF3C7'
              : selected
                ? colors.primary
                : '#EEF2FF',
          }}
        >
          <Text
            style={[
              typography.label,
              {
                color: needsMinyan
                  ? colors.goldDeep
                  : selected
                    ? colors.white
                    : colors.secondary,
                fontWeight: '800',
                fontSize: 13,
              },
            ]}
          >
            {rank}
          </Text>
        </View>
      ) : null}

      <View className="min-w-0 flex-1">
        <Text
          style={[typography.label, { fontSize: 15, fontWeight: '700' }]}
          numberOfLines={1}
        >
          {synagogue.name}
        </Text>
        {synagogue.denomination ? (
          <Text style={[typography.caption, { marginTop: 2 }]} numberOfLines={1}>
            {synagogue.denomination}
          </Text>
        ) : null}
        {minyan ? (
          <View
            className="mt-1.5 self-start rounded-full px-2 py-0.5"
            style={{
              backgroundColor:
                minyan.currentAttendance >= MINYAN_REQUIRED_COUNT
                  ? colors.success
                  : '#FEF3C7',
            }}
          >
            <Text
              style={[
                typography.caption,
                {
                  color:
                    minyan.currentAttendance >= MINYAN_REQUIRED_COUNT
                      ? colors.white
                      : '#92400E',
                  fontWeight: '700',
                  fontSize: 11,
                },
              ]}
            >
              {minyan.currentAttendance >= MINYAN_REQUIRED_COUNT
                ? `מניין מלא (${minyan.currentAttendance})`
                : `חסרים ${minyan.missingCount}`}
            </Text>
          </View>
        ) : null}
      </View>

      {distanceLabel ? (
        <View
          className="rounded-full px-2.5 py-1"
          style={{
            backgroundColor: needsMinyan ? '#FEF3C7' : '#F1F5F9',
          }}
        >
          <Text
            style={[
              typography.caption,
              {
                color: needsMinyan ? colors.goldDeep : colors.secondary,
                fontWeight: '700',
                fontSize: 11,
              },
            ]}
          >
            {distanceLabel}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
