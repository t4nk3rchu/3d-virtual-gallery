---
version: 1
slug: "src-components-viewer-exhibitionviewer-tsx"
primary_target: "src/components/viewer/ExhibitionViewer.tsx"
related_targets: []
---

# Viewer surface brief

**Scope:** The visitor Exhibition Viewer (landing/loading/entrance, roam HUD, focus mode, inspect). Lead surface establishing the redesigned REDA visual world; Landing and Studio inherit it later.

**Visitor mode:** Experience — the visitor is inside the work; the interface recedes.

**Audience & job:** Exhibition visitors and art enthusiasts on mobile and desktop, walking a curator's 3D exhibition and leaning into single works. No downloads. Vietnamese by default, English alternate (bilingual is a later build; type must already carry Vietnamese).

**Must remain untouched:** All behavior — navigation, gravity, focus/inspect flow, audio system, hotspots, render-on-demand, the mobile CSS-3D flatten, the Cloudflare/Drive/D1 platform. This is a restyle: replace the visual layer, preserve structure and function.

**Memorable moment:** A lit oil-canvas entrance that fades into a walkable gallery — the room, not a HUD, is the first thing you feel.

**Unresolved:** Emblem/mark (open — may be revised); oil-canvas texture asset provenance (reuse/adapt the team prototype's `landing-bg.jpg` vs. author new).

## Direction contract

THESIS: The exhibition is the room; the interface is a whisper. Refuses the "3D web app + persistent chrome HUD" default — controls dissolve into the dark until the art calls them forward.

OWN-WORLD: Warm-charcoal spotlight. Grounds `#0e0d0a → #171610 → #1f1d16`, a single gold accent `#c9a35b`, bone text `#ece6da`, hairlines at 12% bone; oil-canvas texture on landing/loading. Type: Playfair Display (display), Merriweather (reading body), Be Vietnam Pro (UI/labels), JetBrains Mono (technical kickers) — all full Vietnamese. Rounded glass pills for controls; no backdrop-filter blur on mobile.

STORY: The visitor arrives at a lit canvas, enters one gallery, walks it, and leans into single works — understanding a body of work as a place, in Vietnamese by default.

FIRST VIEWPORT: Full-bleed oil-canvas ground; centered Playfair wordmark with a single JetBrains-Mono kicker and a gold enter action; no nav bar. The 3D room fades up behind on enter.

FORM: Pinned world — the team prototype's consolidated REDA (`D:/Claude/reda-mus-prototype-main`), adapted to two registers. No roll (user-pinned); code-led, no seed key.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
