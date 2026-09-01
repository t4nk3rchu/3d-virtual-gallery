# REDA Viewer — Design-System Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the existing Viewer (Experience surface) onto the REDA design-system token layer — same layout, same DOM, same behavior — replacing legacy `App.css` styling, inline hex, and emoji glyphs with `--reda-*` tokens, a dedicated `reda-viewer.css`, and the shared `<Icon>` component.

**Architecture:** The Viewer keeps every component, class name, prop, and DOM structure it already has — this is a **re-skin, not a redesign**. A new `src/styles/reda-viewer.css` (lifted from the approved mockup `docs/design/reda-viewer.html`, tokenized) supersedes the viewer rules currently in `src/App.css`. Each viewer component swaps emoji/glyph icons for `<Icon>` and drops inline color styles so the stylesheet drives appearance. The register is **Spotlight (dark)** throughout, per foundation spec §5.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest + @testing-library/react + jsdom, Babylon.js (viewer 3D — untouched here), self-hosted `@fontsource` fonts.

## Global Constraints

- **Register:** Spotlight (dark) only. Deepest charcoal grounds, cream text, art leads, chrome recedes. No layout redesign — do NOT change DOM structure, class names, component props, or runtime behavior. Style only.
- **Colors via tokens only:** every color in `reda-viewer.css` and in any viewer `.tsx` inline style must be a `var(--reda-*)` token. No raw hex in `.tsx` or in `reda-viewer.css`. (Exception: data values like a user's `matColor`, never chrome colors.)
- **No emoji, no glyph-icons:** every emoji (🎬 📍 🎧 ⚙️ …) and every glyph used as an icon (`✕ × ◀ ▶ ▲ ▼ ⟲ ➔ ▴ ⏮ ⏭ ⏸ ℹ 🗕 🗖 📋 📱`) becomes an inline-SVG `<Icon name="…">`. Typographic quotation marks (`" "`) in `ArtistDetailModal` are content, not icons — keep them.
- **Accessibility:** visible gold focus ring (`box-shadow: var(--reda-focus)`) on every interactive element — never removed. Touch targets ≥ 44×44px. Honor `prefers-reduced-motion` (no ping/spin/parallax when set).
- **CSS source of truth:** `docs/design/reda-viewer.html` — its `<style>` block is the exact appearance to reproduce. When lifting, DROP the mockup's local `:root` block and map every local var to the shared token per the table below. Class names in the mockup already match the real components.
- **Token name mapping (mockup local → shared token in `src/styles/tokens.css`):**

  | Mockup local | Shared token | Mockup local | Shared token |
  |---|---|---|---|
  | `--char` | `--reda-char` | `--gold` | `--reda-gold` |
  | `--char-2` | `--reda-char-2` | `--gold-hi` | `--reda-gold-hi` |
  | `--char-3` | `--reda-char-3` | `--sage` | `--reda-sage` |
  | `--wall` | `--reda-wall` | `--terra` | `--reda-terra` |
  | `--wall-deep` | `--reda-wall-deep` | `--link` | `--reda-link` |
  | `--wall-deepest` | `--reda-wall-deepest` | `--oxblood` | `--reda-oxblood` |
  | `--parch` | `--reda-parch` | `--oxblood-hi` | `--reda-oxblood-hi` |
  | `--parch-2` | `--reda-parch-2` | `--glass` | `--reda-glass` (added in Task 1) |
  | `--parch-border` | `--reda-parch-border` | `--glass-2` | `--reda-glass-2` (added in Task 1) |
  | `--cream` | `--reda-cream` | `--hairline` | `--reda-hairline` |
  | `--cream-hi` | `--reda-cream-hi` | `--focus` | `--reda-focus` |
  | `--ink` | `--reda-ink` | `--display` | `--reda-display` |
  | `--ink-2` | `--reda-ink-2` | `--text` | `--reda-text` |
  | `#CDBF9E` | `--reda-muted-hi` (added in Task 1) | `--ui` | `--reda-ui` |
  | `#A79A7C` (mockup `--muted-2`) | `--reda-muted` | `--radius` | `--reda-radius` |
  | `#8B7E62` (mockup `--muted-3`) | `--reda-muted-2` | `--radius-sm` | `--reda-radius-sm` |

- **Test runner:** `npx vitest run <path>` for a single file; `npx vitest run` for the whole suite.
- **Shared classes already tokenized:** `reda-ui.css` already defines `.btn`, `.btn--primary/--secondary/--ghost/--danger/--sm`, and `.reda-icon`. Do NOT redefine buttons in `reda-viewer.css`; the viewer's existing `className="btn btn--primary"` usages inherit the REDA button styling once the competing `App.css` rules are removed.

---

## File Structure

- `src/components/ui/Icon.tsx` — extend to render multi-path icons; add viewer icons. (Task 1)
- `src/styles/tokens.css` — add `--reda-muted-hi`, `--reda-glass`, `--reda-glass-2`. (Task 1)
- `src/styles/reda-viewer.css` — NEW. All viewer-specific component classes, tokenized. (Task 2)
- `src/main.tsx` — import `reda-viewer.css` last. (Task 2)
- `src/lib/reda-viewer-css.test.ts` — NEW. CSS-contract test. (Task 2)
- `src/components/viewer/ExhibitionViewer.tsx` — Roam HUD icons + inline-hex removal. (Task 3)
- `src/components/viewer/VirtualJoystick.tsx`, `ArtworkHoverTooltip.tsx` — glyph→Icon. (Task 4)
- `src/components/viewer/IntroVideoLoader.tsx` — icons. (Task 5)
- `src/components/viewer/FocusPanel.tsx` — icons + inline cleanup. (Task 6)
- `src/components/viewer/InspectLightbox.tsx` — icons + inline cleanup. (Task 7)
- `src/components/viewer/InspectDesktopSidebar.tsx` — icons + inline hex removal. (Task 8)
- `src/components/viewer/HotspotOverlay.tsx` — icons. (Task 8)
- `src/components/viewer/ArtistDetailModal.tsx` — icons. (Task 9)
- `src/components/viewer/SettingsModal.tsx` — icons + inline hex removal (select). (Task 10)
- `src/components/viewer/FallbackCatalog.tsx` — icons. (Task 11)
- `src/App.css` — remove superseded viewer rules (per-component in Tasks 3–11; final sweep in Task 12).

---

### Task 1: Extend Icon component + add viewer tokens

**Files:**
- Modify: `src/components/ui/Icon.tsx`
- Modify: `src/styles/tokens.css`
- Test: `src/components/ui/Icon.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `Icon` supports `name` values (existing plus) `walk`, `mouse`, `target`, `info`, `search`, `reset`, `minimize`, `maximize`, `list`, `pause`, `chevronUp`, `chevronDown`, `phone`. `PATHS[name]` may be a `string` or `string[]` (each rendered as its own `<path>`). Tokens `--reda-muted-hi`, `--reda-glass`, `--reda-glass-2` exist.

- [ ] **Step 1: Write the failing test**

Add to `src/components/ui/Icon.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { Icon } from './Icon';

it('renders multi-path viewer icons with at least one path each', () => {
  for (const name of ['walk','mouse','target','info','search','reset','minimize','maximize','list','pause','chevronUp','chevronDown','phone'] as const) {
    const { container } = render(<Icon name={name} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/Icon.test.tsx`
Expected: FAIL — type error / no path for `walk` (name not in `PATHS`).

- [ ] **Step 3: Extend the component and add icons**

In `src/components/ui/Icon.tsx`, change the `PATHS` type to allow arrays, add the new entries, and render each path. Replace the file body with:

```tsx
const PATHS = {
  select: 'M3 2l10 4.2-4 1.1-1.1 4z',
  frame: 'M3 3.2h10v9.6H3z',
  pin: 'M8 3.6a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zM8 9.2V14',
  cube: 'M8 2.2l5 2.8v6L8 13.8 3 11V5zM3 5l5 2.8L13 5M8 7.8v6',
  user: 'M8 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4 13.6c0-2.6 8-2.6 8 0',
  users: 'M6 4a2.2 2.2 0 1 0 0 4.4A2.2 2.2 0 0 0 6 4zM2.5 13c0-2.3 7-2.3 7 0M11 5.2a1.8 1.8 0 1 1 .01 3.6M11.5 9.4c2 .2 3 1.1 3 2.6',
  gear: 'M8 5.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8zM8 2.4v2M8 11.6v2M2.4 8h2M11.6 8h2M4.2 4.2l1.4 1.4M10.4 10.4l1.4 1.4M11.8 4.2l-1.4 1.4M5.6 10.4l-1.4 1.4',
  close: 'M4 4l8 8M12 4l-8 8',
  sound: 'M3 6v4h2.5L9 13V3L5.5 6zM11 5.5a3.5 3.5 0 0 1 0 5',
  map: 'M6 3L2 5v8l4-2 4 2 4-2V3l-4 2-4-2zM6 3v8M10 5v8',
  fullscreen: 'M2 5V2h3M14 5V2h-3M2 11v3h3M14 11v3h-3',
  play: 'M5 3l8 5-8 5z',
  inspect: 'M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4M8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  plus: 'M8 3v10M3 8h10',
  chevronRight: 'M6 3l5 5-5 5',
  chevronLeft: 'M10 3l-5 5 5 5',
  chevronUp: 'M3 10l5-5 5 5',
  chevronDown: 'M3 6l5 5 5-5',
  external: 'M6 3H3v10h10v-3M9 3h4v4M13 3l-6 6',
  trash: 'M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9',
  google: 'M13.5 8.2c0-.5 0-.9-.1-1.3H8v2.6h3.1a2.7 2.7 0 0 1-1.1 1.8v1.5h1.8c1.1-1 1.7-2.5 1.7-4.6z M8 14c1.5 0 2.8-.5 3.7-1.3l-1.8-1.4c-.5.3-1.1.5-1.9.5a3.3 3.3 0 0 1-3.1-2.3H3v1.5A5.6 5.6 0 0 0 8 14z M4.9 9.5a3.3 3.3 0 0 1 0-2.1V5.9H3a5.6 5.6 0 0 0 0 5z M8 4.6c.8 0 1.6.3 2.2.9l1.6-1.6A5.5 5.5 0 0 0 3 5.9l1.9 1.5A3.3 3.3 0 0 1 8 4.6z',
  film: 'M2.5 3h11v10h-11zM5 3v10M11 3v10M2.5 6.5h2.5M11 6.5h2.5M2.5 9.5h2.5M11 9.5h2.5',
  palette: 'M8 2a6 6 0 0 0 0 12c1 0 1.3-.7 1-1.3-.4-.7 0-1.7 1-1.7h1a3 3 0 0 0 3-3c0-3.3-2.9-6-6-6zM5 6.5h.01M8 5h.01M11 6.5h.01M10.5 9.5h.01',
  audio: 'M4 6v4M6.5 4v8M9 6.5v3M11.5 5v6',
  walk: ['M8 2.4a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4', 'M8 5.4L6.3 7.7l.9 2.5-1.3 3.4M8 5.4l1.7 1.2 2 .6M7.3 10.2l1.9 1.6.6 2.8'],
  mouse: ['M8 2.4a2.9 2.9 0 0 0-2.9 2.9v5.4a2.9 2.9 0 0 0 5.8 0V5.3A2.9 2.9 0 0 0 8 2.4z', 'M8 5v2.4'],
  target: ['M8 2.4a5.6 5.6 0 1 0 0 11.2 5.6 5.6 0 0 0 0-11.2z', 'M8 5.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z'],
  info: ['M8 2.4a5.6 5.6 0 1 0 0 11.2 5.6 5.6 0 0 0 0-11.2z', 'M8 7.4v3.4', 'M8 5.2h.01'],
  search: ['M7.2 2.8a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8z', 'M10.5 10.5l2.7 2.7'],
  reset: ['M3.2 4v3.1h3.1', 'M3.7 7.1A5 5 0 1 1 3.3 10'],
  minimize: 'M4 8h8',
  maximize: ['M3 6V3h3', 'M13 6V3h-3', 'M3 10v3h3', 'M13 10v3h-3'],
  list: ['M6 4.5h8', 'M6 8h8', 'M6 11.5h8', 'M3 4.5h.01', 'M3 8h.01', 'M3 11.5h.01'],
  pause: ['M6 3.5v9', 'M10 3.5v9'],
  phone: ['M5 2.6h6v10.8H5z', 'M7.4 11.6h1.2'],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 17, title, className = '' }:
  { name: IconName; size?: number; title?: string; className?: string }) {
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };
  const d = PATHS[name];
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg className={`reda-icon ${className}`} width={size} height={size} viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" {...(a11y as object)}>
      {title && <title>{title}</title>}
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}
```

- [ ] **Step 4: Add the viewer tokens**

In `src/styles/tokens.css`, inside `:root`, add `--reda-muted-hi` next to the other muted tokens and add the glass tokens after the paper group:

```css
  --reda-muted-hi:#CDBF9E;     /* brightest muted on dark (spec §3.1) */
```
```css
  /* viewer glass (dark register chrome) */
  --reda-glass:rgba(20,18,15,.68);
  --reda-glass-2:rgba(28,25,20,.82);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/Icon.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Icon.tsx src/components/ui/Icon.test.tsx src/styles/tokens.css
git commit -m "feat(viewer): extend Icon set + add viewer tokens"
```

---

### Task 2: Create reda-viewer.css and wire it in

**Files:**
- Create: `src/styles/reda-viewer.css`
- Modify: `src/main.tsx`
- Test: `src/lib/reda-viewer-css.test.ts`

**Interfaces:**
- Consumes: tokens from `tokens.css` (Task 1).
- Produces: viewer component classes styled in the Spotlight register. Required selectors (contract): `.intro-video-overlay`, `.intro-video-tag`, `.intro-skip-btn`, `.viewer-progress`, `.viewer-controls-hint`, `.artwork-hover-tooltip`, `.virtual-joystick`, `.focus-header-bar`, `.focus-info-modal`, `.focus-nav-rail`, `.inspect-lightbox`, `.inspect-lightbox__header`, `.inspect-lightbox__controls`, `.inspect-lightbox__sidebar`, `.inspect-lightbox__drawer`, `.hotspot-pin`, `.hotspot-card`, `.artist-modal-container`, `.settings-modal`, `.settings-toggle`, `.range-input`, `.fallback-catalog`.

- [ ] **Step 1: Write the failing contract test**

Create `src/lib/reda-viewer-css.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../styles/reda-viewer.css'), 'utf8');

describe('reda-viewer.css', () => {
  it('defines every viewer component region', () => {
    for (const s of [
      '.intro-video-overlay', '.viewer-progress', '.viewer-controls-hint',
      '.artwork-hover-tooltip', '.virtual-joystick', '.focus-header-bar',
      '.focus-info-modal', '.focus-nav-rail', '.inspect-lightbox',
      '.inspect-lightbox__header', '.inspect-lightbox__controls',
      '.inspect-lightbox__sidebar', '.inspect-lightbox__drawer', '.hotspot-pin',
      '.hotspot-card', '.artist-modal-container', '.settings-modal',
      '.settings-toggle', '.range-input', '.fallback-catalog',
    ]) {
      expect(css).toContain(s);
    }
  });

  it('uses REDA tokens and contains no raw hex colors', () => {
    expect(css).toContain('var(--reda-');
    // no #rgb / #rrggbb anywhere (tokens only)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/reda-viewer-css.test.ts`
Expected: FAIL — `ENOENT` (file does not exist yet).

- [ ] **Step 3: Create the stylesheet**

Create `src/styles/reda-viewer.css`. Lift the component rules from `docs/design/reda-viewer.html`'s `<style>` block — every rule from the `/* ─── shared component styles ─── */` marker onward (buttons/mode-pill excepted; see below), through all eight numbered section blocks (`01 INTRO` … `08 FALLBACK`). While lifting:

1. Do NOT copy the mockup's `:root{…}` block or its `@import` fonts line — the app already loads tokens and fonts.
2. Replace every local var with its shared token per the Global Constraints mapping table (e.g. `var(--gold)` → `var(--reda-gold)`, `var(--glass)` → `var(--reda-glass)`, and the three raw muted hexes → `var(--reda-muted-hi | --reda-muted | --reda-muted-2)`).
3. Do NOT copy the reference-sheet chrome (`.doc`, `.doc-head`, `.state`, `.state__*`, `.frame`, `.rule`) — those are scaffolding for the mockup page only.
4. Do NOT copy `.btn`, `.btn--*`, `.icon-btn`, or `.mode-pill*` — buttons come from `reda-ui.css`. (If the viewer needs the round icon button, add a `.viewer` scoped helper instead; the current viewer markup does not require it.)
5. Keep the `.ico` rule renamed to target the shared icon: the app renders icons as `.reda-icon`, so add `.viewer-controls-hint .reda-icon{color:var(--reda-gold)}` etc. where the mockup used `.ico` coloring. Match the mockup's intent (gold icons in the hint bar; inherited color elsewhere).
6. Keep `@keyframes ping`, `spin`, and the `@media (prefers-reduced-motion:reduce)` guards.
7. Keep the responsive `@media (max-width:720px)` rule for the artist modal.

Verify no raw hex remains: `grep -nE "#[0-9a-fA-F]{3,6}" src/styles/reda-viewer.css` must return nothing.

- [ ] **Step 4: Wire it in**

In `src/main.tsx`, add the import as the LAST stylesheet (so it wins over `App.css`):

```tsx
import './styles/reda-workbench.css'
import './styles/reda-viewer.css'
import App from './App.tsx'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/reda-viewer-css.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/styles/reda-viewer.css src/main.tsx src/lib/reda-viewer-css.test.ts
git commit -m "feat(viewer): add reda-viewer.css (Spotlight register) and wire it"
```

---

### Task 3: ExhibitionViewer — Roam HUD icons + inline cleanup

**Files:**
- Modify: `src/components/viewer/ExhibitionViewer.tsx:384-411`
- Modify: `src/App.css` (remove superseded `.viewer-controls-hint`, `.btn-settings-hud`, `.btn-mobile-settings`, `.viewer-progress` rules)
- Test: `src/components/viewer/exhibition-viewer-chrome.test.ts` (new, source-scan)

**Interfaces:**
- Consumes: `Icon` (Task 1), `reda-viewer.css` (Task 2).
- Produces: emoji-free Roam HUD.

- [ ] **Step 1: Write the failing test**

Create `src/components/viewer/exhibition-viewer-chrome.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2100}-\u{214F}\u{FE0F}]/u;

describe('ExhibitionViewer chrome is icon-based', () => {
  const src = readFileSync(resolve(__dirname, 'ExhibitionViewer.tsx'), 'utf8');
  it('contains no emoji or glyph icons', () => {
    expect(EMOJI.test(src)).toBe(false);
  });
  it('imports the Icon component', () => {
    expect(src).toMatch(/import\s*\{[^}]*\bIcon\b[^}]*\}\s*from\s*['"]\.\.\/ui['"]/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viewer/exhibition-viewer-chrome.test.ts`
Expected: FAIL — emoji present (🕹️🖱️🖼️🎯⚙️) and no `Icon` import.

- [ ] **Step 3: Add the Icon import**

At the top of `src/components/viewer/ExhibitionViewer.tsx`, add with the other component imports:

```tsx
import { Icon } from '../ui';
```

- [ ] **Step 4: Replace the HUD emoji**

Replace the controls-hint block (currently lines ~385-398) with:

```tsx
      {/* Gallery Controls HUD & Settings (Desktop) */}
      <div className="viewer-controls-hint">
        <span><Icon name="walk" size={15} /> <kbd>WASD</kbd> to walk</span>
        <span><Icon name="mouse" size={15} /> <strong>Drag</strong> to look</span>
        <span><Icon name="frame" size={15} /> <strong>Click art</strong> to focus (90°)</span>
        <span><Icon name="target" size={15} /> <strong>Click floor</strong> to teleport</span>
        <button
          type="button"
          className="btn btn--ghost btn--sm btn-settings-hud"
          onClick={() => setShowSettings(true)}
          title="Gallery &amp; Control Settings"
        >
          <Icon name="gear" size={15} /> Settings
        </button>
      </div>
```

Then replace the mobile settings button (currently lines ~401-411) emoji `⚙️` with an icon:

```tsx
        <button
          type="button"
          className="btn-mobile-settings"
          onClick={() => setShowSettings(true)}
          title="Gallery Settings"
          aria-label="Gallery Settings"
        >
          <Icon name="gear" size={20} />
        </button>
```

- [ ] **Step 5: Remove superseded App.css rules**

Find and delete the now-superseded rules in `src/App.css` so they don't fight `reda-viewer.css`. Locate them with:

```bash
grep -nE "^\.(viewer-controls-hint|btn-settings-hud|btn-mobile-settings|viewer-progress)" src/App.css
```

Delete each matched rule block (from its selector line through its closing `}`), including any grouped selectors and `:hover`/media-query variants for those classes. Do not touch `.viewer` (the root canvas container) unless it only sets colors now handled by tokens.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/viewer/exhibition-viewer-chrome.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/viewer/ExhibitionViewer.tsx src/components/viewer/exhibition-viewer-chrome.test.ts src/App.css
git commit -m "feat(viewer): re-skin Roam HUD with Icon + tokens"
```

---

### Task 4: VirtualJoystick + ArtworkHoverTooltip

**Files:**
- Modify: `src/components/viewer/VirtualJoystick.tsx:116-121`
- Modify: `src/App.css` (remove superseded `.virtual-joystick*`, `.artwork-hover-tooltip*` rules)
- Test: `src/components/viewer/VirtualJoystick.test.tsx` (new)

**Interfaces:**
- Consumes: `Icon` (Task 1).
- Produces: glyph-free joystick. `ArtworkHoverTooltip` has no emoji (verified) — only its App.css rules move to `reda-viewer.css`; no TSX change.

- [ ] **Step 1: Write the failing test**

Create `src/components/viewer/VirtualJoystick.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VirtualJoystick } from './VirtualJoystick';

describe('VirtualJoystick', () => {
  it('renders SVG icon arrows, not glyph characters', () => {
    const { container } = render(<VirtualJoystick onMove={() => {}} />);
    expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThanOrEqual(4);
    expect(container.textContent ?? '').not.toMatch(/[▲▼◀▶]/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viewer/VirtualJoystick.test.tsx`
Expected: FAIL — glyph arrows `▲▼◀▶` present, no `.reda-icon`.

- [ ] **Step 3: Replace the arrow glyphs**

At the top of `src/components/viewer/VirtualJoystick.tsx` add:

```tsx
import { Icon } from '../ui';
```

Replace the ring block (lines ~116-121):

```tsx
      <div className="virtual-joystick__ring">
        <span className="joystick-arrow joystick-arrow--up"><Icon name="chevronUp" size={12} /></span>
        <span className="joystick-arrow joystick-arrow--down"><Icon name="chevronDown" size={12} /></span>
        <span className="joystick-arrow joystick-arrow--left"><Icon name="chevronLeft" size={12} /></span>
        <span className="joystick-arrow joystick-arrow--right"><Icon name="chevronRight" size={12} /></span>
      </div>
```

- [ ] **Step 4: Move the App.css rules**

Confirm the joystick/tooltip appearance now comes from `reda-viewer.css`, then remove the legacy rules:

```bash
grep -nE "^\.(virtual-joystick|joystick-arrow|artwork-hover-tooltip)" src/App.css
```

Delete each matched block (selector line through closing `}`, incl. `.active`, `__ring`, `__knob*`, `--up/down/left/right` variants).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/viewer/VirtualJoystick.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/viewer/VirtualJoystick.tsx src/components/viewer/VirtualJoystick.test.tsx src/App.css
git commit -m "feat(viewer): re-skin joystick + tooltip"
```

---

### Task 5: IntroVideoLoader

**Files:**
- Modify: `src/components/viewer/IntroVideoLoader.tsx:120-153`
- Modify: `src/App.css` (remove superseded `.intro-*` rules)
- Test: `src/components/viewer/IntroVideoLoader.test.tsx` (new)

**Interfaces:**
- Consumes: `Icon` (Task 1).
- Produces: emoji-free intro loader.

- [ ] **Step 1: Write the failing test**

Create `src/components/viewer/IntroVideoLoader.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { IntroVideoLoader } from './IntroVideoLoader';

describe('IntroVideoLoader', () => {
  it('uses icons, not emoji, in its chrome', () => {
    const { container } = render(
      <IntroVideoLoader videoFileId="x" isSceneReady onEnterGallery={() => {}} />
    );
    expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThan(0);
    expect(container.textContent ?? '').not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viewer/IntroVideoLoader.test.tsx`
Expected: FAIL — 🎬/🔊/➔ present, no `.reda-icon`.

- [ ] **Step 3: Replace the emoji**

Add at top of `src/components/viewer/IntroVideoLoader.tsx`:

```tsx
import { Icon } from '../ui';
```

Replace the branding tag (line ~122):

```tsx
        <span className="intro-video-tag"><Icon name="film" size={13} /> Exhibition Intro</span>
```

Replace the unmute button label (line ~133):

```tsx
          <Icon name="sound" size={15} /> Enable sound
```

Replace the skip button label (line ~143):

```tsx
            Enter Exhibition <Icon name="chevronRight" size={15} />
```

- [ ] **Step 4: Remove superseded App.css rules**

```bash
grep -nE "^\.intro-" src/App.css
```

Delete each matched block (all `.intro-video-*`, `.intro-unmute-btn`, `.intro-skip-btn`, `.intro-loading-status`, `.intro-status-spinner`, `.intro-video-spinner`, `.intro-ended-wait`, and the fade/animation classes). Keep any `@keyframes` still referenced by `reda-viewer.css`; if a keyframe (e.g. `spin`) is now defined in `reda-viewer.css`, remove the App.css duplicate.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/viewer/IntroVideoLoader.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/viewer/IntroVideoLoader.tsx src/components/viewer/IntroVideoLoader.test.tsx src/App.css
git commit -m "feat(viewer): re-skin intro video loader"
```

---

### Task 6: FocusPanel

**Files:**
- Modify: `src/components/viewer/FocusPanel.tsx`
- Modify: `src/App.css` (remove superseded `.focus-*` rules)
- Test: `src/components/viewer/FocusPanel.test.tsx` (new)

**Interfaces:**
- Consumes: `Icon` (Task 1).
- Produces: emoji-free FocusPanel.

- [ ] **Step 1: Write the failing test**

Create `src/components/viewer/FocusPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FocusPanel } from './FocusPanel';
import type { Artwork } from '../../types/schema';

const artwork = {
  id: 'a1', title: 'Study in Ochre', artist: 'E. Marchetti', year: 1971,
  medium: 'Oil on linen', dimensions: '92 x 68 cm', description: 'A warm field.',
  artwork_type: 'IMAGE_2D', media_file_id: 'm1', updated_at: 1,
} as unknown as Artwork;

describe('FocusPanel', () => {
  it('renders icons and no emoji', () => {
    const { container } = render(
      <FocusPanel artwork={artwork} onInspect={() => {}} onClose={() => {}} />
    );
    expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThan(0);
    expect(container.textContent ?? '').not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{2100}-\u{214F}\u{FE0F}]/u);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viewer/FocusPanel.test.tsx`
Expected: FAIL — ✕/ℹ present, no `.reda-icon`.

- [ ] **Step 3: Replace the emoji**

Add at top of `src/components/viewer/FocusPanel.tsx`:

```tsx
import { Icon } from '../ui';
```

Apply these replacements:
- Exit icon (line ~42): `<span className="focus-header-bar__exit-icon">✕</span>` → `<span className="focus-header-bar__exit-icon"><Icon name="close" size={14} /></span>`
- Info icon (line ~52): `<span className="focus-info-icon">ℹ</span>` → `<span className="focus-info-icon"><Icon name="info" size={16} /></span>`
- Info-modal close (line ~76): the `×` text → `<Icon name="close" size={15} />`
- Audio guide label (line ~118): `🎧 Audio Guide` → `<Icon name="audio" size={13} /> Audio Guide`
- Read Artist Bio (line ~149): `👤 Read Artist Bio →` → `<Icon name="user" size={14} /> Read Artist Bio`
- Inspect/Cinema button (line ~160): `{artwork.artwork_type === 'VIDEO' ? '🎥 Open Cinema Mode →' : '🔍 Inspect Full Resolution →'}` →
```tsx
                {artwork.artwork_type === 'VIDEO'
                  ? (<><Icon name="film" size={14} /> Open Cinema Mode</>)
                  : (<><Icon name="search" size={14} /> Inspect Full Resolution</>)}
```
- Prev nav (line ~178): `⏮` → `<Icon name="chevronLeft" size={18} />`
- Next nav (line ~189): `⏭` → `<Icon name="chevronRight" size={18} />`

- [ ] **Step 4: Remove superseded App.css rules**

```bash
grep -nE "^\.(focus-header-bar|focus-info-modal|focus-info-icon|focus-panel__artist-link-btn|focus-nav-rail|focus-nav-btn)" src/App.css
```

Delete each matched block including its `@media` variants (e.g. the `.focus-info-modal` mobile rule ~line 1214).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/viewer/FocusPanel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/viewer/FocusPanel.tsx src/components/viewer/FocusPanel.test.tsx src/App.css
git commit -m "feat(viewer): re-skin focus panel"
```

---

### Task 7: InspectLightbox

**Files:**
- Modify: `src/components/viewer/InspectLightbox.tsx`
- Modify: `src/App.css` (remove superseded `.inspect-lightbox*` rules)
- Test: `src/components/viewer/inspect-lightbox-chrome.test.ts` (new, source-scan)

**Interfaces:**
- Consumes: `Icon` (Task 1).
- Produces: emoji-free InspectLightbox.

- [ ] **Step 1: Write the failing test**

Create `src/components/viewer/inspect-lightbox-chrome.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2100}-\u{214F}\u{27F0}-\u{27FF}\u{FE0F}]/u;

describe('InspectLightbox chrome', () => {
  const src = readFileSync(resolve(__dirname, 'InspectLightbox.tsx'), 'utf8');
  it('has no emoji or glyph icons', () => {
    expect(EMOJI.test(src)).toBe(false);
  });
  it('imports Icon', () => {
    expect(src).toMatch(/import\s*\{[^}]*\bIcon\b[^}]*\}\s*from\s*['"]\.\.\/ui['"]/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viewer/inspect-lightbox-chrome.test.ts`
Expected: FAIL — many emoji present.

- [ ] **Step 3: Replace the emoji**

Add at top of `src/components/viewer/InspectLightbox.tsx`:

```tsx
import { Icon } from '../ui';
```

Apply these replacements (each is the emoji → `<Icon>`; keep surrounding text/markup):
- `📍 Detail …` header eyebrow (line ~510): prefix `<Icon name="pin" size={12} /> ` before `Detail …`.
- `▴ See less` (line ~523): → `<Icon name="chevronUp" size={12} /> See less`
- `... See more` (line ~538): → `<Icon name="chevronDown" size={12} /> See more`
- `👤 About {name}` (line ~559): → `<Icon name="user" size={13} /> About {artwork.artist_profile.name}`
- `📍 Hotspots List ({n})` (line ~575): → `<Icon name="pin" size={13} /> Hotspots List ({hotspots.length})`
- close `✕` (line ~587): → `<Icon name="close" size={16} />`
- `📍 Hotspots Directory` (line ~692): → `<Icon name="pin" size={15} /> Hotspots Directory`
- drawer close `✕` (line ~699): → `<Icon name="close" size={15} />`
- `🎵 Audio Attached` (line ~719): → `<Icon name="audio" size={12} /> Audio Attached`
- `⟲ Reset View` (line ~755): → `<Icon name="reset" size={14} /> Reset View`
- `◀ Prev` (line ~770): → `<Icon name="chevronLeft" size={13} /> Prev`
- counter tag `📍 nn/nn` (line ~789): prefix `<Icon name="pin" size={12} /> ` before the count text.
- counter tag `📍 Details (n)` (line ~795): prefix `<Icon name="pin" size={12} /> `.
- counter info icon `📋` (line ~796): → `<Icon name="list" size={13} />`
- `Next ▶` (line ~813): → `Next <Icon name="chevronRight" size={13} />`
- pause/listen (line ~832): `{isPlayingAudio ? '⏸ Pause' : '🎧 Listen'}` →
```tsx
                  {isPlayingAudio
                    ? (<><Icon name="pause" size={13} /> Pause</>)
                    : (<><Icon name="audio" size={13} /> Listen</>)}
```
- `🎧 Guide (…s)` (line ~844): → `<Icon name="audio" size={13} /> Guide ({Math.floor(activeHotspot.audio_timestamp_seconds)}s)`
- hint line (lines ~851-855): remove the leading `🎬`/`💡` emoji from each string; the sentences stand alone (e.g. `'Cinema Mode · Press Esc or click to return to gallery'`, `'Left-drag to Pan · Right-drag to Tilt in 3D · Scroll to Zoom'`, `'Left-drag to Pan · Scroll to Zoom'`). Also change "click ✕" phrasing to "close" to avoid the glyph.

- [ ] **Step 4: Remove superseded App.css rules**

```bash
grep -nE "^\.(inspect-lightbox|inspect-header|inspect-drawer|inspect-desc|inspect-btn|inspect-nav|inspect-audio|carousel-counter|hotspot-list-item|sidebar-|detail-badge|hotspot-detail|item-badge|item-content|item-audio|eyebrow)" src/App.css
```

Review each match; delete the blocks that style InspectLightbox/sidebar/drawer. Be careful with shared names: `.eyebrow` and `.sidebar-header` may be used elsewhere — only remove them if `reda-viewer.css` now provides equivalents; otherwise leave and let `reda-viewer.css` (imported later) override. When unsure, keep the App.css rule and rely on import order.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/viewer/inspect-lightbox-chrome.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/viewer/InspectLightbox.tsx src/components/viewer/inspect-lightbox-chrome.test.ts src/App.css
git commit -m "feat(viewer): re-skin inspect lightbox"
```

---

### Task 8: InspectDesktopSidebar + HotspotOverlay

**Files:**
- Modify: `src/components/viewer/InspectDesktopSidebar.tsx`
- Modify: `src/components/viewer/HotspotOverlay.tsx`
- Test: `src/components/viewer/InspectDesktopSidebar.test.tsx` (new)

**Interfaces:**
- Consumes: `Icon` (Task 1).
- Produces: emoji-free sidebar + hotspot cards; no raw hex in these two files.

- [ ] **Step 1: Write the failing test**

Create `src/components/viewer/InspectDesktopSidebar.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { InspectDesktopSidebar } from './InspectDesktopSidebar';
import type { ArtworkHotspot } from '../../types/schema';

const hs = { id: 'h1', title: 'Ridge', description: 'Impasto crest.' } as unknown as ArtworkHotspot;

describe('InspectDesktopSidebar', () => {
  it('uses icons and no emoji, no raw hex in source', () => {
    const { container } = render(
      <InspectDesktopSidebar activeHotspot={hs} activeHotspotIndex={0} totalHotspots={3}
        onClose={() => {}} onNavigate={() => {}} />
    );
    expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThan(0);
    expect(container.textContent ?? '').not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{2100}-\u{214F}\u{FE0F}]/u);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viewer/InspectDesktopSidebar.test.tsx`
Expected: FAIL — 🗕/🗖/✕ present, no `.reda-icon`.

- [ ] **Step 3: Replace emoji + inline hex in InspectDesktopSidebar**

Add at top:

```tsx
import { Icon } from '../ui';
```

- Drag hint (line ~92): the inline style `color: '#94a3b8'` → `color: 'var(--reda-muted-2)'`.
- Minimize/expand (line ~105): `{isMinimized ? '🗖 Expand' : '🗕 Minimize'}` →
```tsx
            {isMinimized
              ? (<><Icon name="maximize" size={12} /> Expand</>)
              : (<><Icon name="minimize" size={12} /> Minimize</>)}
```
- Close `✕` (line ~113): → `<Icon name="close" size={14} />`
- Audio label `🎧 Dedicated Hotspot Audio` (line ~125): → `<Icon name="audio" size={13} /> Dedicated Hotspot Audio`
- Seek `▶ Jump to …` (line ~141): → `<Icon name="play" size={12} /> Jump to {Math.floor(activeHotspot.audio_timestamp_seconds)}s in Main Audio Guide`
- Prev `◀ Prev` (line ~150): → `<Icon name="chevronLeft" size={12} /> Prev`
- Next `Next ▶` (line ~158): → `Next <Icon name="chevronRight" size={12} />`

- [ ] **Step 4: Replace emoji in HotspotOverlay**

Add at top of `src/components/viewer/HotspotOverlay.tsx`:

```tsx
import { Icon } from '../ui';
```

- Card close `×` (line ~41): → `<Icon name="close" size={13} />`
- Seek `▶ Jump to …` (line ~52): → `<Icon name="play" size={12} /> Jump to {Math.floor(hotspot.audio_timestamp_seconds)}s in audio guide`

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/viewer/InspectDesktopSidebar.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/viewer/InspectDesktopSidebar.tsx src/components/viewer/HotspotOverlay.tsx src/components/viewer/InspectDesktopSidebar.test.tsx
git commit -m "feat(viewer): re-skin hotspot sidebar + overlay"
```

---

### Task 9: ArtistDetailModal

**Files:**
- Modify: `src/components/viewer/ArtistDetailModal.tsx`
- Modify: `src/App.css` (remove superseded `.artist-modal*`, `.artist-*` rules)
- Test: `src/components/viewer/ArtistDetailModal.test.tsx` (new)

**Interfaces:**
- Consumes: `Icon` (Task 1).
- Produces: emoji-free artist modal. Keep the typographic quote marks `" "` (content, not icons).

- [ ] **Step 1: Write the failing test**

Create `src/components/viewer/ArtistDetailModal.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ArtistDetailModal } from './ArtistDetailModal';
import type { Artist } from '../../types/schema';

const artist = { id: 'ar1', name: 'E. Marchetti', life_dates: '1928–1994',
  contact_info: 'Rome', biography: 'Bio.', quote: 'Colour is memory.' } as unknown as Artist;

describe('ArtistDetailModal', () => {
  it('renders icons and no emoji', () => {
    const { container } = render(<ArtistDetailModal artist={artist} onClose={() => {}} />);
    expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThan(0);
    expect(container.textContent ?? '').not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viewer/ArtistDetailModal.test.tsx`
Expected: FAIL — ✕/👤/📍 present, no `.reda-icon`.

- [ ] **Step 3: Replace the emoji**

Add at top:

```tsx
import { Icon } from '../ui';
```

- Close `✕` (line ~42): → `<Icon name="close" size={16} />`
- Portrait placeholder `<span>👤</span>` (line ~62): → `<Icon name="user" size={52} />`
- Contact icon `📍` (line ~73): `<span className="artist-contact-icon">📍</span>` → `<span className="artist-contact-icon"><Icon name="pin" size={13} /></span>`

Leave the `quote-mark` spans (`"`/`"`) unchanged — they are decorative typography.

- [ ] **Step 4: Remove superseded App.css rules**

```bash
grep -nE "^\.(artist-modal|artist-portrait|artist-lifedates|artist-contact|artist-header|artist-kicker|artist-name|artist-quote|quote-mark|artist-bio)" src/App.css
```

Delete each matched block including the `@media (max-width:720px)` variant (now provided by `reda-viewer.css`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/viewer/ArtistDetailModal.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/viewer/ArtistDetailModal.tsx src/components/viewer/ArtistDetailModal.test.tsx src/App.css
git commit -m "feat(viewer): re-skin artist detail modal"
```

---

### Task 10: SettingsModal

**Files:**
- Modify: `src/components/viewer/SettingsModal.tsx`
- Modify: `src/App.css` (remove superseded `.settings-*` rules)
- Test: `src/components/viewer/SettingsModal.test.tsx` (new)

**Interfaces:**
- Consumes: `Icon` (Task 1).
- Produces: emoji-free settings modal; the intro-transition `<select>` styled by a class, no inline hex.

- [ ] **Step 1: Write the failing test**

Create `src/components/viewer/SettingsModal.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SettingsModal, DEFAULT_VIEWER_SETTINGS } from './SettingsModal';

describe('SettingsModal', () => {
  it('renders icons and no emoji', () => {
    const { container } = render(
      <SettingsModal settings={DEFAULT_VIEWER_SETTINGS} onChange={() => {}} onClose={() => {}} />
    );
    expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThan(0);
    expect(container.textContent ?? '').not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viewer/SettingsModal.test.tsx`
Expected: FAIL — ⚙️/🎨/🎬/🚶/🖱️/📱/✕ present.

- [ ] **Step 3: Replace emoji + inline hex**

Add at top:

```tsx
import { Icon } from '../ui';
```

- Header `⚙️ Gallery & Control Settings` (line ~89): → `<Icon name="gear" size={18} /> Gallery &amp; Control Settings`
- Close `✕` (line ~91): → `<Icon name="close" size={16} />`
- `🎨 Visuals & Transitions` (line ~98): → `<Icon name="palette" size={14} /> Visuals &amp; Transitions`
- `🎬 Intro-to-Gallery Transition` (line ~102): → `<Icon name="film" size={13} /> Intro-to-Gallery Transition`
- `🚶 Movement Speed (WASD / Arrows)` (line ~154): → `<Icon name="walk" size={14} /> Movement Speed (WASD / Arrows)`
- `🖱️ Desktop Mouse Look` (line ~196): → `<Icon name="mouse" size={14} /> Desktop Mouse Look`
- `📱 Mobile Touch Drag Look` (line ~221): → `<Icon name="phone" size={14} /> Mobile Touch Drag Look`
- Select inline style (lines ~104-115): remove the inline `style={{ … }}` object with raw hex and add `className="input select settings-select"`:
```tsx
              <select
                value={local.introTransition || 'zoom_in'}
                onChange={(e) => update({ introTransition: e.target.value as IntroTransition })}
                className="input select settings-select"
              >
                {INTRO_TRANSITIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} — {t.description}
                  </option>
                ))}
              </select>
```
Add a `.settings-select` rule to `src/styles/reda-viewer.css` (parchment-free dark field): 
```css
.settings-select{width:100%;padding:8px 12px;border-radius:6px;background:var(--reda-char-3);color:var(--reda-cream);border:1px solid var(--reda-line)}
.settings-select:focus-visible{outline:none;box-shadow:var(--reda-focus)}
.settings-select option{background:var(--reda-char-2);color:var(--reda-cream)}
```

- [ ] **Step 4: Remove superseded App.css rules**

```bash
grep -nE "^\.(settings-modal|settings-section|settings-toggle|settings-slider|settings-select|settings-toggles|range-input|slider-labels)" src/App.css
```

Delete each matched block.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/viewer/SettingsModal.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/viewer/SettingsModal.tsx src/components/viewer/SettingsModal.test.tsx src/styles/reda-viewer.css src/App.css
git commit -m "feat(viewer): re-skin settings modal"
```

---

### Task 11: FallbackCatalog

**Files:**
- Modify: `src/components/viewer/FallbackCatalog.tsx:85-96`
- Modify: `src/App.css` (remove superseded `.fallback-catalog*` rules)
- Test: `src/components/viewer/fallback.test.tsx` (extend existing)

**Interfaces:**
- Consumes: `Icon` (Task 1).
- Produces: emoji-free fallback catalog.

- [ ] **Step 1: Write the failing test**

Append to the existing `src/components/viewer/fallback.test.tsx` (import `Icon`-render check). If the file renders `FallbackCatalog` already, add:

```tsx
it('uses an icon for the audio marker, not emoji', () => {
  const artworks = [{ id: 'a', title: 'Track', artwork_type: 'AUDIO', media_file_id: 'm',
    order_index: 0, updated_at: 1 }] as any;
  const { container } = render(<FallbackCatalog title="X" artworks={artworks} />);
  expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThan(0);
  expect(container.textContent ?? '').not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u);
});
```

(If `render`/`FallbackCatalog` are not yet imported in that file, add the imports.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viewer/fallback.test.tsx`
Expected: FAIL — 🎵 present, no `.reda-icon`.

- [ ] **Step 3: Replace the emoji**

Add at top of `src/components/viewer/FallbackCatalog.tsx`:

```tsx
import { Icon } from '../ui';
```

Replace the audio icon (lines ~87-89):

```tsx
                <span className="fallback-catalog__audio-icon" aria-hidden="true">
                  <Icon name="audio" size={16} />
                </span>
```

- [ ] **Step 4: Remove superseded App.css rules**

```bash
grep -nE "^\.fallback-catalog" src/App.css
```

Delete each matched block.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/viewer/fallback.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/viewer/FallbackCatalog.tsx src/components/viewer/fallback.test.tsx src/App.css
git commit -m "feat(viewer): re-skin fallback catalog"
```

---

### Task 12: Final QA sweep + App.css cleanup

**Files:**
- Modify: `src/App.css` (remove any remaining viewer-only rules)
- Test: `src/components/viewer/no-emoji.test.ts` (new, whole-directory scan)

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a guardrail test proving the whole viewer is emoji-free, and a clean `App.css`.

- [ ] **Step 1: Write the failing whole-directory scan test**

Create `src/components/viewer/no-emoji.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2100}-\u{214F}\u{27F0}-\u{27FF}\u{FE0F}]/u;
const dir = __dirname;

describe('viewer is fully icon-based', () => {
  const files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
  for (const f of files) {
    it(`${f} has no emoji or glyph icons`, () => {
      const src = readFileSync(resolve(dir, f), 'utf8');
      expect(EMOJI.test(src)).toBe(false);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails (or passes)**

Run: `npx vitest run src/components/viewer/no-emoji.test.ts`
Expected: If any file still has a glyph, FAIL and name the file — fix that file's glyph, then re-run. If Tasks 3–11 were complete, this may already PASS; the test remains as a permanent guardrail.

- [ ] **Step 3: Verify no raw hex in viewer TSX**

Run:

```bash
grep -rnE "#[0-9a-fA-F]{3,6}\b" src/components/viewer/ --include=*.tsx | grep -v "\.test\." | grep -viE "matColor|FFFFFF"
```

Expected: no chrome-color matches. If any remain, replace them with the appropriate `var(--reda-*)` token and commit.

- [ ] **Step 4: Remove leftover viewer rules from App.css**

Run a broad scan for viewer selectors still in `App.css`:

```bash
grep -nE "^\.(viewer|intro-|focus-|inspect-|artist-|settings-|fallback-|hotspot-|virtual-joystick|artwork-hover|carousel-|sidebar-|range-input|slider-labels|detail-badge|eyebrow)" src/App.css
```

For each remaining block that is viewer-only and now duplicated by `reda-viewer.css`, delete it. Leave any selector that is genuinely shared with a non-viewer surface (verify with a repo-wide `grep` of the class in `src/`); when shared, leave the App.css rule and rely on `reda-viewer.css` import order. Do NOT remove `.viewer` if it still provides the root canvas layout not covered by `reda-viewer.css`.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS — all tests green (previous count + the new viewer tests), 0 failures.

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: `tsc -b && vite build` completes with 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/viewer/no-emoji.test.ts src/App.css
git commit -m "test(viewer): emoji-free guardrail + App.css cleanup"
```

---

## Self-Review

**Spec coverage** — the source of truth is the foundation spec §5 (Viewer = Spotlight) + the approved mockup `docs/design/reda-viewer.html`. Every mockup section maps to a task: intro (T5), progress (T3), roam HUD + tooltip + joystick (T3, T4), focus (T6), inspect + sidebar + drawer + hotspots (T7, T8), artist modal (T9), settings (T10), fallback (T11). Tokens/icons foundation (T1), stylesheet + wiring (T2), guardrail + cleanup (T12). No section unmapped.

**Placeholder scan** — every code step shows the exact JSX/CSS/command. CSS bulk is lifted from the named mockup file with an explicit token-mapping table and a required-selector contract test (no vague "style the panel").

**Type consistency** — `Icon` `name` values used in Tasks 3–11 are all defined in Task 1's `PATHS` (`walk, mouse, target, frame, gear, film, sound, chevronLeft/Right/Up/Down, user, search, pin, close, info, audio, list, reset, pause, minimize, maximize, play, palette, phone`). Tokens referenced (`--reda-glass`, `--reda-glass-2`, `--reda-muted-hi`) are added in Task 1. `Icon` is imported from `'../ui'` (the existing barrel) consistently.

**Note on App.css removal risk:** removal is per-component and gated by `reda-viewer.css` being imported last (so equal-specificity rules already win before removal). Shared selectors (`.eyebrow`, `.sidebar-header`, `.btn`) are explicitly called out to leave in place when shared. This keeps each task independently reviewable and reversible.
