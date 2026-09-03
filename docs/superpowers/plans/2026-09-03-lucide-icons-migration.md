# Lucide Icons System Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate [Lucide](https://lucide.dev/) (`lucide-react`) across the entire codebase, replacing all legacy SVG icon paths and raw glyph characters with consistent, high-fidelity Lucide icons.

**Architecture:** Install `lucide-react` and revamp the centralized `<Icon name="..." />` component in `src/components/ui/Icon.tsx` into a Lucide-backed component with standard Lucide React subcomponent exports. Sweep all viewer, studio, and workbench components to eliminate raw symbols (such as literal `×` close buttons) and guarantee consistent icon rendering and accessibility throughout.

**Tech Stack:** React 19, TypeScript, `lucide-react`, Vitest, Vite

**Spec:** Reda Gallery Icon System Specification & Lucide Design System

## Global Constraints

- Preserve the `.reda-icon` CSS class name on all rendered icon elements so existing global styles, button sizing, and transitions continue to work without visual regression.
- Maintain full backward compatibility for `<Icon name="..." size={...} title={...} className={...} />` across all 25+ dependent components.
- Support `aria-hidden="true"` when no title is provided, and `role="img"` with accessible `<title>` when a title is supplied.
- Retain the brand Google authentication mark for Google sign-in (as Lucide purposefully does not bundle commercial brand marks).
- All 48 test files and 220 unit tests must pass with zero TypeScript errors (`npx tsc -b --noEmit`).

---

### Task 1: Re-architect `<Icon />` Component with Lucide React

**Files:**
- Modify: `src/components/ui/Icon.tsx`
- Test: `src/components/ui/Icon.test.tsx`

**Interfaces:**
- Consumes: `lucide-react` icon components (`MousePointer2`, `Frame`, `MapPin`, `Box`, `User`, `Users`, `Settings`, `X`, `Volume2`, `VolumeX`, `Map`, `Maximize`, `Play`, `ZoomIn`, `Plus`, `ChevronRight`, `ChevronLeft`, `ChevronUp`, `ChevronDown`, `ExternalLink`, `Trash2`, `Film`, `Palette`, `AudioLines`, `Footprints`, `Mouse`, `Crosshair`, `Info`, `Search`, `RotateCcw`, `RotateCw`, `Minimize2`, `Maximize2`, `List`, `Pause`, `Smartphone`, `Lock`, `Shield`, `ArrowRight`, `LucideIcon`).
- Produces: `<Icon name={IconName} size={number} title={string} className={string} />` and re-exports of Lucide icon primitives.

- [ ] **Step 1: Write failing unit test for Lucide icon mappings and new icon names**

Extend `src/components/ui/Icon.test.tsx` to verify that all canonical icon names (including newly added `refresh`, `soundMute`, `arrowRight`) render valid Lucide SVG icons with `.reda-icon`, appropriate stroke widths, and accessibility attributes.

```tsx
it('renders Lucide icons for all registered IconNames', () => {
  const iconNames = [
    'select', 'frame', 'pin', 'cube', 'user', 'users', 'gear', 'close',
    'sound', 'soundMute', 'map', 'fullscreen', 'play', 'inspect', 'plus',
    'chevronRight', 'chevronLeft', 'chevronUp', 'chevronDown', 'external',
    'trash', 'film', 'palette', 'audio', 'walk', 'mouse', 'target', 'info',
    'search', 'reset', 'refresh', 'minimize', 'maximize', 'list', 'pause',
    'phone', 'lock', 'shield', 'arrowRight', 'google',
  ] as const;

  for (const name of iconNames) {
    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.classList.contains('reda-icon')).toBe(true);
  }
});
```

- [ ] **Step 2: Run test to observe failure**

Run: `npx vitest run src/components/ui/Icon.test.tsx`
Expected: FAIL due to missing `refresh`, `soundMute`, or `arrowRight` in existing `PATHS`.

- [ ] **Step 3: Implement Lucide-backed `Icon.tsx`**

Rewrite `src/components/ui/Icon.tsx` to map each `IconName` to its respective Lucide icon component with default `strokeWidth={1.75}`, forward refs, and accessibility props.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/Icon.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run full test suite to check compatibility**

Run: `npx vitest run`
Expected: All tests pass.

---

### Task 2: Codebase Sweep: Replace Raw Close Glyphs with Lucide `<Icon name="close" />`

**Files:**
- Modify: `src/components/studio/workbench/Inspector.tsx:60-70`
- Modify: `src/components/studio/workbench/ArtistInspector.tsx:185-198`
- Modify: `src/components/studio/HotspotEditor.tsx:236-239`

**Interfaces:**
- Consumes: `<Icon name="close" size={...} />` from `src/components/ui`.
- Produces: Accessible, clean Lucide `X` icons instead of raw `×` Unicode characters.

- [ ] **Step 1: Replace raw `×` in `Inspector.tsx`**

In `src/components/studio/workbench/Inspector.tsx`, replace the plain `×` text in the close button with `<Icon name="close" size={16} />`.

- [ ] **Step 2: Replace raw `×` in `ArtistInspector.tsx`**

In `src/components/studio/workbench/ArtistInspector.tsx`, replace the plain `×` text in the close button with `<Icon name="close" size={16} />`.

- [ ] **Step 3: Replace raw `×` in `HotspotEditor.tsx`**

In `src/components/studio/HotspotEditor.tsx`, replace the plain `×` in the modal close button with `<Icon name="close" size={16} />`.

- [ ] **Step 4: Verify with vitest**

Run: `npx vitest run src/components/studio/workbench/Inspector.test.tsx src/components/studio/workbench/ArtistInspector.test.tsx`
Expected: PASS.

---

### Task 3: Normalize Icon Names & Sweep Specialized Viewers

**Files:**
- Modify: `src/components/studio/workbench/ArtistInspector.tsx:354`
- Modify: `src/components/viewer/ViewerErrorView.tsx:22,35,90`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Consumes: `IconName` type union including `refresh` and `arrowRight`.
- Produces: Correct icon rendering for connection retry and artist navigation links.

- [ ] **Step 1: Fix `arrow-right` in `ArtistInspector.tsx`**

Update `name="arrow-right"` to `name="arrowRight"` at line 354 of `src/components/studio/workbench/ArtistInspector.tsx`.

- [ ] **Step 2: Connect `refresh` in `ViewerErrorView.tsx`**

Ensure `ViewerErrorView.tsx` uses `iconName = 'refresh'` which now resolves to Lucide's `RotateCw`.

- [ ] **Step 3: Re-export Lucide utilities from `src/components/ui/index.ts`**

Export `Icon` and `IconName` cleanly from `src/components/ui/index.ts` to allow direct consumption.

- [ ] **Step 4: Verify typecheck & tests**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: 0 errors, 48/48 test files passed.

---

### Task 4: Final Verification & Visual Polish

**Files:**
- Verify: `src/components/viewer/no-emoji.test.ts`
- Verify: Full app test suite and TypeScript compilation

- [ ] **Step 1: Run no-emoji test suite**

Run: `npx vitest run src/components/viewer/no-emoji.test.ts`
Expected: PASS (confirms no raw emojis or glyphs remain in viewer chrome).

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: 220+ tests pass across all 48 test suites.

- [ ] **Step 3: Build verification**

Run: `npm run build`
Expected: Production build succeeds without bundle or chunk errors.
