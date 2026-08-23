import { SYNC_TIMEOUT_MS } from '@/services/cloud/types';

export function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs = SYNC_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Cloud request timed out'));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
