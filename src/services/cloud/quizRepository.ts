import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';
import type { CloudQuizAttempt } from '@/services/cloud/types';
import { withTimeout } from '@/services/cloud/withTimeout';
import { assertCloudUuid } from '@/utils/uuid';

export async function fetchQuizAttempts(userId: string): Promise<CloudQuizAttempt[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await withTimeout(
    getSupabaseClient()
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId),
  );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function upsertQuizAttempts(rows: CloudQuizAttempt[]): Promise<void> {
  if (!isSupabaseConfigured() || rows.length === 0) {
    return;
  }

  const payload = rows.map((row) => {
    assertCloudUuid(row.id, 'quiz_attempts.id');
    return {
      id: row.id,
      user_id: row.user_id,
      quiz_date: row.quiz_date,
      question_id: row.question_id,
      selected_option_id: row.selected_option_id,
      is_correct: row.is_correct,
      xp_awarded: row.xp_awarded,
      created_at: row.created_at,
    };
  });

  const { error } = await withTimeout(
    getSupabaseClient()
      .from('quiz_attempts')
      .upsert(payload, { onConflict: 'user_id,quiz_date,question_id' }),
  );

  if (error) {
    throw error;
  }
}
