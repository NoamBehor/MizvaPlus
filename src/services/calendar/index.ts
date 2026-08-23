import { hebcalCalendarProvider } from '@/services/calendar/hebcalProvider';
import { CalendarService } from '@/services/calendar/calendarService';

export const calendarService = new CalendarService(hebcalCalendarProvider);

export { HebcalCalendarProvider, hebcalCalendarProvider } from '@/services/calendar/hebcalProvider';
export {
  buildHebcalLocationCacheKey,
  clearHebcalYearCache,
  getCandleLightingForDateKey,
  getResolvedLocationSource,
  getWeeklyParashaForDateKey,
} from '@/services/calendar/hebcalProvider';
export { CalendarService } from '@/services/calendar/calendarService';
