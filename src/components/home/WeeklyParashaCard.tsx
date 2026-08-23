import { Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { typography } from '@/constants/theme';
import type { CalendarDayInfo } from '@/types/calendar';

interface WeeklyParashaCardProps {
  dayInfo: CalendarDayInfo | null;
  isLoading: boolean;
}

export function WeeklyParashaCard({ dayInfo, isLoading }: WeeklyParashaCardProps) {
  const parasha = dayInfo?.weeklyParasha;

  return (
    <Card className="mb-4">
      <Text style={[typography.label, { marginBottom: 12 }]}>פרשת השבוע</Text>

      {isLoading ? (
        <Text style={typography.bodySmall}>טוען פרשה...</Text>
      ) : !parasha ? (
        <Text style={typography.bodySmall}>פרשה לא זמינה כרגע</Text>
      ) : (
        <>
          <Text style={[typography.title, { marginBottom: 8 }]}>
            {parasha.hebrewDisplayName}
          </Text>
          {parasha.gregorianDate ? (
            <Text style={typography.bodySmall}>
              {parasha.gregorianDate}
              {parasha.hebrewDate ? ` · ${parasha.hebrewDate}` : ''}
            </Text>
          ) : null}
        </>
      )}

      {dayInfo?.locationSource === 'fallback' ? (
        <View style={{ marginTop: 12 }}>
          <Text style={typography.caption}>
            זמנים מחושבים ל{dayInfo.locationLabel}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
