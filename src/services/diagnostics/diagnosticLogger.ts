import { MAX_DIAGNOSTIC_LOG_ENTRIES } from './constants';
import type { DiagnosticCategory, DiagnosticLogEntry, DiagnosticSeverity } from './types';

const eventLog: DiagnosticLogEntry[] = [];

const SENSITIVE_KEY_PATTERN =
  /token|password|secret|authorization|bearer|refresh|access.?key|service.?role|anon.?key/i;

function sanitizePayload(
  payload?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!payload) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue;
    }
    if (typeof value === 'string' && value.length > 500) {
      sanitized[key] = `${value.slice(0, 500)}…`;
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

export function logDiagnosticEvent(
  category: DiagnosticCategory,
  eventName: string,
  severity: DiagnosticSeverity = 'info',
  payload?: Record<string, unknown>,
): void {
  if (!__DEV__) {
    return;
  }

  const entry: DiagnosticLogEntry = {
    timestamp: Date.now(),
    category,
    eventName,
    severity,
    payload: sanitizePayload(payload),
  };

  eventLog.unshift(entry);
  if (eventLog.length > MAX_DIAGNOSTIC_LOG_ENTRIES) {
    eventLog.length = MAX_DIAGNOSTIC_LOG_ENTRIES;
  }

  const prefix = `[${category}][${severity.toUpperCase()}]`;
  if (severity === 'error') {
    console.error(prefix, eventName, entry.payload ?? '');
  } else if (severity === 'warn') {
    console.warn(prefix, eventName, entry.payload ?? '');
  } else {
    console.log(prefix, eventName, entry.payload ?? '');
  }
}

export function getDiagnosticEventLog(): DiagnosticLogEntry[] {
  return [...eventLog];
}

export function clearDiagnosticEventLog(): void {
  eventLog.length = 0;
}
