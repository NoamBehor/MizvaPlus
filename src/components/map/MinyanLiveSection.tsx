import { Text, View } from 'react-native';

import { ProgressBar } from '@/components/common/ProgressBar';
import { colors } from '@/constants/colors';
import { MINYAN_REQUIRED_COUNT } from '@/constants/minyanLive';
import { typography } from '@/constants/theme';
import type { ActiveMinyanReport } from '@/services/minyanLive/minyanLiveTypes';
import { formatHebrewRelativeTime } from '@/utils/minyanRelativeTime';

interface MinyanLiveSectionProps {
  minyan: ActiveMinyanReport;
  compact?: boolean;
}

export function MinyanLiveSection({ minyan, compact = false }: MinyanLiveSectionProps) {
  const updatedLabel = formatHebrewRelativeTime(minyan.updatedAt);
  const percentage = (minyan.currentAttendance / MINYAN_REQUIRED_COUNT) * 100;

  if (compact) {
    return (
      <View className="flex-row items-center gap-1.5">
        <Text
          style={[
            typography.caption,
            { color: colors.goldDeep, fontWeight: '700' },
          ]}
        >
          {`חסרים ${minyan.missingCount}`}
        </Text>
        <Text style={[typography.caption, { color: colors.muted }]}>
          {`עודכן ${updatedLabel}`}
        </Text>
      </View>
    );
  }

  return (
    <View
      className="gap-1.5 rounded-2xl border px-3 py-3"
      style={{
        backgroundColor: 'rgba(217, 119, 6, 0.08)',
        borderColor: '#FDE68A',
      }}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text
          style={[
            typography.label,
            {
              color: '#78350F',
              fontWeight: '800',
              fontSize: 15,
            },
          ]}
        >
          {`חסרים ${minyan.missingCount} מתפללים למניין`}
        </Text>
        <Text style={[typography.caption, { color: '#92400E', fontWeight: '700' }]}>
          {`${minyan.currentAttendance} מתוך ${MINYAN_REQUIRED_COUNT} הגיעו`}
        </Text>
      </View>

      <ProgressBar
        percentage={percentage}
        variant="default"
        showPercentageLabel={false}
        fillColor={colors.goldDeep}
        height={10}
        accessibilityLabel={`מניין ${minyan.currentAttendance} מתוך ${MINYAN_REQUIRED_COUNT}`}
      />

      <View className="flex-row items-center justify-between">
        <Text style={[typography.caption, { color: colors.muted }]}>
          {`עודכן ${updatedLabel}`}
        </Text>
        {minyan.comingCount > 0 ? (
          <Text style={[typography.caption, { color: colors.secondary }]}>
            {`${minyan.comingCount} בדרך`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
