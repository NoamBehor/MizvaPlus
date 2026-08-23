import { create } from 'zustand';



import { MITZVOT_SEED } from '@/constants/mitzvot';

import {

  completeMitzvah,

  createDefaultPreferences,

  isMitzvahCompletedToday,

} from '@/services/mitzvot';

import { awardXp } from '@/services/xp';

import { evaluateBadges } from '@/services/gamification';

import { updateStreakOnDailyActivity } from '@/services/streak';

import {
  enableNotifications,
  syncNotificationSchedule,
} from '@/services/notificationScheduler';

import type {

  Mitzvah,

  MitzvahCompletion,

  UserMitzvahPreference,

} from '@/types/mitzvah';

import type { CalendarDayInfo } from '@/types/calendar';

import { filterEnabledActiveMitzvotForToday } from '@/services/calendarMitzvot';

import { useGamificationStore } from '@/store/gamificationStore';

import { prepareForRemoteSync } from '@/services/mitzvahPreferences';
import { requestCloudSync } from '@/services/cloud/syncService';

import {

  completionsStorageKey,

  getJson,

  preferencesStorageKey,

  setJson,

} from '@/utils/storage';



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

  initialize: (userId: string) => Promise<void>;

  setTracking: (mitzvahId: string, enabled: boolean) => Promise<void>;

  setReminder: (mitzvahId: string, enabled: boolean) => Promise<boolean>;

  setReminderTime: (mitzvahId: string, reminderTime: string) => Promise<void>;

  toggleCompletion: (userId: string, mitzvahId: string) => Promise<void>;

  markMitzvahComplete: (userId: string, mitzvahId: string) => Promise<void>;

  getEnabledTrackedMitzvot: () => Mitzvah[];

  getActiveEnabledMitzvotForDay: (dayInfo: CalendarDayInfo) => Mitzvah[];

  getEnabledDailyMitzvot: () => Mitzvah[];

  getTodayProgress: (userId: string, dayInfo?: CalendarDayInfo) => TodayProgress;

  isCompletedToday: (userId: string, mitzvahId: string) => boolean;

  persistPreferences: (userId: string) => Promise<void>;

  persistCompletions: (userId: string) => Promise<void>;

  syncNotifications: (userId: string) => Promise<void>;

  clearPermissionMessage: () => void;

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



  initialize: async (userId: string) => {

    const preferencesKey = preferencesStorageKey(userId);

    const completionsKey = completionsStorageKey(userId);



    const storedPreferences = await getJson<Record<string, UserMitzvahPreference>>(

      preferencesKey,

    );

    const storedCompletions = await getJson<MitzvahCompletion[]>(completionsKey);



    const preferences = storedPreferences ?? createDefaultPreferences(userId);



    set({

      preferences,

      completions: storedCompletions ?? [],

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



  reset: () => {

    set({

      preferences: {},

      completions: [],

      notificationIds: {},

      permissionDeniedMessage: null,

    });

  },

}));


