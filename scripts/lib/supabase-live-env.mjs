/**
 * Shared helpers for live Supabase verification scripts.
 * Never logs secret values or JWT strings.
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const projectRoot = join(__dirname, '..', '..');

export function readProjectFile(path) {
  return readFileSync(join(projectRoot, path), 'utf8');
}

export function loadEnvFile() {
  const envPath = join(projectRoot, '.env');
  if (!existsSync(envPath)) {
    return {};
  }

  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

/** Surfaces DNS / TLS causes without logging secrets (e.g. ENOTFOUND). */
export function formatNetworkError(error) {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause = error.cause;
  if (cause && typeof cause === 'object' && 'code' in cause && cause.code) {
    return `${error.message} (${String(cause.code)})`;
  }
  if (cause instanceof Error && cause.message) {
    return `${error.message} (${cause.message})`;
  }
  return error.message;
}

export function resolveEnv() {
  const fileEnv = loadEnvFile();
  return {
    supabaseUrl: normalizeSupabaseUrl(
      process.env.EXPO_PUBLIC_SUPABASE_URL ?? fileEnv.EXPO_PUBLIC_SUPABASE_URL ?? '',
    ),
    anonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? fileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    serviceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? fileEnv.SUPABASE_SERVICE_ROLE_KEY ?? '',
    databaseUrl:
      process.env.DATABASE_URL ??
      process.env.SUPABASE_DB_URL ??
      fileEnv.DATABASE_URL ??
      fileEnv.SUPABASE_DB_URL ??
      '',
    overpassUrl:
      process.env.EXPO_PUBLIC_OVERPASS_API_URL ??
      fileEnv.EXPO_PUBLIC_OVERPASS_API_URL ??
      'https://overpass-api.de/api/interpreter',
  };
}

export function normalizeSupabaseUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
  }
}

export function isValidSupabaseUrl(url) {
  try {
    const parsed = new URL(normalizeSupabaseUrl(url));
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

export function looksLikeSupabaseKey(value) {
  if (typeof value !== 'string' || value.length < 20) {
    return false;
  }
  return value.split('.').length === 3 || value.startsWith('sb_publishable_');
}

export function looksLikeServiceRoleKey(value) {
  if (typeof value !== 'string' || value.length < 20) {
    return false;
  }
  if (value.startsWith('sb_secret_')) {
    return true;
  }
  if (value.split('.').length !== 3) {
    return false;
  }
  try {
    const payload = value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return json.role === 'service_role';
  } catch {
    return false;
  }
}

export function createAnonClient(env) {
  return createClient(env.supabaseUrl, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAuthedClient(env) {
  return createClient(env.supabaseUrl, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: true },
  });
}

export function createServiceClient(env) {
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const MINYAN_ERROR_CODES = [
  'NOT_AUTHENTICATED',
  'FORBIDDEN',
  'INVALID_SYNAGOGUE_KEY',
  'INVALID_COORDINATES',
  'LOCATION_ACCURACY_INSUFFICIENT',
  'LOCATION_STALE',
  'GEOFENCE_VIOLATION',
  'INVALID_ATTENDANCE',
  'ANCHOR_NOT_FOUND',
  'REPORT_NOT_FOUND',
  'NOT_REPORT_OWNER',
  'REPORT_EXPIRED',
  'RATE_LIMITED',
];

export function extractMinyanErrorCode(error) {
  if (!error) {
    return null;
  }

  const haystack = [error.details, error.message, error.hint, error.code]
    .filter(Boolean)
    .join(' ');

  for (const code of MINYAN_ERROR_CODES) {
    if (haystack.includes(code)) {
      return code;
    }
  }

  return error.code ?? error.message ?? 'UNKNOWN';
}

export async function tableExists(client, table) {
  const { error } = await client.from(table).select('*', { head: true, count: 'exact' });
  if (!error) {
    return true;
  }

  const message = error.message.toLowerCase();
  if (message.includes('does not exist') || message.includes('42p01')) {
    return false;
  }

  return true;
}

export async function rpcExists(client, fnName, args = {}) {
  const { error } = await client.rpc(fnName, args);
  if (!error) {
    return true;
  }

  if (error.code === 'PGRST202') {
    return false;
  }

  return true;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
