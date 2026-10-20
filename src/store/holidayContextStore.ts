import { create } from 'zustand';

import type { HolidayContext } from '@/services/holidayContext';

interface HolidayContextState {
  context: HolidayContext;
  setContext: (context: HolidayContext) => void;
}

const INACTIVE: HolidayContext = {
  active: false,
  themeKey: 'default',
  prepCardEnabled: false,
  triviaCategories: [],
};

export const useHolidayContextStore = create<HolidayContextState>((set) => ({
  context: INACTIVE,
  setContext: (context) => set({ context }),
}));
