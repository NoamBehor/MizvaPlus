import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';
import type { CloudMitzvahCompletion, CloudMitzvahPreference } from '@/services/cloud/types';
import { withTimeout } from '@/services/cloud/withTimeout';

export async function fetchPreferences(
  userId: string,
): Promise<CloudMitzvahPreference[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await withTimeout(
    getSupabaseClient()
      .from('mitzvah_preferences')
      .select('*')
      .eq('user_id', userId),
  );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function upsertPreferences(
  rows: CloudMitzvahPreference[],
): Promise<void> {
  if (!isSupabaseConfigured() || rows.length === 0) {
    return;
  }

  const payload = rows.map((row) => ({
    user_id: row.user_id,
    mitzvah_id: row.mitzvah_id,
    enabled: row.enabled,
    reminder_enabled: row.reminder_enabled,
    reminder_hour: row.reminder_hour,
    reminder_minute: row.reminder_minute,
    updated_at: row.updated_at,
  }));

  const { error } = await withTimeout(
    getSupabaseClient()
      .from('mitzvah_preferences')
      .upsert(payload, { onConflict: 'user_id,mitzvah_id' }),
  );

  if (error) {
    throw error;
  }
}

export async function fetchCompletions(
  userId: string,
): Promise<CloudMitzvahCompletion[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await withTimeout(
    getSupabaseClient()
      .from('mitzvah_completions')
      .select('*')
      .eq('user_id', userId),
  );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function upsertCompletions(
  rows: CloudMitzvahCompletion[],
): Promise<void> {
  if (!isSupabaseConfigured() || rows.length === 0) {
    return;
  }

  const payload = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    mitzvah_id: row.mitzvah_id,
    activity_date: row.activity_date,
    completed_at: row.completed_at,
    xp_awarded: row.xp_awarded,
  }));

  const { error } = await withTimeout(
    getSupabaseClient()
      .from('mitzvah_completions')
      .upsert(payload, { onConflict: 'user_id,mitzvah_id,activity_date' }),
  );

  if (error) {
    throw error;
  }
}
