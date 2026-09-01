# 3D Virtual Gallery — Deployment Design (All-Cloudflare)

**Date:** 2026-08-27
**Status:** design approved in brainstorming; supersedes `docs/plan/3D Virtual Gallery_ Hosting & Deployment Strategic Plan.md` (that plan targeted a Next.js/Firebase app this project is not).

## Goal

Deploy the existing app (Vite + React SPA + one Cloudflare Worker) to a live, free, recognizable URL so curators can test it — with zero backend rewrite, no cold starts, and a clean path to a custom domain later.

## Decision & rationale

**Chosen: all-Cloudflare, single Worker with a static-assets binding.** One Worker serves the SPA *and* `/api/*` from one origin.

Why this over a Google-hosted path:
- **No rewrite** — the app already runs on Cloudflare primitives (D1, Analytics Engine, Worker Cache API) that have no Google equivalent; moving would mean re-engineering all three.
- **Same origin** — SPA and API share an origin, so the JWT cookie + Google-OAuth flow work with no CORS/cross-site-cookie setup (also the more secure posture).
- **Scales on spikes without cold starts** — V8 isolates absorb load instantly, unlike Cloud Run's container boots.
- **Free unlimited egress** — streaming 25 MB GLB rooms + audio costs $0 bandwidth regardless of traffic; Google bills egress per GB.
- **$0** at this scale; **$5/mo Workers Paid** only if sustained traffic exceeds the free ~100k Worker-requests/day.

Accepted tradeoff: it's a Cloudflare console, not a Google one. Google Workspace mail + Drive are unaffected — they work regardless of app host.

> Note: exact free-tier numbers (Workers requests/day, D1 reads/writes, Analytics Engine) change over time — verify current limits in the Cloudflare dashboard at deploy time.

## Architecture

```
                     virtual-gallery.<account>.workers.dev  (free)  ──►  custom domain later
                                        │
                          ┌─────────────▼─────────────┐
                          │   Cloudflare Worker         │
                          │                             │
                          │  request /api/* ──► API     │  (auth, CRUD, media proxy, events)
                          │  else       ──► env.ASSETS  │  (SPA static files + index.html fallback)
                          └───┬─────────┬─────────┬─────┘
                              │ D1      │ AE       │ Cache API + fetch → Google Drive
                              ▼         ▼          ▼
                         virtual-    gallery_    edge cache  (GLB + audio, versioned ?v=)
                         gallery-db  events
```

Static SPA asset requests are served directly by the assets layer and (per Cloudflare's model) generally do **not** count against the Worker request quota; only `/api/*` and media-proxy requests invoke Worker code.

## Components / changes required

The code is deploy-ready except for wiring the SPA into the Worker. Two small changes:

### 1. `wrangler.toml` — add the assets binding

Add:

```toml
[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
```

`not_found_handling = "single-page-application"` makes the assets layer return `index.html` for client-side routes (`/studio`, `/e/:slug`) so deep links and refreshes work.

### 2. `worker/index.ts` — serve assets for non-API routes

Add `ASSETS: Fetcher` to the `Env` type, and at the top of the `fetch` handler, before API routing:

```ts
const url = new URL(req.url);
if (!url.pathname.startsWith('/api')) {
  return env.ASSETS.fetch(req); // SPA + static files (index.html fallback for client routes)
}
// ...existing /api/* routing continues below...
```

API paths never reach the assets layer; everything else is served as static / SPA.

## Deployment process (step by step)

Prerequisites: `wrangler` authenticated (`wrangler login`) to the account that owns `virtual-gallery-db` and the `gallery_events` Analytics Engine dataset.

1. **Build the SPA**
   ```bash
   pnpm build
   ```
   Produces `dist/` (the assets binding directory) and type-checks the Worker (`tsc -b`).

2. **Apply D1 migrations to the *remote* database** (local applies don't affect production)
   ```bash
   pnpm exec wrangler d1 migrations apply virtual-gallery-db --remote
   ```
   Applies **all pending migrations** in `migrations/` (currently `0001`–`0004`; later features add higher-numbered ones, e.g. the artist-profiles feature's `0005` — always apply whatever is present at deploy time, not a fixed range). D1 migrations are forward-only — review before applying.

3. **Set secrets** (encrypted at rest; never commit these)
   ```bash
   pnpm exec wrangler secret put JWT_SECRET_KEY
   pnpm exec wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
   ```
   `JWT_SECRET_KEY` must be a long random string. `GOOGLE_OAUTH_CLIENT_ID` stays as a public `[vars]` entry in `wrangler.toml` (it is not a secret).

4. **Deploy**
   ```bash
   pnpm exec wrangler deploy
   ```
   Uploads the Worker + `dist/` assets and prints the live URL: `https://virtual-gallery.<account>.workers.dev`.

5. **Point Google OAuth at the live URL** (required or login breaks). In Google Cloud Console → the OAuth client:
   - **Authorized JavaScript origins:** `https://virtual-gallery.<account>.workers.dev`
   - **Authorized redirect URIs:** `https://virtual-gallery.<account>.workers.dev/api/auth/google/callback`

6. **Smoke test** on the live URL: register a password curator → create an exhibition → import a room → add an image/video/audio artwork → publish → open `/e/{slug}` as a visitor → confirm media loads (second load = cache hit) and an event lands in Analytics Engine.

### Redeploy / rollback

- Redeploy: rerun steps 1 and 4. `wrangler deploy` is atomic — no partial-serve window.
- Rollback the Worker: `pnpm exec wrangler rollback` (does **not** revert D1 data/migrations — treat migrations as forward-only).

## Custom domain (when you buy one)

You do **not** point a raw A record at an IP — Workers has no fixed IP. Path:

1. Buy the domain at any registrar.
2. **Add the domain as a site in Cloudflare** (dashboard → *Add a site*). Cloudflare assigns two nameservers.
3. **At the registrar, replace the nameservers** with Cloudflare's two. Wait for activation (minutes–hours). Cloudflare now manages DNS + SSL for the zone.
4. **Attach it to the Worker:** Worker → *Settings → Domains & Routes → Add Custom Domain* → enter e.g. `gallery.example.com` (or the apex `example.com`). Cloudflare auto-creates the proxied DNS record and issues the TLS cert — no manual A/CNAME needed.
5. **Update Google OAuth** origins + redirect URI to the custom domain (step 5 above, new host).
6. **(Optional) Google Workspace mail** on the same zone: add the Workspace MX records in Cloudflare DNS. Mail and app hosting are independent — this doesn't affect the Worker.

If you ever must keep DNS at another provider, Workers custom domains still require the zone to be on Cloudflare; the nameserver move is the supported route.

## Scalability

- Workers scale instantly across the edge — no cold starts, no per-instance concurrency cliff. A spike is absorbed without provisioning.
- Ceiling is the free **~100k Worker-requests/day** (verify), not scaling ability; static SPA files generally don't count. Exceed it → **Workers Paid $5/mo (~10M requests)**.
- Egress is free under any spike; the media proxy's edge cache shields Google Drive so origin load stays flat.
- D1 (~5M reads/day) and Analytics Engine free tiers comfortably cover 5 curators / ~100 concurrent visitors.

## Security

Built-in (free): automatic DDoS protection (L3/4/7), managed TLS on `.workers.dev` and any custom domain, secrets encrypted at rest.

App-level (already in place): JWT HTTP-only cookies, PBKDF2 (WebCrypto), parameterized D1 queries, column whitelist on updates, ownership checks on mutations, `fileId` validation on the proxy, same-origin deployment (no cross-site cookies).

Two hardening items to do as part of / just after deploy:
1. **Rate-limit `/api/events`** — it's unauthenticated (batch size is already capped at 50). Add a Cloudflare rate-limiting rule for that path, or a light per-IP guard in the Worker, so it can't be spammed to pollute analytics.
2. **Confirm `JWT_SECRET_KEY` is high-entropy** and set only via `wrangler secret` (never in `wrangler.toml`).

## Media Security & Privacy

*Added 2026-08-31. Expands the deploy-hardening "Security" section above with the asset-storage threat model and its remediation path.*

### Current state

Media takes two different paths today:

- **Images** ([`getImageUrl`](../../../src/lib/media/gdrive.ts)) — the browser fetches `https://lh3.googleusercontent.com/d/{fileId}={size}` **directly**. The Worker never sees image traffic.
- **GLB / audio / video** ([`proxyMediaUrl`](../../../src/lib/media/gdrive.ts) → [`worker/media-proxy.ts`](../../../worker/media-proxy.ts)) — proxied through `/api/media/:fileId`, fetched server-side from Drive, edge-cached, served with `Access-Control-Allow-Origin: *`.

All Drive files are shared **"anyone with the link."**

### Threat model

1. **The `fileId` is a permanent public master key.** It appears in page source (image `src`, `/api/media/{id}`). Because files are "anyone with link," anyone who copies a `fileId` can fetch the full-resolution original directly from Google — indefinitely, outside the app, revocable only by un-sharing each file one by one. **This is the primary risk.**
2. **Hotlinking / bandwidth theft.** The proxy sends `ACAO: *` with no origin check, so any third-party site can embed the assets. (Bandwidth is free on Cloudflare, so this is reputational/leech, not a cost issue — see Pricing.)

### Explicit non-goal

**"Public but no download" is not achievable for web media.** Any asset a browser renders is present on the client (DevTools, save-image, screenshot). We do not pursue download prevention; it is theater. The goals are (a) close the permanent-public-original leak and (b) stop hotlinking.

### Options considered

| Option | Closes fileId leak | Stops hotlinking | New infra | Effort |
|---|---|---|---|---|
| **A. Service account + private Drive** | ✅ the real fix | only with C | ❌ Drive + Worker already in use | Medium |
| **B. Cloudflare R2 private bucket** | ✅ | ✅ | ⚠️ new bucket + upload pipeline | High |
| **C. Origin lock + signed URLs in Worker** | ❌ alone | ✅ (browsers) | ❌ | Low |

Each option's catch:
- **C alone makes nothing private** — `Referer`/`Origin` are trivially spoofed outside a browser, and it only guards the Worker path while **images bypass the Worker entirely** (lh3). Useful only combined with A and with images routed through the proxy.
- **A alone** makes Drive private (a leaked `fileId` becomes useless to outsiders — they lack the service-account token), but the Worker would still serve `/api/media/{id}` to anyone with `ACAO:*`, so signed URLs (C) belong on top.
- **B** is the clean long-term home (no Drive API quotas, free egress, native ACLs) but is a genuine new subsystem: asset migration plus a real upload pipeline (curators currently paste Drive links). Deferred.

### Decision — staged, zero-new-infra first

**Phase 1 (now, uses only Drive + Workers already provisioned): A + C, with images routed through the proxy.**

1. **Route images through the Worker.** Change `getImageUrl` to return a proxied path (image size tiers served by the Worker/`media-proxy`) instead of a direct `lh3` URL, so the app becomes the single gateway for *all* media.
2. **Service account + un-share Drive files (Option A).** Files move to private (owned by a real Drive user or a **Shared Drive**, shared to the service account — a service account has no Drive storage of its own). The Worker mints a short-lived OAuth access token by signing a JWT (RS256 via WebCrypto `crypto.subtle`), caches the token with expiry (mirror the pattern already used in [`google-picker.ts`](../../../src/lib/studio/google-picker.ts)), and fetches files with an `Authorization: Bearer` header. Edge caching means the authenticated Drive fetch happens once per file per cache-miss, so Drive API quota (~12k queries/min/project) is a non-issue.
3. **Signed URLs + origin lock (Option C, the strong half).** The API issues time-limited HMAC tokens (`fileId` + `exp` + signature) when it serves exhibition data; the proxy verifies the token and expiry before serving, and locks `Access-Control-Allow-Origin` to the app origin. A copied media link then dies within minutes and cannot be shared or hotlinked.

**Phase 2 (when Drive quotas or the Google dependency become the constraint): migrate to R2 (Option B).** R2's per-object cache behaves better than Drive-through-Worker and removes the Drive dependency entirely. Not needed at current scale.

### Streaming / memory note (prerequisite hygiene)

[`sliceRange`](../../../worker/media-proxy.ts) calls `arrayBuffer()`, buffering the whole file into the ~128MB isolate. This path is reached **only by `Range` requests**, which come from `<audio>`/`<video>` playback — **never from GLB loads** (Babylon's `SceneLoader.AppendAsync` issues a single full GET with no `Range`). Because proxied media that receives Range is small (intro video ≤ 30MB, audio a few MB; VIDEO artworks are YouTube embeds, not proxied), buffering stays well under the limit today. **Constraint:** never serve a video larger than ~100MB through the proxy. If large proxied video is ever needed, fix `sliceRange` to forward the `Range` header to the origin and stream the `206` back instead of buffering. Full-GET paths (images, GLB) already stream (`new Response(res.body, …)`) and have no size-related memory risk.

## Pricing & Capacity Model

*Added 2026-08-31. Quantifies the "Scalability" section above into a cost model.*

### What actually meters

On Cloudflare, **the cost meter is Worker request count — not file size and not bandwidth.**

- **Bandwidth / egress:** free at every tier. Streamed responses have no size cap.
- **Isolate memory (128MB):** never hit on streamed full-GET paths regardless of file size.
- **Cache per-object ceiling (~512MB, plan-dependent — verify):** the 200MB GLB cap is comfortably under it, so assets cache. If a single object ever exceeds the ceiling, `cache.put` silently fails and every load re-fetches the origin.
- **Worker requests:** the binding constraint — **free ~100k/day**, then Workers Paid **$5/mo (~10M/mo)**, overage **$0.30/million**.

### Per-visit request model

A first-time visitor pulls roughly: **(number of placed artworks) + 1 room GLB + 1 optional intro video**. All placed-artwork textures load on room entry (Babylon builds every placed mesh up front), so gallery size drives request count linearly.

### Worked scenario (100-piece gallery: 100 images @ ~3MB + 1 GLB @ 100MB + intro @ 25MB ≈ 102 requests / ~425MB per first visit)

| Visitors/day | Worker requests/day | Bandwidth/mo | Tier / cost |
|---|---|---|---|
| 100 | ~10,200 | ~1.3 TB | Free |
| 500 | ~51,000 | ~6.4 TB | Free |
| 1,000 | ~102,000 | ~13 TB | **Just over free → $5/mo Paid** |
| 10,000 | ~1.02M | ~128 TB | Paid + ~$6 overage ≈ **$11/mo** |
| 100,000 | ~10.2M | ~1.3 PB | ≈ **$89/mo** |

The bottom row's ~1.3 PB/mo would cost **~$110k/mo in AWS egress**; on Cloudflare it is **$0**. Free egress is the reason the architecture holds under spikes.

### Binding limit & mitigation ladder

The **Worker request count** is the only ceiling that bites, first at roughly **~1,000 visitors/day** for a 100-piece gallery on the free tier. Mitigations, cheapest first:

1. **Workers Paid — $5/mo** → 10M requests/mo (~2,000 heavy visits/day of headroom), then $0.30/M.
2. **Serve media via Cache Rules so edge hits bypass the Worker** — only cache *misses* then cost a Worker request, cutting the billed count by the cache-hit ratio (typically 80–95%). This is the big lever before paying for raw scale, but Worker-in-the-path currently means every request (hit or miss) executes the Worker; achieving true bypass favors a cleanly cacheable origin.
3. **R2 with a cached custom domain** — a clean cacheable origin (unlike Drive) so bypass works effortlessly, still free egress. This is the same Phase 2 migration named in Media Security.

### Headroom (not constraints at this scale)

Bandwidth (free), isolate memory (streamed), cache per-object size (< ceiling at 200MB cap), Drive API quota (shielded by edge cache), D1 (~5M reads/day), Analytics Engine free tier.

> As with the deploy note above: verify current Cloudflare request/day, cache-object-size, and pricing figures in the dashboard — these change over time.

## Out of scope

Google-hosted deployment, CI/CD automation (GitHub push-to-deploy can be added later via `wrangler` in a workflow), custom analytics dashboards, and any code changes beyond the two deploy-wiring edits above. The Media Security Phase 1 (service account + signed URLs) and Phase 2 (R2 migration) are specified here but scoped to their own implementation plans — not part of the initial deploy.
