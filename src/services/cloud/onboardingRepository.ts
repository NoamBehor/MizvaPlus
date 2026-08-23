import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';
import type { CloudOnboardingState } from '@/services/cloud/types';
import { withTimeout } from '@/services/cloud/withTimeout';

export async function fetchOnboardingState(
  userId: string,
): Promise<CloudOnboardingState | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await withTimeout(
    getSupabaseClient()
      .from('onboarding_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertOnboardingState(
  userId: string,
  completed: boolean,
  completedAt: string | null,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const { error } = await withTimeout(
    getSupabaseClient()
      .from('onboarding_state')
      .upsert(
        [
          {
            user_id: userId,
            completed,
            completed_at: completedAt,
          },
        ],
        { onConflict: 'user_id' },
      ),
  );

  if (error) {
    throw error;
  }
}
