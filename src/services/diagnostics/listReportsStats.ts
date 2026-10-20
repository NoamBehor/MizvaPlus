import { isRpcReportActive } from '@/services/minyanLive/minyanLiveMapper';
import type { RpcPublicMinyanReport } from '@/services/minyanLive/minyanLiveTypes';

import type { ListActiveReportsDiagnostics } from './types';

export function analyzeListActiveReportsResult(
  rows: RpcPublicMinyanReport[] | null | undefined,
  now: Date = new Date(),
): ListActiveReportsDiagnostics {
  const returnedCount = rows?.length ?? 0;
  let expiredDiscardedCount = 0;
  let invalidOsmKeyCount = 0;
  let mergedCount = 0;

  if (rows) {
    for (const row of rows) {
      const osmKey = row.synagogue_osm_key;
      if (typeof osmKey !== 'string' || osmKey.trim().length === 0) {
        invalidOsmKeyCount += 1;
        continue;
      }

      if (!isRpcReportActive(row, now)) {
        expiredDiscardedCount += 1;
        continue;
      }

      mergedCount += 1;
    }
  }

  return {
    success: true,
    returnedCount,
    expiredDiscardedCount,
    invalidOsmKeyCount,
    mergedCount,
    errorMessage: null,
  };
}
