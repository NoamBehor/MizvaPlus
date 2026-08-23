import { create } from 'zustand';

import type { SyncStatus } from '@/services/cloud/types';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  setStatus: (status: SyncStatus) => void;
  markSynced: () => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncedAt: null,

  setStatus: (status: SyncStatus) => {
    set({ status });
  },

  markSynced: () => {
    set({ status: 'synced', lastSyncedAt: new Date().toISOString() });
  },

  reset: () => {
    set({ status: 'idle', lastSyncedAt: null });
  },
}));
