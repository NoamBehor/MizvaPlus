import type { Synagogue } from '@/types/synagogue';

/** Server `public.public_minyan_report.status` values. */
export type MinyanReportStatus = 'ACTIVE' | 'FULFILLED' | 'EXPIRED';

/** Raw RPC row shape returned by Minyan Live RPCs. */
export interface RpcPublicMinyanReport {
  id: string;
  synagogue_osm_key: string;
  current_attendance: number;
  missing_count: number;
  status: MinyanReportStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
  coming_count: number;
}

/** Client-facing active minyan overlay merged onto synagogue map data. */
export interface ActiveMinyanReport {
  id: string;
  synagogueOsmKey: string;
  currentAttendance: number;
  missingCount: number;
  status: 'ACTIVE';
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  comingCount: number;
}

export type SynagogueWithMinyan = Synagogue & {
  minyan?: ActiveMinyanReport;
};

export interface CreateMinyanReportParams {
  synagogueOsmKey: string;
  userLatitude: number;
  userLongitude: number;
  userAccuracyMeters: number;
  currentAttendance: number;
  userLocationCapturedAt: string;
}

export interface UpdateMinyanReportParams {
  reportId: string;
  userLatitude: number;
  userLongitude: number;
  userAccuracyMeters: number;
  currentAttendance: number;
  userLocationCapturedAt: string;
}

export interface FulfillMinyanReportParams {
  reportId: string;
  userLatitude: number;
  userLongitude: number;
  userAccuracyMeters: number;
  userLocationCapturedAt: string;
}

export type MinyanMutationKind = 'create' | 'update' | 'fulfill';

export interface MinyanMutationState {
  kind: MinyanMutationKind | null;
  synagogueOsmKey: string | null;
  isPending: boolean;
  error: string | null;
}

export type MinyanLiveErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'INVALID_SYNAGOGUE_KEY'
  | 'INVALID_COORDINATES'
  | 'LOCATION_ACCURACY_INSUFFICIENT'
  | 'LOCATION_STALE'
  | 'GEOFENCE_VIOLATION'
  | 'INVALID_ATTENDANCE'
  | 'ANCHOR_NOT_FOUND'
  | 'REPORT_NOT_FOUND'
  | 'NOT_REPORT_OWNER'
  | 'REPORT_EXPIRED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'SUPABASE_NOT_CONFIGURED'
  | 'UNKNOWN';
