# REDA Design System — Foundation Spec

**Date:** 2026-08-30
**Status:** Locked (brainstorming approved). Foundation only — each surface (Landing, Studio, Viewer) gets its own spec + plan afterward.
**Supersedes:** the ad-hoc `App.css` (3,233 lines) + scattered inline styles.

---

## 1. Positioning

**REDA — Legacy & Archive.** A platform where a curator, gallery, artist, or estate builds a **3D exhibition of a body of work** and publishes it as a single link. Visitors walk the collection in the browser — no downloads.

The product's soul is **building a *story* around the art**, not "hosting a room." REDA preserves and *re-presents* a lifetime of work as a walkable, narrated archive. We lean **fully** into the Legacy & Archive framing across all copy, empty states, and onboarding.

**Design world: the Renaissance Codex (da Vinci).** Leonardo was the original art-meets-engineering mind — anatomy, machines, nature, drawn in one codex. The REDA mark is a **tree fused with circuit traces** (nature + technology) — the same idea, 500 years apart. The visual world is a da Vinci codex re-lit for the browser: **charcoal + parchment, Didone display, classical art collaged and spotlit, gold/oxblood/sage accents.** This is a deliberately *out-of-distribution* world grounded in the audience's own history — not the default "AI editorial" look.

---

## 2. Principles

1. **The art is the hero; the interface carries the story.** Chrome recedes where art appears.
2. **The wall is neutral; the brand is warm.** The surface *behind artwork* (hero backdrop, Viewer wall, Studio viewport) is a **value-neutral** stage so *any* palette pops. Brand warmth (umber/gold/oxblood) lives in the **chrome** — nav, panels, labels, buttons. Every featured work gets **cream mat + frame + spotlight + drop shadow**. (Validated with a warm, dark-edged painting that dissolved on a brown ground and popped on a neutral one.)
3. **One system, two registers, three modes.**
   - **Monograph (light):** parchment grounds, ink text — for *narrative & compose*.
   - **Spotlight (dark):** charcoal grounds, cream text — for *experience & immersion*.
   - Surfaces: **Landing = Persuade**, **Studio = Operate**, **Viewer = Experience**.
4. **Drama in the details, never in the way of the task.** On Operate surfaces (Studio), Didone is for titles only; UI text/data is Montserrat; affordances are familiar and full-size.
5. **Grounded, not decorative.** Motifs (Vitruvian linework, codex chapters, folios) come from da Vinci's own notebooks and tie back to the logo — never applied as garnish.

---

## 3. Color

### 3.1 Primitive palette

| Token | Hex | Role |
|---|---|---|
| `--char` | `#1B1A17` | App/dark ground (charcoal) |
| `--char-2` | `#232019` | Panels, bars |
| `--char-3` | `#2B271F` | Insets, hovered chrome |
| `--wall` | `#2C2C31` | **Neutral art stage** (Studio viewport, hero backdrop) |
| `--wall-deep` | `#181820` → `#101015` | Viewer gallery (deepest, most immersive) |
| `--parch` | `#E7DDC6` | Parchment panel ground |
| `--parch-2` | `#F0E8D4` | Light parchment |
| `--field` | `#FBF6EA` | Input field ground |
| `--cream` | `#ECE3CE` | Body text on dark |
| `--cream-hi` | `#F3EBD8` | Headlines on dark |
| `--ink` | `#2A2018` | Text on parchment |
| `--ink-2` | `#5A4A32` | Secondary text on parchment |
| `--label` | `#7A5A34` | Field labels on parchment |
| `--oxblood` | `#8A322A` | Primary action, current-room marker |
| `--oxblood-hi` | `#9A392E` | Oxblood on dark grounds |
| `--gold` | `#B98A3C` | Accent, active/selected, hairlines, hotspots, gizmo |
| `--gold-hi` | `#C79A48` | Gold on darkest grounds |
| `--sage` | `#6E7358` | Success / saved / positive toggle |
| `--terra` | `#C0703F` | Secondary accent, italic display emphasis |
| Muted on dark | `#CDBF9E` / `#A79A7C` / `#8B7E62` | De-emphasized text/icons on dark |

### 3.2 Semantic roles

- **Primary action:** `--oxblood` (Publish, Start, Inspect). On dark use `--oxblood-hi`.
- **Active / selected / focus accent:** `--gold`.
- **Success / saved:** `--sage`.
- **Body text:** `--cream` on dark, `--ink` on parchment.
- **Link on dark (warm):** brightened terracotta `#D2823E` (passes AA) or `--gold-hi`.
- **Hairline rule:** `linear-gradient(90deg, --gold, transparent)`.

### 3.3 Contrast (WCAG, measured)

| Pair | Ratio | Grade |
|---|---|---|
| `--cream` `#ECE3CE` on `--char` | ~14:1 | AAA |
| Cream `#EFE7D4` on neutral `#201F22` | 13.3:1 | AAA |
| Muted `#C9B79A` on `#201F22` | 8.4:1 | AAA |
| Terracotta link `#D2823E` on `#201F22` | 5.5:1 | AA |
| `--ink` on `--parch` | high | AAA |

**Rule:** cream is the body color on dark; muted browns are for *small labels only*; the warm link/accent is the brightened terracotta/gold that clears AA. (This fixes the earlier draft's mid-tone-brown body text.)

---

## 4. Typography

Three faces (all Google Fonts; none are AI-default overused faces):

| Face | Role | Weights |
|---|---|---|
| **Libre Bodoni** (Didone) | Display: hero headlines, panel/section titles, wordmark, folio numerals, artwork titles | 400/500/700 + italic |
| **EB Garamond** (1500s Garamond) | Text: body copy, descriptions, input *values*, quotes, prev/next | 400/500 + italic |
| **Montserrat** (geometric sans) | Labels: nav, UI data, buttons, kickers (tracked caps), status, tabs | 400/500/600/700 |

**Usage rules**
- **Libre Bodoni never sets dense UI or data** — titles and hero only.
- **Montserrat sets all functional UI** — labels, values in dense contexts, buttons, meta.
- **EB Garamond sets reading content** — descriptions, wall text, editorial body.
- Kickers/labels: Montserrat 600, uppercase, letter-spacing `.2em–.32em`.

**Scale (fluid):** hero `clamp(40px, 5.6vw, 72px)` · panel H1 ~38 · section H2 24–36 · body 15–17 · label 10–11. Line-height: display `.98–1.1`, body `1.5–1.65`.

---

## 5. Registers & surface mapping

| Surface | Mode | Register | Notes |
|---|---|---|---|
| **Landing** | Persuade | Spotlight hero → Monograph chapters → Spotlight CTA | Dark to *feel*, light to *understand*, dark to *act* |
| **Studio** | Operate | Charcoal chrome + **Monograph parchment inspector**; **neutral** viewport wall | Bodoni titles only; Montserrat UI; gold=active, oxblood=publish, sage=saved |
| **Viewer** | Experience | Spotlight (deepest charcoal), art leads, dark-glass Focus panel | Roam → Focus → Inspect; chrome recedes to small gold/Bodoni touches |

---

## 6. Signature motifs

- **Vitruvian / anatomical linework** — thin gold strokes (circle + square + figure, notebook sketches). Ties to the logo's tree-circuit. Used as hero collage, Studio empty states, chapter tiles.
- **Numbered codex chapters** — sections numbered `01/02/03`, oxblood dot, gold hairline; the retrospective "chapter" structure.
- **Folio numerals** — large faint Roman numerals (`I`, `II`) as section watermarks.
- **Gold hairline rules** — the gradient rule as divider.
- **Parchment scraps / wall labels** — small cream label cards (museum plaque) for captions.
- **The plate** — every artwork = cream mat + frame + spotlight + shadow on a neutral wall.

---

## 7. Core components

- **Buttons:** primary (oxblood fill), ghost (gold hairline border), sizes with ≥44px touch target. Uppercase Montserrat 600.
- **Inputs:** `--field` ground, 1px `#cbbd9d` border, **gold focus ring** (`box-shadow 0 0 0 2px rgba(185,138,60,.25)`), Garamond value text, Montserrat uppercase label above.
- **Tabs:** Montserrat caps, active = ink text + oxblood underline.
- **Toggles:** sage when on, sand when off.
- **Cards / tiles:** gold hairline border, numbered corner, parchment or charcoal variant.
- **Mode pill:** Roam/Place/Inspect (Studio) & Roam/Focus/Inspect (Viewer); gold active segment.
- **Focus panel (Viewer):** dark glass (`rgba(20,18,15,.68)` + blur), gold left border, kicker/title/spec/description/audio/inspect.
- **Wall label:** parchment plaque, Bodoni title + Montserrat caps meta.
- **Hotspot marker:** gold ring + center dot + ping.
- **Gizmo handles:** gold corner squares + rotation ring (Studio placement).
- **Status bar / chips:** Montserrat, tabular-nums, muted; sage for saved state.

---

## 8. Motion

- **Reveals:** staggered fade/scale on scroll (`back.out(1.4)`, 300–450ms, `each .06`).
- **Landing:** light scroll-storytelling between registers; keep readable without JS.
- **Viewer:** camera *fly* on Focus; spotlight settle; panel slide from edge.
- **Always** honor `prefers-reduced-motion`: render final state, disable parallax/scrub.

---

## 9. Accessibility

- Contrast values in §3.3 are the floor; body text ≥ AA (targets AAA on dark).
- **Visible gold focus rings** on all interactive elements — never removed.
- Touch targets ≥ 44×44px; ≥ 8px spacing.
- Artworks carry alt text (title + artist); hotspots keyboard-reachable.
- Respect reduced-motion; no meaning by color alone (pair with label/shape).
- Responsive at 375 / 768 / 1024 / 1440.

---

## 10. Implementation notes

- Replace `App.css` (3,233 lines) + inline styles with a **token layer**: primitive CSS custom properties (§3) → semantic roles → component classes. One source of truth for the Vite + React app.
- Load fonts via Google Fonts: Libre Bodoni, EB Garamond, Montserrat (subset to used weights).
- Registers are theme scopes (`.reda-dark` / `.reda-parch`) driven by the same tokens.
- Keep the **neutral art-stage** as its own token (`--wall`) distinct from brand charcoal, so the "wall is neutral" rule is enforceable in code.

---

## 11. To provide / placeholders

- **Real artworks** — curator-supplied; all canvases in comps are placeholders.
- **Knockout REDA logo** — a light/mono version for dark grounds (current asset is sepia-on-white; comps use a cream text wordmark on dark).
- **Real Renaissance imagery** — optional, for marketing surfaces only.
- Confirm final licensing (Google Fonts are open — OK).

---

## 12. Out of scope (this spec) / next

- **Per-surface deep designs** — Landing, Studio, Viewer each get their own spec → plan → build cycle, applying this foundation.
- Migrating the existing components' inline styles to tokens is an implementation task in those cycles.
- Reference comps (source of truth for this world) live in `.superpowers/brainstorm/` (git-ignored): `reda-renaissance.html` (world), `reda-studio.html` (Operate), `reda-viewer.html` (Experience), `reda-landing.html` (Persuade flow), `reda-pop.html` (art-stage rule).
