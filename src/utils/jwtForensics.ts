export interface JwtTimingClaims {
  iat: number | null;
  nbf: number | null;
  exp: number | null;
}

export interface JwtForensicSnapshot {
  clientTimeMs: number;
  clientTimeSec: number;
  claims: JwtTimingClaims;
  serverTimeSec: number | null;
  iatMinusServerSec: number | null;
}

function decodeBase64UrlToUtf8(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let index = 0; index < padded.length; index += 4) {
    const enc1 = alphabet.indexOf(padded[index] ?? '');
    const enc2 = alphabet.indexOf(padded[index + 1] ?? '');
    const enc3 = alphabet.indexOf(padded[index + 2] ?? '');
    const enc4 = alphabet.indexOf(padded[index + 3] ?? '');

    if (enc1 < 0 || enc2 < 0) {
      break;
    }

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    output += String.fromCharCode(chr1);

    if (enc3 >= 0 && padded[index + 2] !== '=') {
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      output += String.fromCharCode(chr2);
    }

    if (enc4 >= 0 && padded[index + 3] !== '=') {
      const chr3 = ((enc3 & 3) << 6) | enc4;
      output += String.fromCharCode(chr3);
    }
  }

  return output;
}

/** Decode only iat/nbf/exp from a JWT payload — never log the token itself. */
export function decodeJwtTimingClaims(accessToken: string): JwtTimingClaims | null {
  const parts = accessToken.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const json = decodeBase64UrlToUtf8(parts[1]);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    return {
      iat: typeof parsed.iat === 'number' ? parsed.iat : null,
      nbf: typeof parsed.nbf === 'number' ? parsed.nbf : null,
      exp: typeof parsed.exp === 'number' ? parsed.exp : null,
    };
  } catch {
    return null;
  }
}

function parseHttpDateHeader(dateHeader: string | null): number | null {
  if (!dateHeader) {
    return null;
  }

  const parsed = Date.parse(dateHeader);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.floor(parsed / 1000);
}

/** Fetch Supabase server time from the Date response header (seconds since epoch). */
export async function fetchSupabaseServerTimeSec(
  supabaseUrl: string,
  anonKey: string,
): Promise<number | null> {
  const baseUrl = supabaseUrl.replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/auth/v1/health`, {
    method: 'GET',
    headers: { apikey: anonKey },
  });

  return parseHttpDateHeader(response.headers.get('date'));
}

/**
 * PostgREST clock used for PGRST303 — prefer over auth health when validating JWT iat.
 */
export async function fetchPostgrestServerTimeSec(
  supabaseUrl: string,
  anonKey: string,
): Promise<number | null> {
  const baseUrl = supabaseUrl.replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/rest/v1/`, {
    method: 'HEAD',
    headers: { apikey: anonKey },
  });

  const restDate = parseHttpDateHeader(response.headers.get('date'));
  if (restDate !== null) {
    return restDate;
  }

  return fetchSupabaseServerTimeSec(supabaseUrl, anonKey);
}

/** True when JWT iat is ahead of the API server clock (PGRST303 precursor). */
export function isJwtIatAheadOfServer(
  accessToken: string,
  serverTimeSec: number | null,
  toleranceSec = 2,
): boolean {
  if (serverTimeSec === null) {
    return false;
  }

  const claims = decodeJwtTimingClaims(accessToken);
  if (claims?.iat === null || claims?.iat === undefined) {
    return false;
  }

  return claims.iat > serverTimeSec + toleranceSec;
}

export async function captureJwtForensicSnapshot(
  accessToken: string,
  supabaseUrl: string,
  anonKey: string,
): Promise<JwtForensicSnapshot> {
  const clientTimeMs = Date.now();
  const clientTimeSec = Math.floor(clientTimeMs / 1000);
  const claims = decodeJwtTimingClaims(accessToken) ?? {
    iat: null,
    nbf: null,
    exp: null,
  };
  const serverTimeSec = await fetchPostgrestServerTimeSec(supabaseUrl, anonKey);

  return {
    clientTimeMs,
    clientTimeSec,
    claims,
    serverTimeSec,
    iatMinusServerSec:
      claims.iat !== null && serverTimeSec !== null ? claims.iat - serverTimeSec : null,
  };
}

export function formatJwtForensicSnapshot(snapshot: JwtForensicSnapshot): string {
  return JSON.stringify({
    clientTimeMs: snapshot.clientTimeMs,
    clientTimeSec: snapshot.clientTimeSec,
    jwtIat: snapshot.claims.iat,
    jwtNbf: snapshot.claims.nbf,
    jwtExp: snapshot.claims.exp,
    serverDateSec: snapshot.serverTimeSec,
    iatMinusServerSec: snapshot.iatMinusServerSec,
  });
}

export function isPgrst303Error(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const record = error as { code?: string; message?: string };
  return (
    record.code === 'PGRST303' ||
    (typeof record.message === 'string' && record.message.includes('JWT issued at future'))
  );
}
