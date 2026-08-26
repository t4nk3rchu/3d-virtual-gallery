# Review: 3D Virtual Gallery — Spec & Plan

**Reviewed:** `docs/spec/...Complete Design Specification.md`, `docs/plan/...Complete Implementation Plan.md`
**Date:** 2026-08-25

---

## Confirmed product context (from Q&A)

- **Product:** multi-tenant platform — curators log in and publish 3D exhibitions of their art.
- **Scale:** ~5 curators, ~100 concurrent visitors at launch. Architect so scale isn't *blocked*; do **not** pre-build for scale you don't have.
- **Storage:** Google Drive only (curator's Drive or "our" Drive). Files set to **public link**; **Google OAuth** used for the authoring Drive picker, not for serving.
- **Auth:** Google OAuth (primary) + email/password fallback (for curators with no Google account, using our Drive). Persistence needed for templates, returning curators, stats.
- **Rooms:** GLB import only at launch; 3D gizmo kept for placing/fine-tuning artworks. Parametric in-browser builder → phase 2.
- **Artworks (phase 1):** 2D image (Google image CDN), video (**YouTube** only), audio (Worker proxy). 3D sculpture → phase 2.
- **Viewer:** three-state model — **Roam → Focus → Inspect**. Guided tour **cut**. Mini-map → phase 2.
- **Analytics:** medium (per-artwork engagement) at launch; deep dashboards later.
- **Access control:** draft vs published only at launch; password-gated exhibitions → phase 2.
- **Stack:** Babylon.js locked in. No public SEO needed. Drop Next.js → **Vite + React SPA (Pages) + Workers API**.

---

## Overall verdict

Competent but **over-scoped Kunstmatrix clone** with **load-bearing technical bugs** and a **stack mismatch**. Reads as AI-generated: internally consistent, but padded with features never requested (guided tour) and confident about integrations that don't work as written (edge caching, Drive downloads). Bones are reusable; scope and a few core mechanisms are not. Net: roughly **half** the documented scope should ship in phase 1 — the half that matters.

---

## Must-fix correctness bugs (break the product, not just polish)

1. **Edge cache is never populated.** The media proxy sets a `Cache-Control` header but never calls the Cloudflare **Cache API** (`caches.default.match/put`). At this scale the cache is the *entire* reason Drive survives 100 concurrent visitors — this bug is the difference between "works" and "Drive 403s on opening night." **#1 priority.**
2. **Drive `uc?export=download` returns an HTML virus-scan interstitial** for large files (room GLBs). The proxy will cache that HTML *as* the model. Needs confirm-token handling or a different endpoint.
3. **Range requests mishandled** — forwarding `Range` but returning upstream status blindly breaks audio seeking and risks caching a `206` partial as the whole file.
4. **`lh3.googleusercontent.com/d/{id}`** (entire 2D image path) is undocumented and Google-breakable — needs a fallback plan.
5. **bcrypt/Argon2 don't run on Workers** — the email/password fallback must use WebCrypto/PBKDF2.

---

## Cut (unrequested or not phase 1)

- **Automated guided tour** — never requested; a table + type + Task 7 + UI button. Delete entirely. (The thing actually wanted — click-to-focus — is a different feature; see below.)
- **Password-protected exhibitions** → phase 2. Drop `password_hash` from the exhibition path.
- **Parametric in-browser room builder** (2D floor-plan editor, wall drawing, CSG doorways, material/lighting inspectors, template authoring) → phase 2. ~30–40% of the build, off the critical path.
- **Mini-map** → phase 2 (also needs redesign — it reads parametric walls that GLB rooms don't have).
- **3D sculpture artworks** → phase 2.
- **Next.js** → replace with Vite SPA + Workers.

---

## Specified but never actually built (spec ↔ plan gaps)

- **The 3-tier resolution scaler is dead code** — built with a test, never called. Wire it to Roam→Focus→Inspect.
- **No click handling in the viewer** — no pointer-pick, so click-to-focus and click-to-inspect can never fire. The whole interaction model is missing its trigger.
- **`artwork-factory` only handles 2D images** — video (YouTube) and audio paths are unbuilt.
- **No production D1 accessor** — only a Node `better-sqlite3` test shim exists; nothing obtains the real D1 binding.

---

## Needed but entirely absent (requirements not in the docs)

- **Auth** — no task exists at all, despite the `users` table. Need Google OAuth (primary) + WebCrypto password fallback + Drive picker integration.
- **Curator CMS/dashboard** — create exhibition, import GLB room, Drive picker, place art via gizmo, publish. Plan has *viewer* pieces but almost no *authoring* backend or CRUD APIs.
- **Analytics** — medium-depth engagement tracking; route to **Workers Analytics Engine**, not D1 (D1's write throughput can't take per-visitor event volume and would contend with app writes).
- **The Focus-state slide-out info panel** — plan jumps straight to a full-screen lightbox; the three-state model needs the intermediate in-scene panel.

---

## Corrected viewer interaction model

| State | Trigger | What happens | Resolution tier |
|---|---|---|---|
| **Roam** | default | drag to look, walk with keys, click floor to move | WALK (75%) |
| **Focus** | click artwork | camera glides, art centers in-scene, **info panel slides from edge** | FOCUS (90%) |
| **Inspect** | click again | full-res pop-up lightbox, pan/zoom, **hotspots** | POPUP (100%) |

`CameraController.focusOnArtwork()` (Task 6) covers the glide but is never wired to a click. The scaler tiers already exist and map exactly onto these states.

---

## Plan-quality issues

- **Test theater** — `exhibition-page.test.ts` asserts a function *exists*; `focus-modal.test.ts` re-tests something already covered. The genuinely risky logic (proxy caching, Range, camera collision) has *no* runnable test and is punted to E2E that's never written. TDD ceremony applied to trivial parts, skipped on the parts that matter.
- **IDs via `Date.now()+Math.random()`** — use `crypto.randomUUID()` (available at edge, collision-safe).

---

## Net phase-1 scope (what actually ships)

Vite+React SPA + Workers/D1 · Google OAuth + password fallback · GLB room import + gizmo artwork placement · 2D image (CDN) / video (YouTube) / audio (proxy) · Roam→Focus→Inspect viewer with hotspots + deep-zoom + **working** resolution scaler · WebGL fallback catalog · **working edge-cached media proxy** · draft/publish · medium analytics via Analytics Engine.

## Phase 2 (deferred)

Parametric in-browser room builder + template authoring · mini-map · 3D sculpture artworks · guided tour (only if actually wanted) · password-gated exhibitions · deep analytics dashboards.
