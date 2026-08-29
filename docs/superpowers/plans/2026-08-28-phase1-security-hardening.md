# Phase-1 Security Hardening & Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining phase-1 review findings before real curators use the app (OAuth login-CSRF, over-broad Google Drive scope, unthrottled analytics beacon, missing intro-video hint, N+1 hotspot query) **and add the Google Drive Picker** (Design 1: standard Picker + validate-on-select, minimal `drive.file` scope) that was missed in phase 1.

**Architecture:** Findings 1/3/5 are worker-side, 4 is a studio hint, 6 (Drive Picker) is client-side (Google Picker via `@googleworkspace/drive-picker-react`) plus a small `is_team` flag for the role-gated "Shared with me" tab. No change to the media *serving* model (still public-link + CDN + edge cache) and no viewer API-contract change — the front-end redesign is unaffected. Same all-Cloudflare stack.

**Tech Stack:** TypeScript, Cloudflare Workers + D1 + Analytics Engine + Rate Limiting binding, Vitest, wrangler.

## Global Constraints

- **Package manager:** `pnpm`. Tests: `pnpm test` (`vitest run`). Build: `pnpm build` (`tsc -b && vite build`). **Build is the real gate** — vitest skips type-checking.
- **Secrets** via `wrangler secret`; never in `wrangler.toml`. Cookies always `HttpOnly; Secure; SameSite=Lax; Path=/`.
- **No API contract changes** — response shapes and routes stay as they are so the upcoming front-end redesign builds on a stable contract.
- **Do not `git commit`** until the user explicitly verifies.

---

### Task 1: OAuth `state` parameter (fix login-CSRF)

**Files:**
- Modify: `worker/jwt.ts` (add state-cookie helpers + a shared cookie reader)
- Modify: `worker/auth.ts` (`handleGoogleAuthStart`, `handleGoogleAuthCallback`)
- Test: `worker/auth.test.ts`

**Interfaces:**
- Consumes: `crypto.randomUUID()`.
- Produces:
  - `readCookie(req: Request, name: string): string | null` in `jwt.ts`.
  - `buildStateCookie(state: string): string` → `oauth_state=<state>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`.
  - `clearStateCookie(): string` → same with `Max-Age=0`.
  - `handleGoogleAuthStart` returns a 302 that both sets `oauth_state` and includes `state` in the Google URL.
  - `handleGoogleAuthCallback` returns **403** when the `state` query param is missing or doesn't match the `oauth_state` cookie.

- [ ] **Step 1: Write the failing tests**

Add to `worker/auth.test.ts` (follow the existing Env/request mock pattern in that file):

```ts
it('sets an oauth_state cookie and includes state in the Google authorize URL', () => {
  const req = new Request('https://app.example.com/api/auth/google');
  const res = handleGoogleAuthStart(req, env);
  const location = res.headers.get('Location')!;
  const setCookie = res.headers.get('Set-Cookie')!;
  const stateInUrl = new URL(location).searchParams.get('state');
  expect(stateInUrl).toBeTruthy();
  expect(setCookie).toContain('oauth_state=');
  expect(setCookie).toContain(stateInUrl!); // cookie value matches the URL state
  expect(setCookie).toContain('HttpOnly');
});

it('rejects the callback when state is missing or mismatched', async () => {
  // No cookie, no state → 403
  const bad = new Request('https://app.example.com/api/auth/google/callback?code=x');
  expect((await handleGoogleAuthCallback(bad, env)).status).toBe(403);

  // Mismatched state → 403
  const mismatched = new Request(
    'https://app.example.com/api/auth/google/callback?code=x&state=aaa',
    { headers: { Cookie: 'oauth_state=bbb' } }
  );
  expect((await handleGoogleAuthCallback(mismatched, env)).status).toBe(403);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run worker/auth.test.ts -t "state"`
Expected: FAIL — no state handling yet.

- [ ] **Step 3: Add cookie helpers in `worker/jwt.ts`**

```ts
/** Read a single cookie value from a request. */
export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('Cookie') ?? '';
  const m = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

export function buildStateCookie(state: string): string {
  return `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;
}

export function clearStateCookie(): string {
  return 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}
```

(Refactor `requireAuth` to use `readCookie(req, 'auth_token')` instead of its inline regex — same behavior, one cookie parser.)

- [ ] **Step 4: Wire state into `worker/auth.ts`**

Import the helpers. Rewrite `handleGoogleAuthStart` to emit state + cookie via a manual 302 (Response.redirect can't set cookies):

```ts
import { signJwt, buildAuthCookie, clearAuthCookie, buildStateCookie, clearStateCookie, readCookie } from './jwt';

export function handleGoogleAuthStart(req: Request, env: Env): Response {
  const redirectUri = getRedirectUri(req);
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile', // Task 2: narrowed scope
    state,
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${GOOGLE_AUTH_URL}?${params}`,
      'Set-Cookie': buildStateCookie(state),
    },
  });
}
```

In `handleGoogleAuthCallback`, before exchanging the code, validate state:

```ts
const url = new URL(req.url);
const code = url.searchParams.get('code');
const stateParam = url.searchParams.get('state');
const stateCookie = readCookie(req, 'oauth_state');
if (!code) return new Response('Missing auth code', { status: 400 });
if (!stateParam || !stateCookie || stateParam !== stateCookie) {
  return new Response('Invalid OAuth state', { status: 403 });
}
```

On the successful 302 back to `/`, also clear the state cookie. Set-Cookie can appear twice — use `Headers` and `append`:

```ts
const headers = new Headers({ Location: '/' });
headers.append('Set-Cookie', buildAuthCookie(token));
headers.append('Set-Cookie', clearStateCookie());
return new Response(null, { status: 302, headers });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run worker/auth.test.ts`
Expected: PASS (new state tests + existing auth tests).

---

### Task 2: Narrow the Google OAuth scope (drop unused `drive.readonly`)

**Files:**
- Modify: `worker/auth.ts` (already edited in Task 1 Step 4 — scope is now `openid email profile`)
- Test: `worker/auth.test.ts`

**Rationale:** the OAuth `access_token` is used **only** to call the userinfo endpoint (`sub/email/name`); no Drive API call exists anywhere. `drive.readonly` is a Google *restricted* scope (unverified-app 100-user cap + scary consent + required security assessment) — pure liability with zero current use. Media is served from public Drive links, not via the token.

**Interfaces:**
- Produces: authorize URL scope = `openid email profile` (no `drive.*`).

- [ ] **Step 1: Write the failing test**

```ts
it('requests only identity scopes, not Drive', () => {
  const res = handleGoogleAuthStart(new Request('https://app.example.com/api/auth/google'), env);
  const scope = new URL(res.headers.get('Location')!).searchParams.get('scope') ?? '';
  expect(scope).toContain('openid');
  expect(scope).toContain('email');
  expect(scope).not.toContain('drive');
});
```

- [ ] **Step 2: Run test**

Run: `pnpm exec vitest run worker/auth.test.ts -t "identity scopes"`
Expected: PASS if Task 1 Step 4 already set `scope: 'openid email profile'`; otherwise fix the scope string there.

- [ ] **Step 3: Document that Drive access is picker-scoped**

Add a comment above the scope line: the **login** flow requests identity scopes only; the Drive Picker (Task 6) requests **`https://www.googleapis.com/auth/drive.file`** on demand via its own token flow (never `drive.readonly`). This keeps login minimal and avoids Google restricted-scope verification.

- [ ] **Step 4: Also remove now-pointless `access_type: 'offline'` / `prompt: 'consent'`**

They force a refresh token that is never stored or used. Confirm they're absent from the Task 1 params block (the rewrite above already omits them). No refresh-token code exists to break.

---

### Task 3: Rate-limit the `/api/events` beacon

**Files:**
- Modify: `wrangler.toml` (add a Rate Limiting binding)
- Modify: `worker/types.ts` (add the binding to `Env`)
- Modify: `worker/routes/events.ts`
- Test: `worker/events.test.ts`

**Interfaces:**
- Consumes: `env.EVENTS_LIMITER.limit({ key })` → `{ success: boolean }`.
- Produces: `handleEvents` returns **429** when the per-IP limit is exceeded, before writing any data point.

> **Verify at implementation time:** the exact `[[ratelimits]]` wrangler syntax and allowed `period` values (currently 10 or 60 seconds) against current Cloudflare docs — the binding API has shifted names historically.

- [ ] **Step 1: Write the failing test**

Add to `worker/events.test.ts`:

```ts
it('returns 429 when the rate limiter denies the request', async () => {
  const env = makeEnv({ EVENTS_LIMITER: { limit: async () => ({ success: false }) } });
  const req = new Request('https://app.example.com/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
    body: JSON.stringify([{ kind: 'exhibition_view', exhibition_id: 'e1' }]),
  });
  const res = await handleEvents(req, env);
  expect(res.status).toBe(429);
});

it('writes normally when under the limit', async () => {
  const writes: unknown[] = [];
  const env = makeEnv({
    EVENTS_LIMITER: { limit: async () => ({ success: true }) },
    AE: { writeDataPoint: (d: unknown) => writes.push(d) },
  });
  const req = new Request('https://app.example.com/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
    body: JSON.stringify([{ kind: 'exhibition_view', exhibition_id: 'e1' }]),
  });
  const res = await handleEvents(req, env);
  expect(res.status).toBe(204);
  expect(writes.length).toBe(1);
});
```

(Extend the existing `makeEnv`/AE mock in that file to also carry `EVENTS_LIMITER`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run worker/events.test.ts -t "rate"`
Expected: FAIL — no limiter call yet.

- [ ] **Step 3: Add the binding config**

`wrangler.toml`:

```toml
[[ratelimits]]
name = "EVENTS_LIMITER"
namespace_id = "1001"
simple = { limit = 120, period = 60 }
```

`worker/types.ts` — add to `Env`:

```ts
EVENTS_LIMITER: RateLimit;
```

(`RateLimit` is provided by `@cloudflare/workers-types`; if not resolved, define `interface RateLimit { limit(o: { key: string }): Promise<{ success: boolean }> }`.)

- [ ] **Step 4: Enforce it in `handleEvents`**

At the top of `handleEvents`, after the method check:

```ts
const ip = req.headers.get('CF-Connecting-IP') ?? 'anon';
const { success } = await env.EVENTS_LIMITER.limit({ key: ip });
if (!success) return new Response('Too Many Requests', { status: 429 });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run worker/events.test.ts`
Expected: PASS.

---

### Task 4: Intro-video size hint in the studio

**Files:**
- Modify: `src/components/studio/StudioApp.tsx` (near the `intro_video_file_id` input, ~line 876)

**Rationale:** the spec constraint (≤10 s / ≤20 MB) can't be hard-validated for a Drive-linked file client-side; surface it as curator guidance so nobody links a full-length video that stalls the loader.

- [ ] **Step 1: Add the hint (no test — trivial static copy)**

Directly below the intro-video input, add:

```tsx
<p className="hint" style={{ marginTop: '0.25rem' }}>
  Keep it short — a few seconds, ≤ 20 MB. Long or high-bitrate clips stall the loader
  (served from Google Drive; artwork video should use YouTube instead).
</p>
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: exits 0.

---

### Task 5: Batch the N+1 hotspot query

**Files:**
- Modify: `worker/db.ts` (`getExhibitionBySlug`, `getExhibitionById`)
- Test: `worker/db.test.ts`

**Rationale:** both hydrators run one `SELECT ... FROM artwork_hotspots WHERE artwork_id = ?` per artwork inside `Promise.all`. Replace with a single `IN (...)` query grouped in JS. Behavior identical; fewer round-trips.

**Interfaces:**
- Produces: unchanged return shape — `artworks[].hotspots` populated identically.

- [ ] **Step 1: Write the failing/guard test**

Add to `worker/db.test.ts`:

```ts
it('hydrates hotspots for multiple artworks correctly (batched)', async () => {
  const db = await makeTestDb();
  const { exId } = await seedExhibition(db); // existing helper or inline
  const a1 = await createArtworkRecord(db, { exhibition_id: exId, title: 'A1', artist: 'X', artwork_type: 'IMAGE_2D', media_file_id: 'm1', transform_json: '{}', frame_config_json: '{}', order_index: 0 } as never);
  const a2 = await createArtworkRecord(db, { exhibition_id: exId, title: 'A2', artist: 'X', artwork_type: 'IMAGE_2D', media_file_id: 'm2', transform_json: '{}', frame_config_json: '{}', order_index: 1 } as never);
  await createHotspot(db, { artwork_id: a1.id, x_percent: 10, y_percent: 10, title: 'h1', description: 'd' } as never);
  await createHotspot(db, { artwork_id: a2.id, x_percent: 20, y_percent: 20, title: 'h2', description: 'd' } as never);

  const detail = await getExhibitionBySlug(db, /* slug */ (await getExhibitionById(db, exId))!.slug);
  const byId = Object.fromEntries(detail!.artworks.map((a) => [a.id, a]));
  expect(byId[a1.id].hotspots.map((h) => h.title)).toEqual(['h1']);
  expect(byId[a2.id].hotspots.map((h) => h.title)).toEqual(['h2']);
});
```

- [ ] **Step 2: Run test (should pass pre-refactor — it's a behavior guard)**

Run: `pnpm exec vitest run worker/db.test.ts -t "batched"`
Expected: PASS (guards current behavior before refactor).

- [ ] **Step 3: Refactor both hydrators to a single query**

Replace the per-artwork hotspot loop (in both `getExhibitionBySlug` and `getExhibitionById`) with:

```ts
const artworkRowsList = artworkRows.results ?? [];
const ids = artworkRowsList.map((a) => a.id);
const hotspotsByArtwork = new Map<string, ArtworkHotspot[]>();
if (ids.length > 0) {
  const placeholders = ids.map(() => '?').join(',');
  const allHotspots = await db
    .prepare(`SELECT * FROM artwork_hotspots WHERE artwork_id IN (${placeholders})`)
    .bind(...ids)
    .all<ArtworkHotspot>();
  for (const h of allHotspots.results ?? []) {
    const list = hotspotsByArtwork.get(h.artwork_id) ?? [];
    list.push(h);
    hotspotsByArtwork.set(h.artwork_id, list);
  }
}
const artworks = artworkRowsList.map((a) => ({
  ...a,
  hotspots: hotspotsByArtwork.get(a.id) ?? [],
  artist_profile: a.artist_id ? artistsMap.get(a.artist_id) ?? null : null,
}));
```

(The `placeholders` list is built only from server-controlled artwork ids and bound as parameters — no injection. Same shape out; the surrounding `artists`/`artistsMap` code stays.)

- [ ] **Step 4: Run the full suite + build**

Run: `pnpm build && pnpm test`
Expected: build exits 0; all tests pass (including the batched-hydration guard).

---

### Task 6: Google Drive Picker (Design 1 — widget + validate-on-select)

**Files:**
- Modify: `package.json` (add `@googleworkspace/drive-picker-react`)
- Create: `src/lib/studio/drive-share.ts` (pure helper: detect anyone-with-link)
- Create: `src/components/studio/DriveFilePicker.tsx` (the picker component)
- Modify: `src/components/studio/ArtworkForm.tsx`, `src/components/studio/RoomImporter.tsx` (add "Pick from Google Drive" using it)
- Create: `migrations/0006_users_team_flag.sql`
- Modify: `worker/db.ts`, `worker/jwt.ts`, `worker/auth.ts`, `worker/index.ts` (`/api/auth/me` returns `is_team`)
- Test: `src/lib/studio/studio.test.ts`, `worker/auth.test.ts`

**Design (confirmed):** use Google's standard Picker via the maintained `@googleworkspace/drive-picker-react` wrapper. The Picker requests `drive.file` on demand (no login-scope change, no Google verification). After the curator picks, the app reads *that picked file's* permissions and **accepts only anyone-with-link files**, rejecting private picks with a "share it first" message. The Picker CANNOT pre-filter by sharing state (verified against Google docs), so filtering happens at selection, not in the list.

**Tabs (per role):** every user gets **My Drive** (`ownedByMe`) and **Shared Drives** (`enableDrives`). Users who are **admin or team members** additionally get **Shared with me** (`ownedByMe={false}`). "Team" needs a flag — added below.

**GCP prerequisites (one-time, done by the user — not code):**
- Enable **Google Picker API** and **Google Drive API** in the GCP project.
- Create a **browser API key** (restrict to the Picker API + the app's domains).
- Note the **project number** (used as the Picker `appId`).
- Add the deployed origin (`https://virtual-gallery.<account>.workers.dev` and later the custom domain) to the OAuth client's **Authorized JavaScript origins**.
- The OAuth consent screen must list the `drive.file` scope (the user said they'll set this up).

**Build-time config (public by design — client id / api key / app id are browser-exposed):**
`VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`, `VITE_GOOGLE_APP_ID` in the SPA's `.env` (read via `import.meta.env`).

**Interfaces:**
- Produces:
  - `isAnyoneWithLink(permissions: Array<{ type: string }>): boolean` — true iff any permission `type === 'anyone'`.
  - `<DriveFilePicker mimeTypes={string} isTeam={boolean} onPicked={(fileId: string) => void} onRejected={(name: string) => void} />`.
  - `/api/auth/me` response gains `is_team: boolean` (`role === 'admin' || users.is_team_member === 1`).

- [ ] **Step 1: Add the team flag (migration + DB + auth)**

`migrations/0006_users_team_flag.sql`:

```sql
-- Migration 0006: mark internal team members (get the "Shared with me" picker tab)
ALTER TABLE users ADD COLUMN is_team_member INTEGER NOT NULL DEFAULT 0;
```

In `worker/jwt.ts`, add `is_team?: boolean` to `JwtPayload`. In `worker/auth.ts`, when signing tokens, include `is_team: user.role === 'admin' || user.is_team_member === 1` (ensure `getUserByEmail`/`upsertGoogleUser` select `is_team_member`; add it to the `User` type in `src/types/schema.ts`). In `worker/index.ts` `/api/auth/me`, return `is_team: auth.is_team ?? false`.

- [ ] **Step 2: Write the failing test for the share-detection helper**

Add to `src/lib/studio/studio.test.ts`:

```ts
import { isAnyoneWithLink } from './drive-share';

describe('isAnyoneWithLink', () => {
  it('true when an anyone permission exists', () => {
    expect(isAnyoneWithLink([{ type: 'user' }, { type: 'anyone' }])).toBe(true);
  });
  it('false for private files', () => {
    expect(isAnyoneWithLink([{ type: 'user' }, { type: 'domain' }])).toBe(false);
    expect(isAnyoneWithLink([])).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/studio/studio.test.ts -t "isAnyoneWithLink"`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement the helper**

`src/lib/studio/drive-share.ts`:

```ts
/** A Drive file is "anyone with the link" iff it has a permission of type 'anyone'. */
export function isAnyoneWithLink(permissions: Array<{ type: string }>): boolean {
  return permissions.some((p) => p.type === 'anyone');
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/studio/studio.test.ts -t "isAnyoneWithLink"`
Expected: PASS.

- [ ] **Step 6: Build the picker component**

`src/components/studio/DriveFilePicker.tsx`:

```tsx
import { DrivePicker, DrivePickerDocsView } from '@googleworkspace/drive-picker-react';
import { isAnyoneWithLink } from '../../lib/studio/drive-share';

interface DriveFilePickerProps {
  mimeTypes: string;              // e.g. 'image/png,image/jpeg' or 'model/gltf-binary'
  isTeam: boolean;
  onPicked(fileId: string): void;
  onRejected(fileName: string): void;
}

export function DriveFilePicker({ mimeTypes, isTeam, onPicked, onRejected }: DriveFilePickerProps) {
  const handlePicked = async (e: CustomEvent<{ docs: Array<{ id: string; name: string }> }>, token: string) => {
    for (const doc of e.detail.docs) {
      // Validate the picked file is anyone-with-link (Picker cannot pre-filter this).
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${doc.id}/permissions?fields=permissions(type)&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.ok ? await res.json() : { permissions: [] };
      if (isAnyoneWithLink(data.permissions ?? [])) onPicked(doc.id);
      else onRejected(doc.name);
    }
  };

  return (
    <DrivePicker
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
      appId={import.meta.env.VITE_GOOGLE_APP_ID}
      scope="https://www.googleapis.com/auth/drive.file"
      onPicked={(e: any) => handlePicked(e, e.detail?.access_token ?? e.detail?.token)}
    >
      {/* My Drive */}
      <DrivePickerDocsView viewId="DOCS" ownedByMe mimeTypes={mimeTypes} includeFolders />
      {/* Shared Drives */}
      <DrivePickerDocsView viewId="DOCS" enableDrives mimeTypes={mimeTypes} includeFolders />
      {/* Shared with me — admin/team only */}
      {isTeam && <DrivePickerDocsView viewId="DOCS" ownedByMe={false} mimeTypes={mimeTypes} includeFolders />}
    </DrivePicker>
  );
}
```

> **Verify at implementation time against the `@googleworkspace/drive-picker-react` docs:** (a) the exact event shape for the OAuth token exposed to `onPicked` (used to call the permissions endpoint), and (b) that `drive.file` permits `permissions.list` on a just-picked file. If the token isn't exposed by the wrapper or `drive.file` can't read permissions, fall back to: accept the pick and show a non-blocking warning ("make sure this file is shared with 'anyone with the link', or visitors can't see it") rather than hard-validating.

- [ ] **Step 7: Wire it into ArtworkForm and RoomImporter**

In `src/components/studio/ArtworkForm.tsx` (image/audio) and `src/components/studio/RoomImporter.tsx` (GLB), add a "📁 Pick from Google Drive" button next to the existing paste-a-link input that mounts `<DriveFilePicker>`. Pass `mimeTypes` for the field (`image/*` list, `audio/*` list, or `model/gltf-binary,application/octet-stream` for GLB), and `isTeam` from the current user (from `/api/auth/me`). `onPicked` sets the input's fileId; `onRejected(name)` shows "'{name}' isn't shared with anyone-with-link — share it in Drive, then pick again." Keep the paste field as a fallback.

- [ ] **Step 8: Full verification**

Run: `pnpm build && pnpm test`
Expected: build exits 0; all tests pass.
Manual (needs the GCP config): open ArtworkForm → Pick from Google Drive → confirm My Drive + Shared Drives tabs (and Shared-with-me only when logged in as admin/team) → picking a private file is rejected; picking a link-shared file fills the fileId.

---

## Deployment follow-through (not code — do at deploy time)

- Apply the new `[[ratelimits]]` binding via `wrangler deploy` (Task 3).
- In Google Cloud Console, the OAuth consent screen can drop the Drive scope from its configured/verified scopes once Task 2 ships.
- Keep the `/api/events` edge WAF rate-limit rule as a second layer if desired (the binding is the primary control now).

## Self-Review

**Coverage:** all five review findings map to a task — OAuth CSRF (1), over-broad scope (2), events rate-limit (3), intro-video hint (4), N+1 (5) — plus the Drive Picker feature (6). ✅ Task 2 narrows the *login* scope; Task 6 adds `drive.file` via the Picker's own token flow — no contradiction (login identity-only, picker per-file). Picker uses Design 1 (validate-on-select) because Google's Picker cannot pre-filter by sharing state (verified against Google Picker docs).
**Placeholders:** concrete code for every code step; the one caveat (Task 3 wrangler syntax / `period` values) is a genuine "verify current API" note, not a stub.
**Consistency:** `readCookie` defined in Task 1 and reused for `requireAuth`; scope string set in Task 1 Step 4 and asserted in Task 2; `EVENTS_LIMITER` named identically in wrangler.toml, `Env`, and `handleEvents`; hotspot batch preserves the exact `{...a, hotspots, artist_profile}` shape both hydrators already return.
**No API contract change** — response shapes/routes unchanged, so the front-end redesign is unaffected.
