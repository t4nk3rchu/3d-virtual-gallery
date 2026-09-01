/**
 * Service-account auth for private Drive. Signs an RS256 JWT with the SA private key,
 * exchanges it for a short-lived OAuth access token, and caches it in module scope.
 * No external libraries — WebCrypto only.
 */
import { base64url } from './jwt';
import type { Env } from './types';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

let cachedToken: string | null = null;
let cachedExpiry = 0; // epoch ms; 0 = none

/** Strip PEM armor + newlines and base64-decode to DER bytes. */
export function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/\\r/g, '')
    .replace(/\\n/g, '') // literal backslash-n from a secret pasted with escaped newlines
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function importRsaKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

export async function buildServiceAccountAssertion(
  clientEmail: string,
  privateKeyPem: string,
  nowSec: number
): Promise<string> {
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claim = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: clientEmail,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat: nowSec,
        exp: nowSec + 3600,
      })
    )
  );
  const message = `${header}.${claim}`;
  const key = await importRsaKey(privateKeyPem);
  const sig = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(message));
  return `${message}.${base64url(sig)}`;
}

export async function getDriveAccessToken(env: Env): Promise<string> {
  if (cachedToken && Date.now() < cachedExpiry) return cachedToken;

  const nowSec = Math.floor(Date.now() / 1000);
  const assertion = await buildServiceAccountAssertion(
    env.GDRIVE_SA_CLIENT_EMAIL,
    env.GDRIVE_SA_PRIVATE_KEY,
    nowSec
  );

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`SA token exchange failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  cachedExpiry = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
  return cachedToken;
}
