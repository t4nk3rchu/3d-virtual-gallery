/**
 * Task 1: Media proxy tests
 * Fixes bugs #1 (cache never populated), #2 (Drive interstitial), #3 (Range mishandled)
 *
 * These tests mock `fetch` and `caches.default` — they must be able to fail
 * for a real reason (not just asserting a function exists).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleMediaProxy, warmCache } from './media-proxy';

// ─── Fake cache store ─────────────────────────────────────────────────────────
function createFakeCache() {
  const store = new Map<string, Response>();
  return {
    store,
    match: vi.fn(async (req: Request) => {
      const key = typeof req === 'string' ? req : req.url;
      const cached = store.get(key);
      return cached ? cached.clone() : undefined;
    }),
    put: vi.fn(async (req: Request, res: Response) => {
      const key = typeof req === 'string' ? req : req.url;
      store.set(key, res.clone());
    }),
    delete: vi.fn(),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(
  fileId: string,
  opts: { range?: string } = {}
): Request {
  const url = `https://gallery.example.com/api/media/${fileId}`;
  const headers: Record<string, string> = {};
  if (opts.range) headers['Range'] = opts.range;
  return new Request(url, { headers });
}

function makeFakeCtx() {
  return {
    waitUntil: vi.fn((p: Promise<unknown>) => p),
  } as unknown as ExecutionContext;
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('handleMediaProxy', () => {
  let fakeCache: ReturnType<typeof createFakeCache>;
  const fileBody = new Uint8Array(256).fill(0xab);

  beforeEach(() => {
    fakeCache = createFakeCache();
    // Replace global caches.default
    vi.stubGlobal('caches', { default: fakeCache });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ── Test 1: cache miss → fetches upstream, stores in cache, returns 200 ────
  it('cache miss: fetches upstream, calls cache.put, returns 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(fileBody, {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '256' },
        })
      )
    );

    const req = makeRequest('abc123');
    const ctx = makeFakeCtx();
    const res = await handleMediaProxy(req, ctx);

    expect(res.status).toBe(200);
    expect(fakeCache.put).toHaveBeenCalledOnce();

    // Cache key should be range-agnostic (no query string / range)
    const cacheKey: Request = fakeCache.put.mock.calls[0][0];
    expect(cacheKey.url).toBe('https://media/abc123');
  });

  // ── Test 2: cache hit → returns cached body without upstream fetch ──────────
  it('cache hit: returns cached body, does NOT fetch upstream', async () => {
    const fetchFn = vi.fn();
    vi.stubGlobal('fetch', fetchFn);

    // Pre-warm the cache
    fakeCache.store.set(
      'https://media/abc123',
      new Response(fileBody, {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '256' },
      })
    );

    const req = makeRequest('abc123');
    const ctx = makeFakeCtx();
    const res = await handleMediaProxy(req, ctx);

    expect(res.status).toBe(200);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  // ── Test 3: Drive returns HTML interstitial → re-fetches with confirm token ─
  it('interstitial: detects HTML, re-fetches with confirm token, caches real bytes', async () => {
    const htmlBody = `
      <html><body>
        <form action="/uc"><input name="confirm" value="t0k3n"/></form>
      </body></html>
    `;

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        // First call: interstitial page
        .mockResolvedValueOnce(
          new Response(htmlBody, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        )
        // Second call: actual file after confirm
        .mockResolvedValueOnce(
          new Response(fileBody, {
            status: 200,
            headers: { 'Content-Type': 'model/gltf-binary', 'Content-Length': '256' },
          })
        )
    );

    const req = makeRequest('glbFile1');
    const ctx = makeFakeCtx();
    const res = await handleMediaProxy(req, ctx);

    expect(res.status).toBe(200);
    const ct = res.headers.get('Content-Type');
    expect(ct).not.toContain('text/html'); // must NOT return the HTML
    expect(ct).toContain('gltf-binary');
    expect(fakeCache.put).toHaveBeenCalledOnce();

    // Make sure second fetch included confirm token
    const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(fetchCalls.length).toBe(2);
    const secondUrl: string = fetchCalls[1][0];
    expect(secondUrl).toContain('confirm=t0k3n');
  });

  // ── Test 4: Range request → 206 with correct slice + Content-Range ──────────
  it('range request: returns 206 with correct byte slice', async () => {
    vi.stubGlobal('fetch', vi.fn()); // should not be called — we pre-warm below
    fakeCache.store.set(
      'https://media/audioFile',
      new Response(fileBody, {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '256' },
      })
    );

    const req = makeRequest('audioFile', { range: 'bytes=0-99' });
    const ctx = makeFakeCtx();
    const res = await handleMediaProxy(req, ctx);

    expect(res.status).toBe(206);
    const body = await res.arrayBuffer();
    expect(body.byteLength).toBe(100);
    expect(res.headers.get('Content-Range')).toBe('bytes 0-99/256');
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
  });

  // ── Test 5: invalid fileId → 400 ────────────────────────────────────────────
  it('rejects fileId with path traversal or spaces with 400', async () => {
    vi.stubGlobal('fetch', vi.fn());
    // Use URL-safe encoding for the URL but expect the proxy to reject after decode
    const badIds = ['..secret', 'a%20b', 'foo%2Fbar'];
    for (const bad of badIds) {
      // The URL will decode the percent-encoding so the handler sees the raw bad char
      const url = `https://gallery.example.com/api/media/${bad}`;
      const req = new Request(url);
      const ctx = makeFakeCtx();
      const res = await handleMediaProxy(req, ctx);
      expect(res.status, `bad id: "${bad}"`).toBe(400);
    }
    // Empty fileId — craft URL with trailing slash
    const emptyReq = new Request('https://gallery.example.com/api/media/');
    const ctx = makeFakeCtx();
    const res = await handleMediaProxy(emptyReq, ctx);
    expect(res.status).toBe(400);
  });

  // ── Test 6: warmCache pre-populates so next request is a cache hit ──────────
  it('warmCache: populates cache so subsequent request is a hit', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(
      new Response(fileBody, {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '256' },
      })
    );
    vi.stubGlobal('fetch', fetchFn);

    const ctx = makeFakeCtx();
    await warmCache('warmFile', ctx);

    // Cache should now be populated
    expect(fakeCache.put).toHaveBeenCalledOnce();

    // Subsequent request should NOT call fetch again
    fetchFn.mockClear();
    const req = makeRequest('warmFile');
    const res = await handleMediaProxy(req, ctx);
    expect(res.status).toBe(200);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  // ── Test 7: upstream failure is surfaced, not cached ─────────────────────────
  it('upstream 500: returns error response and does NOT cache it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response('server error', { status: 500 })
      )
    );

    const req = makeRequest('badUpstream');
    const ctx = makeFakeCtx();
    const res = await handleMediaProxy(req, ctx);

    expect(res.status).toBe(502);
    expect(fakeCache.put).not.toHaveBeenCalled();
  });

  // ── Test 8: version-aware cache key (?v=) ───────────────────────────────────
  it('uses a version-specific cache key so different versions do not collide', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () =>
        new Response(fileBody, {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '256' },
        })
      )
    );
    const ctx = makeFakeCtx();
    const reqV1 = new Request('https://gallery.example.com/api/media/abc123?v=100');
    const reqV2 = new Request('https://gallery.example.com/api/media/abc123?v=200');

    await handleMediaProxy(reqV1, ctx);
    await handleMediaProxy(reqV2, ctx);

    const putKeys = fakeCache.put.mock.calls.map((c) => (c[0] as Request).url);
    expect(putKeys).toContain('https://media/abc123?v=100');
    expect(putKeys).toContain('https://media/abc123?v=200');
  });
});
