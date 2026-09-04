# Walkthrough: Firefox Inspect Mode Hover Glitch Fix

We systematically diagnosed and resolved the issue in Firefox where 1px bounding-box outlines, tile seams, and vertical/horizontal lines appeared when hovering over hotspot pins or buttons in Inspect Mode.

---

## 1. Root Cause Analysis (via `debugging-and-error-recovery`)

Using pixel inspection and WebRender compositor analysis, four root causes were identified:

1. **WebRender 3D Picture-Cache Tile Seams**:
   - In Firefox, elements inside `perspective: 1200px` and `transform-style: preserve-3d` are allocated to 3D picture cache slices divided into 256×256 and 512×512 tiles.
   - Because 3D projection uses floating-point math without integer pixel snapping, WebRender's scissor rect calculations round differently than the texture coordinates during tile re-rasterization on hover. This left 1px unpainted gaps along tile boundaries (e.g., `x=512`, `y=256`, `x=308`).
   - `.inspect-lightbox__shadow` had `filter: blur(36px); transform: translateZ(-28px)`, and 3D bevels (`.inspect-lightbox__frame-*`) were rotated 90° edge-on to the camera, creating additional hairline artifacts.

2. **Continuous RAF Loop Jitter**:
   - In [InspectLightbox.tsx](file:///d:/Claude/3D%20Virtual%20Gallery/src/components/viewer/InspectLightbox.tsx), `tick()` continuously assigned `stage.style.transform` and `tilt.style.transform` every frame (60–144 times/sec) with 14-digit floating-point numbers even when motionless, continuously triggering tile dirty-rect invalidation.

3. **Subpixel Layer Displacement on Button Hover**:
   - `.btn:hover { transform: translateY(-1px); }` moved buttons in `.inspect-lightbox__controls` by 1px, shifting fractional layer boundaries and forcing WebRender to composite dirty rect slices over the 3D canvas.

4. **Hotspot Pin Collision & Button Clipping in Firefox**:
   - In [reda-viewer.css](file:///d:/Claude/3D%20Virtual%20Gallery/src/styles/reda-viewer.css), `.hotspot-pin` had `border: 2px solid var(--reda-gold)` and `::after` (`ping` animation), clashing with [App.css](file:///d:/Claude/3D%20Virtual%20Gallery/src/App.css)'s `.hotspot-pin__ripple` (`pulseRipple` animation) and `.hotspot-pin__dot`.
   - In Firefox, `<button>` elements have default internal content clipping unless `overflow: visible` is explicitly set, causing `span.hotspot-pin__tooltip` to be clipped at its bottom edge into a 1px horizontal line.

---

## 2. Changes Implemented

### A. Flatten 3D Stage Hierarchy in Firefox ([reda-viewer.css](file:///d:/Claude/3D%20Virtual%20Gallery/src/styles/reda-viewer.css))
- Wrapped Firefox-specific overrides inside `@supports (-moz-appearance: none)`:
  - `perspective: none` on `.inspect-lightbox__viewport`.
  - `transform-style: flat` and `will-change: auto` on `.inspect-lightbox__tilt`, `.inspect-lightbox__stage`, and `.inspect-lightbox__slab`.
  - Hid `.inspect-lightbox__shadow` (`display: none !important`) so its radial-gradient div does not cover or vignette the artwork image in flat 2D projection.
  - Applied a clean 2D `box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7)` directly to `img.inspect-lightbox__image`.
  - Hid edge-on bevel strips (`.inspect-lightbox__frame-*`).
  - Chrome, Safari, and Edge retain full 3D tilt, bevels, and blur shadow.

### B. RAF Transform Snapping & Deduplication ([InspectLightbox.tsx](file:///d:/Claude/3D%20Virtual%20Gallery/src/components/viewer/InspectLightbox.tsx))
- Added a resting deadzone check (`ds < 0.0005`, `dx < 0.02`, `dy < 0.02`, `drx < 0.02`, `dry < 0.02`) to snap `cur` directly to `tgt` when near rest.
- Formatted coordinates to fixed precision (`toFixed(2)`) to avoid irrational floats.
- Added equality checks before writing to `stage.style.transform` and `tilt.style.transform`, halting DOM re-renders once stationary.

### C. Button Hover Stabilization in Firefox ([reda-ui.css](file:///d:/Claude/3D%20Virtual%20Gallery/src/styles/reda-ui.css) & [reda-viewer.css](file:///d:/Claude/3D%20Virtual%20Gallery/src/styles/reda-viewer.css))
- Set `transform: none !important` on `.btn:hover` and inspect controls in Firefox, preserving background, border, text color, and shadow hover effects while eliminating geometry-shifting layer seams.

### D. Hotspot Pin & Tooltip Clean-up ([App.css](file:///d:/Claude/3D%20Virtual%20Gallery/src/App.css) & [reda-viewer.css](file:///d:/Claude/3D%20Virtual%20Gallery/src/styles/reda-viewer.css))
- Added `overflow: visible` to `.hotspot-pin` in [App.css](file:///d:/Claude/3D%20Virtual%20Gallery/src/App.css) and [reda-viewer.css](file:///d:/Claude/3D%20Virtual%20Gallery/src/styles/reda-viewer.css).
- Disabled duplicate `::before` and `::after` ping animations on `.hotspot-pin` in Firefox.
- Gave `.hotspot-pin__tooltip` an opaque glass background (`rgba(15, 23, 42, 0.98)`) and `box-shadow` without `backdrop-filter` in Firefox.

---

## 3. Verification

- **Automated Tests**:
  - `pnpm vitest run`: **48 test files passed, 221 tests passed**.
  - `src/lib/reda-viewer-css.test.ts`: Passed (verified zero raw hex colors in `reda-viewer.css`).
  - `src/components/viewer/inspect-lightbox-chrome.test.ts`: Passed.
- **Production Build**:
  - `pnpm build`: Completed cleanly in 2.32s with 0 errors.
- **Documentation**:
  - Updated [docs/note.md](file:///d:/Claude/3D%20Virtual%20Gallery/docs/note.md) Section 7.6 with detailed diagnosis and fixes.
