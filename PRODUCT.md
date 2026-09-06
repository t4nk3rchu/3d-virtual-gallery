# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Curators, Galleries, Artists & Estates**: Cultural curators and estate managers who organize, narrate, and publish 3D virtual exhibitions of physical or digital art collections.
2. **Exhibition Visitors & Art Enthusiasts**: General public and art collectors who explore and walk exhibitions in the browser across mobile and desktop without downloads or friction.

## Product Purpose

**REDA — Legacy & Archive.** A platform where a curator, gallery, artist, or estate builds a **3D exhibition of a body of work** and publishes it as a single link. The product preserves and re-presents a lifetime of work as a walkable, narrated 3D archival experience.

## Positioning

"Building a *story* around the art, not just hosting a room." 

REDA pairs an architectural Renaissance Codex aesthetic (da Vinci art-meets-engineering spirit: tree fused with circuit traces mark, charcoal + parchment, Didone display, spotlit classical art, gold/oxblood/sage accents) with a robust WebGL 3D spatial engine and serverless Cloudflare edge proxy for private Google Drive assets.

## Operating Context

- **Curator Studio Workbench**: Monograph/Atelier hybrid environment with live 3D Babylon.js canvas, transform gizmos, custom spawn points, artist profile manager, waypoint editor, and instant publishing.
- **Visitor Exhibition Viewer**: Spotlight dark immersive 3D gallery with desktop WASD/mouse navigation, mobile touch virtual joystick, continuous floor raycasting gravity, 90° straight-on focus mode, audio guide narration, full-resolution inspect lightbox with interactive hotspots, and theatrical entrance transitions.

## Capabilities and Constraints

- **3D Spatial Engine**: Babylon.js 7 WebGL2 engine with dynamic resolution scaling, floor collision detection, camera animation interpolation, and 2D Monograph fallback for non-WebGL hardware.
- **Private Media Architecture**: Google Drive media assets stored securely and streamed via Cloudflare Worker Service Account proxy (`/api/media/:fileId`) with signed HMAC-SHA256 tokens (ADR-0001).
- **Multi-Register Design System**:
  - *Monograph (light)*: Parchment grounds (`--reda-parch`), ink typography (`--reda-ink`) for narrative and composition.
  - *Spotlight (dark)*: Charcoal grounds (`--reda-char`), value-neutral art wall (`--reda-wall`), cream text (`--reda-cream`) for immersive viewing.
- **Cross-Platform Responsive**: Fluid typography, responsive HUDs, landscape/portrait mobile controls, zero layout shifting on modal expansion.

## Brand Commitments

- **Name**: Reda Gallery
- **Emblem**: Reda Gold Medallion (`public/reda_logo.png`) — tree fused with circuit traces.
- **Typography Tokens**:
  - `Libre Bodoni`: Display headers, hero titles, artwork titles, folios.
  - `Montserrat`: Functional UI labels, buttons, navigation, kickers.
  - `EB Garamond`: Reading copy, wall descriptions, artist biographies.

## Evidence on Hand

- Foundation Design Spec: `docs/superpowers/specs/2026-08-30-reda-design-system-foundation.md`
- Cloudflare Deployment Architecture: `docs/superpowers/specs/2026-08-27-cloudflare-deployment-design.md`
- Service Account Media Auth: `docs/ADR-0001-service-account-media-auth.md`
- Release & Architecture Notes: `docs/note.md`
- Core UI Style Sheets: `src/styles/reda-ui.css`, `src/styles/reda-studio.css`, `src/styles/reda-viewer.css`

## Product Principles

1. **The art is the hero; the interface carries the story**: Chrome recedes where art appears.
2. **The wall is neutral; the brand is warm**: The surface behind artwork is a value-neutral stage; brand warmth lives in the chrome, frames, and accents.
3. **One system, two registers, three modes**: Monograph (light) for narrative/editing; Spotlight (dark) for immersive experience; Landing = Persuade, Studio = Operate, Viewer = Experience.
4. **Drama in the details, never in the way of the task**: Display typography is reserved for titles and focal moments; functional controls remain crisp and familiar.
5. **Grounded, not decorative**: Classical motifs reflect historical codex notebooks and reinforce the brand rather than acting as extraneous ornament.

## Accessibility & Inclusion

- High-contrast color pairings conforming to WCAG AAA standards (`--reda-cream` on dark grounds, `--reda-ink` on parchment).
- Icon-based UI with descriptive `aria-label`, `role`, and keyboard accessibility.
- Automatic 2D Monograph fallback catalog for visitors on low-power devices or assistive technologies.
