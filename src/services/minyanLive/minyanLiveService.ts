import {
  MINYAN_LOCATION_MAX_AGE_MS,
  MINYAN_MAX_GPS_ACCURACY_METERS,
} from '@/constants/minyanLive';
import { resolveDevOverrideLocationForMinyanMutation } from '@/services/devPreview/devLocationOverride';
import { getCurrentLocation, LocationServiceError } from '@/services/location';
import { MinyanLiveServiceError } from '@/services/minyanLive/minyanLiveErrors';
import { mapRpcRowsToActiveReports } from '@/services/minyanLive/minyanLiveMapper';
import type {
  ActiveMinyanReport,
  CreateMinyanReportParams,
  FulfillMinyanReportParams,
  RpcPublicMinyanReport,
  UpdateMinyanReportParams,
} from '@/services/minyanLive/minyanLiveTypes';
import { withTimeout } from '@/services/cloud/withTimeout';
import { analyzeListActiveReportsResult } from '@/services/diagnostics/listReportsStats';
import { logMinyanRpcDiagnostic } from '@/services/diagnostics/errorStages';
import { recordRpcTrace } from '@/services/diagnostics/rpcTrace';
import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';
import type { UserLocation } from '@/types/location';

const MINYAN_RPC_TIMEOUT_MS = 15_000;

function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
}

function toLocationCapturedAt(location: UserLocation): string {
  return new Date(location.timestamp).toISOString();
}

export function validateMinyanSubmitLocation(
  location: UserLocation,
  now: Date = new Date(),
): void {
  if (
    typeof location.accuracy !== 'number' ||
    location.accuracy > MINYAN_MAX_GPS_ACCURACY_METERS
  ) {
    throw new LocationServiceError(
      'location_unavailable',
      'GPS accuracy insufficient for minyan report.',
    );
  }

  const ageMs = now.getTime() - location.timestamp;
  if (ageMs > MINYAN_LOCATION_MAX_AGE_MS) {
    throw new LocationServiceError(
      'location_unavailable',
      'Location fix is stale for minyan report.',
    );
  }
}

export async function getFreshLocationForMinyan(): Promise<UserLocation> {
  const overrideLocation = resolveDevOverrideLocationForMinyanMutation();
  if (overrideLocation) {
    validateMinyanSubmitLocation(overrideLocation);
    return overrideLocation;
  }

  const location = await getCurrentLocation();

  if (location.source === 'FALLBACK' || location.source === 'UNAVAILABLE') {
    throw new LocationServiceError(
      'location_unavailable',
      'Current GPS location is unavailable for minyan report.',
    );
  }

  validateMinyanSubmitLocation(location);
  return location;
}

function mapRpcMutationResult(
  row: RpcPublicMinyanReport | null,
): ActiveMinyanReport | null {
  if (!row) {
    throw new MinyanLiveServiceError('REPORT_EXPIRED');
  }

  const mapped = mapRpcRowsToActiveReports([row])[0];
  if (mapped) {
    return mapped;
  }

  if (row.status === 'FULFILLED') {
    return null;
  }

  throw new MinyanLiveServiceError('REPORT_EXPIRED');
}

export async function listActiveMinyanReports(
  synagogueOsmKeys?: string[],
): Promise<ActiveMinyanReport[]> {
  assertSupabaseConfigured();

  const rpcName = 'list_active_minyan_reports';
  const startedAt = Date.now();

  const { data, error } = await withTimeout(
    getSupabaseClient().rpc('list_active_minyan_reports', {
      p_synagogue_osm_keys:
        synagogueOsmKeys && synagogueOsmKeys.length > 0 ? synagogueOsmKeys : null,
    }),
    MINYAN_RPC_TIMEOUT_MS,
  );

  const completedAt = Date.now();

  if (error) {
    recordRpcTrace(rpcName, startedAt, completedAt, false, error);
    logMinyanRpcDiagnostic(rpcName, error);
    if (__DEV__) {
      useDiagnosticsStore.getState().setListReportsDiagnostics({
        success: false,
        returnedCount: 0,
        expiredDiscardedCount: 0,
        invalidOsmKeyCount: 0,
        mergedCount: 0,
        errorMessage: error.message,
      });
    }
    throw error;
  }

  const rawRows = data as RpcPublicMinyanReport[] | null;
  recordRpcTrace(rpcName, startedAt, completedAt, true);
  if (__DEV__) {
    useDiagnosticsStore
      .getState()
      .setListReportsDiagnostics(analyzeListActiveReportsResult(rawRows));
  }

  return mapRpcRowsToActiveReports(rawRows);
}

export async function createMinyanReport(
  params: CreateMinyanReportParams,
): Promise<ActiveMinyanReport> {
  assertSupabaseConfigured();

  const rpcName = 'create_minyan_report';
  const startedAt = Date.now();

  const { data, error } = await withTimeout(
    getSupabaseClient().rpc('create_minyan_report', {
      p_synagogue_osm_key: params.synagogueOsmKey,
      p_user_latitude: params.userLatitude,
      p_user_longitude: params.userLongitude,
      p_user_accuracy_meters: params.userAccuracyMeters,
      p_current_attendance: params.currentAttendance,
      p_user_location_captured_at: params.userLocationCapturedAt,
    }),
    MINYAN_RPC_TIMEOUT_MS,
  );

  const completedAt = Date.now();

  if (error) {
    recordRpcTrace(rpcName, startedAt, completedAt, false, error);
    logMinyanRpcDiagnostic(rpcName, error);
    throw error;
  }

  recordRpcTrace(rpcName, startedAt, completedAt, true);

  const report = mapRpcMutationResult(data as RpcPublicMinyanReport | null);
  if (!report) {
    throw new MinyanLiveServiceError('REPORT_EXPIRED');
  }

  return report;
}

export async function updateMinyanReport(
  params: UpdateMinyanReportParams,
): Promise<ActiveMinyanReport | null> {
  assertSupabaseConfigured();

  const rpcName = 'update_minyan_report';
  const startedAt = Date.now();

  const { data, error } = await withTimeout(
    getSupabaseClient().rpc('update_minyan_report', {
      p_report_id: params.reportId,
      p_user_latitude: params.userLatitude,
      p_user_longitude: params.userLongitude,
      p_user_accuracy_meters: params.userAccuracyMeters,
      p_current_attendance: params.currentAttendance,
      p_user_location_captured_at: params.userLocationCapturedAt,
    }),
    MINYAN_RPC_TIMEOUT_MS,
  );

  const completedAt = Date.now();

  if (error) {
    recordRpcTrace(rpcName, startedAt, completedAt, false, error);
    logMinyanRpcDiagnostic(rpcName, error);
    throw error;
  }

  recordRpcTrace(rpcName, startedAt, completedAt, true);

  return mapRpcMutationResult(data as RpcPublicMinyanReport | null);
}

export async function fulfillMinyanReport(
  params: FulfillMinyanReportParams,
): Promise<ActiveMinyanReport | null> {
  assertSupabaseConfigured();

  const rpcName = 'fulfill_minyan_report';
  const startedAt = Date.now();

  const { data, error } = await withTimeout(
    getSupabaseClient().rpc('fulfill_minyan_report', {
      p_report_id: params.reportId,
      p_user_latitude: params.userLatitude,
      p_user_longitude: params.userLongitude,
      p_user_accuracy_meters: params.userAccuracyMeters,
      p_user_location_captured_at: params.userLocationCapturedAt,
    }),
    MINYAN_RPC_TIMEOUT_MS,
  );

  const completedAt = Date.now();

  if (error) {
    recordRpcTrace(rpcName, startedAt, completedAt, false, error);
    logMinyanRpcDiagnostic(rpcName, error);
    throw error;
  }

  recordRpcTrace(rpcName, startedAt, completedAt, true);

  return mapRpcRowsToActiveReports([data as RpcPublicMinyanReport])[0] ?? null;
}

export function buildMinyanLocationPayload(location: UserLocation): {
  userLatitude: number;
  userLongitude: number;
  userAccuracyMeters: number;
  userLocationCapturedAt: string;
} {
  validateMinyanSubmitLocation(location);

  return {
    userLatitude: location.coordinates.latitude,
    userLongitude: location.coordinates.longitude,
    userAccuracyMeters: location.accuracy ?? MINYAN_MAX_GPS_ACCURACY_METERS,
    userLocationCapturedAt: toLocationCapturedAt(location),
  };
}
