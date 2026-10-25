import { addDaysToDateKey } from '@/utils/timezone';

export interface HebrewMonthGridKey {
  dateKey: string;
  inCurrentMonth: boolean;
}

const GREGORIAN_MONTHS_HE = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
] as const;

function parseDateKeyParts(dateKey: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month, day };
}

/**
 * Builds a Sunday-start week matrix for one Hebrew month.
 * `startWeekday` is 0=Sunday … 6=Saturday (same as `HDate.getDay()`).
 */
export function buildHebrewMonthGridKeys(
  firstDateKey: string,
  daysInMonth: number,
  startWeekday: number,
): HebrewMonthGridKey[] {
  const cells: HebrewMonthGridKey[] = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({
      dateKey: addDaysToDateKey(firstDateKey, i - startWeekday),
      inCurrentMonth: false,
    });
  }

  for (let day = 0; day < daysInMonth; day += 1) {
    cells.push({
      dateKey: addDaysToDateKey(firstDateKey, day),
      inCurrentMonth: true,
    });
  }

  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const lastKey = cells[cells.length - 1]?.dateKey ?? firstDateKey;
    const pad = 7 - remainder;
    for (let i = 1; i <= pad; i += 1) {
      cells.push({
        dateKey: addDaysToDateKey(lastKey, i),
        inCurrentMonth: false,
      });
    }
  }

  return cells;
}

export function formatGregorianRangeLabel(
  startDateKey: string,
  endDateKey: string,
): string {
  const start = parseDateKeyParts(startDateKey);
  const end = parseDateKeyParts(endDateKey);
  const startMonth = GREGORIAN_MONTHS_HE[start.month - 1] ?? '';
  const endMonth = GREGORIAN_MONTHS_HE[end.month - 1] ?? '';

  if (start.year === end.year && start.month === end.month) {
    return `${startMonth} ${start.year}`;
  }

  if (start.year === end.year) {
    return `${startMonth}–${endMonth} ${start.year}`;
  }

  return `${startMonth} ${start.year}–${endMonth} ${end.year}`;
}

export function formatGregorianDateLabel(dateKey: string): string {
  const { year, month, day } = parseDateKeyParts(dateKey);
  const monthName = GREGORIAN_MONTHS_HE[month - 1] ?? '';
  return `${day} ב${monthName} ${year}`;
}

export const WEEKDAY_TITLES_HE = [
  'יום ראשון',
  'יום שני',
  'יום שלישי',
  'יום רביעי',
  'יום חמישי',
  'יום שישי',
  'שבת קודש',
] as const;
