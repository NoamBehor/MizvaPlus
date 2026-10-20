import { create } from 'zustand';

import { getJson, setJson } from '@/utils/storage';

interface MinyanLiveStoreState {
  ownedReportsByOsmKey: Record<string, string>;
  setOwnedReport: (synagogueOsmKey: string, reportId: string) => void;
  clearOwnedReport: (synagogueOsmKey: string) => void;
  isOwnedReport: (synagogueOsmKey: string, reportId: string) => boolean;
  hydrateOwnedReports: (userId: string) => Promise<void>;
  resetOwnedReports: () => void;
}

function ownedReportsStorageKey(userId: string): string {
  return `@mitzvahapp/minyan_live_owned_reports:${userId}`;
}

export const useMinyanLiveStore = create<MinyanLiveStoreState>((set, get) => ({
  ownedReportsByOsmKey: {},

  setOwnedReport: (synagogueOsmKey, reportId) => {
    set((state) => ({
      ownedReportsByOsmKey: {
        ...state.ownedReportsByOsmKey,
        [synagogueOsmKey]: reportId,
      },
    }));
  },

  clearOwnedReport: (synagogueOsmKey) => {
    set((state) => {
      const next = { ...state.ownedReportsByOsmKey };
      delete next[synagogueOsmKey];
      return { ownedReportsByOsmKey: next };
    });
  },

  isOwnedReport: (synagogueOsmKey, reportId) => {
    return get().ownedReportsByOsmKey[synagogueOsmKey] === reportId;
  },

  hydrateOwnedReports: async (userId) => {
    const stored = await getJson<Record<string, string>>(
      ownedReportsStorageKey(userId),
    );
    set({ ownedReportsByOsmKey: stored ?? {} });
  },

  resetOwnedReports: () => {
    set({ ownedReportsByOsmKey: {} });
  },
}));

export async function persistOwnedMinyanReports(
  userId: string,
  ownedReportsByOsmKey: Record<string, string>,
): Promise<void> {
  await setJson(ownedReportsStorageKey(userId), ownedReportsByOsmKey);
}
