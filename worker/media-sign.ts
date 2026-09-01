/**
 * Signed media-access tokens. Token = "<exp>.<base64url(HMAC-SHA256(key, `${fileId}.${exp}`))>".
 * exp is epoch seconds. The proxy verifies before serving; expiry makes leaked URLs die.
 */
import { base64url, base64urlDecode } from './jwt';
import type { ExhibitionDetail } from '../src/types/schema';

const ALGO = { name: 'HMAC', hash: 'SHA-256' };

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), ALGO, false, ['sign', 'verify']);
}

export async function signMediaToken(fileId: string, exp: number, key: string): Promise<string> {
  const k = await hmacKey(key);
  const sig = await crypto.subtle.sign(ALGO, k, new TextEncoder().encode(`${fileId}.${exp}`));
  return `${exp}.${base64url(sig)}`;
}

export async function verifyMediaToken(fileId: string, token: string, key: string): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const expStr = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;

  const k = await hmacKey(key);
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64urlDecode(sigB64);
  } catch {
    return false;
  }
  try {
    return await crypto.subtle.verify(ALGO, k, sigBytes, new TextEncoder().encode(`${fileId}.${exp}`));
  } catch {
    return false;
  }
}

export async function buildMediaTokens(
  fileIds: Array<string | null | undefined>,
  key: string,
  ttlSeconds = 21600
): Promise<Record<string, string>> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const unique = Array.from(new Set(fileIds.filter((f): f is string => !!f)));
  const out: Record<string, string> = {};
  for (const id of unique) out[id] = await signMediaToken(id, exp, key);
  return out;
}

/** Collect every proxied media fileId in an exhibition detail and sign them. */
export async function tokensForExhibition(
  detail: ExhibitionDetail,
  key: string
): Promise<Record<string, string>> {
  const ids: Array<string | null | undefined> = [
    detail.room?.glb_file_id,
    detail.intro_video_file_id,
  ];
  for (const a of detail.artworks ?? []) {
    ids.push(a.media_file_id, a.audio_guide_file_id);
    for (const h of a.hotspots ?? []) ids.push(h.audio_file_id);
  }
  for (const artist of detail.artists ?? []) ids.push(artist.portrait_file_id);
  return buildMediaTokens(ids, key);
}
