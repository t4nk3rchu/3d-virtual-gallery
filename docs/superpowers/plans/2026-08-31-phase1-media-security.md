# Phase 1 Media Security — Private Drive + Signed URLs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all exhibition media private — Drive files un-shared and fetched via a service account, every `/api/media` request gated by a short-lived signed token plus an origin/referer hotlink check — with no change to how curators upload (they still paste Drive links).

**Architecture:** The Worker fetches Drive files with a service-account OAuth token (RS256 JWT → access token, cached), so files no longer need "anyone with the link." The API attaches a per-`fileId` HMAC token (`exp.sig`) to every response that carries media; the client appends it to `/api/media` URLs via a token registry (existing call sites unchanged); the proxy verifies the token + expiry + origin before serving. Because private Drive kills the public `lh3` image CDN, images also route through the proxy.

**Tech Stack:** Cloudflare Worker (TypeScript), WebCrypto (`crypto.subtle`) for RS256 + HMAC, Google Drive API v3 (`files.get?alt=media`), D1, Vitest (node env) + @testing-library/react.

## Global Constraints

- **No new npm dependencies** — all crypto via WebCrypto (`crypto.subtle`), matching the existing [`worker/jwt.ts`](../../../worker/jwt.ts) approach. No `jsonwebtoken`, no `googleapis`.
- **Curator upload flow is unchanged** — curators still paste a Drive link / pick via the Drive Picker. Only the *serving* path changes.
- **Secrets set only via `wrangler secret put`** — never in `wrangler.toml` or code. New secrets: `GDRIVE_SA_CLIENT_EMAIL`, `GDRIVE_SA_PRIVATE_KEY`, `MEDIA_SIGNING_KEY`. Optional public var: `APP_ORIGIN`.
- **Token format:** `t=<expEpochSeconds>.<base64url(HMAC-SHA256(MEDIA_SIGNING_KEY, "<fileId>.<exp>"))>`. TTL default **6 hours** (21600s).
- **Cache key is unaffected:** [`cacheKey()`](../../../worker/media-proxy.ts) keys on `fileId` + `?v=` version only. The `t` token is a query param it ignores — different tokens for the same file share one cache entry. Do NOT add `t` to the cache key.
- **Drive scope:** service account uses `https://www.googleapis.com/auth/drive.readonly`. Files must be shared to the SA's `client_email`, or live in a Shared Drive the SA belongs to (a service account has no Drive storage of its own).
- **Fail-safe posture (security — never simplify away):** missing/invalid/expired token → `403`; missing SA token or Drive `401/403/404` → `502`/`404`, never serve. Origin/referer present and foreign → `403`; absent → allowed (the signed token still gates).
- **Test runner:** `npx vitest run <path>` single file; `npx vitest run` full suite. WebCrypto is available as the global `crypto` in the vitest node environment.

---

## File Structure

- `worker/media-sign.ts` — NEW. HMAC token `sign`/`verify` + `buildMediaTokens(fileIds, key, ttl)`. (Task 1)
- `worker/jwt.ts` — export `base64url` / `base64urlDecode` for reuse. (Task 1)
- `worker/gdrive-auth.ts` — NEW. Service-account JWT (RS256) → cached access token. (Task 2)
- `worker/media-proxy.ts` — swap Drive fetch to service account (Task 4); add token + origin gate (Task 5).
- `worker/types.ts` — add new `Env` fields. (Tasks 2, 5)
- `worker/index.ts` — pass `env` to `handleMediaProxy`. (Task 4)
- `worker/routes/crud.ts` + `worker/db.ts` — attach `media_tokens` to responses. (Task 6)
- `src/types/schema.ts` — add `media_tokens?` to `ExhibitionDetail`. (Task 6)
- `src/lib/media/media-tokens.ts` — NEW. Client token registry. (Task 7)
- `src/lib/media/gdrive.ts` — helpers append `&t=`; `getImageUrl` routes through the proxy. (Task 8)
- `src/components/viewer/ExhibitionViewer.tsx`, `src/components/studio/workbench/Workbench.tsx` — register tokens on data load. (Task 8)
- `wrangler.toml` + deployment design doc — secrets + Drive runbook. (Task 9)

---

### Task 1: Media signing utility

**Files:**
- Create: `worker/media-sign.ts`
- Modify: `worker/jwt.ts` (export two helpers)
- Test: `worker/media-sign.test.ts`

**Interfaces:**
- Consumes: `base64url`, `base64urlDecode` from `worker/jwt.ts`.
- Produces:
  - `signMediaToken(fileId: string, exp: number, key: string): Promise<string>` → `"<exp>.<sigB64url>"`.
  - `verifyMediaToken(fileId: string, token: string, key: string): Promise<boolean>` (false on bad format / bad sig / expired).
  - `buildMediaTokens(fileIds: Array<string | null | undefined>, key: string, ttlSeconds?: number): Promise<Record<string, string>>` (dedupes, skips falsy, default ttl 21600).

- [ ] **Step 1: Export helpers from jwt.ts**

In `worker/jwt.ts`, change the two helper declarations to named exports:

```ts
export function base64url(buffer: ArrayBuffer): string {
```
```ts
export function base64urlDecode(b64: string): Uint8Array {
```

- [ ] **Step 2: Write the failing test**

Create `worker/media-sign.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { signMediaToken, verifyMediaToken, buildMediaTokens } from './media-sign';

const KEY = 'test-signing-key-please-be-long';

describe('media-sign', () => {
  it('verifies a token it signed', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const tok = await signMediaToken('fileA', exp, KEY);
    expect(await verifyMediaToken('fileA', tok, KEY)).toBe(true);
  });

  it('rejects a token for a different fileId', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const tok = await signMediaToken('fileA', exp, KEY);
    expect(await verifyMediaToken('fileB', tok, KEY)).toBe(false);
  });

  it('rejects a tampered signature', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const tok = await signMediaToken('fileA', exp, KEY);
    const tampered = tok.slice(0, -2) + (tok.endsWith('AA') ? 'BB' : 'AA');
    expect(await verifyMediaToken('fileA', tampered, KEY)).toBe(false);
  });

  it('rejects an expired token', async () => {
    const past = Math.floor(Date.now() / 1000) - 10;
    const tok = await signMediaToken('fileA', past, KEY);
    expect(await verifyMediaToken('fileA', tok, KEY)).toBe(false);
  });

  it('rejects a malformed token', async () => {
    expect(await verifyMediaToken('fileA', 'garbage', KEY)).toBe(false);
    expect(await verifyMediaToken('fileA', '', KEY)).toBe(false);
  });

  it('builds a token map, skipping falsy and deduping', async () => {
    const map = await buildMediaTokens(['a', 'a', null, undefined, 'b'], KEY, 60);
    expect(Object.keys(map).sort()).toEqual(['a', 'b']);
    expect(await verifyMediaToken('a', map.a, KEY)).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run worker/media-sign.test.ts`
Expected: FAIL — `Cannot find module './media-sign'`.

- [ ] **Step 4: Implement `worker/media-sign.ts`**

```ts
/**
 * Signed media-access tokens. Token = "<exp>.<base64url(HMAC-SHA256(key, `${fileId}.${exp}`))>".
 * exp is epoch seconds. The proxy verifies before serving; expiry makes leaked URLs die.
 */
import { base64url, base64urlDecode } from './jwt';

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
  if (exp < Math.floor(Date.now() / 1000)) return false; // expired

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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run worker/media-sign.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add worker/media-sign.ts worker/media-sign.test.ts worker/jwt.ts
git commit -m "feat(security): signed media-token util (HMAC exp.sig)"
```

---

### Task 2: Service-account Drive authentication

**Files:**
- Create: `worker/gdrive-auth.ts`
- Modify: `worker/types.ts` (Env fields)
- Test: `worker/gdrive-auth.test.ts`

**Interfaces:**
- Consumes: `base64url` from `worker/jwt.ts`; `Env`.
- Produces:
  - `pemToPkcs8(pem: string): ArrayBuffer` — strips PEM armor, base64-decodes to DER.
  - `buildServiceAccountAssertion(clientEmail: string, privateKeyPem: string, nowSec: number): Promise<string>` — signed RS256 JWT for the token exchange.
  - `getDriveAccessToken(env: Env): Promise<string>` — cached access token (module-scope, refreshed near expiry).

- [ ] **Step 1: Add Env fields**

In `worker/types.ts`, extend `Env`:

```ts
export interface Env {
  DB: D1Database;
  AE: AnalyticsEngineDataset;
  EVENTS_LIMITER: RateLimit;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  JWT_SECRET_KEY: string;
  GDRIVE_SA_CLIENT_EMAIL: string;
  GDRIVE_SA_PRIVATE_KEY: string;
  MEDIA_SIGNING_KEY: string;
  APP_ORIGIN?: string;
}
```

- [ ] **Step 2: Write the failing test**

Create `worker/gdrive-auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pemToPkcs8, buildServiceAccountAssertion, getDriveAccessToken } from './gdrive-auth';
import { base64url } from './jwt';

// Generate a real RSA keypair so we can sign + verify the assertion for real.
async function makePemKeypair() {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']
  );
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
  const b64 = base64url(pkcs8).replace(/-/g, '+').replace(/_/g, '/');
  const pem = `-----BEGIN PRIVATE KEY-----\n${b64.replace(/(.{64})/g, '$1\n')}\n-----END PRIVATE KEY-----\n`;
  return { pem, publicKey: pair.publicKey };
}

describe('gdrive-auth', () => {
  it('parses a PEM into DER bytes', async () => {
    const { pem } = await makePemKeypair();
    const der = pemToPkcs8(pem);
    expect(der.byteLength).toBeGreaterThan(100);
  });

  it('builds an RS256 assertion that verifies against the public key', async () => {
    const { pem, publicKey } = await makePemKeypair();
    const jwt = await buildServiceAccountAssertion('svc@proj.iam.gserviceaccount.com', pem, 1_700_000_000);
    const [h, p, s] = jwt.split('.');
    expect(h && p && s).toBeTruthy();
    // verify signature over "h.p"
    const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    const ok = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' }, publicKey, sig, new TextEncoder().encode(`${h}.${p}`)
    );
    expect(ok).toBe(true);
    const claim = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
    expect(claim.iss).toBe('svc@proj.iam.gserviceaccount.com');
    expect(claim.scope).toContain('drive.readonly');
    expect(claim.aud).toBe('https://oauth2.googleapis.com/token');
  });

  it('exchanges the assertion for an access token and caches it', async () => {
    const { pem } = await makePemKeypair();
    const env: any = { GDRIVE_SA_CLIENT_EMAIL: 'svc@x.iam', GDRIVE_SA_PRIVATE_KEY: pem };
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: 'ya29.TOKEN', expires_in: 3600 }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const t1 = await getDriveAccessToken(env);
    const t2 = await getDriveAccessToken(env);
    expect(t1).toBe('ya29.TOKEN');
    expect(t2).toBe('ya29.TOKEN');
    expect(fetchMock).toHaveBeenCalledTimes(1); // second call served from cache
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    // reset module cache between tests that assert call counts
    vi.resetModules();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run worker/gdrive-auth.test.ts`
Expected: FAIL — `Cannot find module './gdrive-auth'`.

- [ ] **Step 4: Implement `worker/gdrive-auth.ts`**

```ts
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
  cachedExpiry = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000; // 60s safety margin
  return cachedToken;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run worker/gdrive-auth.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add worker/gdrive-auth.ts worker/gdrive-auth.test.ts worker/types.ts
git commit -m "feat(security): service-account Drive auth (RS256 JWT + token cache)"
```

---

### Task 3: Add `media_tokens` to the client schema type

**Files:**
- Modify: `src/types/schema.ts`
- Test: none (type-only; validated by build in later tasks).

**Interfaces:**
- Produces: `ExhibitionDetail.media_tokens?: Record<string, string>`.

- [ ] **Step 1: Add the field**

In `src/types/schema.ts`, inside `interface ExhibitionDetail extends Exhibition {`, add:

```ts
  /** fileId → signed access token ("exp.sig") for /api/media requests. */
  media_tokens?: Record<string, string>;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit` (or `npm run build` if `tsc -b` is wired there)
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/schema.ts
git commit -m "feat(security): add media_tokens to ExhibitionDetail type"
```

---

### Task 4: Route the proxy through the service account

**Files:**
- Modify: `worker/media-proxy.ts`
- Modify: `worker/index.ts:50-52` (pass `env`)
- Modify: `worker/routes/crud.ts:113-122` (`warmCache` new signature)
- Test: `worker/media-proxy.test.ts` (extend)

**Interfaces:**
- Consumes: `getDriveAccessToken(env)` (Task 2).
- Produces:
  - `handleMediaProxy(req: Request, env: Env, ctx: ExecutionContext): Promise<Response>` (added `env`).
  - `warmCache(fileId: string, env: Env, ctx: ExecutionContext, version?: string): Promise<void>` (added `env`).

- [ ] **Step 1: Write the failing test**

Add to `worker/media-proxy.test.ts` (mocking the SA token + Drive fetch):

```ts
import { vi } from 'vitest';
import { handleMediaProxy } from './media-proxy';

function fakeCtx(): ExecutionContext {
  return { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext;
}

it('fetches from the Drive API with a bearer token and streams bytes', async () => {
  vi.resetModules();
  // module-mock the SA token
  vi.doMock('./gdrive-auth', () => ({ getDriveAccessToken: async () => 'ya29.MOCK' }));
  const { handleMediaProxy: proxy } = await import('./media-proxy');

  const seen: { url: string; auth: string | null } = { url: '', auth: null };
  vi.stubGlobal('fetch', vi.fn(async (input: any, init: any) => {
    seen.url = String(input);
    seen.auth = init?.headers?.Authorization ?? init?.headers?.get?.('Authorization') ?? null;
    return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'Content-Type': 'model/gltf-binary' } });
  }));

  const env: any = { GDRIVE_SA_CLIENT_EMAIL: 'x', GDRIVE_SA_PRIVATE_KEY: 'x', MEDIA_SIGNING_KEY: 'k' };
  // (This test focuses on the Drive fetch; token/origin gating is added & tested in Task 5.)
  const req = new Request('https://app.example/api/media/FILE123');
  const res = await proxy(req, env, fakeCtx());
  expect(seen.url).toContain('/drive/v3/files/FILE123');
  expect(seen.url).toContain('alt=media');
  expect(seen.auth).toBe('Bearer ya29.MOCK');
  vi.unstubAllGlobals();
  vi.doUnmock('./gdrive-auth');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run worker/media-proxy.test.ts`
Expected: FAIL — `handleMediaProxy` has arity 2 and still calls the old `uc?export=download` URL.

- [ ] **Step 3: Replace the Drive fetch in `worker/media-proxy.ts`**

Add the import at the top:

```ts
import { getDriveAccessToken } from './gdrive-auth';
import type { Env } from './types';
```

Delete the `fetchDriveFollowingInterstitial` function and the `DRIVE_DOWNLOAD_BASE` constant (no longer needed — the API returns bytes directly). Replace with:

```ts
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files/';

/** Fetch a private Drive file's bytes via the service account. */
async function fetchDriveAuthenticated(fileId: string, env: Env): Promise<Response> {
  const token = await getDriveAccessToken(env);
  const url = `${DRIVE_API_BASE}${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}
```

Change the handler signature and the upstream call. Update `handleMediaProxy(req, ctx)` → `handleMediaProxy(req, env, ctx)` and replace the `const upstream = await fetchDriveFollowingInterstitial(fileId);` line with:

```ts
    const upstream = await fetchDriveAuthenticated(fileId, env);
```

Update `warmCache(fileId, ctx, version?)` → `warmCache(fileId: string, env: Env, ctx: ExecutionContext, version?: string)` and replace its `fetchDriveFollowingInterstitial(fileId)` call with `fetchDriveAuthenticated(fileId, env)`.

- [ ] **Step 4: Update callers**

In `worker/index.ts`, change the media route:

```ts
    if (path.startsWith('/api/media/')) {
      return handleMediaProxy(req, env, ctx);
    }
```

In `worker/routes/crud.ts` (around lines 113–122), update the three `warmCache(...)` calls to pass `env` as the second argument, e.g.:

```ts
        if (detail.room?.glb_file_id) {
          ctx.waitUntil(warmCache(detail.room.glb_file_id, env, ctx, String(detail.room.created_at)));
        }
```
```ts
          if (art.media_file_id) {
            ctx.waitUntil(warmCache(art.media_file_id, env, ctx, String(art.updated_at)));
          }
```
```ts
          if (art.audio_guide_file_id) {
            ctx.waitUntil(warmCache(art.audio_guide_file_id, env, ctx, String(art.updated_at)));
          }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run worker/media-proxy.test.ts`
Expected: PASS (new test + existing proxy tests still green; existing interstitial-specific tests, if any, were for behavior now removed — update or delete those assertions to match the API-fetch path).

- [ ] **Step 6: Commit**

```bash
git add worker/media-proxy.ts worker/index.ts worker/routes/crud.ts worker/media-proxy.test.ts
git commit -m "feat(security): fetch Drive media via service account (private files)"
```

---

### Task 5: Gate serving on signed token + origin

**Files:**
- Modify: `worker/media-proxy.ts`
- Test: `worker/media-proxy.test.ts` (extend)

**Interfaces:**
- Consumes: `verifyMediaToken` (Task 1); `Env.MEDIA_SIGNING_KEY`, `Env.APP_ORIGIN`.
- Produces: proxy returns `403` for missing/invalid/expired `t` or foreign origin; serves normally for a valid token.

- [ ] **Step 1: Write the failing test**

Add to `worker/media-proxy.test.ts`:

```ts
import { signMediaToken } from './media-sign';

it('rejects a request with no token (403)', async () => {
  vi.resetModules();
  vi.doMock('./gdrive-auth', () => ({ getDriveAccessToken: async () => 'ya29.MOCK' }));
  const { handleMediaProxy: proxy } = await import('./media-proxy');
  const env: any = { MEDIA_SIGNING_KEY: 'k' };
  const res = await proxy(new Request('https://app.example/api/media/FILE123'), env, fakeCtx());
  expect(res.status).toBe(403);
  vi.doUnmock('./gdrive-auth');
});

it('serves when the token is valid', async () => {
  vi.resetModules();
  vi.doMock('./gdrive-auth', () => ({ getDriveAccessToken: async () => 'ya29.MOCK' }));
  const { handleMediaProxy: proxy } = await import('./media-proxy');
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'Content-Type': 'model/gltf-binary' } })
  ));
  const KEY = 'k';
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const t = await signMediaToken('FILE123', exp, KEY);
  const env: any = { MEDIA_SIGNING_KEY: KEY, GDRIVE_SA_CLIENT_EMAIL: 'x', GDRIVE_SA_PRIVATE_KEY: 'x' };
  const res = await proxy(new Request(`https://app.example/api/media/FILE123?t=${encodeURIComponent(t)}`), env, fakeCtx());
  expect(res.status).toBe(200);
  vi.unstubAllGlobals();
  vi.doUnmock('./gdrive-auth');
});

it('rejects a foreign referer (hotlink) even with a valid token', async () => {
  vi.resetModules();
  vi.doMock('./gdrive-auth', () => ({ getDriveAccessToken: async () => 'ya29.MOCK' }));
  const { handleMediaProxy: proxy } = await import('./media-proxy');
  const KEY = 'k';
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const t = await signMediaToken('FILE123', exp, KEY);
  const env: any = { MEDIA_SIGNING_KEY: KEY };
  const req = new Request(`https://app.example/api/media/FILE123?t=${encodeURIComponent(t)}`, {
    headers: { Referer: 'https://evil.example/steal.html' },
  });
  const res = await proxy(req, env, fakeCtx());
  expect(res.status).toBe(403);
  vi.doUnmock('./gdrive-auth');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run worker/media-proxy.test.ts`
Expected: FAIL — the no-token and foreign-referer cases currently return 200/502, not 403.

- [ ] **Step 3: Add the gate**

In `worker/media-proxy.ts`, add the import:

```ts
import { verifyMediaToken } from './media-sign';
```

Add this helper above `handleMediaProxy`:

```ts
/** Hotlink guard: allow same-origin / configured origin; allow when no Origin+Referer present. */
function isAllowedOrigin(req: Request, env: Env): boolean {
  const host = new URL(req.url).host;
  const allowed = new Set<string>([`https://${host}`, `http://${host}`]);
  if (env.APP_ORIGIN) allowed.add(env.APP_ORIGIN);

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
  return true; // no origin/referer signal → the signed token is the gate
}
```

In `handleMediaProxy`, immediately after the `fileId` validation (`if (!fileId || !FILE_ID_RE.test(fileId)) …`) and before the cache logic, insert the gate — but let `OPTIONS` and `HEAD` preflight/metadata still pass token-free where appropriate. Place it after the existing `OPTIONS` block and after fileId validation:

```ts
  // Hotlink guard (best-effort; the signed token below is the real gate)
  if (!isAllowedOrigin(req, env)) {
    return new Response('Forbidden origin', { status: 403 });
  }

  // Signed-token gate — required for GET/HEAD serving
  const token = url.searchParams.get('t') ?? '';
  if (!(await verifyMediaToken(fileId, token, env.MEDIA_SIGNING_KEY))) {
    return new Response('Invalid or expired media token', { status: 403 });
  }
```

(`url` is already computed later in the function — move its declaration `const url = new URL(req.url);` up to just after the fileId line if needed, and reuse it; do not create a second `url`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run worker/media-proxy.test.ts`
Expected: PASS — 403 for no-token and foreign-referer, 200 for valid token, plus the Task 4 fetch test.

- [ ] **Step 5: Commit**

```bash
git add worker/media-proxy.ts worker/media-proxy.test.ts
git commit -m "feat(security): gate media proxy on signed token + origin"
```

---

### Task 6: Attach `media_tokens` to API responses

**Files:**
- Modify: `worker/db.ts` (both `getExhibitionBySlug` and `getExhibitionById` return sites)
- Modify: `worker/routes/crud.ts` (pass signing key into detail serialization; artworks + artists lists)
- Test: `worker/routes/crud.test.ts` (extend) and/or `worker/db.test.ts`

**Interfaces:**
- Consumes: `buildMediaTokens` (Task 1); `Env.MEDIA_SIGNING_KEY`.
- Produces: exhibition-detail, artworks-list, and artists-list responses carry `media_tokens: Record<fileId, "exp.sig">` covering every media fileId in the payload.

- [ ] **Step 1: Write the failing test**

Add to `worker/routes/crud.test.ts` a test that a by-slug response includes tokens for the room GLB and each artwork's media. Use the existing test harness/mocks in that file; the assertion shape:

```ts
it('by-slug response includes media_tokens for room + artwork media', async () => {
  // ...arrange an exhibition with room.glb_file_id='g1' and one artwork media_file_id='m1'
  // (reuse the file's existing fixture builders)
  const res = await handleExhibitionBySlug(/* req */, /* env with MEDIA_SIGNING_KEY:'k' */, /* auth */, 'the-slug');
  const body = await res.json();
  expect(body.media_tokens).toBeTruthy();
  expect(body.media_tokens['g1']).toMatch(/^\d+\./);
  expect(body.media_tokens['m1']).toMatch(/^\d+\./);
});
```

Adapt argument construction to the existing test's mocking style (D1 mock, env object). If `crud.test.ts` lacks a by-slug fixture, add one mirroring the existing by-id fixture.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run worker/routes/crud.test.ts`
Expected: FAIL — `body.media_tokens` is undefined.

- [ ] **Step 3: Add a token-collection helper and wire it in**

Add to `worker/media-sign.ts`:

```ts
import type { ExhibitionDetail } from '../src/types/schema';

/** Collect every proxied media fileId in an exhibition detail and sign them. */
export async function tokensForExhibition(detail: ExhibitionDetail, key: string): Promise<Record<string, string>> {
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
```

(Confirm the relative import path `../src/types/schema` resolves from `worker/`; if the worker tsconfig maps types differently, import the local shapes instead — the fields referenced are `glb_file_id`, `intro_video_file_id`, `media_file_id`, `audio_guide_file_id`, `audio_file_id`, `portrait_file_id`.)

In `worker/routes/crud.ts`, in both `handleExhibitionBySlug` and `handleExhibitionById`, after obtaining the `detail` object and before returning JSON, attach the tokens:

```ts
    const media_tokens = await tokensForExhibition(detail, env.MEDIA_SIGNING_KEY);
    return json({ ...detail, media_tokens });
```

(Import `tokensForExhibition` at the top of `crud.ts`. Use the file's existing `json(...)` response helper; match its current return shape.)

For the studio list endpoints, attach a token map alongside the existing payload. In `handleArtworks` (list branch) build `buildMediaTokens([...media_file_ids, ...audio_guide_file_ids], env.MEDIA_SIGNING_KEY)` and include `media_tokens` in the JSON. In `handleArtists`/`handleExhibitionArtists`, build from `portrait_file_id`s. Import `buildMediaTokens` from `./media-sign` (adjust relative path to `../media-sign`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run worker/routes/crud.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/media-sign.ts worker/routes/crud.ts worker/routes/crud.test.ts
git commit -m "feat(security): attach signed media_tokens to API responses"
```

---

### Task 7: Client media-token registry

**Files:**
- Create: `src/lib/media/media-tokens.ts`
- Test: `src/lib/media/media-tokens.test.ts`

**Interfaces:**
- Produces:
  - `registerMediaTokens(map?: Record<string, string>): void` — merges into the registry.
  - `getMediaToken(fileId: string): string | undefined`.
  - `clearMediaTokens(): void` (test helper / logout).

- [ ] **Step 1: Write the failing test**

Create `src/lib/media/media-tokens.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { registerMediaTokens, getMediaToken, clearMediaTokens } from './media-tokens';

describe('media-tokens registry', () => {
  beforeEach(() => clearMediaTokens());

  it('stores and retrieves tokens', () => {
    registerMediaTokens({ a: '123.sig' });
    expect(getMediaToken('a')).toBe('123.sig');
  });

  it('merges rather than replacing', () => {
    registerMediaTokens({ a: '1.x' });
    registerMediaTokens({ b: '2.y' });
    expect(getMediaToken('a')).toBe('1.x');
    expect(getMediaToken('b')).toBe('2.y');
  });

  it('ignores undefined maps', () => {
    registerMediaTokens(undefined);
    expect(getMediaToken('a')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/media/media-tokens.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/media/media-tokens.ts`**

```ts
/**
 * Client-side registry of signed media tokens (fileId → "exp.sig"), populated from
 * API responses (media_tokens). The media URL helpers read from here automatically,
 * so call sites that build /api/media URLs don't need to thread tokens through.
 * ponytail: module-global map — a browser SPA singleton, fine for this use.
 */
const tokens = new Map<string, string>();

export function registerMediaTokens(map?: Record<string, string>): void {
  if (!map) return;
  for (const [id, tok] of Object.entries(map)) tokens.set(id, tok);
}

export function getMediaToken(fileId: string): string | undefined {
  return tokens.get(fileId);
}

export function clearMediaTokens(): void {
  tokens.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/media/media-tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/media/media-tokens.ts src/lib/media/media-tokens.test.ts
git commit -m "feat(security): client media-token registry"
```

---

### Task 8: Route all media through the proxy with tokens

**Files:**
- Modify: `src/lib/media/gdrive.ts`
- Modify: `src/lib/media/gdrive.test.ts`
- Modify: `src/components/viewer/ExhibitionViewer.tsx` (register tokens on load)
- Modify: `src/components/studio/workbench/Workbench.tsx` (register tokens on load)

**Interfaces:**
- Consumes: `getMediaToken` (Task 7).
- Produces: `getImageUrl` returns a `/api/media/:id?...&t=...` path (no longer `lh3`); `proxyMediaUrl` and `resolveAudioUrl` append `&t=` when a token is registered.

- [ ] **Step 1: Write the failing test**

Update `src/lib/media/gdrive.test.ts`. Replace the `getImageUrl` lh3 expectation and add token behavior:

```ts
import { registerMediaTokens, clearMediaTokens } from './media-tokens';

describe('getImageUrl (proxied)', () => {
  beforeEach(() => clearMediaTokens());
  it('routes Drive images through /api/media, not lh3', () => {
    const url = getImageUrl('FILE123', 'gallery');
    expect(url.startsWith('/api/media/FILE123')).toBe(true);
    expect(url).not.toContain('googleusercontent');
  });
  it('appends a registered token', () => {
    registerMediaTokens({ FILE123: '999.sig' });
    expect(getImageUrl('FILE123')).toContain('t=999.sig');
  });
});

describe('proxyMediaUrl token', () => {
  beforeEach(() => clearMediaTokens());
  it('appends a registered token', () => {
    registerMediaTokens({ fid: '999.sig' });
    expect(proxyMediaUrl('fid', 5)).toContain('t=999.sig');
  });
});
```

(Update any existing `getImageUrl` test that asserted a `lh3.googleusercontent.com` URL — that behavior is intentionally removed.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/media/gdrive.test.ts`
Expected: FAIL — `getImageUrl` still returns the lh3 URL; no token appended.

- [ ] **Step 3: Update `src/lib/media/gdrive.ts`**

Add the import:

```ts
import { getMediaToken } from './media-tokens';
```

Add a small internal helper and use it in all three URL builders:

```ts
/** Append the registered signed token (if any) to a proxy URL. */
function withToken(path: string, fileId: string): string {
  const t = getMediaToken(fileId);
  if (!t) return path;
  return path + (path.includes('?') ? '&' : '?') + `t=${encodeURIComponent(t)}`;
}
```

Rewrite `getImageUrl` so Drive images go through the proxy (private Drive means `lh3` no longer works). Keep the tier as a hint query param for a future resizing layer:

```ts
export function getImageUrl(
  fileIdOrUrl: string,
  tier: 'thumbnail' | 'gallery' | 'original' = 'thumbnail'
): string {
  if (!fileIdOrUrl) return '';
  const trimmed = fileIdOrUrl.trim();
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    // Private Drive → serve via the authenticated Worker proxy (lh3 only serves public files).
    return withToken(`/api/media/${driveId}?tier=${tier}`, driveId);
  }
  return trimmed; // direct external URL / local / data:
}
```

In `proxyMediaUrl`, wrap the returned proxy path with `withToken`:

```ts
  if (driveId) {
    const base = `/api/media/${driveId}`;
    const versioned = version == null || version === '' ? base : `${base}?v=${version}`;
    return withToken(versioned, driveId);
  }
```

(`resolveAudioUrl` calls `proxyMediaUrl`, so it inherits the token automatically — no change needed.)

- [ ] **Step 4: Register tokens on data load**

In `src/components/viewer/ExhibitionViewer.tsx`, in the fetch `.then((data) => { … })` that sets the exhibition (around line 65), register tokens **before** `setExhibition` so the scene build reads them:

```tsx
      .then((data) => {
        registerMediaTokens(data.media_tokens);
        setExhibition(data);
        setLoadState('loaded');
      })
```

Add the import: `import { registerMediaTokens } from '../../lib/media/media-tokens';`

In `src/components/studio/workbench/Workbench.tsx`, wherever the exhibition detail (and/or artworks/artists lists) is fetched, call `registerMediaTokens(resp.media_tokens)` immediately after each fetch resolves and before rendering media. Add the same import (adjust the relative path).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/media/gdrive.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/media/gdrive.ts src/lib/media/gdrive.test.ts src/components/viewer/ExhibitionViewer.tsx src/components/studio/workbench/Workbench.tsx
git commit -m "feat(security): route all media through proxy with signed tokens"
```

---

### Task 9: Secrets, Drive migration runbook, and deploy-doc update

**Files:**
- Modify: `wrangler.toml` (secret comments + optional `APP_ORIGIN` var)
- Modify: `docs/superpowers/specs/2026-08-27-cloudflare-deployment-design.md` (deploy steps)
- Test: none (ops/docs). Verified by the smoke test in Task 10.

- [ ] **Step 1: Document the new secrets in `wrangler.toml`**

Under the existing secrets comment block, add:

```toml
# 3. GDRIVE_SA_CLIENT_EMAIL   (service-account client_email)
# 4. GDRIVE_SA_PRIVATE_KEY    (service-account private_key PEM, incl. BEGIN/END lines)
# 5. MEDIA_SIGNING_KEY        (long random string; HMAC key for media tokens)
```

If a custom domain is in use, add it as a public var (not a secret):

```toml
[vars]
GOOGLE_OAUTH_CLIENT_ID = "660457062165-6f0920km3t94bdq79f3bqpl5ig8t276n.apps.googleusercontent.com"
# APP_ORIGIN = "https://gallery.example.com"   # uncomment on custom domain
```

- [ ] **Step 2: Add the runbook to the deployment design doc**

Append a subsection under the deploy process in `docs/superpowers/specs/2026-08-27-cloudflare-deployment-design.md`:

```markdown
### Media privacy setup (Phase 1)

1. **Create a service account** in Google Cloud Console → IAM → Service Accounts. Create a JSON key; note `client_email` and `private_key`.
2. **Enable the Drive API** for that project (APIs & Services → Enable APIs → Google Drive API).
3. **Give the SA read access to the media:** either (a) create a **Shared Drive**, add the SA `client_email` as a Viewer, and keep all exhibition media there, or (b) share each curator media folder with the SA `client_email`.
4. **Set the secrets:**
   \`\`\`bash
   pnpm exec wrangler secret put GDRIVE_SA_CLIENT_EMAIL
   pnpm exec wrangler secret put GDRIVE_SA_PRIVATE_KEY   # paste full PEM incl. BEGIN/END
   pnpm exec wrangler secret put MEDIA_SIGNING_KEY       # long random string
   \`\`\`
5. **Deploy** (`wrangler deploy`), smoke-test media loads, then **un-share the Drive files from "anyone with the link"** — access now flows only through the service account. (Do this last so there's no outage window.)
```

- [ ] **Step 3: Commit**

```bash
git add wrangler.toml docs/superpowers/specs/2026-08-27-cloudflare-deployment-design.md
git commit -m "docs(security): media-privacy secrets + Drive migration runbook"
```

---

### Task 10: Full QA + integration smoke

**Files:**
- Test: whole suite + build; manual smoke checklist.

- [ ] **Step 1: Run the full unit suite**

Run: `npx vitest run`
Expected: PASS — all green (new security tests + existing). Fix any test that still asserts the old lh3 image URL or the removed interstitial path.

- [ ] **Step 2: Type-check / build**

Run: `npm run build`
Expected: `tsc -b && vite build` with 0 errors.

- [ ] **Step 3: Local Worker smoke (with real secrets in a `.dev.vars`)**

Create `.dev.vars` (git-ignored — confirm it is in `.gitignore`) with real `GDRIVE_SA_CLIENT_EMAIL`, `GDRIVE_SA_PRIVATE_KEY`, `MEDIA_SIGNING_KEY`, then:

Run: `npm run worker:dev`
Manually verify against a **private** (un-shared) test Drive file:
- A `/api/media/{id}` request **without** `?t=` → **403**.
- The same with a valid signed `t` (grab one from a `by-slug` response) → **200** and bytes.
- A request with `Referer: https://evil.example/` and a valid token → **403**.
- An expired token (`exp` in the past) → **403**.

- [ ] **Step 4: Full visitor smoke on deploy (or `wrangler dev`)**

Open `/e/{slug}`: confirm the GLB room, images, audio, and intro video all load (they now come through the proxy with tokens), and that a second load is a cache hit. Open the studio workbench: confirm artwork/image previews and artist portraits load.

- [ ] **Step 5: Commit any QA fixes**

```bash
git add -A
git commit -m "test(security): phase-1 media security QA fixes"
```

---

## Self-Review

**Spec coverage** (against the "Media Security & Privacy — Phase 1" section of `2026-08-27-cloudflare-deployment-design.md`):
- *Route images through the Worker* → Task 8 (`getImageUrl` → proxy). Also forced by private Drive killing lh3, called out up front.
- *Service account + un-share Drive* → Task 2 (auth), Task 4 (proxy uses it), Task 9 (SA setup + un-share runbook).
- *Signed URLs + origin lock* → Task 1 (sign/verify), Task 5 (proxy gate + origin), Task 6 (server issues tokens), Task 7–8 (client consumes them).
- *Token TTL 6h, HMAC(fileId+exp)* → Task 1 constants + format, matches Global Constraints.
- *Cache key unaffected by `t`* → called out in Global Constraints; relies on existing `cacheKey()` using fileId+`v` only.
- *`sliceRange` streaming fix* → intentionally **out of scope** for Phase 1 (the spec tags it "audio/video-only, low priority" and caps proxied video at ~100MB); not included here. Noted so a reviewer doesn't flag it as a gap.

**Placeholder scan:** every code step contains complete code or an exact diff; commands have expected output; no "TBD"/"handle errors"/"similar to". The one soft spot — `crud.test.ts` fixture reuse in Task 6 — points at the file's existing fixture builders rather than inventing a shape, because the harness style must match; the assertion contract is fully specified.

**Type consistency:** `handleMediaProxy(req, env, ctx)` and `warmCache(fileId, env, ctx, version?)` signatures are updated consistently in Task 4 and all callers (index.ts, crud.ts). `media_tokens: Record<string,string>` is the same shape server-side (Task 6), in the type (Task 3), and client-side (Task 7/8). Token format `"<exp>.<sig>"` is identical in `signMediaToken`, `verifyMediaToken`, and the client `t=` param. `getMediaToken`/`registerMediaTokens` names match across Tasks 7–8.

**Known follow-ups (not gaps, deliberately deferred):** image resizing — routing images through the proxy serves full-resolution bytes for every tier (Google's `=w400`/`=w1600` resizing is lost with private Drive); bandwidth is free so this is a *performance* follow-up (Cloudflare Image Resizing / cached derivatives), and the `tier=` hint param is already carried in `getImageUrl` so a later resizing layer needs no client change.
