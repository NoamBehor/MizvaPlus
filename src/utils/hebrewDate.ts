import { calendarService } from '@/services/calendar';



/**

 * Returns today's Hebrew date string from the calendar provider.

 */

export async function getHebrewDateDisplay(): Promise<string> {

  const info = await calendarService.getTodayInfo();

  return info.hebrewDate.displayString;

}



/**

 * @deprecated Use calendarService / useHebrewCalendar instead.

 */

export function getHebrewDatePlaceholder(): string {

  return 'תאריך עברי';

}



/**

 * @deprecated Use useNextUpcomingEvent instead.

 */

export function getNextEventPlaceholder(): string {

  return 'אירוע קרוב';

}


