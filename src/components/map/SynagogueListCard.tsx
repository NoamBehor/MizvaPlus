import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { MINYAN_REQUIRED_COUNT } from '@/constants/minyanLive';
import { typography } from '@/constants/theme';
import type { ActiveMinyanReport } from '@/services/minyanLive/minyanLiveTypes';
import type { Synagogue } from '@/types/synagogue';
import { formatDistanceMeters } from '@/utils/distance';
import { synagogueNeedsMinyan } from '@/utils/mapSynagogues';

interface SynagogueListCardProps {
  synagogue: Synagogue;
  selected?: boolean;
  onPress: (synagogue: Synagogue) => void;
  minyan?: ActiveMinyanReport;
}

export function SynagogueListCard({
  synagogue,
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
    <View
      className="flex-row items-center justify-between gap-2 rounded-xl border px-3 py-2.5"
      style={{
        backgroundColor: needsMinyan
          ? '#FFFBEB'
          : selected
            ? '#F8FAFC'
            : colors.background,
        borderColor: needsMinyan
          ? colors.goldDeep
          : selected
            ? colors.primary
            : colors.border,
        borderWidth: needsMinyan || selected ? 2 : 1,
      }}
    >
      <View className="min-w-0 flex-1">
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text
            style={[typography.label, { fontSize: 13 }]}
            numberOfLines={1}
          >
            {synagogue.name}
          </Text>
          {minyan ? (
            <View
              className="rounded px-1.5 py-0.5"
              style={{
                backgroundColor:
                  minyan.currentAttendance >= MINYAN_REQUIRED_COUNT
                    ? colors.success
                    : '#FFFBEB',
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
                    fontSize: 10,
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
        <Text style={[typography.caption, { marginTop: 2, fontSize: 10 }]}>
          {[distanceLabel, synagogue.denomination].filter(Boolean).join(' • ')}
        </Text>
      </View>

      <Pressable
        onPress={() => onPress(synagogue)}
        accessibilityRole="button"
        accessibilityLabel={`פרטים על ${synagogue.name}`}
        className="rounded-lg border px-2.5 py-1"
        style={{
          backgroundColor: colors.surface,
          borderColor: '#DBEAFE',
        }}
      >
        <Text
          style={[
            typography.caption,
            { color: colors.secondary, fontWeight: '700', fontSize: 10 },
          ]}
        >
          פרטים
        </Text>
      </Pressable>
    </View>
  );
}
