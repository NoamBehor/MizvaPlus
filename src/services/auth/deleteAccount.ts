import { getCurrentSession } from '@/services/auth';
import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';

export async function deleteCurrentAccount(): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const session = await getCurrentSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error('Not signed in');
  }

  const { data, error } = await getSupabaseClient().functions.invoke<{ deleted?: boolean }>(
    'delete-account',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (error || data?.deleted !== true) {
    throw error ?? new Error('Account deletion failed');
  }
}
