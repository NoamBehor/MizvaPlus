import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export interface CountdownState {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

function computeCountdown(targetDate: string): CountdownState {
  const targetMs = new Date(targetDate).getTime();
  const nowMs = Date.now();
  const diffMs = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(diffMs / 1000);

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
    isExpired: diffMs === 0,
  };
}

function isSameCountdown(a: CountdownState, b: CountdownState): boolean {
  return (
    a.hours === b.hours &&
    a.minutes === b.minutes &&
    a.seconds === b.seconds &&
    a.totalSeconds === b.totalSeconds &&
    a.isExpired === b.isExpired
  );
}

export function useCountdown(
  targetDate: string,
  onExpired?: () => void,
): CountdownState {
  const targetMs = new Date(targetDate).getTime();
  const [countdown, setCountdown] = useState(() => computeCountdown(targetDate));
  const onExpiredRef = useRef(onExpired);
  const hasExpiredRef = useRef(false);
  const targetDateRef = useRef(targetDate);

  onExpiredRef.current = onExpired;
  targetDateRef.current = targetDate;

  const tick = useCallback(() => {
    const next = computeCountdown(targetDateRef.current);
    setCountdown((prev) => (isSameCountdown(prev, next) ? prev : next));

    if (next.isExpired && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
      onExpiredRef.current?.();
    }
  }, []);

  useEffect(() => {
    hasExpiredRef.current = false;
    setCountdown(computeCountdown(targetDate));

    tick();

    const interval = setInterval(tick, 1000);

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        tick();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [targetMs, tick]);

  return countdown;
}
