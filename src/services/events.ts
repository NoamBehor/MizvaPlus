import { calendarService } from '@/services/calendar';
import { pickNextUpcomingEvent } from '@/services/eventMapper';
import type { CalendarLocationInput } from '@/types/calendar';
import type { UpcomingEvent } from '@/types/event';

/**
 * Returns the next relevant Jewish calendar event for countdown display.
 * Uses the Hebrew calendar provider — no placeholder approximations.
 */
export async function getNextUpcomingEvent(
  location?: CalendarLocationInput,
): Promise<UpcomingEvent | null> {
  const events = await calendarService.getUpcomingEvents(45, location);
  return pickNextUpcomingEvent(events);
}
