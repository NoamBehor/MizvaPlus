import type { PostgrestError } from '@supabase/supabase-js';

import { LocationServiceError } from '@/services/location';
import type {
  MinyanLiveErrorCode,
  MinyanMutationKind,
} from '@/services/minyanLive/minyanLiveTypes';

const HEBREW_MESSAGES: Record<MinyanLiveErrorCode, string> = {
  NOT_AUTHENTICATED: 'יש להתחבר כדי לדווח על מניין.',
  INVALID_SYNAGOGUE_KEY: 'בית הכנסת שנבחר אינו תקין.',
  INVALID_COORDINATES: 'לא התקבל מיקום תקין מהמכשיר.',
  LOCATION_ACCURACY_INSUFFICIENT:
    'נדרש מיקום מדויק יותר כדי לדווח על המניין.',
  LOCATION_STALE: 'המיקום שקיבלנו אינו עדכני. נסו שוב.',
  GEOFENCE_VIOLATION: 'אתה נמצא רחוק מדי מבית הכנסת כדי לדווח עליו.',
  INVALID_ATTENDANCE: 'מספר הנוכחים חייב להיות בין 0 ל-10.',
  ANCHOR_NOT_FOUND:
    'בית הכנסת עדיין לא זמין לדיווח מניין. נסו שוב מאוחר יותר.',
  REPORT_NOT_FOUND: 'הדיווח על המניין לא נמצא.',
  NOT_REPORT_OWNER: 'רק מי שפתח את הדיווח יכול לעדכן אותו.',
  REPORT_EXPIRED: 'הדיווח על המניין כבר פג או נסגר.',
  RATE_LIMITED: 'בוצעו יותר מדי פעולות. נסו שוב בעוד כמה דקות.',
  NETWORK_ERROR: 'אין חיבור לרשת. בדקו את החיבור ונסו שוב.',
  SUPABASE_NOT_CONFIGURED: 'השירות אינו זמין כרגע.',
  UNKNOWN: 'לא הצלחנו לבצע את הפעולה. נסו שוב.',
};

export class MinyanLiveServiceError extends Error {
  readonly code: MinyanLiveErrorCode;

  constructor(code: MinyanLiveErrorCode) {
    super(code);
    this.name = 'MinyanLiveServiceError';
    this.code = code;
  }
}

export function getMinyanLiveHebrewMessage(
  code: MinyanLiveErrorCode,
  mutationKind?: MinyanMutationKind,
): string {
  if (code === 'GEOFENCE_VIOLATION') {
    if (mutationKind === 'update') {
      return 'צריך להיות קרוב יותר לבית הכנסת כדי לעדכן את המניין.';
    }
    if (mutationKind === 'fulfill') {
      return 'צריך להיות קרוב יותר לבית הכנסת כדי לסמן הגעה.';
    }
  }

  return HEBREW_MESSAGES[code];
}

export function mapLocationErrorToMinyanMessage(error: LocationServiceError): string {
  switch (error.code) {
    case 'permission_denied':
      return 'כדי לדווח על מניין נדרש אישור מיקום.';
    case 'services_disabled':
      return 'יש להפעיל שירותי מיקום במכשיר כדי לדווח על מניין.';
    case 'timeout':
      return 'איתור המיקום ארך זמן רב מדי. נסו שוב.';
    case 'location_unavailable':
    default:
      return 'לא ניתן לאתר את המיקום כרגע. נסו שוב.';
  }
}

function buildPostgrestErrorHaystack(error: PostgrestError): string {
  return [error.details, error.message, error.hint, error.code]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ');
}

export function mapPostgrestErrorToMinyanCode(error: PostgrestError): MinyanLiveErrorCode {
  const haystack = buildPostgrestErrorHaystack(error);

  for (const code of KNOWN_MINYAN_ERROR_CODES) {
    if (haystack.includes(code)) {
      return code;
    }
  }

  const message = error.message.toLowerCase();
  if (message.includes('fetch') || message.includes('network')) {
    return 'NETWORK_ERROR';
  }

  return 'UNKNOWN';
}

export function mapUnknownErrorToMinyanCode(error: unknown): MinyanLiveErrorCode {
  if (error instanceof MinyanLiveServiceError) {
    return error.code;
  }

  if (error instanceof LocationServiceError) {
    return 'LOCATION_ACCURACY_INSUFFICIENT';
  }

  if (error instanceof Error) {
    if (isMinyanLiveErrorCode(error.message)) {
      return error.message;
    }

    const message = error.message.toLowerCase();
    if (message.includes('timed out') || message.includes('timeout')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('network')) {
      return 'NETWORK_ERROR';
    }

    for (const code of KNOWN_MINYAN_ERROR_CODES) {
      if (message.includes(code.toLowerCase())) {
        return code;
      }
    }
  }

  return 'UNKNOWN';
}

export function toUserFacingMinyanError(
  error: unknown,
  mutationKind?: MinyanMutationKind,
): {
  code: MinyanLiveErrorCode;
  message: string;
} {
  if (error instanceof LocationServiceError) {
    return {
      code:
        error.code === 'permission_denied'
          ? 'NOT_AUTHENTICATED'
          : 'LOCATION_ACCURACY_INSUFFICIENT',
      message: mapLocationErrorToMinyanMessage(error),
    };
  }

  if (isPostgrestError(error)) {
    const code = mapPostgrestErrorToMinyanCode(error);
    return { code, message: getMinyanLiveHebrewMessage(code, mutationKind) };
  }

  const code = mapUnknownErrorToMinyanCode(error);
  return { code, message: getMinyanLiveHebrewMessage(code, mutationKind) };
}

const KNOWN_MINYAN_ERROR_CODES: MinyanLiveErrorCode[] = [
  'NOT_AUTHENTICATED',
  'INVALID_SYNAGOGUE_KEY',
  'INVALID_COORDINATES',
  'LOCATION_ACCURACY_INSUFFICIENT',
  'LOCATION_STALE',
  'GEOFENCE_VIOLATION',
  'INVALID_ATTENDANCE',
  'ANCHOR_NOT_FOUND',
  'REPORT_NOT_FOUND',
  'NOT_REPORT_OWNER',
  'REPORT_EXPIRED',
  'RATE_LIMITED',
];

/** Domain rejections that are expected during normal Minyan Live flows. */
export const EXPECTED_MINYAN_REJECTION_CODES = new Set<MinyanLiveErrorCode>([
  'GEOFENCE_VIOLATION',
  'LOCATION_ACCURACY_INSUFFICIENT',
  'LOCATION_STALE',
  'ANCHOR_NOT_FOUND',
  'RATE_LIMITED',
  'REPORT_EXPIRED',
  'REPORT_NOT_FOUND',
  'NOT_REPORT_OWNER',
  'INVALID_ATTENDANCE',
  'NOT_AUTHENTICATED',
]);

export function isExpectedMinyanRejection(code: MinyanLiveErrorCode): boolean {
  return EXPECTED_MINYAN_REJECTION_CODES.has(code);
}

function isMinyanLiveErrorCode(value: string): value is MinyanLiveErrorCode {
  return KNOWN_MINYAN_ERROR_CODES.includes(value as MinyanLiveErrorCode);
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as PostgrestError).message === 'string'
  );
}
