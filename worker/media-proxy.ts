/**
 * Task 1: Worker media proxy
 *
 * Fixes:
 *   Bug #1 — cache never populated (explicit caches.default.put via ctx.waitUntil)
 *   Bug #2 — Drive HTML interstitial cached as model (detect + re-fetch with confirm token)
 *   Bug #3 — Range requests mishandled (cache only 200; slice full body for 206)
 *
 * Spec §4.1 required behavior:
 *   1. Explicit Cache API usage
 *   2. Drive interstitial handling
 *   3. Range support (206 from cached full body, never cache 206)
 *   4. Cache-Control: immutable + CORS
 *   5. fileId validation
 *   6. warmCache for publish-time pre-warming
 */

const FILE_ID_RE = /^[a-zA-Z0-9_-]+$/;
const DRIVE_DOWNLOAD_BASE = 'https://drive.google.com/uc?export=download&id=';

// Range-agnostic cache key. Version (?v=) segments the key so a recreated room
// (new created_at) or edited artwork (new updated_at) never serves stale bytes,
// even when the Google Drive fileId is reused (overwrite-in-place). Spec §4.1.1.
function cacheKey(fileId: string, version?: string): Request {
  const suffix = version ? `?v=${encodeURIComponent(version)}` : '';
  return new Request(`https://media/${fileId}${suffix}`);
}

/**
 * Fetches the file from Google Drive, following the HTML virus-scan
 * interstitial if present (Bug #2).
 */
async function fetchDriveFollowingInterstitial(fileId: string): Promise<Response> {
  const url = `${DRIVE_DOWNLOAD_BASE}${fileId}`;
  const res = await fetch(url, { redirect: 'follow' });

  // Detect interstitial: Drive returns a text/html page with a confirm token
  // for files that exceed its automatic scan threshold.
  const ct = res.headers.get('Content-Type') ?? '';
  if (ct.includes('text/html')) {
    const html = await res.text();
    // The confirm token appears in a hidden input, form action, link or a query param like ?confirm=XXXX
    const tokenMatch =
      html.match(/[?&]confirm=([^&"']+)/) ??
      html.match(/name="confirm"\s+value="([^"]+)"/) ??
      html.match(/value="([^"]+)"\s+name="confirm"/) ??
      html.match(/confirm=([A-Za-z0-9_-]+)/);

    // Extract cookies to forward
    const setCookie = res.headers.get('set-cookie');
    const headers: Record<string, string> = {};
    if (setCookie) {
      headers['Cookie'] = setCookie.split(';')[0];
    }

    // Check for form action (e.g. drive.usercontent.google.com/download)
    const actionMatch = html.match(/<form[^>]+action="([^"]+)"/);
    let targetUrl = `${url}&confirm=${tokenMatch ? tokenMatch[1] : 't'}`;
    if (actionMatch && actionMatch[1]) {
      const action = actionMatch[1].replace(/&amp;/g, '&');
      if (action.startsWith('http')) {
        targetUrl = action;
        if (tokenMatch && !targetUrl.includes('confirm=')) {
          targetUrl += (targetUrl.includes('?') ? '&' : '?') + `confirm=${tokenMatch[1]}`;
        }
      }
    }

    if (tokenMatch || actionMatch) {
      const secondRes = await fetch(targetUrl, {
        headers,
        redirect: 'follow',
      });
      const secondCt = secondRes.headers.get('Content-Type') ?? '';
      if (secondCt.includes('text/html')) {
        return new Response('Drive interstitial resolved to HTML page instead of file', { status: 502 });
      }
      return secondRes;
    }
    // No token found — return a synthetic error so callers know not to cache
    return new Response('Drive interstitial with no confirm token', { status: 502 });
  }

  return res;
}

/**
 * Slices a byte range from a cached full Response.
 * Bug #3 fix: we always store the 200 full body; range slices come from it.
 */
async function sliceRange(full: Response, rangeHeader: string): Promise<Response> {
  const totalBytes = parseInt(full.headers.get('Content-Length') ?? '0', 10);
  const body = await full.arrayBuffer();
  const total = body.byteLength || totalBytes;

  // Parse "bytes=start-end"
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

  return new Response(slice, {
    status: 206,
    headers: {
      'Content-Type': full.headers.get('Content-Type') ?? 'application/octet-stream',
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

/**
 * Main proxy handler — called from the Worker router for GET /api/media/:fileId
 */
export async function handleMediaProxy(
  req: Request,
  ctx: ExecutionContext
): Promise<Response> {
  // OPTIONS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
      },
    });
  }

  // Validate fileId (Bug #1 prerequisite, spec §4.1 #5)
  const fileId = new URL(req.url).pathname.split('/').pop() ?? '';
  if (!fileId || !FILE_ID_RE.test(fileId)) {
    return new Response('Invalid file ID', { status: 400 });
  }

  const url = new URL(req.url);
  const version = url.searchParams.get('v') ?? undefined;
  const cache = caches.default;
  const key = cacheKey(fileId, version);

  // Bug #1 fix: explicit cache.match — setting Cache-Control alone does NOT cache
  let full = await cache.match(key);

  if (!full) {
    const upstream = await fetchDriveFollowingInterstitial(fileId);

    if (!upstream.ok || upstream.status !== 200) {
      // Bug #3 companion: never cache non-200 responses
      return new Response('Upstream error', { status: 502 });
    }

    // Clone before reading — body can only be consumed once
    const toCache = new Response(upstream.clone().body, upstream);
    toCache.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    toCache.headers.set('Access-Control-Allow-Origin', '*');

    // Bug #1 fix: actually write to the Cache API via ctx.waitUntil
    ctx.waitUntil(cache.put(key, toCache.clone()));

    full = toCache;
  }

  // Bug #3 fix: serve range slices from the full cached body
  const rangeHeader = req.headers.get('Range');
  if (rangeHeader) {
    return sliceRange(full, rangeHeader);
  }

  return withCors(full.clone());
}

/**
 * Pre-warm the edge cache for a file at publish time (spec §4.1 #6).
 * Called with ctx.waitUntil from the publish route so it doesn't block the response.
 */
export async function warmCache(fileId: string, ctx: ExecutionContext, version?: string): Promise<void> {
  if (!fileId || !FILE_ID_RE.test(fileId)) return;

  const cache = caches.default;
  const key = cacheKey(fileId, version);

  // Only fetch if not already cached
  const existing = await cache.match(key);
  if (existing) return;

  const upstream = await fetchDriveFollowingInterstitial(fileId);
  if (!upstream.ok || upstream.status !== 200) return;

  const toCache = new Response(upstream.body, upstream);
  toCache.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  toCache.headers.set('Access-Control-Allow-Origin', '*');

  ctx.waitUntil(cache.put(key, toCache));
}
