---
name: REDA — Tranh Việt
description: A Vietnamese painting house — dark sơn-mài viewing hall, bright giấy-điệp workshop.
colors:
  lacquer: "#0E0D0A"
  lacquer-2: "#1A140D"
  lacquer-3: "#241A10"
  gold: "#C9A35B"
  gold-hi: "#D9BB6E"
  gold-deep: "#A9863F"
  son: "#B23A22"
  son-hi: "#C4442A"
  cham: "#2E4A5A"
  cham-hi: "#4E7286"
  diep: "#EDE4CC"
  eggshell: "#F6EFDC"
  bone: "#ECE6DA"
  bone-hi: "#F5EFE1"
  stone: "#B0A78F"
  ink: "#241A10"
  ink-diep: "#3A2C1C"
  label-diep: "#6B5220"
  folk-key: "#2A241C"
  folk-gold: "#C99A34"
  folk-green: "#5E6B3B"
  folk-terra: "#A6482E"
typography:
  display:
    fontFamily: "UTM Dragon Fire, Georgia, serif"
    fontSize: "clamp(60px, 11vw, 150px)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "0.005em"
  headline:
    fontFamily: "MJ Modern, Merriweather, Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.005em"
  title:
    fontFamily: "MJ Modern, Merriweather, Georgia, serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "MJ Modern, Merriweather, Georgia, serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
  ui:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.02em"
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.16em"
rounded:
  sm: "3px"
  md: "5px"
  card: "14px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "22px"
  lg: "34px"
  xl: "64px"
components:
  button-enter:
    backgroundColor: "{colors.son}"
    textColor: "{colors.eggshell}"
    rounded: "{rounded.pill}"
    padding: "15px 30px"
  pill-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  pill-cham:
    backgroundColor: "{colors.cham}"
    textColor: "{colors.eggshell}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  card-dark:
    backgroundColor: "{colors.lacquer-2}"
    textColor: "{colors.bone}"
    rounded: "{rounded.card}"
    padding: "22px"
  card-diep:
    backgroundColor: "{colors.diep}"
    textColor: "{colors.ink-diep}"
    rounded: "{rounded.card}"
    padding: "22px"
---

<!-- SEED: the visual world was chosen with the user (Tranh Việt) and its token values are
     committed from the approved direction board. The real app has not yet been rebuilt in this
     world — re-run /impeccable document in scan mode once the Viewer/Studio are implemented, to
     capture the actual built tokens and components and generate a fresh sidecar. -->

# Design System: REDA — Tranh Việt

## Overview

**Creative North Star: "The Lacquer Hall & the Điệp Workshop"**

REDA is a Vietnamese gallery of Vietnamese painting, and its design is built from three native media rather than any European tradition: **sơn mài** (lacquer), **tranh Đông Hồ** (folk woodblock on giấy điệp), and **sơn dầu** (oil). The product has two rooms. The **viewing hall** is a deep sơn-mài dark — warm black-browns, a single gold-leaf accent, son (cinnabar) for action — where the artwork is lit and the interface recedes. The **workshop** is bright **giấy điệp** — a warm shell-paper cream that carries the folk-print palette (black keyline, vàng hoè, lục lá, son nâu) — where the curator arranges works. One palette, one type system, two registers.

The character is reverent but not precious: a museum voice in Vietnamese by default, confident enough to let a single wall of art carry a viewport. It is warm, hand-made, and material in reference — but **rendered flat and clean, never with faked CSS texture**. Color, light, and honest type do the work; real material texture enters only as scanned assets (sơn-mài sheen, điệp paper, oil canvas, Đông Hồ prints), never as a CSS approximation.

This world deliberately replaces the prior "Renaissance Codex" identity (Didone type, da Vinci motifs, European museum mood), which read as a non-Vietnamese company.

**Key Characteristics:**
- Two registers: dark sơn-mài hall (Experience) · light điệp workshop (Operate).
- One gold accent; son (red) means *action*; chàm (indigo) means *detail / inspect*.
- Vietnamese-capable type, Vietnamese-first; the display face performs on Vietnamese letterforms.
- Flat color and light — no faked material texture.
- The art leads; chrome recedes until called.

## Colors

A warm, single-family palette drawn from Vietnamese lacquer and folk-print pigments. Nothing is cool-neutral gray; muted tones are tinted warm.

### Primary
- **Sơn-mài Black** (`#0E0D0A`, with `#1A140D` / `#241A10` steps): the viewing-hall grounds — app background, panels, insets. Deep and warm, never pure black.
- **Vàng thếp / Gold Leaf** (`#C9A35B`; lifted `#D9BB6E`, deep `#A9863F`): the single brand accent — hairlines, active labels, the wordmark, focus. Rare by doctrine.

### Secondary
- **Son / Cinnabar** (`#B23A22`; lifted `#C4442A`): the **action** color — the enter seal, primary calls to act. It is the only saturated red; it always means "do this."
- **Chàm / Indigo** (`#2E4A5A`; lifted `#4E7286`): the **detail / inspect** color — "xem chi tiết / xem gần," hotspot and inspect affordances. A cool counterweight used sparingly.

### Neutral
- **Bone** (`#ECE6DA`; bright `#F5EFE1`): body and headline text on dark.
- **Stone** (`#B0A78F`): de-emphasized text on dark — warm, never gray, and never below ~13px.
- **Giấy Điệp** (`#EDE4CC`; highlight `#F6EFDC` eggshell): the workshop / light-register ground — a warm shell-paper cream.
- **Ink** (`#241A10`; on-điệp `#3A2C1C`; label `#6B5220`): text on the điệp light register.

### Đông Hồ folk palette (light register only)
- **Keyline** (`#2A241C`), **Vàng hoè** (`#C99A34`), **Lục lá** (`#5E6B3B`), **Son nâu** (`#A6482E`): the four woodblock inks, laid flat on điệp with the paper itself left as "flesh." Used for folk-print treatments and studio accents, never in the dark hall.

### Named Rules
**The One Gold Rule.** A single gold carries the brand. It appears as accent, not as area — hairlines, one active label, the wordmark. If gold is filling regions, the register is wrong.

**The Meaningful Red Rule.** Son (cinnabar) is never decoration. It means *action* — the enter seal, the primary do-this. If red isn't an action, it shouldn't be red.

**The Warm-Muted Rule.** Secondary text is tinted from the ground's warmth (stone, label-diep), never neutral gray.

## Typography

**Display Font:** UTM Dragon Fire (Vietnamese foundry display) — fallback Georgia, serif.
**Reading Font:** MJ Modern (Vietnamese serif) → Merriweather → Georgia, serif.
**UI Font:** Be Vietnam Pro (sans) — fallback system-ui.
**Label / Mono Font:** JetBrains Mono — technical and status readouts only.

**Character:** A Vietnamese-first stack that renders full diacritics everywhere. UTM Dragon Fire is calligraphic and characterful; MJ Modern is a warm workhorse serif for reading (it lacks some punctuation, so it is always stacked before Merriweather, which supplies the missing marks per-glyph). Be Vietnam Pro keeps UI crisp and familiar.

### Hierarchy
- **Display** (400, `clamp(60px,11vw,150px)`, 0.92): exhibition titles and the wordmark only. Vietnamese phrases, so the letterforms and diacritics perform.
- **Headline** (400, 30px, serif): section titles and card titles — set in MJ Modern, *not* the display face, so the display face stays special.
- **Title** (400, 22px, serif): sub-headings and secondary card titles (base `h2`) — MJ Modern.
- **Body** (400, 17px, 1.7, ~62ch): wall text, descriptions, biographies — MJ Modern italic-gold for emphasis.
- **UI** (500, 14.5px, Be Vietnam Pro): buttons, labels, navigation.
- **Label** (500, 11px, 0.16em, uppercase, JetBrains Mono): technical/status readouts (loading %, WebGL2, room number) — measurement, not decoration.

### Named Rules
**The Vietnamese Display Rule.** UTM Dragon Fire renders only large Vietnamese titles (wordmark, exhibition names). Never English strings, never body, never a section heading — that squanders the one face whose reason to exist is Vietnamese letterforms.

**The No-Kicker Rule.** No mono eyebrow/kicker above a heading. The title carries its own weight.

## Layout

A centered reading column (`max-width: 1180px`, 24px gutters). The dark viewing hall runs full-bleed (100vh entrances, edge-to-edge canvas); the light workshop and content sections sit inside the column. Spacing rhythm is generous between sections (64px) and tight within groups (8–22px), with more space above a heading than below it. Two-register surfaces sit side by side on desktop and stack on mobile (≤760px). Vietnamese copy runs longer than English — every breakpoint is proven with real Vietnamese text.

## Elevation & Depth

Depth comes from **warm light and layered tone, not from texture.** Grounds are flat color; the sense of a lit room comes from soft radial/directional gradients (a raking highlight, a warm glow) and honest shadows — never from CSS-faked material grain, noise, weave, or streaks.

### Shadow Vocabulary
- **Panel lift** (`box-shadow: 0 16px 44px rgba(0,0,0,0.5)`): dark cards floating over the hall.
- **Soft lift** (`box-shadow: 0 12px 34px rgba(0,0,0,0.35)`): light điệp panels.
- **Action lift** (`box-shadow: 0 12px 36px rgba(178,58,34,0.34)`): the son enter-seal, warmed by its own hue.

### Named Rules
**The Flat-Material Rule.** Never fake a material in CSS. Sơn-mài sheen, giấy điệp, oil canvas, and Đông Hồ prints are *scanned assets or nothing* — a CSS approximation of paper or lacquer looks cheap and is banned. Until real scans exist, surfaces are flat color plus light.

**The Lit-Room Rule.** Every shadow carries an offset and a soft blur (never a zero-offset colored halo). Depth reads as lighting, not decoration.

## Shapes

Soft, quiet corners: 5px on most chrome (3px small), 14px on cards, and full pills (999px) for controls and the enter seal. Borders are 1px hairlines — bone at ~10–12% on dark, warm ochre on light. No thick colored side-borders, no hard offset shadows. The one deliberately bold silhouette is the **Đông Hồ keyline** in the light register: a heavy warm-black outline around flat spot-color, honoring the woodblock, used only there.

## Components

### Buttons
- **Shape:** full pill (999px).
- **Enter seal (primary):** son ground (`#B23A22→#C4442A`), near-white text (`#FFF4EC` for AA), a small triện (Vietnamese seal chop) mark; action-lift shadow. This is the "Vào phòng tranh" moment.
- **Hover / Focus:** `translateY(-1px)` + deeper action-lift; gold focus ring (`0 0 0 2px rgba(201,163,91,0.5)`).

### Chips / Pills
- **Gold pill:** gold ground, ink text — a primary in-context action (e.g. "Nghe thuyết minh").
- **Chàm pill:** indigo ground, eggshell text — the detail/inspect action ("Xem chi tiết").
- **Ghost pill:** transparent, gold hairline, bone text — tertiary.

### Cards / Containers
- **Dark card (viewer):** lacquer-2 ground, gold hairline, 14px radius, panel-lift shadow, italic-serif title.
- **Điệp card (studio):** flat giấy-điệp ground, warm ochre hairline, 14px radius, soft-lift, display-face title in ink.
- **Internal padding:** 22px.

### Navigation / Chrome
- Recedes by default: the roam HUD and controls stay quiet gold-on-lacquer glass pills and appear only when the art calls them. Browser surfaces (selection, caret, scrollbar, focus ring) are themed from the palette (son selection, gold focus) — never browser defaults.

### The Enter Seal (signature)
The entrance is exhibition-led: a large Vietnamese title in the display face over a lit ground, the REDA mark receding to a corner, and a single son seal to enter. The art (or the exhibition) is the hero, not the brand.

## Do's and Don'ts

### Do:
- **Do** keep the two registers honest: dark sơn-mài for experience, light giấy điệp for operate — same accent, same type.
- **Do** reserve UTM Dragon Fire for large Vietnamese titles; set smaller headings in MJ Modern.
- **Do** make son mean action and chàm mean detail/inspect — consistently.
- **Do** prove every layout with real Vietnamese copy at every breakpoint.
- **Do** theme text selection, caret, scrollbar, and focus ring from the palette.

### Don't:
- **Don't** fake material texture in CSS (no paper grain, canvas weave, lacquer noise, or điệp streaks). Real scans only; flat color otherwise.
- **Don't** put a mono kicker/eyebrow above a heading.
- **Don't** let gold fill regions — it is an accent, not an area.
- **Don't** reach back for the Renaissance/Didone/da-Vinci mood; that identity is retired.
- **Don't** use gradient text, dark colored glows, or thick colored side-borders.
