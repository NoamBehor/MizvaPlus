import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';
import type { CloudUserBadge } from '@/services/cloud/types';
import { withTimeout } from '@/services/cloud/withTimeout';

export async function fetchBadges(userId: string): Promise<CloudUserBadge[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await withTimeout(
    getSupabaseClient()
      .from('user_badges')
      .select('*')
      .eq('user_id', userId),
  );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function upsertBadges(rows: CloudUserBadge[]): Promise<void> {
  if (!isSupabaseConfigured() || rows.length === 0) {
    return;
  }

  const payload = rows.map((row) => ({
    user_id: row.user_id,
    badge_id: row.badge_id,
    unlocked_at: row.unlocked_at,
  }));

  const { error } = await withTimeout(
    getSupabaseClient()
      .from('user_badges')
      .upsert(payload, { onConflict: 'user_id,badge_id' }),
  );

  if (error) {
    throw error;
  }
}
