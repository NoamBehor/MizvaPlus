import type { MitzvahCompletion } from '@/types/mitzvah';
import type { DailyQuizAttempt } from '@/types/quiz';
import {
  migrateCompletions,
  migrateQuizAttempts,
  unionByKey,
} from '@/utils/uuid';
import {
  completionsStorageKey,
  getJson,
  quizAttemptsStorageKey,
  setJson,
} from '@/utils/storage';

export async function migratePersistedUuidRecords(
  userId: string,
  inMemory?: {
    completions?: MitzvahCompletion[];
    quizAttempts?: DailyQuizAttempt[];
  },
): Promise<{
  completions: MitzvahCompletion[];
  quizAttempts: DailyQuizAttempt[];
  changed: boolean;
}> {
  const storedCompletions =
    (await getJson<MitzvahCompletion[]>(completionsStorageKey(userId))) ?? [];
  const storedAttempts =
    (await getJson<DailyQuizAttempt[]>(quizAttemptsStorageKey(userId))) ?? [];

  const completionSource = unionByKey(
    storedCompletions,
    inMemory?.completions ?? [],
    (record) => `${record.mitzvahId}:${record.completionDate}`,
  );
  const quizSource = unionByKey(
    storedAttempts,
    inMemory?.quizAttempts ?? [],
    (record) => `${record.dateKey}:${record.questionId}`,
  );

  const completions = migrateCompletions(completionSource);
  const quizAttempts = migrateQuizAttempts(quizSource);
  const completionsChanged =
    completions.changed || completionSource.length !== storedCompletions.length;
  const quizChanged =
    quizAttempts.changed || quizSource.length !== storedAttempts.length;
  const changed = completionsChanged || quizChanged;

  if (completionsChanged) {
    await setJson(completionsStorageKey(userId), completions.records);
  }

  if (quizChanged) {
    await setJson(quizAttemptsStorageKey(userId), quizAttempts.records);
  }

  return {
    completions: completions.records,
    quizAttempts: quizAttempts.records,
    changed,
  };
}
