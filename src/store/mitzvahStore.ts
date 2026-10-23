import { create } from 'zustand';



import { MITZVOT_SEED } from '@/constants/mitzvot';

import {

  completeMitzvah,

  createDefaultPreferences,

  isMitzvahCompletedToday,

  uncompleteMitzvahToday,

} from '@/services/mitzvot';

import { awardXp } from '@/services/xp';

import { evaluateBadges } from '@/services/gamification';

import { updateStreakOnDailyActivity } from '@/services/streak';

import {
  enableNotifications,
  syncNotificationSchedule,
} from '@/services/notificationScheduler';
import type { NotificationPermissionStatus } from '@/services/notifications';

import type {

  Mitzvah,

  MitzvahCompletion,

  UserMitzvahPreference,

} from '@/types/mitzvah';

import type { CalendarDayInfo } from '@/types/calendar';

import { filterEnabledActiveMitzvotForToday } from '@/services/calendarMitzvot';

import { useGamificationStore } from '@/store/gamificationStore';

import { prepareForRemoteSync } from '@/services/mitzvahPreferences';
import { deleteCompletion } from '@/services/cloud/mitzvahRepository';
import { requestCloudSync } from '@/services/cloud/syncService';
import { getActivityDateKey } from '@/utils/timezone';

import {

  completionsStorageKey,

  getJson,

  preferencesStorageKey,

  setJson,

} from '@/utils/storage';

import { migrateCompletions } from '@/utils/uuid';
import { logDiagnosticEvent } from '@/services/diagnostics/diagnosticLogger';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';



interface TodayProgress {

  completed: number;

  total: number;

  percentage: number;

}



interface MitzvahState {

  mitzvot: Mitzvah[];

  preferences: Record<string, UserMitzvahPreference>;

  completions: MitzvahCompletion[];

  notificationIds: Record<string, string>;

  permissionDeniedMessage: string | null;

  osNotificationPermission: NotificationPermissionStatus | null;

  initialize: (userId: string) => Promise<void>;

  setTracking: (mitzvahId: string, enabled: boolean) => Promise<void>;

  setReminder: (mitzvahId: string, enabled: boolean) => Promise<boolean>;

  setReminderTime: (mitzvahId: string, reminderTime: string) => Promise<void>;

  toggleCompletion: (userId: string, mitzvahId: string) => Promise<void>;

  markMitzvahComplete: (userId: string, mitzvahId: string) => Promise<void>;

  unmarkMitzvahCompleteToday: (userId: string, mitzvahId: string) => Promise<void>;

  getEnabledTrackedMitzvot: () => Mitzvah[];

  getActiveEnabledMitzvotForDay: (dayInfo: CalendarDayInfo) => Mitzvah[];

  getEnabledDailyMitzvot: () => Mitzvah[];

  getTodayProgress: (userId: string, dayInfo?: CalendarDayInfo) => TodayProgress;

  isCompletedToday: (userId: string, mitzvahId: string) => boolean;

  persistPreferences: (userId: string) => Promise<void>;

  persistCompletions: (userId: string) => Promise<void>;

  syncNotifications: (userId: string) => Promise<void>;

  clearPermissionMessage: () => void;

  setOsNotificationPermission: (status: NotificationPermissionStatus) => void;

  preferencesRevision: number;

  saveTrackedSelections: (
    userId: string,
    enabledMitzvahIds: string[],
  ) => Promise<'saved' | 'noop'>;

  reset: () => void;

}



async function reconcileUserNotifications(

  userId: string,

  preferences: Record<string, UserMitzvahPreference>,

  mitzvot: Mitzvah[],

): Promise<Record<string, string>> {

  const result = await syncNotificationSchedule(userId, preferences, mitzvot);

  const notificationIds: Record<string, string> = {};



  for (const identifier of result.scheduled) {

    const parts = identifier.split(':');

    const mitzvahId = parts[1];

    if (parts[2] === 'mitzvah-daily' && mitzvahId) {

      notificationIds[mitzvahId] = identifier;

    }

  }



  return notificationIds;

}



export const useMitzvahStore = create<MitzvahState>((set, get) => ({

  mitzvot: MITZVOT_SEED,

  preferences: {},

  completions: [],

  notificationIds: {},

  permissionDeniedMessage: null,

  osNotificationPermission: null,

  preferencesRevision: 0,

  initialize: async (userId: string) => {

    const preferencesKey = preferencesStorageKey(userId);

    const completionsKey = completionsStorageKey(userId);



    const storedPreferences = await getJson<Record<string, UserMitzvahPreference>>(

      preferencesKey,

    );

    const storedCompletions = await getJson<MitzvahCompletion[]>(completionsKey);

    const migratedCompletions = migrateCompletions(storedCompletions ?? []);

    if (migratedCompletions.changed) {

      await setJson(completionsKey, migratedCompletions.records);

    }



    const preferences = storedPreferences ?? createDefaultPreferences(userId);



    set({

      preferences,

      completions: migratedCompletions.records,

    });



    if (!storedPreferences) {

      await setJson(preferencesKey, preferences);

    }



    const notificationIds = await reconcileUserNotifications(

      userId,

      preferences,

      get().mitzvot,

    );

    set({ notificationIds });

  },



  setTracking: async (mitzvahId: string, enabled: boolean) => {

    const { preferences, mitzvot } = get();

    const preference = preferences[mitzvahId];



    if (!preference) {

      return;

    }



    const updatedPreference: UserMitzvahPreference = {

      ...preference,

      enabled,

      reminderEnabled: enabled ? preference.reminderEnabled : false,

      updatedAt: new Date().toISOString(),

    };



    const updatedPreferences = {

      ...preferences,

      [mitzvahId]: updatedPreference,

    };



    set({ preferences: updatedPreferences });

    await setJson(preferencesStorageKey(preference.userId), updatedPreferences);

    void requestCloudSync(preference.userId);

    const notificationIds = await reconcileUserNotifications(

      preference.userId,

      updatedPreferences,

      mitzvot,

    );

    set({ notificationIds });

  },



  setReminder: async (mitzvahId: string, enabled: boolean) => {

    const { preferences, mitzvot } = get();

    const preference = preferences[mitzvahId];

    const mitzvah = mitzvot.find((item) => item.id === mitzvahId);



    if (!preference || !mitzvah || !preference.enabled) {

      return false;

    }



    if (enabled) {

      const permission = await enableNotifications();

      if (!permission.granted) {

        set({

          permissionDeniedMessage:

            'לא ניתן להפעיל תזכורות ללא אישור התראות. יש לאפשר התראות בהגדרות המכשיר.',

        });

        return false;

      }

    }



    const updatedPreference: UserMitzvahPreference = {

      ...preference,

      reminderEnabled: enabled,

      reminderTime:

        enabled && !preference.reminderTime

          ? mitzvah.defaultTime ?? '07:30'

          : preference.reminderTime,

      updatedAt: new Date().toISOString(),

    };



    const updatedPreferences = {

      ...preferences,

      [mitzvahId]: updatedPreference,

    };



    set({ preferences: updatedPreferences, permissionDeniedMessage: null });

    await setJson(preferencesStorageKey(preference.userId), updatedPreferences);

    void requestCloudSync(preference.userId);

    const notificationIds = await reconcileUserNotifications(

      preference.userId,

      updatedPreferences,

      mitzvot,

    );

    set({ notificationIds });

    return true;

  },



  setReminderTime: async (mitzvahId: string, reminderTime: string) => {

    const { preferences, mitzvot } = get();

    const preference = preferences[mitzvahId];



    if (!preference) {

      return;

    }



    const updatedPreference: UserMitzvahPreference = {

      ...preference,

      reminderTime,

      updatedAt: new Date().toISOString(),

    };



    const updatedPreferences = {

      ...preferences,

      [mitzvahId]: updatedPreference,

    };



    set({ preferences: updatedPreferences });

    await setJson(preferencesStorageKey(preference.userId), updatedPreferences);

    void requestCloudSync(preference.userId);

    const notificationIds = await reconcileUserNotifications(

      preference.userId,

      updatedPreferences,

      mitzvot,

    );

    set({ notificationIds });

  },



  toggleCompletion: async (userId: string, mitzvahId: string) => {

    await get().markMitzvahComplete(userId, mitzvahId);

  },



  markMitzvahComplete: async (userId: string, mitzvahId: string) => {

    const { completions, preferences } = get();

    const preference = preferences[mitzvahId];



    if (!preference?.enabled) {

      return;

    }



    if (isMitzvahCompletedToday(userId, mitzvahId, completions)) {

      return;

    }



    const result = completeMitzvah(userId, mitzvahId, completions);

    if (!result.success || !result.completion) {

      return;

    }



    const updatedCompletions = [...completions, result.completion];

    set({ completions: updatedCompletions });

    await setJson(completionsStorageKey(userId), updatedCompletions);



    await awardXp({

      userId,

      amount: result.completion.xpAwarded,

      reason: 'MITZVAH_COMPLETED',

      referenceId: result.completion.id,

    });



    await updateStreakOnDailyActivity(userId);



    const newlyUnlocked = await evaluateBadges(userId);

    useGamificationStore.getState().queueBadgeNotifications(newlyUnlocked);

    void requestCloudSync(userId);

  },

  unmarkMitzvahCompleteToday: async (userId, mitzvahId) => {
    const { completions } = get();
    const completionDate = getActivityDateKey();
    const removed = completions.find(
      (completion) =>
        completion.userId === userId &&
        completion.mitzvahId === mitzvahId &&
        completion.completionDate === completionDate,
    );

    if (!removed) {
      return;
    }

    try {
      await deleteCompletion(userId, mitzvahId, completionDate);
    } catch {
      return;
    }

    const updatedCompletions = uncompleteMitzvahToday(
      userId,
      mitzvahId,
      completions,
    );
    set({ completions: updatedCompletions });
    await setJson(completionsStorageKey(userId), updatedCompletions);

    await awardXp({
      userId,
      amount: -removed.xpAwarded,
      reason: 'MITZVAH_COMPLETED',
      referenceId: removed.id,
    });
    void requestCloudSync(userId);
  },



  getEnabledTrackedMitzvot: () => {

    const { mitzvot, preferences } = get();

    return mitzvot.filter((mitzvah) => preferences[mitzvah.id]?.enabled);

  },



  getActiveEnabledMitzvotForDay: (dayInfo: CalendarDayInfo) => {

    const { mitzvot, preferences } = get();

    return filterEnabledActiveMitzvotForToday(mitzvot, dayInfo, preferences);

  },



  getEnabledDailyMitzvot: () => {

    return get().getEnabledTrackedMitzvot().filter(

      (mitzvah) => mitzvah.category === 'daily',

    );

  },



  getTodayProgress: (userId: string, dayInfo?: CalendarDayInfo) => {

    const activeMitzvot = dayInfo

      ? get().getActiveEnabledMitzvotForDay(dayInfo)

      : get().getEnabledTrackedMitzvot();

    const completed = activeMitzvot.filter((mitzvah) =>

      isMitzvahCompletedToday(userId, mitzvah.id, get().completions),

    ).length;

    const total = activeMitzvot.length;

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);



    return { completed, total, percentage };

  },



  isCompletedToday: (userId: string, mitzvahId: string) => {

    return isMitzvahCompletedToday(userId, mitzvahId, get().completions);

  },



  persistPreferences: async (userId: string) => {

    const { preferences } = get();

    await setJson(preferencesStorageKey(userId), preferences);

    await prepareForRemoteSync(userId, preferences);

    void requestCloudSync(userId);

  },



  persistCompletions: async (userId: string) => {

    const { completions } = get();

    await setJson(completionsStorageKey(userId), completions);

  },



  syncNotifications: async (userId: string) => {

    const { preferences, mitzvot } = get();

    const notificationIds = await reconcileUserNotifications(

      userId,

      preferences,

      mitzvot,

    );

    set({ notificationIds });

  },



  clearPermissionMessage: () => {

    set({ permissionDeniedMessage: null });

  },



  setOsNotificationPermission: (status) => {

    set({ osNotificationPermission: status });

  },



  saveTrackedSelections: async (userId, enabledMitzvahIds) => {

    const { preferences, mitzvot } = get();

    const nextEnabled = new Set(enabledMitzvahIds);

    let changed = false;

    const updatedPreferences = { ...preferences };



    for (const mitzvah of mitzvot) {

      const preference = preferences[mitzvah.id];

      if (!preference) {

        continue;

      }



      const shouldEnable = nextEnabled.has(mitzvah.id);

      if (preference.enabled === shouldEnable) {

        continue;

      }



      updatedPreferences[mitzvah.id] = {

        ...preference,

        enabled: shouldEnable,

        reminderEnabled: shouldEnable ? preference.reminderEnabled : false,

        updatedAt: new Date().toISOString(),

      };

      changed = true;

    }



    const selectedIds = enabledMitzvahIds;
    const revision = get().preferencesRevision;

    if (!changed) {
      if (__DEV__) {
        useDiagnosticsStore.getState().setMyMitzvotSnapshot({
          selectedMitzvahIds: selectedIds,
          selectionCount: selectedIds.length,
          preferencesRevision: revision,
          lastSavedRevision: revision,
          lastSaveStatus: 'noop',
          lastSaveTimestamp: Date.now(),
          lastSaveWasNoop: true,
          notificationReconciliationStatus: 'skipped_noop',
          homeRefreshTriggered: false,
        });
        logDiagnosticEvent('MITZVOT', 'save_tracked_selections', 'info', {
          status: 'noop',
        });
      }
      return 'noop';
    }



    set({

      preferences: updatedPreferences,

      preferencesRevision: get().preferencesRevision + 1,

    });

    const nextRevision = get().preferencesRevision;



    await setJson(preferencesStorageKey(userId), updatedPreferences);

    await prepareForRemoteSync(userId, updatedPreferences);

    void requestCloudSync(userId);



    const notificationIds = await reconcileUserNotifications(

      userId,

      updatedPreferences,

      mitzvot,

    );

    set({ notificationIds });

    if (__DEV__) {
      useDiagnosticsStore.getState().setMyMitzvotSnapshot({
        selectedMitzvahIds: selectedIds,
        selectionCount: selectedIds.length,
        preferencesRevision: nextRevision,
        lastSavedRevision: nextRevision,
        lastSaveStatus: 'saved',
        lastSaveTimestamp: Date.now(),
        lastSaveWasNoop: false,
        notificationReconciliationStatus: 'reconciled',
        homeRefreshTriggered: true,
      });
      logDiagnosticEvent('MITZVOT', 'save_tracked_selections', 'info', {
        status: 'saved',
        revision: nextRevision,
      });
    }



    return 'saved';

  },



  reset: () => {

    set({

      preferences: {},

      completions: [],

      notificationIds: {},

      permissionDeniedMessage: null,

      osNotificationPermission: null,

      preferencesRevision: 0,

    });

  },

}));


