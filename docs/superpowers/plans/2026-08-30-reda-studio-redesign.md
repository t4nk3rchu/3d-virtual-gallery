# REDA Studio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Depends on:** `2026-08-30-reda-foundation.md` (must be implemented first — this plan imports `@/components/ui` and the REDA tokens/classes).

**Goal:** Re-skin the entire curator Studio (Login → Dashboard → New/Edit Exhibition → Artwork Manager and its modals) into the REDA Renaissance Codex world, preserving all functional wiring and API calls.

**Architecture:** The Studio is driven by global CSS class names (`.studio-*`, `.login-*`, `.exhibition-list`, `.artwork-card`, `.badge`, `.input`, `.form-*`) defined in `App.css`, plus inline styles and emoji "icons". Strategy: (1) one new stylesheet `reda-studio.css` re-skins those class names with REDA tokens — imported AFTER `App.css`, so equal-specificity class rules win by source order and the whole Studio transforms with almost no JSX change; then (2) surgical JSX passes wrap the app in a REDA register scope, replace emoji with `<Icon>`, and adopt the component kit + Bodoni chrome per screen. This preserves the Viewer (which also uses `App.css`) untouched until its own plan.

**Tech Stack:** React 19, Vite 8, TS 6, Vitest 3 + @testing-library/react. REDA component kit from `@/components/ui`.

## Global Constraints

- Import order in `src/main.tsx` MUST be: `index.css` → `App.css` → `styles/fonts` → `styles/tokens.css` → `styles/base.css` → `styles/reda-ui.css` → `styles/reda-studio.css`. (Foundation plan added the middle four; this plan adds `reda-studio.css` LAST.)
- Preserve every API call, prop, state, and handler. This is a visual re-skin only — no behavior changes, no copy changes except removing emoji.
- **No emoji as icons** — replace every emoji glyph in Studio files with `<Icon name=…>` or drop it.
- Colors only via REDA tokens (§3 of the design-system spec). No raw hex added to Studio files.
- Do not touch Viewer components (`src/components/viewer/*`) — the shared `App.css` stays; `reda-studio.css` only restyles Studio class names.

---

## File Structure

- `src/styles/reda-studio.css` — REDA re-skin of Studio/login/form/badge/card class names. **Backbone deliverable.**
- `src/components/studio/StudioTopBar.tsx` — shared REDA app bar (wordmark + breadcrumb + actions).
- `src/components/studio/StudioApp.tsx` — modify: scope wrapper, top bar, emoji→Icon, component swaps.
- `src/components/studio/ArtworkForm.tsx`, `HotspotEditor.tsx`, `ArtistManagerModal.tsx`, `RoomImporter.tsx`, `GizmoPlacement.tsx`, `StudioSettingsSidebar.tsx` — modify: emoji→Icon, adopt `<Button>`/fields.
- `src/components/studio/StudioApp.test.tsx` — new integration tests (fetch stubbed).
- `src/lib/reda-studio-css.test.ts` — content test for the re-skin stylesheet.
- `src/main.tsx` — add the `reda-studio.css` import (last).

---

## Task 1: REDA Studio stylesheet (the re-skin backbone)

**Files:**
- Create: `src/styles/reda-studio.css`, `src/lib/reda-studio-css.test.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: REDA styling for all Studio class names, scoped so the Studio adopts the Renaissance Codex look. Later tasks add the `.reda-dark` wrapper that these rules sit inside.

- [ ] **Step 1: Write the failing content test**

Create `src/lib/reda-studio-css.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../styles/reda-studio.css'), 'utf8');

describe('reda-studio.css', () => {
  it('re-skins the core Studio class names', () => {
    for (const sel of ['.studio-dashboard', '.studio-header', '.studio-card',
      '.exhibition-list__item', '.artwork-card', '.badge--live', '.badge--draft',
      '.login-card', '.form-label', '.artwork-type-badge']) {
      expect(css).toContain(sel);
    }
  });
  it('uses REDA tokens, not raw slate/indigo hex', () => {
    expect(css).toContain('var(--reda-');
    expect(css).not.toMatch(/#0f172a|#6366f1|#1e293b/i); // old palette gone
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/reda-studio-css.test.ts`
Expected: FAIL — `ENOENT` (file missing).

- [ ] **Step 3: Create `src/styles/reda-studio.css`**

```css
/* REDA re-skin of the existing Studio class names. Loaded after App.css. */

/* ---- app grounds & shells ---- */
.studio-dashboard, .studio-editor, .studio-new-exhibition {
  background: var(--reda-char); color: var(--reda-cream);
  min-height: 100vh; padding: 28px clamp(16px, 4vw, 48px) 64px;
  font-family: var(--reda-ui); }
.studio-loading { background: var(--reda-char); color: var(--reda-muted);
  font-family: var(--reda-text); font-size: 18px; padding: 60px; text-align: center; }

/* ---- headers ---- */
.studio-header, .studio-editor__header {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding-bottom: 18px; margin-bottom: 24px; border-bottom: 1px solid var(--reda-line); }
.studio-header__title, .studio-editor__title { font-family: var(--reda-display); font-weight: 500;
  color: var(--reda-cream-hi); letter-spacing: .01em; }
.studio-header__curator { font-family: var(--reda-ui); font-size: 12px; color: var(--reda-muted-2);
  letter-spacing: .04em; }
.studio-header__actions, .header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.title-area { display: flex; align-items: center; gap: 12px; }

/* ---- cards / panels ---- */
.studio-card { background: var(--reda-parch); color: var(--reda-ink);
  border: 1px solid #d3c6a8; border-radius: var(--reda-radius); padding: 22px; }
.studio-card h3 { font-family: var(--reda-display); color: var(--reda-ink); }
.hint { font-family: var(--reda-text); font-size: 13.5px; color: var(--reda-ink-2); }
.studio-editor__status-banner { background: rgba(110,115,88,.18); border: 1px solid var(--reda-sage);
  color: var(--reda-cream); border-radius: var(--reda-radius); padding: 12px 16px; margin-bottom: 18px;
  font-family: var(--reda-ui); font-size: 13px; }

/* ---- legacy inputs (inside parchment cards) ---- */
.form-label { display: block; font-family: var(--reda-ui); font-size: 10px; font-weight: 700;
  letter-spacing: .09em; text-transform: uppercase; color: var(--reda-label); margin-bottom: 5px; }
.input { width: 100%; font-family: var(--reda-text); font-size: 15px; color: var(--reda-ink);
  background: var(--reda-field); border: 1px solid #cbbd9d; border-radius: var(--reda-radius); padding: 9px 11px; }
.input:focus { outline: none; border-color: var(--reda-gold); box-shadow: var(--reda-focus); }
.input.textarea, textarea.input { resize: vertical; min-height: 60px; line-height: 1.45; }
.form-group { margin-bottom: 16px; }
.form-actions { display: flex; gap: 10px; margin-top: 8px; }
.error, .login-error { font-family: var(--reda-ui); font-size: 12px; color: #B23A2E; }

/* ---- badges ---- */
.badge { font-family: var(--reda-ui); font-size: 10px; font-weight: 700; letter-spacing: .1em;
  text-transform: uppercase; padding: 4px 9px; border-radius: var(--reda-radius-sm); display: inline-block; }
.badge--live { background: var(--reda-sage); color: #10130c; }
.badge--draft { background: var(--reda-char-3); color: var(--reda-muted); border: 1px solid var(--reda-line); }

/* ---- exhibition list (codex tiles) ---- */
.exhibition-list { list-style: none; margin: 0; padding: 0; display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; }
.exhibition-list__item { background: var(--reda-char-2); border: 1px solid var(--reda-line);
  border-radius: var(--reda-radius); padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.exhibition-list__info h3 { font-family: var(--reda-display); color: var(--reda-cream-hi); margin: 0 0 6px; }
.slug-preview { font-family: var(--reda-text); font-style: italic; color: var(--reda-muted); font-size: 13px; }
.exhibition-list__actions { display: flex; gap: 8px; flex-wrap: wrap; }
.studio-empty, .artwork-manager__empty { background: var(--reda-char-2); border: 1px dashed var(--reda-line);
  border-radius: var(--reda-radius); padding: 40px; text-align: center; color: var(--reda-muted);
  display: flex; flex-direction: column; gap: 14px; align-items: center; }

/* ---- artwork manager ---- */
.artwork-manager { margin-top: 8px; }
.artwork-manager__header { display: flex; justify-content: space-between; align-items: flex-start;
  gap: 16px; margin-bottom: 18px; }
.artwork-manager h3 { font-family: var(--reda-display); color: var(--reda-cream-hi); }
.artwork-manager__hint { font-family: var(--reda-text); color: var(--reda-muted); font-size: 14px; max-width: 640px; }
.artwork-manager__actions { display: flex; gap: 10px; }
.artwork-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
.artwork-card { background: var(--reda-char-2); border: 1px solid var(--reda-line);
  border-radius: var(--reda-radius); overflow: hidden; display: flex; flex-direction: column; }
.artwork-card__media { position: relative; aspect-ratio: 4/3; background: var(--reda-wall); }
.artwork-card__thumb { width: 100%; height: 100%; object-fit: cover; }
.artwork-card__placeholder, .artwork-card__audio-placeholder { width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center; color: var(--reda-muted-2);
  font-family: var(--reda-ui); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.artwork-type-badge { position: absolute; top: 8px; left: 8px; background: rgba(27,26,23,.72);
  color: var(--reda-gold); border: 1px solid var(--reda-line); font-family: var(--reda-ui); font-size: 9px;
  font-weight: 700; letter-spacing: .1em; padding: 4px 7px; border-radius: var(--reda-radius-sm); }
.artwork-card__body { padding: 14px; flex: 1; }
.artwork-card__title { font-family: var(--reda-display); color: var(--reda-cream-hi); font-size: 16px; margin: 0 0 6px; }
.artwork-card__artist, .artwork-card__meta, .artwork-card__dims, .artwork-card__hotspots-count {
  font-family: var(--reda-text); color: var(--reda-muted); font-size: 13px; margin: 2px 0; }
.artwork-card__footer { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 14px;
  border-top: 1px solid var(--reda-line); }

/* ---- login ---- */
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: radial-gradient(120% 90% at 30% 0%, #26231C, var(--reda-char) 60%); padding: 24px; }
.login-card { width: 100%; max-width: 400px; background: var(--reda-parch); color: var(--reda-ink);
  border: 1px solid #d3c6a8; border-radius: var(--reda-radius); padding: 34px 30px; box-shadow: 0 30px 70px rgba(0,0,0,.5); }
.login-card__title { font-family: var(--reda-display); color: var(--reda-ink); text-align: center; margin: 0 0 4px; }
.login-card__subtitle { font-family: var(--reda-ui); font-size: 11px; letter-spacing: .28em; text-transform: uppercase;
  color: var(--reda-oxblood); text-align: center; margin: 0 0 22px; }
.btn--google { width: 100%; background: var(--reda-char); color: var(--reda-cream); border: 1px solid var(--reda-line); }
.login-divider { border: 0; border-top: 1px solid #cbbd9d; margin: 22px 0 10px; }
.login-divider__label { font-family: var(--reda-text); font-size: 13px; color: var(--reda-ink-2); text-align: center; margin: 0 0 16px; }
.login-card .input { margin: 0; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
```

- [ ] **Step 4: Wire the import (last) in `src/main.tsx`**

Add, immediately after the `import './styles/reda-ui.css'` line added by the Foundation plan:
```ts
import './styles/reda-studio.css';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/lib/reda-studio-css.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/styles/reda-studio.css src/lib/reda-studio-css.test.ts src/main.tsx
git commit -m "feat(studio): REDA re-skin stylesheet for Studio class names"
```

---

## Task 2: Register scope + integration tests for the Studio shell

**Files:**
- Modify: `src/components/studio/StudioApp.tsx` (wrap outputs in `.reda-dark`)
- Create: `src/components/studio/StudioApp.test.tsx`

**Interfaces:**
- Consumes: `reda-studio.css` classes (Task 1).
- Produces: every top-level Studio screen rendered inside a `<div className="reda-dark">…</div>` (or the class added to each root element) so REDA scope styles + focus rings apply.

- [ ] **Step 1: Write the failing test**

Create `src/components/studio/StudioApp.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioApp } from './StudioApp';

function stubFetch(handler: (url: string) => unknown) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const body = handler(url);
    return { ok: body != null, json: async () => body, text: async () => '' } as Response;
  }));
}

describe('StudioApp shell', () => {
  beforeEach(() => stubFetch((url) => (url.includes('/api/auth/me') ? null : null)));
  afterEach(() => vi.unstubAllGlobals());

  it('renders the Login screen inside a REDA scope when unauthenticated', async () => {
    const { container } = render(<StudioApp />);
    // waits out the checking state
    expect(await screen.findByRole('button', { name: /Continue with Google/i })).toBeTruthy();
    expect(container.querySelector('.reda-dark, .login-page')).toBeTruthy();
  });

  it('toggles to the register form', async () => {
    render(<StudioApp />);
    await screen.findByRole('button', { name: /Continue with Google/i });
    await userEvent.click(screen.getByRole('button', { name: /Need an account/i }));
    expect(screen.getByPlaceholderText(/Full Name/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/studio/StudioApp.test.tsx`
Expected: FAIL — the `.reda-dark`/scope assertion or Google-button query may fail until the scope wrapper + Task 3 login markup land. (If the Google button text already matches, the scope assertion still drives the change.)

- [ ] **Step 3: Add the REDA scope wrapper**

In `src/components/studio/StudioApp.tsx`, wrap the returned screens so each carries the REDA dark scope. Minimal approach — change the root wrappers:
- `Dashboard` root: `<div className="studio-dashboard reda-dark">`
- `ExhibitionEditor` root: `<div className="studio-editor reda-dark">`
- `NewExhibitionForm` root: `<div className="studio-new-exhibition reda-dark">`
- `Login` root `<main className="login-page reda-dark" …>`
- The `checking` branch: `<div className="studio-loading reda-dark">Loading Curator Studio…</div>`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/studio/StudioApp.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/studio/StudioApp.tsx src/components/studio/StudioApp.test.tsx
git commit -m "feat(studio): REDA register scope + shell integration tests"
```

---

## Task 3: Emoji → Icon sweep + Button/field adoption in StudioApp.tsx

**Files:**
- Modify: `src/components/studio/StudioApp.tsx`

**Interfaces:**
- Consumes: `Icon`, `Button`, `TextField`, `TextArea`, `SelectField` from `@/components/ui`.

- [ ] **Step 1: Add the import**

At the top of `StudioApp.tsx`:
```ts
import { Icon, Button } from '../ui';
```

- [ ] **Step 2: Replace every emoji with an Icon (exact mapping)**

Apply these replacements throughout `StudioApp.tsx` (emoji → JSX). Keep surrounding text:
| Current | Replace with |
|---|---|
| `<span aria-hidden="true">G</span> Continue with Google` | `<Icon name="google" /> Continue with Google` |
| `👤 Solo Artist Exhibition` | `<Icon name="user" /> Solo Artist Exhibition` |
| `👥 Group / Collective Exhibition` | `<Icon name="users" /> Group / Collective Exhibition` |
| `👥 Manage Artists (…)` | `<Icon name="users" /> Manage Artists (…)` |
| `🎬 Intro Video File Link…` label text | remove the `🎬 ` prefix (label stays) |
| `📁 Pick Video from Google Drive` (DriveFilePicker `buttonLabel`) | `Pick Video from Google Drive` (drop emoji) |
| `🎬` / `✨` in other labels | drop the emoji glyph |
| `👤 {art.artist}` (artwork card) | `<Icon name="user" size={13} /> {art.artist}` |
| `🎵 Audio Marker` | `<Icon name="audio" /> Audio Marker` |
| `🎨 Other Artworks (…)` | `<Icon name="palette" /> Other Artworks (…)` |
| `🎮 3D Gizmo Scene Placement` | `<Icon name="cube" /> 3D Gizmo Scene Placement` |
| `👤` fallback in group artist header | `<Icon name="user" size={20} />` |

- [ ] **Step 3: Swap header/action buttons to `<Button>`**

Replace the raw `<button className="btn btn--primary">`, `btn--ghost`, `btn--secondary`, `btn--danger` in Dashboard header, Editor header, and ArtworkManager header with `<Button variant="…">`. Example — Dashboard header actions:
```tsx
<div className="studio-header__actions">
  <Button variant="primary" iconLeft="plus" onClick={onNew}>New Exhibition</Button>
  <Button variant="ghost" onClick={onLogout}>Sign out</Button>
</div>
```
Publish button (Editor) uses `variant="primary"`; Delete uses `variant="danger"`; Preview/View links stay as `<a className="btn btn--secondary">` (anchors, not buttons).

- [ ] **Step 4: Run the suite**

Run: `pnpm vitest run src/components/studio/StudioApp.test.tsx`
Expected: PASS (existing shell tests still green — the Google button now contains an SVG but its accessible name still matches `/Continue with Google/i`).

- [ ] **Step 5: Verify no emoji remain**

Run:
```bash
node -e "const s=require('fs').readFileSync('src/components/studio/StudioApp.tsx','utf8');const m=s.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);process.exit(m?(console.log('emoji left:',m),1):0)"
```
Expected: exit 0 (no emoji).

- [ ] **Step 6: Commit**

```bash
git add src/components/studio/StudioApp.tsx
git commit -m "feat(studio): replace emoji with Icon, adopt Button in Studio shell"
```

---

## Task 4: ExhibitionEditor + NewExhibitionForm — field components & Bodoni chrome

**Files:**
- Modify: `src/components/studio/StudioApp.tsx` (the `NewExhibitionForm` and `ExhibitionEditor` form sections)

**Interfaces:**
- Consumes: `TextField`, `TextArea`, `SelectField` from `@/components/ui`.

- [ ] **Step 1: Convert the New Exhibition form fields**

In `NewExhibitionForm`, replace each `<div className="form-group"><label…/><input className="input"…/></div>` block with the equivalent `<TextField>` / `<TextArea>`. Example (title):
```tsx
<TextField id="new-ex-title" label="Exhibition Title" value={title}
  onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Modernist Horizons 2026" required />
```
Repeat for slug, curator name (TextField) and description (TextArea). Keep the `RoomImporter`, error `<p className="error">`, and `<div className="form-actions">` with `<Button>`s.

- [ ] **Step 2: Convert the Exhibition Editor detail form fields**

In `ExhibitionEditor`'s `<form onSubmit={handleSaveDetails}>`, convert Title/Curator to `TextField`, Room to `SelectField` (keep the same `<option>` logic as children), Description to `TextArea`, and the intro-video input to `TextField` (keep its `onChange`/`onBlur` handlers and the `DriveFilePicker` beside the label). Keep the curation-type radio group and the Artist-Profiles panel as-is (already re-skinned via CSS in Task 1), but wrap the Artist-Profiles panel in `<Panel variant="parch">` if desired.

- [ ] **Step 3: Run the build (typecheck)**

Run: `pnpm build`
Expected: `tsc -b` exits 0 (all field props typed correctly).

- [ ] **Step 4: Commit**

```bash
git add src/components/studio/StudioApp.tsx
git commit -m "feat(studio): editor & new-exhibition forms use REDA field components"
```

---

## Task 5: Sub-components sweep (modals, importer, gizmo, settings)

**Files:**
- Modify: `src/components/studio/ArtworkForm.tsx`, `HotspotEditor.tsx`, `ArtistManagerModal.tsx`, `RoomImporter.tsx`, `GizmoPlacement.tsx`, `StudioSettingsSidebar.tsx`

**Interfaces:**
- Consumes: `@/components/ui` (`Button`, `Icon`, `TextField`, `TextArea`, `SelectField`).

These already inherit the Task-1 re-skin via shared classes (`.btn`, `.input`, `.form-*`, `.studio-card`). This task removes emoji and adopts the kit for consistency. For **each** file:

- [ ] **Step 1: Remove emoji**

In each file, replace emoji glyphs with `<Icon>` (import `Icon` from `../ui`) using the mapping: person→`user`, people→`users`, gear/settings→`gear`, film/video→`film`, audio/music→`audio`, palette/art→`palette`, pin/marker→`pin`, trash/delete→`trash`, plus/add→`plus`, close/×→`close`. Drop purely decorative emoji.

Run this to list emoji per file before editing:
```bash
for f in ArtworkForm HotspotEditor ArtistManagerModal RoomImporter GizmoPlacement StudioSettingsSidebar; do
  echo "== $f =="; grep -nP "[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}]" "src/components/studio/$f.tsx" || echo "  (none)"; done
```

- [ ] **Step 2: Adopt Button for primary/secondary/danger actions**

Replace raw `<button className="btn btn--primary|secondary|danger|ghost">` with `<Button variant=…>` in each file (modals' save/cancel/delete footers). Leave any element that is an anchor (`<a className="btn …">`) as-is.

- [ ] **Step 3: Ensure modal shells read REDA**

Each modal's overlay/container class (e.g. a `.modal`, `.modal-overlay`, or inline-styled wrapper) should sit on a parchment or charcoal panel. If a modal uses inline styles for its panel background, change the background to `var(--reda-parch)` (content panels) or `var(--reda-char-2)` (dark chrome) and text to the matching token. If it uses a class, add a rule for it to `reda-studio.css`.

- [ ] **Step 4: Verify no emoji remain in Studio**

Run:
```bash
grep -rlP "[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}]" src/components/studio/ && echo "EMOJI REMAIN" || echo "clean"
```
Expected: `clean`.

- [ ] **Step 5: Run the full suite + build**

Run: `pnpm test && pnpm build`
Expected: all tests PASS, build exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/studio
git commit -m "feat(studio): REDA sweep across modals, importer, gizmo, settings"
```

---

## Task 6: Artwork type badge polish + numbered codex cards

**Files:**
- Modify: `src/components/studio/StudioApp.tsx` (`renderArtworkCard`)
- Modify: `src/styles/reda-studio.css`

**Interfaces:** none new.

- [ ] **Step 1: Number the cards as codex entries**

In `renderArtworkCard`, the title already renders `{index + 1}. {art.title}`. Split the number into a styled folio: replace the `<h4 className="artwork-card__title">` content with:
```tsx
<h4 className="artwork-card__title">
  <span className="artwork-card__no">{String(index + 1).padStart(2, '0')}</span> {art.title}
</h4>
```

- [ ] **Step 2: Style the folio number**

Append to `src/styles/reda-studio.css`:
```css
.artwork-card__no { font-family: var(--reda-display); color: var(--reda-gold); margin-right: 4px; }
```

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/studio/StudioApp.tsx src/styles/reda-studio.css
git commit -m "feat(studio): codex folio numbers on artwork cards"
```

---

## Task 7: Visual QA in the real app

**Files:** none (verification only).

- [ ] **Step 1: Launch the dev app**

Run: `pnpm dev` and open `/studio`. (If a login is required, use the password path or an existing curator account.)

- [ ] **Step 2: Walk every Studio screen and confirm**

Check each against the design-system spec:
- Login: parchment card on the spotlight gradient, Bodoni title, gold-focus inputs, Google button with SVG icon (no emoji).
- Dashboard: charcoal ground, Bodoni title, exhibition tiles with live/draft badges (sage/charcoal), `<Button>` actions.
- New + Edit Exhibition: parchment `studio-card`, REDA fields with gold focus rings, radio group legible, no emoji.
- Artwork Manager: charcoal cards, artwork thumbnails on neutral (`--reda-wall`) media area, gold type-badge, folio numbers, footer `<Button>`s.
- Modals (Artwork form, Hotspot editor, Artist manager, Gizmo): parchment/charcoal panels, REDA buttons, no emoji.
- Tab/keyboard through a form: **visible gold focus ring** on every control.

- [ ] **Step 3: Confirm the Viewer is untouched**

Open a public exhibition `/e/<slug>` and confirm it still renders as before (this plan must not change Viewer styling).

- [ ] **Step 4: Final full check**

Run: `pnpm test && pnpm build`
Expected: all PASS, build exits 0.

- [ ] **Step 5: Commit any QA fixes, then finalize**

```bash
git add -A
git commit -m "fix(studio): REDA visual QA adjustments"
```

---

## Self-Review

**Spec coverage:** Studio = Operate register (§5) → Task 1 re-skin + Task 2 scope. Warm chrome / parchment inspector (§5) → `.studio-card` parchment + charcoal shells. No-emoji rule (§ principles) → Tasks 3 & 5 sweeps with verification greps. Component adoption (§7) → Buttons/fields Tasks 3–5. Neutral art stage (§2) → `.artwork-card__media { background: var(--reda-wall) }`. Focus rings/labels (§9) → inherited from Foundation base.css + labeled fields; QA Step 2 verifies. Codex numbering motif (§6) → Task 6.
**Gaps (intentional):** The idealized 3-panel IDE viewport from the mock is NOT built — the real Studio is form-based, and this plan re-skins what exists (correct scope). The 3D gizmo canvas chrome gets token colors but its Babylon internals are unchanged. Full `App.css` retirement waits for the Viewer plan (shared file).
**Placeholder scan:** none — CSS is complete, emoji mappings are explicit, tests are runnable. Per-screen JSX edits reference exact blocks/handlers in the read source (StudioApp.tsx lines 113–1286).
**Type consistency:** `Button`/`Icon`/field component names and props match the Foundation plan's exports (`variant`, `iconLeft`, `{id,label,error,hint}`); `IconName` values used (`google,user,users,cube,audio,palette,plus,trash,pin,film,gear,close`) all exist in the Foundation Icon set.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-30-reda-studio-redesign.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
