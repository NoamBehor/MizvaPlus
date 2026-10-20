import { useEffect } from 'react';

import type { CalendarDayInfo } from '@/types/calendar';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';

export function useHomeDiagnosticsCapture(
  dayInfo: CalendarDayInfo | null,
  selectedMitzvotIds: string[],
  preferencesRevision: number,
): void {
  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    useDiagnosticsStore.getState().setHomeSnapshot({
      weeklyParashaFinal: dayInfo?.weeklyParasha?.hebrewName ?? null,
      weeklyParashaFallback: dayInfo?.freshness === 'unavailable',
      selectedMitzvotCount: selectedMitzvotIds.length,
      selectedMitzvotIds,
      preferencesRevision,
    });
  }, [dayInfo, selectedMitzvotIds, preferencesRevision]);
}
