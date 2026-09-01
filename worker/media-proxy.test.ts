/**
 * Media proxy tests — cache behavior, SA Drive fetch, token gate, range slicing.
 * gdrive-auth is statically mocked so tests never hit the real token exchange.
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { signMediaToken } from './media-sign';
import { handleMediaProxy, warmCache } from './media-proxy';

vi.mock('./gdrive-auth', () => ({ getDriveAccessToken: async () => 'ya29.MOCK' }));

const TEST_KEY = 'test-media-proxy-signing-key';
const env: any = {
  GDRIVE_SA_CLIENT_EMAIL: 'svc@example.iam',
  GDRIVE_SA_PRIVATE_KEY: 'unused-mocked',
  MEDIA_SIGNING_KEY: TEST_KEY,
};

// Pre-sign tokens for every fileId used in tests (exp 2h from now — outlives any test run)
const toks = new Map<string, string>();
beforeAll(async () => {
  const exp = Math.floor(Date.now() / 1000) + 7200;
  for (const id of ['abc123', 'audioFile', 'glbFile1', 'badUpstream', 'warmFile', 'FILE123']) {
    toks.set(id, await signMediaToken(id, exp, TEST_KEY));
  }
});

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

function makeRequest(
  fileId: string,
  opts: { range?: string; token?: string | false; version?: string; referer?: string } = {}
): Request {
  const qs = new URLSearchParams();
  const tok = opts.token === false ? undefined : (opts.token ?? toks.get(fileId));
  if (tok) qs.set('t', tok);
  if (opts.version) qs.set('v', opts.version);
  const qs_str = qs.toString();
  const url = `https://gallery.example.com/api/media/${fileId}${qs_str ? '?' + qs_str : ''}`;
  const headers: Record<string, string> = {};
  if (opts.range) headers['Range'] = opts.range;
  if (opts.referer) headers['Referer'] = opts.referer;
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
    vi.stubGlobal('caches', { default: fakeCache });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ── Cache miss → fetches via SA, stores in cache, returns 200 ──────────────
  it('cache miss: fetches from Drive API with Bearer token, calls cache.put, returns 200', async () => {
    const seen: { url: string; auth: string | null } = { url: '', auth: null };
    vi.stubGlobal('fetch', vi.fn(async (input: unknown, init: unknown) => {
      seen.url = String(input);
      seen.auth = (init as RequestInit)?.headers instanceof Headers
        ? ((init as RequestInit).headers as Headers).get('Authorization')
        : ((init as RequestInit)?.headers as Record<string, string>)?.Authorization ?? null;
      return new Response(fileBody, {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '256' },
      });
    }));

    const req = makeRequest('abc123');
    const ctx = makeFakeCtx();
    const res = await handleMediaProxy(req, env, ctx);

    expect(res.status).toBe(200);
    expect(seen.url).toContain('/drive/v3/files/abc123');
    expect(seen.url).toContain('alt=media');
    expect(seen.auth).toBe('Bearer ya29.MOCK');
    expect(fakeCache.put).toHaveBeenCalledOnce();
    const cacheKey: Request = fakeCache.put.mock.calls[0][0];
    expect(cacheKey.url).toBe('https://media/abc123');
  });

  // ── Cache hit → returns cached body without upstream fetch ──────────────────
  it('cache hit: returns cached body, does NOT fetch upstream', async () => {
    const fetchFn = vi.fn();
    vi.stubGlobal('fetch', fetchFn);

    fakeCache.store.set(
      'https://media/abc123',
      new Response(fileBody, {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '256' },
      })
    );

    const req = makeRequest('abc123');
    const ctx = makeFakeCtx();
    const res = await handleMediaProxy(req, env, ctx);

    expect(res.status).toBe(200);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  // ── Range request → 206 with correct slice + Content-Range ─────────────────
  it('range request: returns 206 with correct byte slice', async () => {
    vi.stubGlobal('fetch', vi.fn());
    fakeCache.store.set(
      'https://media/audioFile',
      new Response(fileBody, {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '256' },
      })
    );

    const req = makeRequest('audioFile', { range: 'bytes=0-99' });
    const ctx = makeFakeCtx();
    const res = await handleMediaProxy(req, env, ctx);

    expect(res.status).toBe(206);
    const body = await res.arrayBuffer();
    expect(body.byteLength).toBe(100);
    expect(res.headers.get('Content-Range')).toBe('bytes 0-99/256');
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
  });

  // ── Invalid fileId → 400 ────────────────────────────────────────────────────
  it('rejects fileId with path traversal or spaces with 400', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const badIds = ['..secret', 'a%20b', 'foo%2Fbar'];
    for (const bad of badIds) {
      const url = `https://gallery.example.com/api/media/${bad}`;
      const req = new Request(url);
      const res = await handleMediaProxy(req, env, makeFakeCtx());
      expect(res.status, `bad id: "${bad}"`).toBe(400);
    }
    const emptyReq = new Request('https://gallery.example.com/api/media/');
    expect((await handleMediaProxy(emptyReq, env, makeFakeCtx())).status).toBe(400);
  });

  // ── No token → 403 ──────────────────────────────────────────────────────────
  it('rejects a request with no ?t= token (403)', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const req = makeRequest('abc123', { token: false });
    const res = await handleMediaProxy(req, env, makeFakeCtx());
    expect(res.status).toBe(403);
  });

  // ── Foreign Referer → 403 only when APP_ORIGIN is set ──────────────────────
  it('allows a foreign Referer when APP_ORIGIN is not configured (token is the gate)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'Content-Type': 'model/gltf-binary' } })
    ));
    const req = makeRequest('abc123', { referer: 'https://evil.example/steal.html' });
    const res = await handleMediaProxy(req, env, makeFakeCtx()); // env has no APP_ORIGIN
    expect(res.status).toBe(200);
  });

  it('rejects a foreign Referer when APP_ORIGIN is configured (hotlink block)', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const envWithOrigin: any = { ...env, APP_ORIGIN: 'https://gallery.example.com' };
    const req = makeRequest('abc123', { referer: 'https://evil.example/steal.html' });
    const res = await handleMediaProxy(req, envWithOrigin, makeFakeCtx());
    expect(res.status).toBe(403);
  });

  // ── Upstream failure → 502, not cached ──────────────────────────────────────
  it('upstream 500: returns 502 and does NOT cache it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('error', { status: 500 })));
    const req = makeRequest('badUpstream');
    const res = await handleMediaProxy(req, env, makeFakeCtx());
    expect(res.status).toBe(502);
    expect(fakeCache.put).not.toHaveBeenCalled();
  });

  // ── Version-aware cache key (?v=) ───────────────────────────────────────────
  it('uses version-specific cache keys so different versions do not collide', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () =>
      new Response(fileBody, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '256' } })
    ));
    const ctx = makeFakeCtx();
    // Need separate signed tokens for the versioned keys — reuse abc123 token (only fileId is bound)
    const reqV1 = makeRequest('abc123', { version: '100' });
    const reqV2 = makeRequest('abc123', { version: '200' });

    await handleMediaProxy(reqV1, env, ctx);
    await handleMediaProxy(reqV2, env, ctx);

    const putKeys = fakeCache.put.mock.calls.map((c) => (c[0] as Request).url);
    expect(putKeys).toContain('https://media/abc123?v=100');
    expect(putKeys).toContain('https://media/abc123?v=200');
  });

  // ── warmCache pre-populates so next request is a cache hit ──────────────────
  it('warmCache: populates cache so subsequent request is a hit', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(
      new Response(fileBody, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '256' } })
    );
    vi.stubGlobal('fetch', fetchFn);

    const ctx = makeFakeCtx();
    await warmCache('warmFile', env, ctx);
    expect(fakeCache.put).toHaveBeenCalledOnce();

    fetchFn.mockClear();
    const req = makeRequest('warmFile');
    const res = await handleMediaProxy(req, env, ctx);
    expect(res.status).toBe(200);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
