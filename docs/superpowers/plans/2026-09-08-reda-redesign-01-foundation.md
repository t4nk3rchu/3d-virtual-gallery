# REDA Redesign 01 — Foundation: Token Rebase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `2026-09-08-reda-redesign-00-roadmap.md` first for shared context and Global Constraints.

**Goal:** Make the Tranh Việt token layer authoritative across the whole app by purging the legacy indigo/slate palette from `src/App.css` and reconciling `src/index.css`, so the token-based `reda-*.css` rules stop being overridden — with no layout or behavior change, only correct color.

**Architecture:** `src/styles/tokens.css` already defines the full `--reda-*` Tranh Việt palette and is consumed by `reda-{viewer,studio,workbench,ui}.css`. `src/App.css` (3256 lines) still hardcodes the old palette (~40 indigo + ~120 slate/near-white hex) and, via higher-specificity selectors, overrides the token layer. We replace every legacy hex in `App.css` with the semantically-correct `--reda-*` token, alias `index.css`'s parallel `--text/--bg/--accent` vocabulary onto `--reda-*`, and enforce it with a new `App.css` palette-guard test mirroring the existing `reda-*-css.test.ts` guards.

**Tech Stack:** Vite + React 19 + TypeScript; plain global CSS; Vitest (node project reads CSS as text); pnpm.

## Global Constraints

- Restyle only — **no layout/DOM/behavior change** in this plan; replace colors, never move or delete structural rules. (Deleting a *color-only* override line to let the token layer win is allowed and expected; deleting layout rules is not.)
- All colors via `--reda-*` tokens from `src/styles/tokens.css`. No new hardcoded hex anywhere except inside `tokens.css`.
- Role mapping for every legacy color (use the table in Task 2): **son** = action/commit/destructive; **gold** = single hairline/accent (never area fill); **chàm** = inspect/detail context; text = `--reda-cream(-hi)`/`--reda-muted` on dark.
- `pnpm test` green and `pnpm build` clean at every commit. Keep `no-emoji.test.ts` and all existing suites green.
- pnpm; frequent commits.

## File Structure

- **Create:** `src/lib/app-css-palette.test.ts` — text guard that `src/App.css` contains no legacy indigo/slate/near-white hex. (Node vitest project — it reads files, no DOM.)
- **Modify:** `src/App.css` — replace all legacy hex with `--reda-*` tokens (color-only edits).
- **Modify:** `src/index.css` — alias the parallel `--text/--bg/--accent/--sans/--heading/--mono` vars onto `--reda-*` (or the shared families); remove off-palette hex from its `:root`.
- **Reference (do not edit here):** `src/styles/tokens.css` (token names), `src/lib/reda-viewer-css.test.ts` / `reda-studio-css.test.ts` / `reda-workbench-css.test.ts` (guard-test pattern to mirror), `src/lib/design-tokens.test.ts` (must stay green).

## Verification note (why this is text-guarded, not DOM-guarded)

jsdom does not apply external stylesheets or compute the CSS cascade, so we cannot assert "the eyebrow's computed color is gold" in a unit test. The codebase's established pattern (`reda-*-css.test.ts`) is to **read the stylesheet as text and assert banned substrings are absent**. This plan follows that pattern. Cascade-win correctness (e.g. the Inspect eyebrow rendering gold) is verified visually in Task 6 via `pnpm dev` + screenshot.

---

### Task 1: Add the App.css indigo guard (RED)

**Files:**
- Create: `src/lib/app-css-palette.test.ts`

**Interfaces:**
- Produces: a node-project vitest file asserting `src/App.css` text excludes banned hex. Later tasks extend it.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/app-css-palette.test.ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const appCss = readFileSync(
  fileURLToPath(new URL('../App.css', import.meta.url)),
  'utf8',
);

// Legacy indigo brand palette that must not survive in App.css.
const LEGACY_INDIGO = /#6366f1|#818cf8|#a5b4fc|#4f46e5|#c7d2fe|#4338ca/i;

describe('App.css palette', () => {
  it('contains no legacy indigo brand colors (use --reda-* tokens)', () => {
    expect(appCss).not.toMatch(LEGACY_INDIGO);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/app-css-palette.test.ts`
Expected: FAIL — `App.css` still contains `#6366f1` etc. (~40 matches).

- [ ] **Step 3: Commit the failing guard**

```bash
git add src/lib/app-css-palette.test.ts
git commit -m "test: add App.css indigo palette guard (red)"
```

---

### Task 2: Purge legacy indigo from App.css (GREEN)

**Files:**
- Modify: `src/App.css` (indigo occurrences; concentrated at lines 25, 93, 407, 494, 648, 689, 774, 828, 932, 1518, 1524, 1601, 1636-1643, 1672, 1889-1897, 2034-2048, 2102, 2171-2238, 2379, 2424-2511, 2702-2901, 3221-3244)

**Interfaces:**
- Consumes: `--reda-*` tokens (`src/styles/tokens.css`).

**Role → token mapping (apply per selector by what the color *means*):**

| Legacy hex | Role in the old design | Replace with |
|---|---|---|
| `#6366f1`, `#4f46e5`, `#4338ca` | brand/primary, hotspot pins, active/selected | inspect/detail context → `var(--reda-cham-hi)`; a genuine primary/commit action → `var(--reda-son)`; a single accent/focus ring → `var(--reda-gold)` |
| `#818cf8`, `#a5b4fc`, `#c7d2fe` | eyebrows, hover, light-indigo text/borders | eyebrow/accent text → `var(--reda-gold)`; inspect-context text → `var(--reda-cham-hi)` |

Concrete over-specificity fixes to make in this task (these are the rules that currently *beat* the token layer):
- `App.css:1636` `.inspect-lightbox__title-info .eyebrow { color:#818cf8 }` → if the rule is color-only, **delete the `color` declaration** so `reda-viewer.css:43 .eyebrow{color:var(--reda-gold)}` wins; if it carries other props, set `color: var(--reda-gold)`. The mobile `.eyebrow--hotspot` must be `var(--reda-gold)` (or `var(--reda-cham-hi)`), never indigo.
- `App.css:~1889-1897` hotspot pins `background:#6366f1` + `box-shadow:0 0 10px #6366f1` → `var(--reda-cham-hi)` (pins = inspect/detail = chàm).
- `App.css:~2718/2759/2876` settings `accent-color:#6366f1` → `var(--reda-gold)`.
- `App.css:~3221/3244` loader spinner `border-top-color:#818cf8`/`#6366f1` → `var(--reda-gold)`.
- `App.css:25` / `:494` type-selector / `:648` gizmo overlay `#6366f1` → selected/active state → `var(--reda-cham-hi)`.

- [ ] **Step 1: Replace every indigo occurrence in `src/App.css`** using the mapping table above. Edit colors only; do not move or delete layout rules (deleting a color-only `color:` line to defer to the token layer is fine).

- [ ] **Step 2: Run the guard to verify green**

Run: `pnpm test -- src/lib/app-css-palette.test.ts`
Expected: PASS — indigo guard passes.

- [ ] **Step 3: Run the full suite for regressions**

Run: `pnpm test`
Expected: PASS (all existing dom + node tests; no CSS-guard breakage since we only touched App.css).

- [ ] **Step 4: Typecheck**

Run: `pnpm build`
Expected: `tsc -b` completes, Vite build succeeds (no TS errors).

- [ ] **Step 5: Commit**

```bash
git add src/App.css
git commit -m "refactor(css): purge legacy indigo from App.css onto --reda-* tokens"
```

---

### Task 3: Purge legacy slate / near-white greys from App.css

**Files:**
- Create/extend: `src/lib/app-css-palette.test.ts`
- Modify: `src/App.css`

- [ ] **Step 1: Add the failing slate guard**

Append to `src/lib/app-css-palette.test.ts`, inside the same `describe`:

```ts
  // Legacy Tailwind slate/zinc neutrals + raw near-white/black text.
  const LEGACY_NEUTRALS =
    /#0f172a|#1e293b|#334155|#3f3f46|#94a3b8|#a1a1aa|#cbd5e1|#e2e8f0|#f8fafc|#ffffff\b|#fff\b/i;

  it('contains no legacy slate/near-white neutrals (use --reda-* tokens)', () => {
    expect(appCss).not.toMatch(LEGACY_NEUTRALS);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- src/lib/app-css-palette.test.ts`
Expected: FAIL — `#fff`/`#cbd5e1`/etc. still present.

- [ ] **Step 3: Replace every neutral in `src/App.css`** using this mapping:

| Legacy hex | Role | Replace with |
|---|---|---|
| `#ffffff`/`#fff`, `#f8fafc`, `#e2e8f0` | primary text on dark | `var(--reda-cream-hi)` (text) |
| `#e2e8f0`, `#cbd5e1` used as hairline/border | 1px lines | `var(--reda-line)` (or the nearest defined line token in tokens.css) |
| `#cbd5e1`, `#94a3b8`, `#a1a1aa` | secondary / muted text | `var(--reda-muted)` |
| `#3f3f46`, `#334155`, `#1e293b`, `#0f172a` | dark panel/surface | `var(--reda-char-2)` / `var(--reda-char-3)` / `var(--reda-glass)` per depth |
| `#22c55e` | success / "Saved" | `var(--reda-success)` |
| `#ef4444` | error / destructive | `var(--reda-error)` (destructive *action* fill → `var(--reda-son)`) |

Notes: keep `#000`/`#fff` only where they are non-text utility (e.g. an image mask, `text-shadow` black, or a `transparent`-adjacent overlay). If a `#fff` is a text or surface color, it must become a token. Verify the token names against `src/styles/tokens.css` before using (e.g. confirm `--reda-line`, `--reda-success`, `--reda-error` exist; if a needed neutral token is missing, add it to `tokens.css` rather than hardcoding — that edit belongs in this task and must keep `design-tokens.test.ts` green).

- [ ] **Step 4: Run the guard green**

Run: `pnpm test -- src/lib/app-css-palette.test.ts`
Expected: PASS (both indigo and neutrals guards).

- [ ] **Step 5: Full suite + typecheck**

Run: `pnpm test && pnpm build`
Expected: PASS; build clean.

- [ ] **Step 6: Commit**

```bash
git add src/App.css src/lib/app-css-palette.test.ts src/styles/tokens.css
git commit -m "refactor(css): purge legacy slate/near-white from App.css onto tokens"
```

---

### Task 4: Reconcile index.css parallel token vocabulary

**Files:**
- Modify: `src/index.css` (`:root` at lines ~1-26; body/h1-h4/code base styles)
- Extend: `src/lib/app-css-palette.test.ts`

**Interfaces:**
- `src/index.css` currently defines its own `--text/--text-h/--bg/--border/--accent/--sans/--heading/--mono`. We keep the variable *names* (so its body/heading selectors need no change) but redefine their *values* as aliases of the `--reda-*` tokens, and remove any off-palette hex from its `:root`.

- [ ] **Step 1: Add the failing index.css guard**

Append to `src/lib/app-css-palette.test.ts`:

```ts
import { readFileSync as _r } from 'node:fs';
const indexCss = _r(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8');
const indexRoot = indexCss.slice(indexCss.indexOf(':root'), indexCss.indexOf('}', indexCss.indexOf(':root')) + 1);

describe('index.css tokens', () => {
  it(':root aliases onto --reda-* tokens (no standalone hex)', () => {
    expect(indexRoot).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(indexRoot).toMatch(/var\(--reda-/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- src/lib/app-css-palette.test.ts`
Expected: FAIL — `index.css :root` still has raw hex (`#0E0D0A`, `#C9A35B`, …).

- [ ] **Step 3: Rewrite the `:root` block in `src/index.css`** to alias tokens (keep the same var names so downstream selectors are untouched):

```css
:root {
  --bg: var(--reda-char);
  --border: var(--reda-line);
  --text: var(--reda-muted);
  --text-h: var(--reda-cream-hi);
  --accent: var(--reda-gold);
  --sans: var(--reda-ui);
  --heading: var(--reda-text);
  --mono: var(--reda-mono);
  color-scheme: dark;
}
```

(Confirm each referenced `--reda-*` name exists in `src/styles/tokens.css`; adjust to the actual token names if any differ. `--reda-*` are defined on `:root` in `tokens.css`, which is imported after `index.css`; `var()` resolves at computed-value time, so forward references across files on `:root` are valid.)

- [ ] **Step 4: Run the guard green + full suite + typecheck**

Run: `pnpm test && pnpm build`
Expected: PASS; build clean.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/lib/app-css-palette.test.ts
git commit -m "refactor(css): alias index.css :root onto --reda-* tokens"
```

---

### Task 5: Sweep remaining App.css off-palette hex + confirm token references rose

**Files:**
- Extend: `src/lib/app-css-palette.test.ts`
- Modify: `src/App.css` (any stragglers)

**Interfaces:**
- Consumes: the two guards from Tasks 1/3. This task closes the gap for *any* remaining non-token hex (there were 189 total; indigo+neutrals cover most, but sweep the rest — e.g. status greens/reds, stray browns that should be `--reda-*`).

- [ ] **Step 1: Add a comprehensive "token adoption" assertion**

Append to `src/lib/app-css-palette.test.ts`:

```ts
describe('App.css token adoption', () => {
  // Every remaining hex must be either a token definition context or an
  // allowed non-color utility. Allow only #000/#fff inside rgba()/shadows/masks.
  it('has no bare hex color values outside allowed utilities', () => {
    // Strip allowed utility uses (rgba already uses decimals; target hex color props).
    const hexColorDecl =
      /(color|background(-color)?|border(-[a-z]+)?-color|fill|stroke|box-shadow|outline(-color)?|accent-color)\s*:[^;]*#(?!000\b|fff\b)[0-9a-f]{3,8}/gi;
    const matches = appCss.match(hexColorDecl) ?? [];
    expect(matches).toEqual([]);
  });

  it('references --reda-* tokens broadly (adoption sanity check)', () => {
    const tokenRefs = (appCss.match(/var\(--reda-/g) ?? []).length;
    expect(tokenRefs).toBeGreaterThan(80);
  });
});
```

- [ ] **Step 2: Run to see remaining offenders**

Run: `pnpm test -- src/lib/app-css-palette.test.ts`
Expected: FAIL — the assertion prints the remaining hex color declarations. Fix each per the Task 2/3 mapping (or a matching `--reda-*` token) until the array is empty. Leave genuine `#000`/`#fff` only inside `rgba()`, `text-shadow`, gradients, or masks (the regex already excludes `#000`/`#fff`).

- [ ] **Step 3: Run green + full suite + typecheck**

Run: `pnpm test && pnpm build`
Expected: PASS; build clean.

- [ ] **Step 4: Commit**

```bash
git add src/App.css src/lib/app-css-palette.test.ts
git commit -m "refactor(css): sweep remaining App.css hex onto tokens"
```

---

### Task 6: Visual smoke test — confirm the token layer now wins

**Files:** none (verification + doc note only)

- [ ] **Step 1: Start the app**

Run: `pnpm dev` (and, in another shell, `pnpm worker:dev` if a live API is needed; for a pure visual check the static shell renders without it).
Expected: Vite serves on `http://localhost:5173`.

- [ ] **Step 2: Screenshot the key surfaces and compare to mockups**

For each, load the route, screenshot at desktop (~1440px) and mobile (iPhone SE 667×375), and confirm **no indigo/slate remains** and the palette reads Tranh Việt (the *layout* will still be pre-redesign — that's the surface plans' job; only color changes here):
- `/studio` login → compare palette to `mockup/auth/view-01-login.html`.
- `/studio` dashboard → `mockup/dashboard/view-02-dashboard.html`.
- `/e/<a-published-slug>` viewer roam + open Inspect → confirm the **Inspect "Inspect Mode" eyebrow now renders gold, not indigo** (the headline over-specificity fix), and hotspot pins render chàm.

- [ ] **Step 3: Record the result**

Note in the PR/commit body which surfaces were checked and that the eyebrow/pin overrides are resolved. No code change.

- [ ] **Step 4: Final commit (if any doc/screenshot artifacts)**

```bash
git commit --allow-empty -m "chore: foundation token rebase verified (visual smoke)"
```

---

## Self-Review (completed)

- **Spec coverage:** App.css indigo (Task 2), App.css neutrals (Task 3), index.css parallel vocab (Task 4), remaining hex sweep (Task 5), the specific override conflicts — Inspect eyebrow, hotspot pins, settings accent, loader spinner — are named explicitly in Task 2 and verified in Task 6. ✓
- **Placeholder scan:** every step has a runnable command + expected result and real test code; the purge steps are driven by a concrete guard test + an explicit role→token mapping (not "handle colors appropriately"). ✓
- **Type consistency:** the guard test file `src/lib/app-css-palette.test.ts` is created in Task 1 and extended (never renamed) in Tasks 3/4/5; token names are cross-checked against `src/styles/tokens.css` before use. ✓
- **Downstream:** existing `reda-*-css.test.ts` and `design-tokens.test.ts` are untouched by these App.css/index.css edits and must remain green (asserted by `pnpm test` in every task).
