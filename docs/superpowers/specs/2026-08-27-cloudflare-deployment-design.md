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

## Out of scope

Google-hosted deployment, CI/CD automation (GitHub push-to-deploy can be added later via `wrangler` in a workflow), custom analytics dashboards, and any code changes beyond the two deploy-wiring edits above.
