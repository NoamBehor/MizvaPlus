import type { HebrewCalendarEvent } from '@/types/calendar';
import type { EventType, UpcomingEvent } from '@/types/event';

function mapCalendarTypeToEventType(
  type: HebrewCalendarEvent['type'],
  titleHebrew: string,
): EventType {
  if (type === 'CANDLE_LIGHTING' || titleHebrew.includes('הדלקת נרות')) {
    return 'SHABBAT_ENTRY';
  }

  if (type === 'HAVDALAH' || titleHebrew.includes('הבדלה')) {
    return 'SHABBAT_EXIT';
  }

  if (type === 'FAST') {
    return 'FAST';
  }

  if (type === 'HOLIDAY' || type === 'SHABBAT') {
    return 'HOLIDAY';
  }

  return 'HOLIDAY';
}

function buildDisplayTitle(event: HebrewCalendarEvent): string {
  if (event.type === 'CANDLE_LIGHTING') {
    return 'כניסת שבת';
  }

  if (event.type === 'HAVDALAH') {
    return 'הבדלה';
  }

  if (event.type === 'FAST') {
    if (event.titleHebrew.includes('סיום') || event.titleHebrew.includes('סוף')) {
      return 'צום מסתיים';
    }
    return 'צום מתחיל';
  }

  if (event.type === 'HOLIDAY') {
    if (event.titleHebrew.includes('ערב')) {
      return `חג נכנס · ${event.titleHebrew}`;
    }
    return event.titleHebrew;
  }

  return event.titleHebrew;
}

export function mapCalendarEventToUpcoming(
  event: HebrewCalendarEvent,
): UpcomingEvent {
  const targetDate = event.startDate ?? '';

  return {
    id: event.id,
    type: mapCalendarTypeToEventType(event.type, event.titleHebrew),
    title: buildDisplayTitle(event),
    targetDate,
    displayTime: event.startTime,
  };
}

export function pickNextUpcomingEvent(
  events: HebrewCalendarEvent[],
): UpcomingEvent | null {
  if (events.length === 0) {
    return null;
  }

  const now = Date.now();
  const next = events.find((event) => {
    if (!event.startDate) {
      return false;
    }

    return new Date(event.startDate).getTime() > now;
  });

  if (!next) {
    return null;
  }

  return mapCalendarEventToUpcoming(next);
}
