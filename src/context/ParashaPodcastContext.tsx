import { createContext, useContext, type ReactNode } from 'react';

import { useHebrewCalendar } from '@/hooks/useHebrewCalendar';
import {
  useParashaPodcast,
  type UseParashaPodcastResult,
} from '@/hooks/useParashaPodcast';
import { useZmanimLocation } from '@/hooks/useZmanimLocation';

const ParashaPodcastContext = createContext<UseParashaPodcastResult | null>(
  null,
);

interface ParashaPodcastProviderProps {
  children: ReactNode;
}

export function ParashaPodcastProvider({ children }: ParashaPodcastProviderProps) {
  const { calendarInput } = useZmanimLocation();
  const { dayInfo } = useHebrewCalendar(calendarInput);
  const podcast = useParashaPodcast(dayInfo?.weeklyParasha ?? null, {
    enablePlayback: true,
  });

  return (
    <ParashaPodcastContext.Provider value={podcast}>
      {children}
    </ParashaPodcastContext.Provider>
  );
}

export function useParashaPodcastContext(): UseParashaPodcastResult {
  const context = useContext(ParashaPodcastContext);

  if (!context) {
    throw new Error(
      'useParashaPodcastContext must be used within ParashaPodcastProvider',
    );
  }

  return context;
}

export function useParashaPodcastContextOptional(): UseParashaPodcastResult | null {
  return useContext(ParashaPodcastContext);
}
