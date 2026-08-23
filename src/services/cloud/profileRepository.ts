import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';
import type { CloudProfile } from '@/services/cloud/types';
import { withTimeout } from '@/services/cloud/withTimeout';

export async function fetchProfile(userId: string): Promise<CloudProfile | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await withTimeout(
    getSupabaseClient()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(),
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertProfile(
  profile: Omit<CloudProfile, 'created_at' | 'updated_at'>,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const { error } = await withTimeout(
    getSupabaseClient()
      .from('profiles')
      .upsert([profile], { onConflict: 'id' }),
  );

  if (error) {
    throw error;
  }
}
