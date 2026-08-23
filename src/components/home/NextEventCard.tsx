import { useCallback } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { typography } from '@/constants/theme';
import { useCountdown } from '@/hooks/useCountdown';
import { useNextUpcomingEvent } from '@/hooks/useNextUpcomingEvent';
import { useUserLocation } from '@/hooks/useUserLocation';
import { formatCountdown } from '@/utils/time';

/** Stable fallback so useCountdown is not fed a new ISO string every render while loading. */
const IDLE_COUNTDOWN_TARGET = '1970-01-01T00:00:00.000Z';

export function NextEventCard() {
  const { location } = useUserLocation();
  const { event, isLoading, error, refresh } = useNextUpcomingEvent(
    location
      ? {
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude,
        }
      : undefined,
  );

  const handleExpired = useCallback(() => {
    void refresh();
  }, [refresh]);

  const countdown = useCountdown(
    event?.targetDate ?? IDLE_COUNTDOWN_TARGET,
    event ? handleExpired : undefined,
  );

  return (
    <Card className="mb-4 items-center">
      <Text style={typography.caption}>האירוע הבא</Text>

      {isLoading ? (
        <Text style={[typography.bodySmall, { marginVertical: 8 }]}>
          טוען אירוע...
        </Text>
      ) : error || !event ? (
        <Text style={[typography.bodySmall, { marginVertical: 8 }]}>
          {error ?? 'אין אירוע קרוב זמין'}
        </Text>
      ) : (
        <>
          <Text style={[typography.countdown, { marginVertical: 8 }]}>
            {formatCountdown(countdown.totalSeconds)}
          </Text>
          <View className="items-center">
            <Text style={typography.subtitle}>{event.title}</Text>
            {event.displayTime ? (
              <Text style={[typography.body, { marginTop: 4 }]}>
                {event.displayTime}
              </Text>
            ) : null}
          </View>
        </>
      )}

      {!location ? (
        <Text style={[typography.caption, { marginTop: 12 }]}>
          זמנים מחושבים לירושלים (מיקום ברירת מחדל)
        </Text>
      ) : null}
    </Card>
  );
}
