import { Text, View } from 'react-native';

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

  return (
    <View
      className="gap-1 rounded-xl px-3 py-2"
      style={{
        backgroundColor: 'rgba(201, 162, 39, 0.12)',
        borderColor: colors.accent,
        borderWidth: 1,
      }}
    >
      <Text
        style={[
          typography.label,
          {
            color: colors.accent,
            fontWeight: '700',
          },
        ]}
      >
        🟡 מניין נדרש
      </Text>

      <Text style={[typography.body, { fontWeight: '600' }]}>
        {`חסרים ${minyan.missingCount} למניין`}
      </Text>

      {!compact ? (
        <>
          <Text style={typography.bodySmall}>
            {`${minyan.currentAttendance} מתוך ${MINYAN_REQUIRED_COUNT} נמצאים`}
          </Text>
          <Text style={[typography.caption, { color: colors.muted }]}>
            {`עודכן ${updatedLabel}`}
          </Text>
          {minyan.comingCount > 0 ? (
            <Text style={[typography.bodySmall, { color: colors.secondary }]}>
              {`${minyan.comingCount} בדרך`}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Text style={typography.caption}>{`חסרים ${minyan.missingCount}`}</Text>
          <Text style={[typography.caption, { color: colors.muted }]}>
            {`עודכן ${updatedLabel}`}
          </Text>
        </>
      )}
    </View>
  );
}
