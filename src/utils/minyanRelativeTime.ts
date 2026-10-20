/**
 * Hebrew relative-time formatter for Minyan Live updated timestamps.
 */
export function formatHebrewRelativeTime(
  isoTimestamp: string,
  now: Date = new Date(),
): string {
  const updatedAt = new Date(isoTimestamp);
  if (!Number.isFinite(updatedAt.getTime())) {
    return 'עכשיו';
  }

  const diffMs = now.getTime() - updatedAt.getTime();
  if (diffMs <= 0) {
    return 'עכשיו';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) {
    return 'עכשיו';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes === 1) {
    return 'לפני דקה';
  }

  if (diffMinutes < 60) {
    return `לפני ${diffMinutes} דקות`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) {
    return 'לפני שעה';
  }

  return `לפני ${diffHours} שעות`;
}
