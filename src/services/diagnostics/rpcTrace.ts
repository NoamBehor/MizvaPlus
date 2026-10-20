import type { PostgrestError } from '@supabase/supabase-js';

import { extractRpcErrorFields } from './errorStages';
import { MAX_RPC_TRACE_ENTRIES } from './constants';
import type { RpcTraceEntry } from './types';

const rpcTraceHistory: RpcTraceEntry[] = [];

let nextRpcTraceSeq = 0;

function allocateRpcTraceId(): string {
  nextRpcTraceSeq += 1;
  return `rpc-trace-${nextRpcTraceSeq}`;
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as PostgrestError).message === 'string'
  );
}

export function recordRpcTrace(
  rpcName: string,
  startedAt: number,
  completedAt: number,
  success: boolean,
  error?: unknown,
): RpcTraceEntry {
  const durationMs = completedAt - startedAt;
  const fields = error ? extractRpcErrorFields(error) : null;

  const entry: RpcTraceEntry = {
    traceId: allocateRpcTraceId(),
    rpcName,
    startedAt,
    completedAt,
    durationMs,
    success,
    postgresCode: fields?.postgresCode ?? null,
    message: fields?.message ?? null,
    details: fields?.details ?? null,
    hint: fields?.hint ?? null,
    stage: success ? null : fields?.stage ?? null,
    minyanCode: success ? null : fields?.minyanCode ?? null,
  };

  if (__DEV__) {
    rpcTraceHistory.unshift(entry);
    if (rpcTraceHistory.length > MAX_RPC_TRACE_ENTRIES) {
      rpcTraceHistory.length = MAX_RPC_TRACE_ENTRIES;
    }
  }

  return entry;
}

export function getRpcTraceHistory(): RpcTraceEntry[] {
  return [...rpcTraceHistory];
}

export function clearRpcTraceHistory(): void {
  rpcTraceHistory.length = 0;
}

export function captureRpcTraceFromError(
  rpcName: string,
  startedAt: number,
  error: unknown,
): RpcTraceEntry {
  const completedAt = Date.now();
  return recordRpcTrace(rpcName, startedAt, completedAt, false, error);
}

export function isRpcTraceableError(error: unknown): boolean {
  return isPostgrestError(error) || error instanceof Error;
}
