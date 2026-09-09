# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Curators, Galleries, Artists & Estates**: Cultural curators and estate managers who organize, narrate, and publish 3D virtual exhibitions of physical or digital art collections.
2. **Exhibition Visitors & Art Enthusiasts**: General public and art collectors who explore and walk exhibitions in the browser across mobile and desktop, with no downloads or install.

## Product Purpose

**REDA — Legacy & Archive.** A platform where a curator, gallery, artist, or estate builds a **3D exhibition of a body of work** and publishes it as a single link. The product preserves and re-presents a lifetime of work as a walkable, narrated 3D archival experience.

## Positioning

"Building a *story* around the art, not just hosting a room." REDA pairs a robust WebGL 3D spatial engine with a serverless Cloudflare edge proxy for **private** Google Drive assets — so a curator publishes a narrated, spatial exhibition from files they already own, without moving, re-hosting, or exposing them.

## Operating Context

- **Curator Studio Workbench**: A live 3D Babylon.js canvas with transform gizmos, custom visitor spawn points, an artist-profile manager, a waypoint editor, per-artwork hotspots with audio, and instant publishing.
- **Visitor Exhibition Viewer**: An immersive 3D gallery with desktop WASD/mouse navigation, a mobile touch virtual joystick, continuous floor-raycast gravity, a 90° straight-on focus mode, audio-guide narration, a full-resolution inspect view (pan / zoom / 3D tilt) with interactive hotspots, and theatrical entrance transitions.

## Capabilities and Constraints

- **3D Spatial Engine**: Babylon.js 7 WebGL2 with dynamic resolution scaling, render-on-demand, floor collision detection, camera-animation interpolation, and a 2D catalog fallback for non-WebGL hardware.
- **Artwork types**: 2D image and video today; **3D model (`MODEL_3D`)** is specced and planned — a low-poly roam proxy plus a dedicated 360° inspect viewer with surface-anchored hotspots. Audio is supported as narration guides and per-hotspot clips, not as a standalone artwork type.
- **Private Media Architecture**: Google Drive assets streamed through a Cloudflare Worker service-account proxy (`/api/media/:fileId`) with signed HMAC-SHA256 tokens (ADR-0001), edge-cached.
- **Persistence & Hosting**: Cloudflare D1 (SQLite) for exhibitions, artworks, artists, and hotspots; Cloudflare Pages/Workers for hosting and the API.
- **Bilingual EN/VI**: The product must support Vietnamese and English for **both** UI chrome and exhibition content, with **Vietnamese as the primary/default language** and English as the alternate. Bilingual infrastructure (language switcher, string externalization, bilingual content model) is a planned build, sequenced after the visual redesign.
- **Cross-platform responsive**: Mobile and desktop, portrait and landscape.

## Brand Commitments

- **Name**: Reda Gallery (fixed).
- **Emblem**: Retained. The existing Gold Medallion logo (`public/reda_logo.png`, includes the "Reda Gallery" wordmark) stays as the brand mark through the redesign — confirmed by the user, no longer open.
- **Voice, typography, and palette**: Being redesigned; not fixed in this record. (The prototype at `D:/Claude/reda-mus-prototype-main` is a reference/anti-reference, not a binding spec.)
- **Constraint**: All brand and UI typography must render **full Vietnamese diacritics** correctly — this constrains font selection in the visual world.

## Evidence on Hand

- Foundation & deployment specs: `docs/superpowers/specs/2026-08-30-reda-design-system-foundation.md`, `docs/superpowers/specs/2026-08-27-cloudflare-deployment-design.md`
- 3D model support: `docs/superpowers/specs/2026-09-04-3d-model-support-design.md`, `docs/superpowers/plans/2026-09-04-3d-model-support.md`
- Service-account media auth: `docs/ADR-0001-service-account-media-auth.md`
- Release & architecture notes: `docs/note.md`
- Team reference prototype (three.js single-room gallery; **not** part of this codebase, used as visual/UX reference and anti-reference): `D:/Claude/reda-mus-prototype-main`
- No customer testimonials, benchmarks, pricing, or licensing claims exist yet; future work must not fabricate them.

## Product Principles

1. **The art is the hero; the interface carries the story** — chrome recedes where art appears.
2. **Publish from assets you already own** — private Drive media, one link, zero downloads for the visitor.
3. **One exhibition, three modes of engagement** — persuade (landing), operate (studio), experience (viewer).
4. **It works on the visitor's device** — mobile and desktop, with a graceful non-WebGL fallback.
5. **Vietnamese-first, English-ready** — the product speaks Vietnamese by default without treating English as an afterthought.

## Accessibility & Inclusion

- Bilingual EN/VI, Vietnamese default; all typography must carry complete Vietnamese diacritics.
- High-contrast color pairings; aim for WCAG AA text contrast or better.
- Icon-based UI with descriptive `aria-label`, `role`, and keyboard accessibility.
- Automatic 2D fallback catalog for low-power devices and assistive technologies.
