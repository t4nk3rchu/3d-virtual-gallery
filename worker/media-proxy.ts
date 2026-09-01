/**
 * Worker media proxy — serves private Drive files via service account auth.
 *
 * Security: every request must carry a short-lived signed token (?t=) issued
 * by the API alongside each exhibition payload. The token is HMAC-SHA256 over
 * fileId+exp with a server-only key. A referer/origin check provides best-effort
 * hotlink protection; the signed token is the real gate.
 *
 * Cache: explicit Cache API (ctx.waitUntil put); keyed on fileId+?v=. The ?t=
 * token is intentionally excluded from the cache key so the same underlying
 * bytes are shared across sessions. Range requests are sliced from the full
 * cached body (audio/video only; GLBs come as a single full GET).
 */

import { getDriveAccessToken } from './gdrive-auth';
import { verifyMediaToken } from './media-sign';
import type { Env } from './types';

const FILE_ID_RE = /^[a-zA-Z0-9_-]+$/;
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files/';

function cacheKey(fileId: string, version?: string): Request {
  const suffix = version ? `?v=${encodeURIComponent(version)}` : '';
  return new Request(`https://media/${fileId}${suffix}`);
}

async function fetchDriveAuthenticated(fileId: string, env: Env): Promise<Response> {
  const token = await getDriveAccessToken(env);
  const url = `${DRIVE_API_BASE}${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

/**
 * Hotlink guard: only enforced when APP_ORIGIN is configured.
 * Without it, the signed token is the sole gate — don't block legitimate
 * cross-origin requests from the frontend on a different port/domain.
 */
function isAllowedOrigin(req: Request, env: Env): boolean {
  if (!env.APP_ORIGIN) return true; // rely on token gate only

  const allowed = new Set<string>([
    env.APP_ORIGIN,
    `https://${new URL(req.url).host}`,
    `http://${new URL(req.url).host}`,
  ]);

  const origin = req.headers.get('Origin');
  if (origin) return allowed.has(origin);
  const referer = req.headers.get('Referer');
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  return true;
}

function inferContentType(headers: Headers, bodyBuffer?: ArrayBuffer): string {
  const existing = headers.get('Content-Type');
  if (
    existing &&
    existing !== 'application/octet-stream' &&
    existing !== 'binary/octet-stream' &&
    !existing.includes('text/html')
  ) {
    return existing;
  }

  const disposition = headers.get('Content-Disposition') ?? '';
  if (disposition.includes('.png')) return 'image/png';
  if (disposition.includes('.jpg') || disposition.includes('.jpeg')) return 'image/jpeg';
  if (disposition.includes('.webp')) return 'image/webp';
  if (disposition.includes('.gif')) return 'image/gif';
  if (disposition.includes('.svg')) return 'image/svg+xml';
  if (disposition.includes('.mp4')) return 'video/mp4';
  if (disposition.includes('.webm')) return 'video/webm';
  if (disposition.includes('.mov')) return 'video/quicktime';
  if (disposition.includes('.mp3')) return 'audio/mpeg';
  if (disposition.includes('.ogg')) return 'audio/ogg';
  if (disposition.includes('.wav')) return 'audio/wav';
  if (disposition.includes('.glb')) return 'model/gltf-binary';
  if (disposition.includes('.gltf')) return 'model/gltf+json';

  if (bodyBuffer && bodyBuffer.byteLength >= 8) {
    const bytes = new Uint8Array(bodyBuffer);
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png';
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bodyBuffer.byteLength >= 12 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) return 'image/webp';
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'video/mp4';
    if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) return 'video/webm';
    if (bytes[0] === 0x67 && bytes[1] === 0x6C && bytes[2] === 0x54 && bytes[3] === 0x46) return 'model/gltf-binary';
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return 'audio/mpeg';
  }

  return existing || 'application/octet-stream';
}

async function sliceRange(full: Response, rangeHeader: string): Promise<Response> {
  const totalBytes = parseInt(full.headers.get('Content-Length') ?? '0', 10);
  const body = await full.arrayBuffer();
  const total = body.byteLength || totalBytes;

  const m = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!m) return new Response('invalid Range', { status: 416 });

  const start = parseInt(m[1], 10);
  const end = m[2] ? parseInt(m[2], 10) : total - 1;

  if (start > end || start >= total) {
    return new Response('Range Not Satisfiable', {
      status: 416,
      headers: { 'Content-Range': `bytes */${total}` },
    });
  }

  const clampedEnd = Math.min(end, total - 1);
  const slice = body.slice(start, clampedEnd + 1);
  const contentType = inferContentType(full.headers, slice);

  return new Response(slice, {
    status: 206,
    headers: {
      'Content-Type': contentType,
      'Content-Range': `bytes ${start}-${clampedEnd}/${total}`,
      'Content-Length': String(clampedEnd - start + 1),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export async function handleMediaProxy(
  req: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
      },
    });
  }

  const url = new URL(req.url);
  const fileId = url.pathname.split('/').pop() ?? '';
  if (!fileId || !FILE_ID_RE.test(fileId)) {
    return new Response('Invalid file ID', { status: 400 });
  }

  // Hotlink guard (best-effort; the signed token below is the real gate)
  if (!isAllowedOrigin(req, env)) {
    return new Response('Forbidden origin', { status: 403 });
  }

  // Signed-token gate
  const token = url.searchParams.get('t') ?? '';
  if (!(await verifyMediaToken(fileId, token, env.MEDIA_SIGNING_KEY))) {
    return new Response('Invalid or expired media token', { status: 403 });
  }

  const version = url.searchParams.get('v') ?? undefined;
  const cache = caches.default;
  const key = cacheKey(fileId, version);

  let full = await cache.match(key);

  if (!full) {
    const upstream = await fetchDriveAuthenticated(fileId, env);

    if (!upstream.ok || upstream.status !== 200) {
      const detail = await upstream.text().catch(() => '');
      console.error(`Drive fetch failed for ${fileId}: ${upstream.status} ${detail.slice(0, 500)}`);
      return new Response(`Upstream error ${upstream.status}: ${detail.slice(0, 300)}`, { status: 502 });
    }

    const toCache = new Response(upstream.clone().body, upstream);
    const contentType = inferContentType(upstream.headers);
    toCache.headers.set('Content-Type', contentType);
    toCache.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    toCache.headers.set('Access-Control-Allow-Origin', '*');
    toCache.headers.set('Accept-Ranges', 'bytes');

    ctx.waitUntil(cache.put(key, toCache.clone()));

    full = toCache;
  }

  if (req.method === 'HEAD') {
    return withCors(new Response(null, { status: 200, headers: full.headers }));
  }

  const rangeHeader = req.headers.get('Range');
  if (rangeHeader) {
    return sliceRange(full, rangeHeader);
  }

  return withCors(full.clone());
}

export async function warmCache(
  fileId: string,
  env: Env,
  ctx: ExecutionContext,
  version?: string
): Promise<void> {
  if (!fileId || !FILE_ID_RE.test(fileId)) return;

  const cache = caches.default;
  const key = cacheKey(fileId, version);

  const existing = await cache.match(key);
  if (existing) return;

  const upstream = await fetchDriveAuthenticated(fileId, env);
  if (!upstream.ok || upstream.status !== 200) return;

  const toCache = new Response(upstream.body, upstream);
  toCache.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  toCache.headers.set('Access-Control-Allow-Origin', '*');

  ctx.waitUntil(cache.put(key, toCache));
}
