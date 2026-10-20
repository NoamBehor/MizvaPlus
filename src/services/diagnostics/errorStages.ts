import type { PostgrestError } from '@supabase/supabase-js';

import { LocationServiceError } from '@/services/location';
import {
  isExpectedMinyanRejection,
  mapPostgrestErrorToMinyanCode,
  MinyanLiveServiceError,
  mapUnknownErrorToMinyanCode,
  toUserFacingMinyanError,
} from '@/services/minyanLive/minyanLiveErrors';
import type { MinyanLiveErrorCode } from '@/services/minyanLive/minyanLiveTypes';

import { logDiagnosticEvent } from './diagnosticLogger';
import type {
  DiagnosticSeverity,
  MinyanErrorPresentation,
  MinyanErrorStage,
} from './types';

export function classifyMinyanErrorStage(
  minyanCode: MinyanLiveErrorCode,
  postgresCode?: string | null,
): MinyanErrorStage {
  switch (minyanCode) {
    case 'NOT_AUTHENTICATED':
      return 'AUTH';
    case 'INVALID_COORDINATES':
    case 'LOCATION_ACCURACY_INSUFFICIENT':
    case 'LOCATION_STALE':
      return 'LOCATION';
    case 'ANCHOR_NOT_FOUND':
      return 'ANCHOR_LOOKUP';
    case 'GEOFENCE_VIOLATION':
      return 'GEOFENCE';
    case 'INVALID_ATTENDANCE':
      return 'ATTENDANCE_VALIDATION';
    case 'REPORT_NOT_FOUND':
    case 'NOT_REPORT_OWNER':
    case 'REPORT_EXPIRED':
    case 'INVALID_SYNAGOGUE_KEY':
      return 'ACTIVE_REPORT_CONFLICT';
    case 'RATE_LIMITED':
      return 'RATE_LIMIT';
    default:
      if (postgresCode && postgresCode !== 'P0001') {
        return 'RPC_RESULT';
      }
      return 'UNKNOWN';
  }
}

function extractPostgresFields(error: PostgrestError): {
  postgresCode: string | null;
  message: string | null;
  details: string | null;
  hint: string | null;
} {
  return {
    postgresCode: typeof error.code === 'string' ? error.code : null,
    message: typeof error.message === 'string' ? error.message : null,
    details: typeof error.details === 'string' ? error.details : null,
    hint: typeof error.hint === 'string' ? error.hint : null,
  };
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as PostgrestError).message === 'string'
  );
}

export function buildMinyanErrorPresentation(
  error: unknown,
  rpcName: string | null,
): MinyanErrorPresentation {
  const facing = toUserFacingMinyanError(error);

  if (isPostgrestError(error)) {
    const fields = extractPostgresFields(error);
    return {
      userMessage: facing.message,
      rpcName,
      postgresCode: fields.postgresCode,
      details: fields.details ?? fields.hint,
      stage: classifyMinyanErrorStage(facing.code, fields.postgresCode),
      minyanCode: facing.code,
    };
  }

  const minyanCode =
    facing.code !== 'UNKNOWN'
      ? facing.code
      : mapUnknownErrorToMinyanCode(error);

  return {
    userMessage: facing.message,
    rpcName,
    postgresCode: null,
    details: error instanceof Error ? error.message : null,
    stage: classifyMinyanErrorStage(minyanCode),
    minyanCode,
  };
}

export function classifyMinyanErrorSeverity(error: unknown): DiagnosticSeverity {
  if (error instanceof LocationServiceError) {
    return 'warn';
  }

  if (error instanceof MinyanLiveServiceError) {
    return isExpectedMinyanRejection(error.code) ? 'warn' : 'error';
  }

  const { minyanCode } = extractRpcErrorFields(error);
  if (minyanCode && isExpectedMinyanRejection(minyanCode)) {
    return 'warn';
  }

  return 'error';
}

export function logMinyanRpcDiagnostic(rpcName: string, error: unknown): void {
  const severity = classifyMinyanErrorSeverity(error);
  const presentation = buildMinyanErrorPresentation(error, rpcName);
  const payload: Record<string, unknown> = {
    stage: presentation.stage,
    details: presentation.details,
  };

  if (isPostgrestError(error)) {
    payload.code = error.code;
  } else if (presentation.minyanCode) {
    payload.code = presentation.minyanCode;
  }

  logDiagnosticEvent('MINYAN', rpcName, severity, payload);
}

export function extractRpcErrorFields(error: unknown): {
  postgresCode: string | null;
  message: string | null;
  details: string | null;
  hint: string | null;
  minyanCode: MinyanLiveErrorCode | null;
  stage: MinyanErrorStage | null;
} {
  if (!isPostgrestError(error)) {
    const minyanCode = mapUnknownErrorToMinyanCode(error);
    return {
      postgresCode: null,
      message: error instanceof Error ? error.message : null,
      details: null,
      hint: null,
      minyanCode,
      stage: classifyMinyanErrorStage(minyanCode),
    };
  }

  const fields = extractPostgresFields(error);
  const minyanCode = mapPostgrestErrorToMinyanCode(error);
  return {
    ...fields,
    minyanCode,
    stage: classifyMinyanErrorStage(minyanCode, fields.postgresCode),
  };
}
