import { DAILY_QUOTES, type DailyQuote } from '@/constants/dailyQuotes';
import { getActivityDateKey } from '@/utils/timezone';

/**
 * Deterministically selects a daily quote based on the local calendar date.
 * The same date always returns the same quote.
 */
export function getDailyQuoteForDate(date: Date = new Date()): DailyQuote {
  const dateKey = getActivityDateKey(date);
  const dayNumber = Number(dateKey.replace(/-/g, ''));
  const index = dayNumber % DAILY_QUOTES.length;
  return DAILY_QUOTES[index];
}
