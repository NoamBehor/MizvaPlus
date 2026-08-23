export type EventType =
  | 'SHABBAT_ENTRY'
  | 'SHABBAT_EXIT'
  | 'MITZVAH'
  | 'FAST'
  | 'HOLIDAY';

export interface UpcomingEvent {
  id: string;
  type: EventType;
  title: string;
  targetDate: string;
  /** HH:mm in Israel local time when the provider supplies a timed event. */
  displayTime?: string;
}
