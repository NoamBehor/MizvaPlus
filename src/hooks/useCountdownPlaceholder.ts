import { useEffect, useState } from 'react';

import { formatCountdown } from '@/utils/time';

const PLACEHOLDER_SECONDS = 2 * 60 * 60 + 45 * 60 + 10;

export function useCountdownPlaceholder(
  initialSeconds: number = PLACEHOLDER_SECONDS,
): string {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((current) => (current > 0 ? current - 1 : initialSeconds));
    }, 1000);

    return () => clearInterval(interval);
  }, [initialSeconds]);

  return formatCountdown(seconds);
}
