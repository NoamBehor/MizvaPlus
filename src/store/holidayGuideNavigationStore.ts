import { create } from 'zustand';

interface HolidayGuideNavigationState {
  pendingHolidayKey: string | null;
  pendingExpanded: boolean;
  requestHolidayGuide: (holidayKey: string, expanded?: boolean) => void;
  consumePendingHolidayGuide: () => { holidayKey: string; expanded: boolean } | null;
}

export const useHolidayGuideNavigationStore = create<HolidayGuideNavigationState>(
  (set, get) => ({
    pendingHolidayKey: null,
    pendingExpanded: true,
    requestHolidayGuide: (holidayKey, expanded = true) => {
      set({ pendingHolidayKey: holidayKey, pendingExpanded: expanded });
    },
    consumePendingHolidayGuide: () => {
      const { pendingHolidayKey, pendingExpanded } = get();
      if (!pendingHolidayKey) {
        return null;
      }

      set({ pendingHolidayKey: null, pendingExpanded: true });
      return { holidayKey: pendingHolidayKey, expanded: pendingExpanded };
    },
  }),
);
