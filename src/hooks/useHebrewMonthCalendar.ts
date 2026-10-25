import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  hebrewMonthFromDateKey,
  shiftHebrewMonth,
} from '@/services/calendar/calendarCellPresentation';
import { calendarService } from '@/services/calendar';
import type {
  CalendarHebrewMonth,
  CalendarLocationInput,
} from '@/types/calendar';
import { getCalendarDateKey } from '@/utils/timezone';

export interface UseHebrewMonthCalendarResult {
  month: CalendarHebrewMonth | null;
  selectedDateKey: string;
  todayDateKey: string;
  isLoading: boolean;
  error: string | null;
  selectDate: (dateKey: string) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  refresh: () => Promise<void>;
}

export function useHebrewMonthCalendar(
  location?: CalendarLocationInput,
): UseHebrewMonthCalendarResult {
  const todayDateKey = getCalendarDateKey();
  const todayMonth = useMemo(
    () => hebrewMonthFromDateKey(todayDateKey),
    [todayDateKey],
  );
  const [hebrewYear, setHebrewYear] = useState(todayMonth.hebrewYear);
  const [hebrewMonth, setHebrewMonth] = useState(todayMonth.hebrewMonth);
  const [selectedDateKey, setSelectedDateKey] = useState(todayDateKey);
  const [month, setMonth] = useState<CalendarHebrewMonth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextMonth = await calendarService.getHebrewMonth(
        hebrewYear,
        hebrewMonth,
        location,
      );
      if (!isMountedRef.current) {
        return;
      }
      setMonth(nextMonth);
      const unavailable = nextMonth.cells.every(
        (cell) => cell.dayInfo.freshness === 'unavailable',
      );
      setError(
        unavailable ? 'לא ניתן לטעון את לוח השנה העברי כרגע.' : null,
      );
    } catch {
      if (isMountedRef.current) {
        setError('לא ניתן לטעון את לוח השנה העברי כרגע.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [hebrewYear, hebrewMonth, location?.latitude, location?.longitude]);

  useEffect(() => {
    isMountedRef.current = true;
    void load();
    return () => {
      isMountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (!month) {
      return;
    }
    const inMonth = month.cells.filter((cell) => cell.inCurrentMonth);
    const stillVisible = inMonth.some(
      (cell) => cell.dateKey === selectedDateKey,
    );
    if (stillVisible || inMonth.length === 0) {
      return;
    }
    const todayInMonth = inMonth.find(
      (cell) => cell.dateKey === todayDateKey,
    );
    setSelectedDateKey(todayInMonth?.dateKey ?? inMonth[0].dateKey);
  }, [month, selectedDateKey, todayDateKey]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void load();
      }
    };
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => {
      subscription.remove();
    };
  }, [load]);

  const selectDate = useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey);
  }, []);

  const goToPreviousMonth = useCallback(() => {
    const next = shiftHebrewMonth(hebrewYear, hebrewMonth, -1);
    setHebrewYear(next.hebrewYear);
    setHebrewMonth(next.hebrewMonth);
  }, [hebrewYear, hebrewMonth]);

  const goToNextMonth = useCallback(() => {
    const next = shiftHebrewMonth(hebrewYear, hebrewMonth, 1);
    setHebrewYear(next.hebrewYear);
    setHebrewMonth(next.hebrewMonth);
  }, [hebrewYear, hebrewMonth]);

  const goToToday = useCallback(() => {
    setHebrewYear(todayMonth.hebrewYear);
    setHebrewMonth(todayMonth.hebrewMonth);
    setSelectedDateKey(todayDateKey);
  }, [todayDateKey, todayMonth.hebrewMonth, todayMonth.hebrewYear]);

  return {
    month,
    selectedDateKey,
    todayDateKey,
    isLoading,
    error,
    selectDate,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    refresh: load,
  };
}
