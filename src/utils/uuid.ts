const RFC_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Old client IDs from generateId(): `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` */
const LEGACY_CLIENT_ID_PATTERN = /^\d+-[a-z0-9]+$/i;

export function isRfcUuid(id: string): boolean {
  return RFC_UUID_PATTERN.test(id);
}

export function isLegacyClientId(id: string): boolean {
  return LEGACY_CLIENT_ID_PATTERN.test(id);
}

function fillRandomBytes(bytes: Uint8Array): void {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes as Uint8Array<ArrayBuffer>);
    return;
  }

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
}

/**
 * RFC 4122 UUID v4.
 *
 * Hermes / React Native in this Expo 57 project does not reliably expose
 * `crypto.randomUUID()`. Prefer it when present (Node, some web runtimes),
 * otherwise build v4 from `getRandomValues` or a byte fallback.
 */
export function generateUuidV4(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  const bytes = new Uint8Array(16);
  fillRandomBytes(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function assertCloudUuid(id: string, field: string): void {
  if (!isRfcUuid(id)) {
    throw new Error(`${field} must be an RFC UUID before reaching Supabase`);
  }
}

export function unionByKey<T>(
  stored: T[],
  memory: T[],
  getKey: (record: T) => string,
): T[] {
  const map = new Map<string, T>();
  for (const record of stored) {
    map.set(getKey(record), record);
  }
  for (const record of memory) {
    map.set(getKey(record), record);
  }
  return Array.from(map.values());
}

export function normalizeKeyedRecords<T extends { id: string }>(
  records: T[],
  getKey: (record: T) => string,
): { records: T[]; changed: boolean } {
  const byKey = new Map<string, T>();
  let changed = false;

  for (const record of records) {
    const key = getKey(record);
    const existing = byKey.get(key);

    if (existing) {
      changed = true;
      if (!isRfcUuid(existing.id) && isRfcUuid(record.id)) {
        byKey.set(key, record);
      }
      continue;
    }

    if (isRfcUuid(record.id)) {
      byKey.set(key, record);
      continue;
    }

    byKey.set(key, { ...record, id: generateUuidV4() });
    changed = true;
  }

  return { records: Array.from(byKey.values()), changed };
}

export function migrateCompletions<
  T extends { id: string; mitzvahId: string; completionDate: string },
>(records: T[]): { records: T[]; changed: boolean } {
  return normalizeKeyedRecords(
    records,
    (record) => `${record.mitzvahId}:${record.completionDate}`,
  );
}

export function migrateQuizAttempts<
  T extends { id: string; dateKey: string; questionId: string },
>(records: T[]): { records: T[]; changed: boolean } {
  return normalizeKeyedRecords(
    records,
    (record) => `${record.dateKey}:${record.questionId}`,
  );
}
