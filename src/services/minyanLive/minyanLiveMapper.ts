import { MINYAN_REQUIRED_COUNT } from '@/constants/minyanLive';
import type {
  ActiveMinyanReport,
  RpcPublicMinyanReport,
  SynagogueWithMinyan,
} from '@/services/minyanLive/minyanLiveTypes';
import type { Synagogue } from '@/types/synagogue';

export function isRpcReportActive(
  report: RpcPublicMinyanReport,
  now: Date = new Date(),
): boolean {
  if (report.status !== 'ACTIVE') {
    return false;
  }

  const expiresAt = new Date(report.expires_at);
  return Number.isFinite(expiresAt.getTime()) && expiresAt > now;
}

export function mapRpcToActiveMinyanReport(
  report: RpcPublicMinyanReport,
  now: Date = new Date(),
): ActiveMinyanReport | null {
  if (!isRpcReportActive(report, now)) {
    return null;
  }

  return {
    id: report.id,
    synagogueOsmKey: report.synagogue_osm_key,
    currentAttendance: report.current_attendance,
    missingCount: report.missing_count,
    status: 'ACTIVE',
    createdAt: report.created_at,
    updatedAt: report.updated_at,
    expiresAt: report.expires_at,
    comingCount: Number(report.coming_count ?? 0),
  };
}

export function mapRpcRowsToActiveReports(
  rows: RpcPublicMinyanReport[] | null | undefined,
  now: Date = new Date(),
): ActiveMinyanReport[] {
  if (!rows || rows.length === 0) {
    return [];
  }

  const activeReports: ActiveMinyanReport[] = [];

  for (const row of rows) {
    const mapped = mapRpcToActiveMinyanReport(row, now);
    if (mapped) {
      activeReports.push(mapped);
    }
  }

  return activeReports;
}

export function mergeSynagoguesWithMinyan(
  synagogues: Synagogue[],
  reports: ActiveMinyanReport[],
): SynagogueWithMinyan[] {
  const reportsByOsmKey = new Map<string, ActiveMinyanReport>();

  for (const report of reports) {
    reportsByOsmKey.set(report.synagogueOsmKey, report);
  }

  return synagogues.map((synagogue) => ({
    ...synagogue,
    minyan: reportsByOsmKey.get(synagogue.id),
  }));
}

/** UX-only preview before server confirms missing count. */
export function previewMissingCount(currentAttendance: number): number {
  if (!Number.isInteger(currentAttendance)) {
    return MINYAN_REQUIRED_COUNT;
  }

  return Math.max(0, MINYAN_REQUIRED_COUNT - currentAttendance);
}

export function validateAttendanceInput(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MINYAN_REQUIRED_COUNT;
}
