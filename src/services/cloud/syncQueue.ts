import { getJson, removeKey, setJson } from '@/utils/storage';

const SYNC_PENDING_PREFIX = '@mitzvahapp/sync_pending';
const SYNC_QUEUE_PREFIX = '@mitzvahapp/sync_queue';

export type SyncQueueOperation =
  | { type: 'full_sync'; enqueuedAt: string }
  | { type: 'push_profile'; enqueuedAt: string }
  | { type: 'push_preferences'; enqueuedAt: string }
  | { type: 'push_completions'; enqueuedAt: string }
  | { type: 'push_quiz'; enqueuedAt: string }
  | { type: 'push_badges'; enqueuedAt: string }
  | { type: 'push_onboarding'; enqueuedAt: string };

function pendingKey(userId: string): string {
  return `${SYNC_PENDING_PREFIX}:${userId}`;
}

function queueKey(userId: string): string {
  return `${SYNC_QUEUE_PREFIX}:${userId}`;
}

export async function isSyncPending(userId: string): Promise<boolean> {
  return (await getJson<boolean>(pendingKey(userId))) ?? false;
}

export async function markSyncPending(userId: string): Promise<void> {
  await setJson(pendingKey(userId), true);
}

export async function clearSyncPending(userId: string): Promise<void> {
  await removeKey(pendingKey(userId));
}

export async function enqueueSync(
  userId: string,
  operation: SyncQueueOperation = {
    type: 'full_sync',
    enqueuedAt: new Date().toISOString(),
  },
): Promise<void> {
  const existing = (await getJson<SyncQueueOperation[]>(queueKey(userId))) ?? [];
  const hasFullSync = existing.some((op) => op.type === 'full_sync');
  const next =
    operation.type === 'full_sync' || hasFullSync
      ? [{ type: 'full_sync' as const, enqueuedAt: new Date().toISOString() }]
      : [...existing, operation];

  await setJson(queueKey(userId), next);
  await markSyncPending(userId);
}

export async function dequeueSync(userId: string): Promise<SyncQueueOperation | null> {
  const existing = (await getJson<SyncQueueOperation[]>(queueKey(userId))) ?? [];
  if (existing.length === 0) {
    return null;
  }

  const [next, ...rest] = existing;
  if (rest.length === 0) {
    await removeKey(queueKey(userId));
  } else {
    await setJson(queueKey(userId), rest);
  }

  return next;
}

export async function peekSyncQueue(userId: string): Promise<SyncQueueOperation[]> {
  return (await getJson<SyncQueueOperation[]>(queueKey(userId))) ?? [];
}

export async function clearSyncQueue(userId: string): Promise<void> {
  await removeKey(queueKey(userId));
  await clearSyncPending(userId);
}
