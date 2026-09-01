# REDA Studio Redesign — Workbench Architecture (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Depends on:** `2026-08-30-reda-foundation.md` (must be implemented first — this plan imports `@/components/ui` and the REDA tokens).

**Visual source of truth:** `docs/design/reda-workbench.html` — the approved mockup of the workbench and its 5 states (Dashboard, Curate, Setup·Identity, Artists, Inspect·Hotspots). Lift its `<style>` block and per-state markup. A second reference, `docs/design/reda-codex.html`, is the **full-codex** treatment reserved ONLY for (a) editing a single artwork's catalogue record and (b) a visitor viewing a single artwork; do NOT apply it to list/high-frequency screens.

**Goal:** Replace the form-based Studio (Dashboard cards → book-spread editor → slide-over modals) with a single **workbench**: one editor surface where the 3D room stays live in the center and a tool rail + contextual inspector handle artwork placement, details, artists, identity, and hotspots in place.

**Architecture:** A new `Workbench.tsx` shell owns layout + shared state (active tool, mode, selected artwork/artist) and **re-mounts the existing, working components into its regions** — `GizmoPlacement` becomes the always-live center viewport, `ArtworkForm` becomes the right inspector, `ArtistManagerModal`'s list/form become the Artists pane+inspector, `HotspotEditor` becomes the Inspect-mode overlay. Their data-fetching, Babylon, and API logic are **preserved**; only their mounting and chrome change. The Dashboard is redesigned; the old `ExhibitionEditor` + `ArtworkManager` form screens are retired.

**Tech Stack:** React 19, Vite 8, TS 6, Vitest 3 + @testing-library/react. REDA kit from `@/components/ui`.

## Global Constraints

- Import order in `src/main.tsx`: `index.css` → `App.css` → `styles/fonts` → `styles/tokens.css` → `styles/base.css` → `styles/reda-ui.css` → `styles/reda-workbench.css` (last). (Foundation added the middle four.)
- Preserve every API call, prop contract, Babylon behavior, and data flow of the reused components. This is re-composition + re-skin, not a logic rewrite.
- Colors only via REDA tokens. No raw hex in TSX. **No emoji as icons** — use `<Icon>`.
- Every control keeps a visible gold focus ring (inherited from `base.css`); touch targets ≥ 44px.
- Do NOT touch `src/components/viewer/*` (its own plan). `App.css` stays; `reda-workbench.css` layers over it for Studio class names.
- Reused component prop contracts (verbatim — the shell must satisfy these):
  - `GizmoPlacement({ room: Room; artworks: Artwork[]; initialSelectedArtworkId?: string; onArtworkTransformSaved(id: string, transformJson: string): void; onClose(): void })`
  - `ArtworkForm({ exhibitionId: string; artwork?: Artwork | 'new' | null; artists?: Artist[]; isTeam?: boolean; onSaved(a: Artwork): void; onCancel(): void })`
  - `HotspotEditor({ artwork: Artwork; hotspots: ArtworkHotspot[]; isTeam?: boolean; onHotspotsUpdated(u: ArtworkHotspot[]): void; onClose(): void })`
  - `ArtistManagerModal({ isOpen?: boolean; exhibitionId: string; artists: Artist[]; isTeam?: boolean; onArtistsChanged?(): void; onArtistUpdated?(): void; onClose(): void })`

---

## File Structure

- `src/styles/reda-workbench.css` — workbench shell + state styling (lifted from the mockup). **Backbone.**
- `src/components/studio/workbench/Workbench.tsx` — shell: layout grid, shared state, data fetch, region slots.
- `src/components/studio/workbench/WorkbenchTopBar.tsx` — breadcrumb, mode pill (Roam/Place/Inspect), Saved, Preview, Publish, avatar.
- `src/components/studio/workbench/ToolRail.tsx` — Curate / Rooms / Artists / Setup.
- `src/components/studio/workbench/ArtworksPane.tsx` — room tabs + numbered artwork list.
- `src/components/studio/workbench/ArtistsPane.tsx` — artist list (reuses ArtistManagerModal data pattern).
- `src/components/studio/workbench/Inspector.tsx` — contextual right panel (hosts ArtworkForm / artist form).
- `src/components/studio/workbench/SetupSheet.tsx` — exhibition identity as a focused parchment sheet.
- `src/components/studio/workbench/StatusBar.tsx`.
- `src/components/studio/GizmoPlacement.tsx` — modify: add `embedded?: boolean` to render inline instead of a fullscreen overlay.
- `src/components/studio/StudioApp.tsx` — modify: route Dashboard → Workbench; redesign Dashboard; remove old `ExhibitionEditor`/`ArtworkManager` usage.
- Tests beside each new component; `src/lib/reda-workbench-css.test.ts` for the stylesheet.

---

## Task 1: Workbench stylesheet

**Files:**
- Create: `src/styles/reda-workbench.css`, `src/lib/reda-workbench-css.test.ts`
- Modify: `src/main.tsx`

**Interfaces:** Produces the classes the shell + panes use (`.wb`, `.wb-top`, `.wb-rail`, `.wb-pane`, `.wb-view`, `.wb-insp`, `.wb-status`, `.wb-li`, `.wb-seg`, plus the Dashboard `.dcard`).

- [ ] **Step 1: Write the failing content test**

Create `src/lib/reda-workbench-css.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const css = readFileSync(resolve(__dirname, '../styles/reda-workbench.css'), 'utf8');
describe('reda-workbench.css', () => {
  it('defines the shell regions', () => {
    for (const s of ['.wb', '.wb-top', '.wb-rail', '.wb-pane', '.wb-view', '.wb-insp', '.wb-status', '.dcard']) {
      expect(css).toContain(s);
    }
  });
  it('uses REDA tokens only (no legacy slate/indigo)', () => {
    expect(css).toContain('var(--reda-');
    expect(css).not.toMatch(/#0f172a|#6366f1|#1e293b/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm vitest run src/lib/reda-workbench-css.test.ts` → FAIL (ENOENT).

- [ ] **Step 3: Create `src/styles/reda-workbench.css`**

Lift the workbench CSS from `docs/design/reda-workbench.html`'s `<style>` block, renaming its local classes to the `wb-` prefixed selectors below and swapping every hardcoded value for the matching `--reda-*` token from `tokens.css`. The complete required rule set (copy verbatim, tokens already defined in the foundation):
```css
/* ---- shell grid ---- */
.wb{height:100vh;display:grid;grid-template-rows:54px 1fr 28px;background:var(--reda-char);color:var(--reda-cream);font-family:var(--reda-ui)}
.wb-main{display:grid;min-height:0}
/* ---- top bar ---- */
.wb-top{display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:var(--reda-char-2);border-bottom:1px solid var(--reda-line)}
.wb-top .l,.wb-top .r{display:flex;align-items:center;gap:12px}
.wb-brand{font-family:var(--reda-display);font-size:19px;letter-spacing:.11em;color:var(--reda-cream)}
.wb-crumb{display:flex;align-items:center;gap:8px;color:var(--reda-muted);font-size:12px}
.wb-crumb .cur{color:var(--reda-cream);font-family:var(--reda-display);font-size:15px}
.wb-crumb .sep{opacity:.5}
.wb-pill{display:flex;background:var(--reda-char-3);border:1px solid var(--reda-line);border-radius:5px;overflow:hidden}
.wb-pill button{background:none;border:none;color:var(--reda-muted);font-family:var(--reda-ui);font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:7px 13px;cursor:pointer;min-height:40px}
.wb-pill button[aria-pressed="true"]{background:var(--reda-gold);color:#241a08}
.wb-saved{display:flex;align-items:center;gap:6px;color:var(--reda-sage);font-size:11px;font-weight:500}
.wb-saved i{width:6px;height:6px;border-radius:50%;background:var(--reda-sage)}
.wb-ava{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--reda-terra),var(--reda-oxblood));display:flex;align-items:center;justify-content:center;font-family:var(--reda-display);font-size:13px;color:#F3E7D5}
/* ---- rail ---- */
.wb-rail{background:var(--reda-char-2);border-right:1px solid var(--reda-line);display:flex;flex-direction:column;align-items:center;padding:12px 0;gap:6px}
.wb-rail button{width:40px;height:40px;border-radius:7px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:var(--reda-muted-2);cursor:pointer;background:none;border:none;font-size:7px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;position:relative}
.wb-rail button[aria-pressed="true"]{background:var(--reda-char-3);color:var(--reda-gold)}
.wb-rail button[aria-pressed="true"]:before{content:'';position:absolute;left:-12px;top:9px;bottom:9px;width:3px;background:var(--reda-gold);border-radius:2px}
.wb-rail .sp{flex:1}
/* ---- panes ---- */
.wb-pane{background:var(--reda-char-2);border-right:1px solid var(--reda-line);display:flex;flex-direction:column;min-height:0;overflow:hidden}
.wb-ph{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px}
.wb-ph h3{font-family:var(--reda-display);font-weight:500;font-size:15px;color:var(--reda-cream)}
.wb-ph .add{background:none;border:1px solid var(--reda-line);color:var(--reda-gold);border-radius:5px;width:26px;height:26px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.wb-seg{display:flex;gap:6px;padding:0 12px 8px}
.wb-seg button{font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;padding:5px 9px;border-radius:3px;color:var(--reda-muted);background:var(--reda-char-3);cursor:pointer;border:none}
.wb-seg button[aria-pressed="true"]{background:var(--reda-oxblood);color:#F3E7D5}
.wb-list{overflow:auto;padding:6px 10px}
.wb-li{display:flex;gap:10px;align-items:center;padding:8px;border-radius:6px;cursor:pointer;margin-bottom:3px;width:100%;background:none;border:none;text-align:left;color:inherit}
.wb-li[aria-selected="true"]{background:var(--reda-char-3);outline:1px solid var(--reda-gold)}
.wb-li .no{font-family:var(--reda-display);font-size:12px;color:var(--reda-gold);width:16px}
.wb-li .th{width:42px;height:32px;border:1px solid #4a3a22;background-size:cover;background-position:center;flex:none;border-radius:2px}
.wb-li .pf{width:34px;height:34px;border-radius:50%;background:var(--reda-char-3);border:1px solid var(--reda-line);display:flex;align-items:center;justify-content:center;color:var(--reda-muted);flex:none}
.wb-li .meta{flex:1;min-width:0}
.wb-li .meta b{display:block;font-family:var(--reda-display);font-weight:500;font-size:13px;color:var(--reda-cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-li .meta span{font-size:10.5px;color:var(--reda-muted-2)}
.wb-nav{padding:11px 16px;font-family:var(--reda-ui);font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--reda-muted);cursor:pointer;display:flex;align-items:center;gap:9px;border-left:2px solid transparent;background:none;border-top:none;border-right:none;border-bottom:none;width:100%;text-align:left}
.wb-nav[aria-current="true"]{color:var(--reda-gold);border-left-color:var(--reda-gold);background:var(--reda-char-3)}
/* ---- viewport ---- */
.wb-view{position:relative;background:radial-gradient(120% 100% at 50% 0%,#34343A,var(--reda-wall) 55%,var(--reda-wall-deep));overflow:hidden;min-height:0}
.wb-view .badge-mode{position:absolute;top:14px;left:14px;z-index:6;font-family:var(--reda-ui);font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--reda-gold);background:rgba(27,26,23,.7);border:1px solid var(--reda-line);padding:6px 10px;border-radius:4px}
/* ---- inspector ---- */
.wb-insp{background:var(--reda-parch);color:var(--reda-ink);border-left:1px solid #d3c6a8;display:flex;flex-direction:column;min-height:0}
.wb-insp .ih{padding:14px 16px 10px;border-bottom:1px solid #d3c6a8}
.wb-insp .ih .k{font-family:var(--reda-ui);font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--reda-oxblood)}
.wb-insp .ih h3{font-family:var(--reda-display);font-weight:500;font-size:20px;margin-top:3px;color:var(--reda-ink)}
.wb-insp .body{overflow:auto;flex:1;padding:16px}
.wb-insp .foot{padding:12px 16px;border-top:1px solid #d3c6a8;display:flex;gap:9px;justify-content:flex-end;background:rgba(0,0,0,.03)}
/* ---- status ---- */
.wb-status{display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:var(--reda-char-2);border-top:1px solid var(--reda-line);font-size:11px;color:var(--reda-muted-2);font-variant-numeric:tabular-nums}
.wb-status .g{display:flex;gap:16px;align-items:center}
.wb-status b{color:#CDBF9E;font-weight:600}
/* ---- setup sheet ---- */
.wb-sheetwrap{position:relative;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:26px}
.wb-sheetwrap .vbg{position:absolute;inset:0;background:radial-gradient(120% 100% at 50% 0%,#2a2620,var(--reda-char) 60%);filter:brightness(.5)}
.wb-sheet{position:relative;z-index:2;width:min(760px,94%);background:var(--reda-parch);color:var(--reda-ink);border-radius:10px;box-shadow:0 40px 90px rgba(0,0,0,.55);padding:30px 34px}
/* ---- dashboard ---- */
.dash{padding:26px clamp(18px,3vw,42px)}
.dhead{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}
.dhead .k{font-family:var(--reda-ui);font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--reda-gold)}
.dhead h1{font-family:var(--reda-display);font-weight:500;font-size:34px;color:var(--reda-cream-hi);margin-top:8px}
.dhead .who{font-family:var(--reda-text);color:var(--reda-muted);font-size:14px}
.dgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px}
.dcard{background:var(--reda-char-2);border:1px solid var(--reda-line);border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
.dcard .prev{height:150px;position:relative;background:radial-gradient(60% 80% at 50% 30%,#d9c39a,#1c150d);overflow:hidden}
.dcard .prev .badge{position:absolute;top:12px;right:12px;font-family:var(--reda-ui);font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:5px 9px;border-radius:3px;background:rgba(27,26,23,.75);color:var(--reda-gold);border:1px solid var(--reda-line)}
.dcard .prev .ct{position:absolute;bottom:12px;left:14px;font-family:var(--reda-ui);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#efe6d2;background:rgba(20,18,14,.6);padding:4px 8px;border-radius:3px}
.dcard .bd{padding:18px}
.dcard h3{font-family:var(--reda-display);font-weight:500;font-size:20px;color:var(--reda-cream-hi)}
.dcard .slug{font-family:var(--reda-text);font-style:italic;color:var(--reda-gold);font-size:13px;margin:3px 0 2px}
.dcard .cur{font-family:var(--reda-text);color:var(--reda-muted);font-size:13px}
.dcard .acts{display:flex;gap:8px;padding:14px 18px;border-top:1px solid var(--reda-line)}
.dnew{border:1.5px dashed var(--reda-line);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--reda-muted);cursor:pointer;min-height:280px;font-family:var(--reda-ui);font-weight:600;font-size:12px;letter-spacing:.05em;text-transform:uppercase}
.dnew .c{width:44px;height:44px;border-radius:50%;border:1.5px solid var(--reda-gold);color:var(--reda-gold);display:flex;align-items:center;justify-content:center}
```

- [ ] **Step 4: Add the import (last) in `src/main.tsx`:**
```ts
import './styles/reda-workbench.css';
```

- [ ] **Step 5: Run test** — `pnpm vitest run src/lib/reda-workbench-css.test.ts` → PASS.

- [ ] **Step 6: Commit**
```bash
git add src/styles/reda-workbench.css src/lib/reda-workbench-css.test.ts src/main.tsx
git commit -m "feat(studio): REDA workbench stylesheet"
```

---

## Task 2: Redesigned Dashboard

**Files:** Modify `src/components/studio/StudioApp.tsx` (the `Dashboard` component); Create `src/components/studio/Dashboard.test.tsx`.

**Interfaces:** Consumes `Button`, `Icon` from `@/components/ui`. Keeps the existing `DashboardProps` (`user`, `onEdit`, `onNew`, `onLogout`) and all fetch/delete handlers.

- [ ] **Step 1: Write the failing test**

Create `src/components/studio/Dashboard.test.tsx`:
```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudioApp } from './StudioApp';

function stubFetch(map: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const key = Object.keys(map).find((k) => url.includes(k));
    const body = key ? map[key] : null;
    return { ok: body != null, json: async () => body, text: async () => '' } as Response;
  }));
}
afterEach(() => vi.unstubAllGlobals());

describe('Dashboard (redesigned)', () => {
  it('renders exhibition cards with slug and status in the REDA dash layout', async () => {
    stubFetch({
      '/api/auth/me': { id: 'u1', email: 'c@x.com', full_name: 'C', role: 'curator' },
      '/api/exhibitions': [{ id: 'e1', title: 'Testing GLB Room', slug: 'glb-room', is_published: 0 }],
    });
    const { container } = render(<StudioApp />);
    expect(await screen.findByText('Testing GLB Room')).toBeTruthy();
    expect(screen.getByText('/e/glb-room')).toBeTruthy();
    expect(container.querySelector('.dgrid')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm vitest run src/components/studio/Dashboard.test.tsx` → FAIL (`.dgrid` absent).

- [ ] **Step 3: Rebuild the `Dashboard` render** in `StudioApp.tsx`, lifting the markup from `docs/design/reda-workbench.html` screen 01 (`.dash`/`.dhead`/`.dgrid`/`.dcard`/`.dnew`). Keep the existing state, `useEffect` fetch, and `handleDelete`. The card body maps `ex.title`, `/e/${ex.slug}`, `Curator · ${ex.curator_name ?? '—'}`, the draft/live `.badge`, and actions to `<Button variant="primary" onClick={() => onEdit(ex.id)}>Edit & curate</Button>`, a `View 3D` anchor, and a `<Button variant="danger" iconLeft="trash" …>`. Add the trailing `.dnew` tile calling `onNew`. Replace all emoji with `<Icon>`.

- [ ] **Step 4: Run test** → PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/studio/StudioApp.tsx src/components/studio/Dashboard.test.tsx
git commit -m "feat(studio): redesigned Dashboard with room-preview cards"
```

---

## Task 3: Workbench shell + top bar + status bar

**Files:** Create `src/components/studio/workbench/Workbench.tsx`, `WorkbenchTopBar.tsx`, `StatusBar.tsx`, `Workbench.test.tsx`.

**Interfaces:**
- Produces `Workbench({ exhibitionId: string; isTeam?: boolean; onBack(): void })`. It fetches the exhibition (`GET /api/exhibitions/:id`) + rooms (`GET /api/rooms`) exactly as the old `ExhibitionEditor` did (copy that logic), and holds shared state: `activeTool: 'curate'|'rooms'|'artists'|'setup'`, `mode: 'roam'|'place'|'inspect'`, `selectedArtworkId: string|null`, `selectedArtistId: string|null`. Renders the grid: `<WorkbenchTopBar>` / `<div class="wb-main">` (rail · pane · view · inspector, columns depend on activeTool) / `<StatusBar>`.
- `WorkbenchTopBar({ title; slug; isPublished; mode; onMode(m); saving; onPublish; onUnpublish; onBack; onPreviewHref })`.
- `StatusBar({ roomName; workCount; mode; saved })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/studio/workbench/Workbench.test.tsx`:
```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Workbench } from './Workbench';

const EX = { id: 'e1', title: 'Testing GLB Room', slug: 'glb-room', is_published: 0,
  room: { id: 'r1', name: 'The Salon' }, artworks: [], artists: [], curation_type: 'solo' };
function stub() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const body = url.includes('/api/rooms') ? [{ id: 'r1', name: 'The Salon', is_public: 1 }]
      : url.includes('/api/exhibitions/e1') ? EX : null;
    return { ok: true, json: async () => body, text: async () => '' } as Response;
  }));
}
afterEach(() => vi.unstubAllGlobals());

describe('Workbench shell', () => {
  it('renders top bar, rail, viewport and status once loaded', async () => {
    stub();
    const { container } = render(<Workbench exhibitionId="e1" onBack={() => {}} />);
    expect(await screen.findByText('Testing GLB Room')).toBeTruthy();
    expect(container.querySelector('.wb-rail')).toBeTruthy();
    expect(container.querySelector('.wb-view')).toBeTruthy();
    expect(container.querySelector('.wb-status')).toBeTruthy();
  });
  it('switches mode via the pill', async () => {
    stub();
    render(<Workbench exhibitionId="e1" onBack={() => {}} />);
    await screen.findByText('Testing GLB Room');
    const inspect = screen.getByRole('button', { name: /Inspect/i });
    await userEvent.click(inspect);
    expect(inspect.getAttribute('aria-pressed')).toBe('true');
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm vitest run src/components/studio/workbench/Workbench.test.tsx` → FAIL (module missing).

- [ ] **Step 3: Implement `StatusBar.tsx`**
```tsx
export function StatusBar({ roomName, workCount, mode, saved }:
  { roomName: string; workCount: number; mode: string; saved: string }) {
  return (
    <div className="wb-status">
      <div className="g"><span>{roomName}</span><span>·</span><span>{workCount} works</span></div>
      <div className="g"><span>Mode <b>{mode}</b></span><span><b style={{ color: 'var(--reda-sage)' }}>{saved}</b></span></div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `WorkbenchTopBar.tsx`**
```tsx
import { Button, Icon } from '../../ui';
type Mode = 'roam' | 'place' | 'inspect';
export function WorkbenchTopBar({ title, isPublished, mode, onMode, saving, onPublish, onUnpublish, onBack, previewHref }:
  { title: string; slug: string; isPublished: boolean; mode: Mode; onMode(m: Mode): void;
    saving: boolean; onPublish(): void; onUnpublish(): void; onBack(): void; previewHref: string }) {
  const modes: Mode[] = ['roam', 'place', 'inspect'];
  return (
    <div className="wb-top">
      <div className="l">
        <span className="wb-brand">REDA</span>
        <div className="wb-crumb"><span>Exhibitions</span><span className="sep">/</span><span className="cur">{title}</span></div>
      </div>
      <div className="wb-pill" role="group" aria-label="View mode">
        {modes.map((m) => (
          <button key={m} aria-pressed={m === mode} onClick={() => onMode(m)}>{m}</button>
        ))}
      </div>
      <div className="r">
        <span className="wb-saved"><i /> Saved</span>
        <a className="btn btn--ghost btn--sm" href={previewHref} target="_blank" rel="noopener noreferrer">Preview <Icon name="external" size={12} /></a>
        {isPublished
          ? <Button variant="ghost" size="sm" disabled={saving} onClick={onUnpublish}>Unpublish</Button>
          : <Button variant="primary" size="sm" disabled={saving} onClick={onPublish}>{saving ? 'Publishing…' : 'Publish'}</Button>}
        <button className="wb-ava" onClick={onBack} title="Dashboard">R</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement `Workbench.tsx`** — copy the exhibition/rooms fetch + publish/unpublish handlers from the old `ExhibitionEditor` (StudioApp.tsx:549–716), then render the shell. Minimum viable body for this task (panes/inspector arrive in later tasks — render placeholders that following tasks replace):
```tsx
import { useEffect, useState } from 'react';
import type { ExhibitionDetail, Room } from '../../../types/schema';
import { WorkbenchTopBar } from './WorkbenchTopBar';
import { StatusBar } from './StatusBar';

type Tool = 'curate' | 'rooms' | 'artists' | 'setup';
type Mode = 'roam' | 'place' | 'inspect';

export function Workbench({ exhibitionId, isTeam = false, onBack }:
  { exhibitionId: string; isTeam?: boolean; onBack(): void }) {
  const [exhibition, setExhibition] = useState<ExhibitionDetail | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tool, setTool] = useState<Tool>('curate');
  const [mode, setMode] = useState<Mode>('place');
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  void isTeam; void rooms; void tool; void setTool; void selectedArtworkId; void setSelectedArtworkId;

  const fetchExhibition = () =>
    fetch(`/api/exhibitions/${exhibitionId}`, { credentials: 'include' })
      .then((r) => r.json() as Promise<ExhibitionDetail>).then(setExhibition).catch(() => {});
  useEffect(() => {
    fetchExhibition();
    fetch('/api/rooms', { credentials: 'include' })
      .then((r) => (r.ok ? (r.json() as Promise<Room[]>) : [])).then(setRooms).catch(() => {});
  }, [exhibitionId]);

  const setPublished = async (v: 0 | 1) => {
    if (!exhibition) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/exhibitions/${exhibitionId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ is_published: v }),
      });
      if (res.ok) setExhibition({ ...exhibition, is_published: v });
    } finally { setSaving(false); }
  };

  if (!exhibition) return <div className="studio-loading reda-dark">Loading workbench…</div>;
  return (
    <div className="wb reda-dark">
      <WorkbenchTopBar title={exhibition.title} slug={exhibition.slug} isPublished={!!exhibition.is_published}
        mode={mode} onMode={setMode} saving={saving} onPublish={() => setPublished(1)}
        onUnpublish={() => setPublished(0)} onBack={onBack} previewHref={`/e/${exhibition.slug}`} />
      <div className="wb-main" style={{ gridTemplateColumns: '60px 232px 1fr 320px' }}>
        {/* ToolRail — Task 4 */}<div className="wb-rail" />
        {/* Pane — Task 4 */}<div className="wb-pane" />
        {/* Viewport — Task 5 */}<div className="wb-view"><div className="badge-mode">{mode} mode</div></div>
        {/* Inspector — Task 6 */}<div className="wb-insp" />
      </div>
      <StatusBar roomName={exhibition.room?.name ?? '—'} workCount={exhibition.artworks?.length ?? 0}
        mode={mode} saved="Auto-saved" />
    </div>
  );
}
```

- [ ] **Step 6: Run test** → PASS.

- [ ] **Step 7: Commit**
```bash
git add src/components/studio/workbench
git commit -m "feat(studio): Workbench shell, top bar, status bar"
```

---

## Task 4: Tool rail + Artworks pane + Setup nav

**Files:** Create `ToolRail.tsx`, `ArtworksPane.tsx`; Modify `Workbench.tsx`; Create `panes.test.tsx`.

**Interfaces:**
- `ToolRail({ active: Tool; onChange(t: Tool): void })` — buttons Curate/Rooms/Artists/Setup with `aria-pressed`.
- `ArtworksPane({ artworks: Artwork[]; rooms: Room[]; selectedId: string|null; onSelect(id): void; onAdd(): void })` — `.wb-seg` room tabs + `.wb-list` of `.wb-li` rows (folio number, thumbnail via `getImageUrl(art.media_file_id,'thumbnail')`, title, medium), `aria-selected` on the active row.

- [ ] **Step 1: Write the failing test**

Create `src/components/studio/workbench/panes.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolRail } from './ToolRail';
import { ArtworksPane } from './ArtworksPane';
import type { Artwork } from '../../../types/schema';

const AW = [{ id: 'a1', title: 'Untitled', artist: 'X', medium: 'Oil', artwork_type: 'IMAGE_2D',
  media_file_id: 'f1', order_index: 0 }] as unknown as Artwork[];

describe('ToolRail', () => {
  it('marks the active tool and switches', async () => {
    const onChange = vi.fn();
    render(<ToolRail active="curate" onChange={onChange} />);
    expect(screen.getByRole('button', { name: /Curate/i }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: /Artists/i }));
    expect(onChange).toHaveBeenCalledWith('artists');
  });
});
describe('ArtworksPane', () => {
  it('lists works and selects one', async () => {
    const onSelect = vi.fn();
    render(<ArtworksPane artworks={AW} rooms={[]} selectedId={null} onSelect={onSelect} onAdd={() => {}} />);
    await userEvent.click(screen.getByText('Untitled'));
    expect(onSelect).toHaveBeenCalledWith('a1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm vitest run src/components/studio/workbench/panes.test.tsx` → FAIL.

- [ ] **Step 3: Implement `ToolRail.tsx`**
```tsx
import { Icon, type IconName } from '../../ui';
type Tool = 'curate' | 'rooms' | 'artists' | 'setup';
const ITEMS: { key: Tool; icon: IconName; label: string }[] = [
  { key: 'curate', icon: 'select', label: 'Curate' },
  { key: 'rooms', icon: 'cube', label: 'Rooms' },
  { key: 'artists', icon: 'users', label: 'Artists' },
  { key: 'setup', icon: 'gear', label: 'Setup' },
];
export function ToolRail({ active, onChange }: { active: Tool; onChange(t: Tool): void }) {
  return (
    <div className="wb-rail">
      {ITEMS.map((it) => (
        <button key={it.key} aria-pressed={it.key === active} aria-label={it.label} onClick={() => onChange(it.key)}>
          <Icon name={it.icon} size={17} />{it.label}
        </button>
      ))}
      <div className="sp" />
    </div>
  );
}
```

- [ ] **Step 4: Implement `ArtworksPane.tsx`**
```tsx
import { Icon } from '../../ui';
import type { Artwork, Room } from '../../../types/schema';
import { getImageUrl } from '../../../lib/media/gdrive';
export function ArtworksPane({ artworks, rooms, selectedId, onSelect, onAdd }:
  { artworks: Artwork[]; rooms: Room[]; selectedId: string | null; onSelect(id: string): void; onAdd(): void }) {
  void rooms;
  return (
    <div className="wb-pane">
      <div className="wb-ph"><h3>Artworks</h3><button className="add" onClick={onAdd} aria-label="Add artwork"><Icon name="plus" size={14} /></button></div>
      <div className="wb-list">
        {artworks.map((a, i) => (
          <button key={a.id} className="wb-li" aria-selected={a.id === selectedId} onClick={() => onSelect(a.id)}>
            <span className="no">{String(i + 1).padStart(2, '0')}</span>
            <span className="th" style={{ backgroundImage: a.media_file_id ? `url(${getImageUrl(a.media_file_id, 'thumbnail')})` : undefined }} />
            <span className="meta"><b>{a.title}</b><span>{a.medium || a.artwork_type}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire into `Workbench.tsx`** — replace the placeholder `.wb-rail` and `.wb-pane` with `<ToolRail active={tool} onChange={setTool} />` and, when `tool==='curate'`, `<ArtworksPane artworks={exhibition.artworks ?? []} rooms={rooms} selectedId={selectedArtworkId} onSelect={setSelectedArtworkId} onAdd={() => setSelectedArtworkId('new')} />`. (Artists/Setup panes wired in Tasks 6–8.) Remove the `void` suppressions for the now-used state.

- [ ] **Step 6: Run test + build** — `pnpm vitest run src/components/studio/workbench/panes.test.tsx` PASS; `pnpm build` exits 0.

- [ ] **Step 7: Commit**
```bash
git add src/components/studio/workbench
git commit -m "feat(studio): tool rail + artworks pane"
```

---

## Task 5: Embed GizmoPlacement as the live viewport

**Files:** Modify `src/components/studio/GizmoPlacement.tsx` (add `embedded` prop); Modify `Workbench.tsx`.

**Interfaces:** Add optional `embedded?: boolean` to `GizmoPlacementProps`. When `embedded`, the component renders inline (fills `.wb-view`) instead of as a fullscreen overlay, and omits its own "Back/close" affordance (the workbench top bar owns navigation). All Babylon/gizmo/save logic is unchanged.

- [ ] **Step 1: Add the prop + inline rendering** in `GizmoPlacement.tsx`:
  - Extend the interface: `embedded?: boolean;` and destructure it (default `false`).
  - The root is `<div className="gizmo-placement-overlay">` (line ~520). Change to `<div className={embedded ? 'gizmo-embedded' : 'gizmo-placement-overlay'}>`.
  - In its `onClose` control (the toolbar close/back button), render it only when `!embedded`.

- [ ] **Step 2: Add the embedded layout rule** to `src/styles/reda-workbench.css`:
```css
.gizmo-embedded{position:relative;width:100%;height:100%;display:flex;flex-direction:column;background:transparent}
.gizmo-embedded .gizmo-main-area{flex:1;min-height:0}
```

- [ ] **Step 3: Mount it in `Workbench.tsx`** — replace the placeholder `.wb-view` with:
```tsx
<div className="wb-view">
  <GizmoPlacement
    embedded
    room={exhibition.room}
    artworks={exhibition.artworks ?? []}
    initialSelectedArtworkId={selectedArtworkId && selectedArtworkId !== 'new' ? selectedArtworkId : undefined}
    onArtworkTransformSaved={() => fetchExhibition()}
    onClose={() => {}}
  />
</div>
```
Import `GizmoPlacement` at the top.

- [ ] **Step 4: Verify (manual, Babylon can't run in jsdom)** — `pnpm build` exits 0. Note in the commit that runtime verification happens in Task 10's QA (jsdom has no WebGL, so no unit test for the canvas).

- [ ] **Step 5: Commit**
```bash
git add src/components/studio/GizmoPlacement.tsx src/components/studio/workbench/Workbench.tsx src/styles/reda-workbench.css
git commit -m "feat(studio): embed GizmoPlacement as the live workbench viewport"
```

---

## Task 6: Artwork inspector (ArtworkForm as a panel)

**Files:** Create `Inspector.tsx`; Modify `Workbench.tsx`; Create `Inspector.test.tsx`.

**Interfaces:** `Inspector` renders, when an artwork is selected, the existing `ArtworkForm` inside `.wb-insp`. `ArtworkForm` already renders a `<form className="artwork-form">`; the inspector wraps it with the `.wb-insp` header + hosts its save/cancel. Pass `artwork={selected==='new' ? 'new' : selectedArtwork}`, `artists`, `isTeam`, `onSaved={() => { fetchExhibition(); }}`, `onCancel={() => setSelectedArtworkId(null)}`.

- [ ] **Step 1: Write the failing test**

Create `src/components/studio/workbench/Inspector.test.tsx`:
```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Inspector } from './Inspector';
import type { Artwork } from '../../../types/schema';
const AW = { id: 'a1', title: 'Untitled', artist: 'X', artwork_type: 'IMAGE_2D', media_file_id: 'f1',
  order_index: 0 } as unknown as Artwork;
afterEach(() => vi.unstubAllGlobals());
describe('Inspector', () => {
  it('shows an empty state when nothing is selected', () => {
    const { container } = render(<Inspector exhibitionId="e1" selected={null} artworks={[]} artists={[]}
      onSaved={() => {}} onDeselect={() => {}} />);
    expect(container.querySelector('.wb-insp')).toBeTruthy();
  });
  it('hosts the artwork form when a work is selected', () => {
    render(<Inspector exhibitionId="e1" selected="a1" artworks={[AW]} artists={[]} onSaved={() => {}} onDeselect={() => {}} />);
    expect(screen.getByText('Untitled')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — FAIL (module missing).

- [ ] **Step 3: Implement `Inspector.tsx`**
```tsx
import { ArtworkForm } from '../ArtworkForm';
import type { Artwork, Artist } from '../../../types/schema';
export function Inspector({ exhibitionId, selected, artworks, artists, isTeam, onSaved, onDeselect }:
  { exhibitionId: string; selected: string | null; artworks: Artwork[]; artists: Artist[];
    isTeam?: boolean; onSaved(): void; onDeselect(): void }) {
  if (!selected) {
    return <div className="wb-insp"><div className="ih"><div className="k">Inspector</div><h3>No selection</h3></div>
      <div className="body" style={{ color: 'var(--reda-ink-2)', fontFamily: 'var(--reda-text)' }}>Select a work from the list, or add one, to edit its catalogue record and placement.</div></div>;
  }
  const art = selected === 'new' ? null : artworks.find((a) => a.id === selected) ?? null;
  return (
    <div className="wb-insp">
      <div className="ih"><div className="k">Artwork · catalogue</div><h3>{art?.title ?? 'New artwork'}</h3></div>
      <div className="body">
        <ArtworkForm exhibitionId={exhibitionId} artwork={selected === 'new' ? 'new' : art} artists={artists}
          isTeam={isTeam} onSaved={onSaved} onCancel={onDeselect} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire into `Workbench.tsx`** — replace the placeholder `.wb-insp` (when `tool==='curate'`) with:
```tsx
<Inspector exhibitionId={exhibitionId} selected={selectedArtworkId} artworks={exhibition.artworks ?? []}
  artists={exhibition.artists ?? []} isTeam={isTeam}
  onSaved={() => { fetchExhibition(); }} onDeselect={() => setSelectedArtworkId(null)} />
```

- [ ] **Step 5: Run test + build** → PASS, build 0.

- [ ] **Step 6: Commit**
```bash
git add src/components/studio/workbench
git commit -m "feat(studio): artwork inspector hosts ArtworkForm inline"
```

---

## Task 7: Artists tool (pane + inspector)

**Files:** Create `ArtistsPane.tsx`; Modify `Workbench.tsx`.

**Interfaces:** When `tool==='artists'`, the left pane lists `exhibition.artists` (`.wb-li` with `.pf` avatar, name, life dates), an Add button, and selecting one opens the existing artist editor. Reuse `ArtistManagerModal`'s form by rendering it with `isOpen` controlled by the workbench (it already handles list+edit); mount it as the inspector/overlay for the Artists tool, wiring `onArtistsChanged={fetchExhibition}` and `onClose={() => setTool('curate')}`.

- [ ] **Step 1: Implement `ArtistsPane.tsx`**
```tsx
import { Icon } from '../../ui';
import type { Artist } from '../../../types/schema';
export function ArtistsPane({ artists, selectedId, onSelect, onAdd }:
  { artists: Artist[]; selectedId: string | null; onSelect(id: string): void; onAdd(): void }) {
  return (
    <div className="wb-pane">
      <div className="wb-ph"><h3>Artists</h3><button className="add" onClick={onAdd} aria-label="Add artist"><Icon name="plus" size={14} /></button></div>
      <div className="wb-list">
        {artists.map((a) => (
          <button key={a.id} className="wb-li" aria-selected={a.id === selectedId} onClick={() => onSelect(a.id)}>
            <span className="pf"><Icon name="users" size={15} /></span>
            <span className="meta"><b>{a.name}</b><span>{a.life_dates || 'No dates'}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into `Workbench.tsx`** — add `selectedArtistId` state. When `tool==='artists'`, render `<ArtistsPane …>` as the pane, and render `<ArtistManagerModal isOpen exhibitionId={exhibitionId} artists={exhibition.artists ?? []} isTeam={isTeam} onArtistsChanged={fetchExhibition} onClose={() => setTool('curate')} />` as the artists surface (it provides its own slide-over/form; the workbench simply opens it while the Artists tool is active). Keep the viewport visible behind if the modal is transparent; otherwise the modal covers the right region — acceptable for this tool.

- [ ] **Step 3: Build** — `pnpm build` exits 0.

- [ ] **Step 4: Commit**
```bash
git add src/components/studio/workbench/ArtistsPane.tsx src/components/studio/workbench/Workbench.tsx
git commit -m "feat(studio): artists tool (pane + reused artist editor)"
```

---

## Task 8: Setup tool (identity sheet)

**Files:** Create `SetupSheet.tsx`; Modify `Workbench.tsx`.

**Interfaces:** `SetupSheet({ exhibition; rooms; isTeam; onSaved })` — a focused parchment `.wb-sheet` (center) reproducing the exhibition-identity form from the old `ExhibitionEditor` (StudioApp.tsx:793–985): title, curator, room `SelectField`, solo/group `SegmentedControl`, description `TextArea`, intro-video `TextField` + `DriveFilePicker`, transition `SelectField`, and a "Manage artists" affordance that sets the tool to `artists`. Reuse `buildExhibitionPatch` + the `PUT /api/exhibitions/:id` save exactly as before. Fields use the foundation kit (`TextField`/`TextArea`/`SelectField`/`SegmentedControl`).

- [ ] **Step 1: Implement `SetupSheet.tsx`** — port the identity `<form>` from `ExhibitionEditor.handleSaveDetails` + its form state, swapping raw `.input`/`.form-group` markup for `TextField`/`TextArea`/`SelectField`, radios for `SegmentedControl`, and wrapping in `<div className="wb-sheetwrap"><div className="vbg" /><div className="wb-sheet">…</div></div>`. Keep `intro_video_file_id`, `intro_transition`, `curation_type`, `settings_json` handling identical.

- [ ] **Step 2: Wire into `Workbench.tsx`** — when `tool==='setup'`, use a two-column main (`gridTemplateColumns:'60px 210px 1fr'`), a `.wb-pane` with `.wb-nav` items (Identity / Space / Intro / Publish) and the `<SetupSheet>` as the center (no inspector). On save call `fetchExhibition()`.

- [ ] **Step 3: Build** — exits 0.

- [ ] **Step 4: Commit**
```bash
git add src/components/studio/workbench/SetupSheet.tsx src/components/studio/workbench/Workbench.tsx
git commit -m "feat(studio): setup tool — identity sheet"
```

---

## Task 9: Inspect mode — hotspots in context

**Files:** Modify `Workbench.tsx`.

**Interfaces:** When `mode==='inspect'` and the selected artwork is `IMAGE_2D`, open the existing `HotspotEditor` for it (it is self-contained). Pass `artwork={selectedArtwork}`, `hotspots={selectedArtwork.hotspots ?? []}`, `isTeam`, `onHotspotsUpdated={() => fetchExhibition()}`, `onClose={() => setMode('place')}`.

- [ ] **Step 1: Wire it in `Workbench.tsx`**
```tsx
{mode === 'inspect' && selArt && selArt.artwork_type === 'IMAGE_2D' && (
  <HotspotEditor artwork={selArt} hotspots={(selArt as any).hotspots ?? []} isTeam={isTeam}
    onHotspotsUpdated={() => fetchExhibition()} onClose={() => setMode('place')} />
)}
```
where `selArt = (exhibition.artworks ?? []).find(a => a.id === selectedArtworkId)`. The badge in `.wb-view` shows "Inspect mode · hotspots".

- [ ] **Step 2: Build** — exits 0.

- [ ] **Step 3: Commit**
```bash
git add src/components/studio/workbench/Workbench.tsx
git commit -m "feat(studio): inspect mode opens hotspot editor in context"
```

---

## Task 10: Route to the Workbench, retire old editor, QA

**Files:** Modify `src/components/studio/StudioApp.tsx`.

- [ ] **Step 1: Swap the editor route** — in `StudioApp`, the `view.type === 'editor'` branch renders `<Workbench exhibitionId={view.exhibitionId} isTeam={user.is_team} onBack={() => setView({ type: 'dashboard' })} />` instead of `<ExhibitionEditor …>`. Import `Workbench` from `./workbench/Workbench`.

- [ ] **Step 2: Remove dead code** — delete the now-unused `ExhibitionEditor` and `ArtworkManager` function components from `StudioApp.tsx` (their logic now lives in the workbench pieces). Keep `Login`, `Dashboard`, `NewExhibitionForm`. Remove now-unused imports.

- [ ] **Step 3: Full suite** — `pnpm test` → all green (foundation + workbench suites + existing).

- [ ] **Step 4: Typecheck/build** — `pnpm build` → exits 0.

- [ ] **Step 5: Visual QA** — `pnpm dev`, open `/studio`, and verify against `docs/design/reda-workbench.html`:
  - Dashboard: room-preview cards, oxblood New, draft/live badges.
  - Workbench: rail switches Curate/Rooms/Artists/Setup; **the 3D room is live in the center** (Babylon canvas); selecting a work in the list selects it in the room; the inspector edits its record and saves; mode pill flips Roam/Place/Inspect.
  - Inspect: hotspot editor opens for a 2D work.
  - Artists: list + editor; Setup: identity sheet saves.
  - Every control shows a **visible gold focus ring**; no emoji anywhere (`grep -rlP "[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}]" src/components/studio/`).
  - Viewer (`/e/:slug`) unchanged.

- [ ] **Step 6: Commit**
```bash
git add src/components/studio/StudioApp.tsx
git commit -m "feat(studio): route curator editor to the Workbench; retire form editor"
```

---

## Self-Review

**Spec coverage:** Operate register / warm-chrome-neutral-stage (foundation §2,§5) → shell + `.wb-view` neutral gradient. Unified workbench (memory decision) → Tasks 3–9. Dashboard redesign → Task 2. Codex reserved for single-artwork edit/view → NOT applied here (the ArtworkForm inspector is the workbench treatment; the full-codex catalogue card is a later, optional enhancement per the memory note). No-emoji + focus rings → enforced in components + QA Step 5. Reuse of Babylon/data/API → Tasks 5–9 mount existing components unchanged.
**Placeholder scan:** none — shell/CSS/pane code is complete; integration tasks name exact props (verified against the live interfaces) and exact source line ranges to port from.
**Type consistency:** `Tool`/`Mode` unions consistent across Workbench/ToolRail/TopBar; reused-component props match the verbatim contracts in Global Constraints; `Inspector`/`ArtworksPane`/`ArtistsPane` prop names align with their Workbench call sites.
**Risk notes (honest):** (1) `GizmoPlacement` embedding (Task 5) is the highest-risk change — it was built as a fullscreen overlay; verify its Babylon canvas sizes correctly inside `.wb-view` during QA. (2) `ArtistManagerModal` (Task 7) is reused as-is (slide-over) rather than fully dissolved into the pane — a pragmatic reuse; a deeper integration can follow later. (3) Hotspots (Task 9) reuse the modal over the workbench — acceptable for a focused sub-task.

---

## Execution Handoff

**Plan revised and saved to `docs/superpowers/plans/2026-08-30-reda-studio-redesign.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks.
**2. Inline Execution** — executing-plans with checkpoints.

**Which approach?**
