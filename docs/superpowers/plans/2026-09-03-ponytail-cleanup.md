# Ponytail Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove ~120 lines of dead code, duplicate logic, and unnecessary abstractions identified by a repo-wide ponytail audit, leaving all 221 tests green and the TypeScript build clean after every commit.

**Architecture:** Five independent commits, ordered by risk (lowest first). Each commit is self-contained — the codebase is fully buildable and testable after each one. No behaviour changes; pure cleanup.

**Tech Stack:** TypeScript 5, React 18, Vitest, Cloudflare Workers D1

## Global Constraints

- Branch: `redesign/reda-foundation`
- Build check: `npx tsc -b --noEmit` — zero errors required after every task
- Test check: `npx vitest run` — 48 files, 221 tests passing required after every task
- No new features, no behaviour changes, no new files except where explicitly specified
- Commit after each task using the exact message given

---

### Task 1: Delete dead prop, two delegate-only wrappers, and a test-only static method

**Files:**
- Modify: `src/components/studio/workbench/ArtworksPane.tsx`
- Modify: `src/components/studio/workbench/Workbench.tsx`
- Modify: `src/lib/media/gdrive.ts`
- Modify: `src/components/viewer/InspectLightbox.tsx`
- Modify: `src/components/viewer/InspectDesktopSidebar.tsx`
- Modify: `src/lib/studio/transform.ts`
- Modify: `src/components/studio/GizmoPlacement.tsx`
- Modify: `src/lib/studio/studio.test.ts`
- Modify: `src/lib/babylon/resolution-scaler.ts`
- Modify: `src/lib/babylon/resolution-scaler.test.ts`

**Interfaces:**
- Consumes: nothing changed
- Produces: nothing changed; public API only shrinks

- [ ] **Step 1: Remove `rooms` from `ArtworksPane` props**

In `src/components/studio/workbench/ArtworksPane.tsx`, delete `rooms` from the destructured parameters, the type annotation, and the `void rooms;` line:

```ts
// Before
export function ArtworksPane({
  artworks,
  artists = [],
  rooms,
  selectedId,
  onSelect,
  onAdd,
}: {
  artworks: Artwork[];
  artists?: Artist[];
  rooms: Room[];
  selectedId: string | null;
  onSelect(id: string): void;
  onAdd(): void;
}) {
  void rooms;

// After
export function ArtworksPane({
  artworks,
  artists = [],
  selectedId,
  onSelect,
  onAdd,
}: {
  artworks: Artwork[];
  artists?: Artist[];
  selectedId: string | null;
  onSelect(id: string): void;
  onAdd(): void;
}) {
```

- [ ] **Step 2: Remove `rooms={rooms}` from `ArtworksPane` call sites in `Workbench.tsx`**

`Workbench.tsx` passes `rooms={rooms}` to `<ArtworksPane>` at lines 120 and 199. Remove both `rooms={rooms}` prop occurrences. Do not remove the `rooms` variable itself — it may be used elsewhere in `Workbench.tsx`.

- [ ] **Step 3: Inline `resolveAudioUrl` in `InspectDesktopSidebar.tsx`**

`src/components/viewer/InspectDesktopSidebar.tsx` line 143:

```tsx
// Before
src={resolveAudioUrl(activeHotspot.audio_file_id)!}

// After
src={proxyMediaUrl(activeHotspot.audio_file_id!) || ''}
```

The element only renders when `audio_file_id` is truthy, so `|| ''` is unreachable.

Also update the import on line 3:
```ts
// Before
import { resolveAudioUrl } from '../../lib/media/gdrive';

// After
import { proxyMediaUrl } from '../../lib/media/gdrive';
```

- [ ] **Step 4: Inline `resolveAudioUrl` in `InspectLightbox.tsx`**

`src/components/viewer/InspectLightbox.tsx` line 837:

```tsx
// Before
src={resolveAudioUrl(activeHotspot.audio_file_id)!}

// After
src={proxyMediaUrl(activeHotspot.audio_file_id!) || ''}
```

Line 25 imports `resolveAudioUrl` — remove it from the import. `proxyMediaUrl` is already imported on line 25; just remove `resolveAudioUrl` from the destructure.

- [ ] **Step 5: Delete `resolveAudioUrl` from `gdrive.ts`**

Remove lines 90–94 from `src/lib/media/gdrive.ts`:

```ts
// DELETE these 5 lines:
export function resolveAudioUrl(fileIdOrUrl?: string | null, version?: string | number): string | null {
  if (!fileIdOrUrl) return null;
  const resolved = proxyMediaUrl(fileIdOrUrl, version);
  return resolved || null;
}
```

- [ ] **Step 6: Inline `serializeTransform` in `GizmoPlacement.tsx`**

`src/components/studio/GizmoPlacement.tsx` line 181:

```ts
// Before
const transformJson = serializeTransform(transform);

// After
const transformJson = JSON.stringify(transform);
```

Remove `serializeTransform` from the import on line 21.

- [ ] **Step 7: Inline `serializeTransform` in `studio.test.ts`**

`src/lib/studio/studio.test.ts` — four call sites. Replace every `serializeTransform(...)` with `JSON.stringify(...)`:

| Line | Before | After |
|------|--------|-------|
| 54 | `const json = serializeTransform(transform);` | `const json = JSON.stringify(transform);` |
| 61 | `const json = serializeTransform(transform);` | `const json = JSON.stringify(transform);` |
| 75 | `isValidTransform(serializeTransform(transform))` | `isValidTransform(JSON.stringify(transform))` |
| 84 | `isValidTransform(serializeTransform(zero))` | `isValidTransform(JSON.stringify(zero))` |

Remove `serializeTransform` from the import on line 6. Confirm `deserializeTransform` and `isValidTransform` stay imported.

- [ ] **Step 8: Delete `serializeTransform` from `transform.ts`**

Remove lines 14–16 from `src/lib/studio/transform.ts`:

```ts
// DELETE:
export function serializeTransform(transform: Transform): string {
  return JSON.stringify(transform);
}
```

- [ ] **Step 9: Delete `levelForTier` static method and its test**

In `src/lib/babylon/resolution-scaler.ts`, remove:
```ts
// DELETE:
static levelForTier(tier: ResolutionTier): number {
  return TIER_LEVELS[tier];
}
```

In `src/lib/babylon/resolution-scaler.test.ts`, remove the entire `it('levelForTier returns correct values', ...)` block (lines 47–50). The underlying `TIER_LEVELS` values are already verified indirectly by the `setHardwareScalingLevel` spy assertions in the other test cases.

- [ ] **Step 10: Build and test**

```
npx tsc -b --noEmit
npx vitest run
```

Expected: 0 TS errors. Test files: 48 (one fewer test case in resolution-scaler.test.ts), 220 tests passing.

- [ ] **Step 11: Commit**

```bash
git add src/components/studio/workbench/ArtworksPane.tsx src/components/studio/workbench/Workbench.tsx src/lib/media/gdrive.ts src/components/viewer/InspectLightbox.tsx src/components/viewer/InspectDesktopSidebar.tsx src/lib/studio/transform.ts src/lib/studio/studio.test.ts src/components/studio/GizmoPlacement.tsx src/lib/babylon/resolution-scaler.ts src/lib/babylon/resolution-scaler.test.ts
git commit -m "refactor: remove dead prop, delegate-only wrappers, test-only static"
```

---

### Task 2: Remove duplicate `controlMode` state and `HotspotOverlay` dead internal state

**Files:**
- Modify: `src/components/viewer/ExhibitionViewer.tsx`
- Modify: `src/components/viewer/HotspotOverlay.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: nothing new; `HotspotOverlay` props tightened (all three selection props become required)

- [ ] **Step 1: Remove `controlMode` state from `ExhibitionViewer`**

`src/components/viewer/ExhibitionViewer.tsx` — `controlMode` state (line 55) is always equal to `settings.controlMode`. It is set together with `settings` in `toggleControlMode` (lines 322–324). Delete the state and derive it:

```ts
// Before (line 55):
const [controlMode, setControlMode] = useState<CameraControlMode>(() => getStoredViewerSettings().controlMode || 'gallery');

// After — delete that line entirely. Then add below the settings state (line 54):
const controlMode = settings.controlMode;
```

In `toggleControlMode` (lines 320–332), remove the `setControlMode(nextMode)` call on line 322 — only `setSettings` is needed:

```ts
// Before
const toggleControlMode = (targetMode?: CameraControlMode) => {
  const nextMode = targetMode ?? (controlMode === 'gallery' ? 'fps' : 'gallery');
  setControlMode(nextMode);
  const updatedSettings = { ...settings, controlMode: nextMode };
  setSettings(updatedSettings);
  // ...

// After
const toggleControlMode = (targetMode?: CameraControlMode) => {
  const nextMode = targetMode ?? (controlMode === 'gallery' ? 'fps' : 'gallery');
  const updatedSettings = { ...settings, controlMode: nextMode };
  setSettings(updatedSettings);
  // ...
```

Also remove `useCallback` from imports if it is now unused (check — it may still be used for `stopSeekAudio`).

- [ ] **Step 2: Remove `stopSeekAudio` `useCallback` wrapper**

`src/components/viewer/ExhibitionViewer.tsx` lines 152–156. This function is only ever called with refs — it has empty deps and gains nothing from `useCallback`. Replace with a plain function:

```ts
// Before
const stopSeekAudio = useCallback(() => {
  seekEndCleanupRef.current?.();
  seekEndCleanupRef.current = null;
  audioRef.current?.pause();
}, []);

// After
const stopSeekAudio = () => {
  seekEndCleanupRef.current?.();
  seekEndCleanupRef.current = null;
  audioRef.current?.pause();
};
```

If `useCallback` is now unused, remove it from the React import on line 1.

- [ ] **Step 3: Remove dead internal state from `HotspotOverlay`**

`src/components/viewer/HotspotOverlay.tsx` — the component is always used as fully controlled (`activeHotspotId`, `onSelectHotspot`, `onDismissActive` are always provided in its only call site in `InspectLightbox.tsx`). Remove the uncontrolled fallback path:

```ts
// Before (lines 60–87):
export function HotspotOverlay({
  hotspots,
  activeHotspotId,
  hideFloatingCard = false,
  onSelectHotspot,
  onDismissActive,
  onAudioSeek,
}: HotspotOverlayProps) {
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);

  const currentActiveId = activeHotspotId !== undefined ? activeHotspotId : internalActiveId;
  const active = hotspots.find((h) => h.id === currentActiveId);

  const handleSelect = (id: string) => {
    if (onSelectHotspot) {
      onSelectHotspot(id);
    } else {
      setInternalActiveId(id);
    }
  };

  const handleDismiss = () => {
    if (onDismissActive) {
      onDismissActive();
    } else {
      setInternalActiveId(null);
    }
  };

// After:
export function HotspotOverlay({
  hotspots,
  activeHotspotId,
  hideFloatingCard = false,
  onSelectHotspot,
  onDismissActive,
  onAudioSeek,
}: HotspotOverlayProps) {
  const active = hotspots.find((h) => h.id === activeHotspotId);

  const handleSelect = (id: string) => {
    onSelectHotspot?.(id);
  };

  const handleDismiss = () => {
    onDismissActive?.();
  };
```

Also update the `HotspotOverlayProps` interface: change `activeHotspotId?: string | null` to `activeHotspotId: string | null` (required), `onSelectHotspot?` and `onDismissActive?` may stay optional since `?.` handles them gracefully. Remove `useState` from imports if no longer used.

- [ ] **Step 4: Build and test**

```
npx tsc -b --noEmit
npx vitest run
```

Expected: 0 TS errors, 48 files, same passing count as after Task 1.

- [ ] **Step 5: Commit**

```bash
git add src/components/viewer/ExhibitionViewer.tsx src/components/viewer/HotspotOverlay.tsx
git commit -m "refactor: remove duplicate controlMode state and dead HotspotOverlay internal state"
```

---

### Task 3: Extract shared `resolveArtistDisplay` utility and replace local `parseTransform` in artwork-factory

**Files:**
- Create: `src/lib/viewer/display.ts`
- Modify: `src/components/viewer/FocusPanel.tsx`
- Modify: `src/components/viewer/ArtworkHoverTooltip.tsx`
- Modify: `src/lib/babylon/artwork-factory.ts`

**Interfaces:**
- Produces: `resolveArtistDisplay(artwork: Pick<Artwork, 'artist' | 'artist_profile'>): string` — exported from `src/lib/viewer/display.ts`

- [ ] **Step 1: Create `src/lib/viewer/display.ts`**

```ts
import type { Artwork, Artist } from '../../types/schema';

type ArtworkWithProfile = Pick<Artwork, 'artist'> & { artist_profile?: Artist | null };

export function resolveArtistDisplay(artwork: ArtworkWithProfile): string {
  return (
    artwork.artist_profile?.name ||
    (artwork.artist && artwork.artist !== 'Untitled Artist' ? artwork.artist : null) ||
    'Untitled Artist'
  );
}
```

Note: the original chain had a redundant fourth arm (`|| artwork.artist`) — it can never be truthy after the third arm (`artwork.artist !== 'Untitled Artist' ? artwork.artist : null`) already captured it. The simplified form above is equivalent.

- [ ] **Step 2: Use `resolveArtistDisplay` in `FocusPanel.tsx`**

In `src/components/viewer/FocusPanel.tsx`, replace lines 46–50:

```ts
// Before
const displayArtist =
  artwork.artist_profile?.name ||
  (artwork.artist && artwork.artist !== 'Untitled Artist' ? artwork.artist : null) ||
  artwork.artist ||
  'Untitled Artist';

// After
const displayArtist = resolveArtistDisplay(artwork);
```

Add import at the top:
```ts
import { resolveArtistDisplay } from '../../lib/viewer/display';
```

- [ ] **Step 3: Use `resolveArtistDisplay` in `ArtworkHoverTooltip.tsx`**

In `src/components/viewer/ArtworkHoverTooltip.tsx`, replace lines 11–15:

```ts
// Before
const displayArtist =
  artwork.artist_profile?.name ||
  (artwork.artist && artwork.artist !== 'Untitled Artist' ? artwork.artist : null) ||
  artwork.artist ||
  'Untitled Artist';

// After
const displayArtist = resolveArtistDisplay(artwork);
```

Add import:
```ts
import { resolveArtistDisplay } from '../../lib/viewer/display';
```

- [ ] **Step 4: Replace local `parseTransform` in `artwork-factory.ts` with `deserializeTransform`**

`src/lib/babylon/artwork-factory.ts` has a private `parseTransform` (lines 23–33) that is a stripped-down duplicate of `deserializeTransform` from `src/lib/studio/transform.ts`. The canonical version also validates field presence before returning; the local one does not. Use the canonical version:

```ts
// DELETE lines 23-33 (the local parseTransform function):
function parseTransform(json: string): {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
} {
  try {
    return JSON.parse(json);
  } catch {
    return { position: [0, 1.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
  }
}
```

Add import near the top of `artwork-factory.ts`:
```ts
import { deserializeTransform } from '../studio/transform';
```

Replace the two call sites (lines ~110 and ~175 in the original — search for `parseTransform(`) with `deserializeTransform(`.

- [ ] **Step 5: Build and test**

```
npx tsc -b --noEmit
npx vitest run
```

Expected: 0 TS errors, tests unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/lib/viewer/display.ts src/components/viewer/FocusPanel.tsx src/components/viewer/ArtworkHoverTooltip.tsx src/lib/babylon/artwork-factory.ts
git commit -m "refactor: extract resolveArtistDisplay helper, replace local parseTransform with deserializeTransform"
```

---

### Task 4: Type tightening — `BabylonEngine` interface, `Panel` prop, `StatusBar.mode`, `EDITABLE_KEYS`

**Files:**
- Modify: `src/lib/babylon/resolution-scaler.ts`
- Modify: `src/components/ui/primitives.tsx`
- Modify: `src/components/studio/workbench/WorkbenchTopBar.tsx` (already exports `Mode`)
- Modify: `src/components/studio/workbench/StatusBar.tsx`
- Modify: `src/lib/studio/exhibition-patch.ts`

**Interfaces:**
- `StatusBar` props: `mode: string` → `mode: Mode`
- `Panel` props: `variant?: 'dark' | 'parch'` → `parch?: boolean`
- `BabylonEngine` interface: deleted; replaced by inline structural type

- [ ] **Step 1: Remove the `BabylonEngine` named interface from `resolution-scaler.ts`**

In `src/lib/babylon/resolution-scaler.ts`, the `BabylonEngine` interface (lines 15–17) is a named export with exactly one method. Replace the parameter type in the constructor or factory with an inline structural type:

```ts
// Before:
export interface BabylonEngine {
  setHardwareScalingLevel(level: number): void;
}

// ...then in class or function signature:
// engine: BabylonEngine

// After: delete the interface. In the constructor/method signature, inline it:
// engine: { setHardwareScalingLevel(level: number): void }
```

Search `resolution-scaler.ts` for every occurrence of `BabylonEngine` and replace with the inline structural type. Also check `resolution-scaler.test.ts` — if it imports `BabylonEngine`, remove that import too (mock objects satisfy the structural type without needing the named interface).

- [ ] **Step 2: Simplify `Panel` prop from `variant` to `parch`**

`Panel` is defined in `src/components/ui/primitives.tsx` but a repo-wide search (`grep -rn "<Panel"`) shows it has zero JSX call sites in production code. The prop rename is safe to do without hunting callers.

```ts
// Before
export function Panel({ variant = 'dark', className = '', children }:
  { variant?: 'dark' | 'parch'; className?: string; children: ReactNode }) {
  return <div className={`reda-panel ${variant === 'parch' ? 'reda-panel--parch' : ''} ${className}`}>{children}</div>;
}

// After
export function Panel({ parch = false, className = '', children }:
  { parch?: boolean; className?: string; children: ReactNode }) {
  return <div className={`reda-panel${parch ? ' reda-panel--parch' : ''} ${className}`}>{children}</div>;
}
```

- [ ] **Step 3: Tighten `StatusBar.mode` type**

`WorkbenchTopBar.tsx` line 3 already exports `Mode`:
```ts
export type Mode = 'artworks' | 'waypoints' | 'walk';
```

In `src/components/studio/workbench/StatusBar.tsx`, import and use it:

```ts
// Add import:
import type { Mode } from './WorkbenchTopBar';

// Change prop type from:
mode: string;
// to:
mode: Mode;
```

- [ ] **Step 4: Add `satisfies` to `EDITABLE_KEYS` in `exhibition-patch.ts`**

This gives compile-time validation that every string in the array is a valid key of `ExhibitionEditForm`, catching future typos. The runtime behaviour is unchanged.

```ts
// Before
const EDITABLE_KEYS: (keyof ExhibitionEditForm)[] = [
  'title',
  'description',
  'curator_name',
  'start_date',
  'end_date',
  'cover_image_url',
  'room_id',
  'intro_video_file_id',
  'curation_type',
  'settings_json',
];

// After
const EDITABLE_KEYS = [
  'title',
  'description',
  'curator_name',
  'start_date',
  'end_date',
  'cover_image_url',
  'room_id',
  'intro_video_file_id',
  'curation_type',
  'settings_json',
] satisfies (keyof ExhibitionEditForm)[];
```

- [ ] **Step 5: Build and test**

```
npx tsc -b --noEmit
npx vitest run
```

Expected: 0 TS errors, tests unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/lib/babylon/resolution-scaler.ts src/lib/babylon/resolution-scaler.test.ts src/components/ui/primitives.tsx src/components/studio/workbench/StatusBar.tsx src/lib/studio/exhibition-patch.ts
git commit -m "refactor: inline BabylonEngine structural type, simplify Panel parch prop, tighten StatusBar.mode and EDITABLE_KEYS"
```

---

### Task 5: Deduplicate HMAC constants in worker and shared viewer settings defaults

**Files:**
- Modify: `worker/jwt.ts`
- Modify: `worker/media-sign.ts`
- Create: `src/lib/viewer/settings.ts`
- Modify: `src/components/viewer/SettingsModal.tsx`
- Modify: `src/lib/babylon/camera-controller.ts`
- Modify: all files that import `DEFAULT_VIEWER_SETTINGS`, `getStoredViewerSettings`, `saveStoredViewerSettings`, or `ViewerSettings` from `SettingsModal.tsx`

**Interfaces:**
- Produces: `src/lib/viewer/settings.ts` exports `ViewerSettings`, `DEFAULT_VIEWER_SETTINGS`, `getStoredViewerSettings`, `saveStoredViewerSettings`
- `SettingsModal.tsx` re-exports all four for backward compatibility during the transition

#### Part A — Worker HMAC dedup

- [ ] **Step 1: Export `HMAC_ALGO` and `importHmacKey` from `jwt.ts`**

In `worker/jwt.ts`, change `const ALGORITHM` to an export and expose the key-import helper:

```ts
// Before (line 23):
const ALGORITHM = { name: 'HMAC', hash: 'SHA-256' };

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    ALGORITHM,
    false,
    ['sign', 'verify']
  );
}

// After:
export const HMAC_ALGO = { name: 'HMAC', hash: 'SHA-256' } as const;

export async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    HMAC_ALGO,
    false,
    ['sign', 'verify']
  );
}
```

Update all usages of `ALGORITHM` and `importKey` within `jwt.ts` itself to `HMAC_ALGO` and `importHmacKey`.

- [ ] **Step 2: Use `HMAC_ALGO` and `importHmacKey` in `media-sign.ts`**

In `worker/media-sign.ts`, delete the local `ALGO` and `hmacKey` and use the exports from `./jwt`:

```ts
// Delete lines 8-12:
const ALGO = { name: 'HMAC', hash: 'SHA-256' };

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), ALGO, false, ['sign', 'verify']);
}

// Update line 5 import to:
import { base64url, base64urlDecode, HMAC_ALGO, importHmacKey } from './jwt';
```

Replace every `hmacKey(...)` call with `importHmacKey(...)` and every `ALGO` reference with `HMAC_ALGO` within `media-sign.ts`. There are two `hmacKey` calls (lines 15 and 30) and two `ALGO` references (lines 16 and 38).

#### Part B — Viewer settings defaults dedup

- [ ] **Step 3: Create `src/lib/viewer/settings.ts`**

Move `ViewerSettings`, `DEFAULT_VIEWER_SETTINGS`, `getStoredViewerSettings`, and `saveStoredViewerSettings` from `SettingsModal.tsx` into this new file:

```ts
export interface ViewerSettings {
  controlMode: 'gallery' | 'fps';
  tiltEnabled: boolean;
  introTransition: string;
  walkSpeed: number;
  sprintSpeed: number;
  invertMouseX: boolean;
  invertMouseY: boolean;
  mouseSensitivity: number;
  invertTouchX: boolean;
  invertTouchY: boolean;
  touchSensitivity: number;
  fov: number;
}

export const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  controlMode: 'gallery',
  tiltEnabled: true,
  introTransition: 'zoom_in',
  walkSpeed: 0.02,
  sprintSpeed: 0.045,
  invertMouseX: false,
  invertMouseY: false,
  mouseSensitivity: 2000,
  invertTouchX: true,
  invertTouchY: true,
  touchSensitivity: 2000,
  fov: 65,
};

const STORAGE_KEY = 'reda_viewer_settings';

export function getStoredViewerSettings(): ViewerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VIEWER_SETTINGS;
    return { ...DEFAULT_VIEWER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_VIEWER_SETTINGS;
  }
}

export function saveStoredViewerSettings(settings: ViewerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
```

> **Note:** Verify the exact body of `getStoredViewerSettings` and `saveStoredViewerSettings` from `SettingsModal.tsx` before copying — copy verbatim, do not paraphrase. The storage key (`STORAGE_KEY`) may differ; match whatever string is used in `SettingsModal.tsx`.

- [ ] **Step 4: Update `SettingsModal.tsx` to import from `settings.ts`**

In `src/components/viewer/SettingsModal.tsx`, remove the four moved declarations and add imports. Re-export them so any other importers of `SettingsModal.tsx` are not broken:

```ts
export {
  ViewerSettings,
  DEFAULT_VIEWER_SETTINGS,
  getStoredViewerSettings,
  saveStoredViewerSettings,
} from '../../lib/viewer/settings';
```

- [ ] **Step 5: Initialize shared defaults in `camera-controller.ts`**

`src/lib/babylon/camera-controller.ts` — import `DEFAULT_VIEWER_SETTINGS` and initialize the overlapping fields from it to eliminate the duplicated numeric literals:

```ts
import { DEFAULT_VIEWER_SETTINGS } from '../viewer/settings';

export const CAMERA_CONFIG = {
  controlMode: DEFAULT_VIEWER_SETTINGS.controlMode,
  walkSpeed: DEFAULT_VIEWER_SETTINGS.walkSpeed,
  sprintSpeed: DEFAULT_VIEWER_SETTINGS.sprintSpeed,
  fov: DEFAULT_VIEWER_SETTINGS.fov,
  mouseSensitivity: DEFAULT_VIEWER_SETTINGS.mouseSensitivity,
  invertMouseX: DEFAULT_VIEWER_SETTINGS.invertMouseX,
  invertMouseY: DEFAULT_VIEWER_SETTINGS.invertMouseY,
  touchSensitivity: DEFAULT_VIEWER_SETTINGS.touchSensitivity,
  invertTouchX: DEFAULT_VIEWER_SETTINGS.invertTouchX,
  invertTouchY: DEFAULT_VIEWER_SETTINGS.invertTouchY,
  // Fields only in CAMERA_CONFIG (no viewer-settings equivalent):
  inertia: 0.5,
  eyeHeight: 1.7,
};
```

- [ ] **Step 6: Fix any remaining import sites**

Run:
```
npx tsc -b --noEmit
```

If any file imports `ViewerSettings`, `DEFAULT_VIEWER_SETTINGS`, `getStoredViewerSettings`, or `saveStoredViewerSettings` directly from `SettingsModal.tsx`, the re-exports in Step 4 keep them working. If the build surfaces errors, update those imports to point to `../../lib/viewer/settings` directly (shorter import path, avoids importing a component from a lib).

- [ ] **Step 7: Build and test**

```
npx tsc -b --noEmit
npx vitest run
```

Expected: 0 TS errors, tests unchanged.

- [ ] **Step 8: Commit**

```bash
git add worker/jwt.ts worker/media-sign.ts src/lib/viewer/settings.ts src/components/viewer/SettingsModal.tsx src/lib/babylon/camera-controller.ts
git commit -m "refactor: deduplicate HMAC algo/key in worker, extract viewer settings defaults to lib"
```

---

## Self-Review

**Spec coverage check:**

| Audit finding | Task | Status |
|---|---|---|
| `ArtworksPane.rooms` dead prop | Task 1 | covered |
| `resolveAudioUrl` wrapper | Task 1 | covered |
| `serializeTransform` wrapper | Task 1 | covered |
| `levelForTier` test-only static | Task 1 | covered |
| `controlMode` duplicate state | Task 2 | covered |
| `stopSeekAudio` unnecessary useCallback | Task 2 | covered |
| `HotspotOverlay` dead internal state | Task 2 | covered |
| `displayArtist` duplicated chain | Task 3 | covered |
| `parseTransform` in artwork-factory | Task 3 | covered |
| `BabylonEngine` YAGNI interface | Task 4 | covered |
| `Panel.variant` misleading type | Task 4 | covered |
| `StatusBar.mode: string` | Task 4 | covered |
| `EDITABLE_KEYS` parallel array | Task 4 | covered |
| HMAC constant duplicated in worker | Task 5 | covered |
| `DEFAULT_VIEWER_SETTINGS` / `CAMERA_CONFIG` drift | Task 5 | covered |

Findings intentionally excluded (correctness/behaviour, not over-engineering):
- `full_name: auth.email` bug in `/api/auth/me` — correctness bug, route to a separate fix
- `WorkbenchTopBar.saving` not reflected in status — missing feature, not over-engineering
- `IntroVideoLoader` stale closure — correctness bug, route to a separate fix
- `WorkbenchTopBar` inline styles → CSS — style preference, low yield, deferred
- `isWebGLSupported` not memoized — performance, not over-engineering

**Placeholder scan:** No TBD, TODO, or "similar to above" patterns found.

**Type consistency:** All function names match between tasks. `resolveArtistDisplay` defined in Task 3 Step 1 and used in Steps 2–3. `HMAC_ALGO`/`importHmacKey` defined in Task 5 Step 1 and used in Step 2. `DEFAULT_VIEWER_SETTINGS` moved in Task 5 Step 3 and consumed in Step 5.
