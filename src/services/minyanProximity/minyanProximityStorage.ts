import { getJson, setJson, STORAGE_KEYS } from '@/utils/storage';

export interface MinyanProximityPreferences {
  enabled: boolean;
}

export interface MinyanProximityNotificationState {
  notifiedByReportId: Record<string, string>;
}

const DEFAULT_PREFERENCES: MinyanProximityPreferences = {
  enabled: false,
};

const DEFAULT_NOTIFICATION_STATE: MinyanProximityNotificationState = {
  notifiedByReportId: {},
};

export async function getMinyanProximityPreferences(): Promise<MinyanProximityPreferences> {
  const stored = await getJson<MinyanProximityPreferences>(
    STORAGE_KEYS.minyanProximityPreferences,
  );
  if (!stored || typeof stored.enabled !== 'boolean') {
    return DEFAULT_PREFERENCES;
  }

  return stored;
}

export async function setMinyanProximityEnabled(enabled: boolean): Promise<void> {
  await setJson(STORAGE_KEYS.minyanProximityPreferences, { enabled });
}

export async function getMinyanProximityNotificationState(): Promise<MinyanProximityNotificationState> {
  const stored = await getJson<MinyanProximityNotificationState>(
    STORAGE_KEYS.minyanProximityNotificationState,
  );
  if (!stored || typeof stored.notifiedByReportId !== 'object') {
    return DEFAULT_NOTIFICATION_STATE;
  }

  return {
    notifiedByReportId: stored.notifiedByReportId ?? {},
  };
}

export async function saveMinyanProximityNotificationState(
  state: MinyanProximityNotificationState,
): Promise<void> {
  await setJson(STORAGE_KEYS.minyanProximityNotificationState, state);
}
