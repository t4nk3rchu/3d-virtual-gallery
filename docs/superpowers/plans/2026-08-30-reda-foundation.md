# REDA Design-System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared REDA design-system layer — fonts, design tokens, base styles, and a typed/accessible core component kit — that every surface (Landing, Studio, Viewer) will consume.

**Architecture:** Plain CSS custom properties (no Tailwind/CSS-in-JS — matches the existing global-class codebase). Tokens live in `src/styles/*.css`. React wrapper components in `src/components/ui/` emit the same BEM-ish class names the CSS defines (e.g. `<Button variant="primary">` → `<button class="btn btn--primary">`), so components and CSS are one system. Fonts are self-hosted via `@fontsource` (no external CDN — Cloudflare/CSP friendly).

**Tech Stack:** React 19, Vite 8, TypeScript 6, Vitest 3 + @testing-library/react (jsdom), `@fontsource` packages.

## Global Constraints

- Fonts (self-hosted, `@fontsource`): **Libre Bodoni** (display) · **EB Garamond** (text) · **Montserrat** (labels/UI). No other families. No Google Fonts CDN link.
- Palette tokens are the ONLY source of color — no raw hex in component files. Values verbatim from the design-system spec `docs/superpowers/specs/2026-08-30-reda-design-system-foundation.md`.
- **No emoji as icons** — all icons are inline SVG via `<Icon>`.
- Body text on dark = cream (`--reda-cream`); muted browns for small labels only; warm link/accent = `#D2823E` (AA). Primary action = oxblood; active/selected = gold; success = sage.
- Every interactive element keeps a **visible gold focus ring**; honor `prefers-reduced-motion`.
- Touch targets ≥ 44×44px.
- Test files live beside source: `src/components/ui/<Name>.test.tsx` (jsdom project). Node CSS-content tests: `src/styles/<name>.test.ts` (node project — path under `src/lib/**` OR add to `dom` glob; use `src/styles/` and rely on the node project's `src/lib/**` include NOT matching — so put CSS-content tests under `src/lib/styles-check/` to hit the node project). Simpler: CSS-content assertions go in `src/lib/design-tokens.test.ts`.

---

## File Structure

- `src/styles/fonts.ts` — imports the exact `@fontsource` weight CSS files (side-effect module).
- `src/styles/tokens.css` — REDA CSS custom properties (primitives → semantic → register scopes).
- `src/styles/base.css` — reset, body defaults, focus-visible ring, reduced-motion, register-scope backgrounds.
- `src/styles/reda-ui.css` — component classes (`.btn*`, `.reda-field*`, `.reda-toggle`, `.reda-seg`, `.reda-tabs`, `.reda-plate`, `.reda-walllabel`, `.reda-kicker`, `.reda-rule`, `.reda-panel`, `.reda-section-title`).
- `src/components/ui/Icon.tsx` — inline SVG icon set.
- `src/components/ui/Button.tsx`
- `src/components/ui/fields/TextField.tsx` · `TextArea.tsx` · `SelectField.tsx`
- `src/components/ui/Toggle.tsx`
- `src/components/ui/SegmentedControl.tsx`
- `src/components/ui/Tabs.tsx`
- `src/components/ui/primitives.tsx` — `Kicker`, `HairlineRule`, `SectionTitle`, `Panel`.
- `src/components/ui/Plate.tsx` — `Plate`, `WallLabel`.
- `src/components/ui/index.ts` — barrel export.
- `src/lib/design-tokens.test.ts` — asserts required tokens/classes exist in the CSS files.
- `src/main.tsx` — modify to import fonts + styles.

---

## Task 1: Fonts + token + base + component stylesheets

**Files:**
- Create: `src/styles/fonts.ts`, `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/reda-ui.css`
- Create: `src/lib/design-tokens.test.ts`
- Modify: `src/main.tsx` (add imports), `package.json` (add deps)

**Interfaces:**
- Produces: CSS custom properties on `:root` and register scopes `.reda-dark` / `.reda-parch`; component classes consumed by Tasks 2–7.

- [ ] **Step 1: Install font packages**

Run:
```bash
pnpm add @fontsource/libre-bodoni @fontsource/eb-garamond @fontsource-variable/montserrat
```
Expected: three packages added to `dependencies`.

- [ ] **Step 2: Write the failing token test**

Create `src/lib/design-tokens.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(__dirname, '../styles', p), 'utf8');

describe('REDA tokens', () => {
  it('defines the core palette custom properties', () => {
    const css = read('tokens.css');
    for (const t of ['--reda-char', '--reda-parch', '--reda-cream', '--reda-ink',
      '--reda-oxblood', '--reda-gold', '--reda-sage', '--reda-terra', '--reda-wall']) {
      expect(css).toContain(t);
    }
  });
  it('defines register scopes', () => {
    const css = read('base.css');
    expect(css).toContain('.reda-dark');
    expect(css).toContain('.reda-parch');
    expect(css).toContain('prefers-reduced-motion');
  });
  it('defines core component classes', () => {
    const css = read('reda-ui.css');
    for (const c of ['.btn', '.btn--primary', '.reda-field', '.reda-toggle',
      '.reda-seg', '.reda-tabs', '.reda-plate']) {
      expect(css).toContain(c);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/lib/design-tokens.test.ts`
Expected: FAIL — `ENOENT` (files don't exist yet).

- [ ] **Step 4: Create `src/styles/tokens.css`**

```css
/* REDA design tokens — primitives → semantic. Source: 2026-08-30-reda-design-system-foundation.md */
:root {
  /* grounds */
  --reda-char: #1B1A17;        /* app/dark ground */
  --reda-char-2: #232019;      /* panels, bars */
  --reda-char-3: #2B271F;      /* insets, hovered chrome */
  --reda-wall: #2C2C31;        /* NEUTRAL art stage — distinct from brand charcoal */
  --reda-wall-deep: #181820;   /* viewer gallery */
  --reda-wall-deepest: #101015;
  /* paper */
  --reda-parch: #E7DDC6;
  --reda-parch-2: #F0E8D4;
  --reda-field: #FBF6EA;
  /* text */
  --reda-cream: #ECE3CE;       /* body on dark */
  --reda-cream-hi: #F3EBD8;    /* headlines on dark */
  --reda-ink: #2A2018;         /* text on parchment */
  --reda-ink-2: #5A4A32;
  --reda-label: #7A5A34;
  --reda-muted: #A79A7C;       /* de-emphasized on dark */
  --reda-muted-2: #8B7E62;
  /* brand accents */
  --reda-oxblood: #8A322A;
  --reda-oxblood-hi: #9A392E;
  --reda-gold: #B98A3C;
  --reda-gold-hi: #C79A48;
  --reda-sage: #6E7358;
  --reda-terra: #C0703F;
  --reda-link: #D2823E;        /* warm link on dark, AA */
  /* lines & fx */
  --reda-line: rgba(185, 138, 60, 0.24);
  --reda-hairline: linear-gradient(90deg, var(--reda-gold), transparent);
  --reda-focus: 0 0 0 2px rgba(185, 138, 60, 0.45);
  /* type */
  --reda-display: 'Libre Bodoni', Georgia, serif;
  --reda-text: 'EB Garamond', Georgia, serif;
  --reda-ui: 'Montserrat', system-ui, sans-serif;
  /* radius/space */
  --reda-radius: 5px;
  --reda-radius-sm: 3px;
}
```

- [ ] **Step 5: Create `src/styles/base.css`**

```css
/* REDA base + register scopes */
.reda-dark { background: var(--reda-char); color: var(--reda-cream); }
.reda-parch { background: var(--reda-parch); color: var(--reda-ink); }

.reda-dark h1, .reda-dark h2, .reda-dark h3,
.reda-parch h1, .reda-parch h2, .reda-parch h3 { font-family: var(--reda-display); font-weight: 500; }

:where(.reda-dark, .reda-parch) :focus-visible {
  outline: none;
  box-shadow: var(--reda-focus);
  border-radius: var(--reda-radius-sm);
}

@media (prefers-reduced-motion: reduce) {
  .reda-dark *, .reda-parch * {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 6: Create `src/styles/fonts.ts`**

```ts
// Self-hosted fonts (no external CDN). Only the weights REDA uses.
import '@fontsource/libre-bodoni/400.css';
import '@fontsource/libre-bodoni/500.css';
import '@fontsource/libre-bodoni/700.css';
import '@fontsource/libre-bodoni/400-italic.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource-variable/montserrat';
```

- [ ] **Step 7: Create `src/styles/reda-ui.css`**

```css
/* ===== Buttons ===== */
.btn { font-family: var(--reda-ui); font-weight: 600; font-size: 13px; letter-spacing: .04em;
  text-transform: uppercase; padding: 11px 18px; min-height: 44px; border: 1px solid transparent;
  border-radius: var(--reda-radius); cursor: pointer; display: inline-flex; align-items: center;
  justify-content: center; gap: 8px; text-decoration: none; transition: transform .15s, background .15s; }
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
.btn--primary { background: var(--reda-oxblood); color: #F3E7D5; border-color: var(--reda-oxblood); }
.btn--secondary { background: var(--reda-char-3); color: var(--reda-cream); border-color: var(--reda-line); }
.btn--ghost { background: transparent; color: var(--reda-cream); border-color: var(--reda-line); }
.btn--danger { background: transparent; color: #E0776A; border-color: rgba(224,119,106,.5); }
.btn--sm { min-height: 34px; padding: 7px 12px; font-size: 11px; }
.reda-parch .btn--ghost, .reda-parch .btn--secondary { color: var(--reda-ink); }

/* ===== Fields ===== */
.reda-field { margin-bottom: 14px; }
.reda-field__label { display: block; font-family: var(--reda-ui); font-size: 10px; font-weight: 700;
  letter-spacing: .09em; text-transform: uppercase; color: var(--reda-label); margin-bottom: 5px; }
.reda-field__control { width: 100%; font-family: var(--reda-text); font-size: 15px; color: var(--reda-ink);
  background: var(--reda-field); border: 1px solid #cbbd9d; border-radius: var(--reda-radius); padding: 9px 11px; }
.reda-field__control:focus { outline: none; border-color: var(--reda-gold); box-shadow: var(--reda-focus); }
textarea.reda-field__control { resize: vertical; min-height: 60px; line-height: 1.45; }
.reda-field__hint { font-family: var(--reda-text); font-size: 12.5px; color: var(--reda-ink-2); margin-top: 5px; }
.reda-field__error { font-family: var(--reda-ui); font-size: 11px; color: #B23A2E; margin-top: 5px; }

/* ===== Toggle ===== */
.reda-toggle { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; }
.reda-toggle__track { width: 40px; height: 22px; border-radius: 11px; background: #c3b596; position: relative;
  transition: background .15s; flex: none; }
.reda-toggle__track[data-on="true"] { background: var(--reda-sage); }
.reda-toggle__knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%;
  background: #fff; transition: left .15s; }
.reda-toggle__track[data-on="true"] .reda-toggle__knob { left: 20px; }

/* ===== Segmented control (mode pill) ===== */
.reda-seg { display: inline-flex; background: var(--reda-char-3); border: 1px solid var(--reda-line);
  border-radius: var(--reda-radius); overflow: hidden; }
.reda-seg__opt { background: none; border: none; font-family: var(--reda-ui); font-weight: 600; font-size: 11px;
  letter-spacing: .08em; text-transform: uppercase; color: var(--reda-muted); padding: 8px 15px; min-height: 44px;
  cursor: pointer; }
.reda-seg__opt[aria-pressed="true"] { background: var(--reda-gold); color: #241a08; }

/* ===== Tabs ===== */
.reda-tabs { display: flex; gap: 20px; border-bottom: 1px solid var(--reda-line); }
.reda-tabs__tab { background: none; border: none; font-family: var(--reda-ui); font-size: 11px; font-weight: 600;
  letter-spacing: .05em; text-transform: uppercase; color: var(--reda-muted); padding: 11px 0; cursor: pointer;
  border-bottom: 2px solid transparent; }
.reda-tabs__tab[aria-selected="true"] { color: var(--reda-cream); border-bottom-color: var(--reda-oxblood); }
.reda-parch .reda-tabs__tab[aria-selected="true"] { color: var(--reda-ink); }

/* ===== Plate (mat + frame) & wall label ===== */
.reda-plate { background: var(--reda-parch); padding: 8px; border: 8px solid #3A2A18;
  box-shadow: 0 22px 46px rgba(0,0,0,.5); display: block; }
.reda-plate img { display: block; width: 100%; height: 100%; object-fit: cover; }
.reda-walllabel { background: var(--reda-parch); color: var(--reda-ink); padding: 10px 12px; }
.reda-walllabel__title { font-family: var(--reda-display); font-size: 14px; }
.reda-walllabel__meta { font-family: var(--reda-ui); font-size: 8px; letter-spacing: .04em; text-transform: uppercase;
  color: var(--reda-label); line-height: 1.7; margin-top: 4px; }

/* ===== Primitives ===== */
.reda-kicker { font-family: var(--reda-ui); font-weight: 600; font-size: 10px; letter-spacing: .26em;
  text-transform: uppercase; color: var(--reda-gold); }
.reda-rule { height: 1px; background: var(--reda-hairline); border: 0; }
.reda-section-title { font-family: var(--reda-display); font-weight: 500; }
.reda-panel { background: var(--reda-char-2); border: 1px solid var(--reda-line); border-radius: var(--reda-radius); }
.reda-panel--parch { background: var(--reda-parch); border-color: #d3c6a8; color: var(--reda-ink); }
.reda-icon { display: inline-block; vertical-align: middle; }
```

- [ ] **Step 8: Wire into `src/main.tsx`**

Modify `src/main.tsx` — add these imports directly under the existing `import './App.css'` line:
```ts
import './styles/fonts';
import './styles/tokens.css';
import './styles/base.css';
import './styles/reda-ui.css';
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm vitest run src/lib/design-tokens.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml src/styles src/lib/design-tokens.test.ts src/main.tsx
git commit -m "feat(design-system): REDA fonts, tokens, base + component stylesheets"
```

---

## Task 2: Icon component

**Files:**
- Create: `src/components/ui/Icon.tsx`, `src/components/ui/Icon.test.tsx`

**Interfaces:**
- Produces: `Icon`, `IconName`. `<Icon name: IconName, size?: number, title?: string, className?: string />` → inline `<svg>`. With `title`, sets `role="img"` + `<title>`; without, sets `aria-hidden="true"`.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/Icon.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from './Icon';

describe('Icon', () => {
  it('renders an svg with the reda-icon class', () => {
    const { container } = render(<Icon name="plus" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.classList.contains('reda-icon')).toBe(true);
  });
  it('is aria-hidden when no title', () => {
    const { container } = render(<Icon name="gear" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
  it('exposes a title as role=img when provided', () => {
    const { getByRole } = render(<Icon name="trash" title="Delete" />);
    const svg = getByRole('img', { name: 'Delete' });
    expect(svg).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/Icon.test.tsx`
Expected: FAIL — cannot find module `./Icon`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/ui/Icon.tsx`:
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
  external: 'M6 3H3v10h10v-3M9 3h4v4M13 3l-6 6',
  trash: 'M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9',
  google: 'M13.5 8.2c0-.5 0-.9-.1-1.3H8v2.6h3.1a2.7 2.7 0 0 1-1.1 1.8v1.5h1.8c1.1-1 1.7-2.5 1.7-4.6z M8 14c1.5 0 2.8-.5 3.7-1.3l-1.8-1.4c-.5.3-1.1.5-1.9.5a3.3 3.3 0 0 1-3.1-2.3H3v1.5A5.6 5.6 0 0 0 8 14z M4.9 9.5a3.3 3.3 0 0 1 0-2.1V5.9H3a5.6 5.6 0 0 0 0 5z M8 4.6c.8 0 1.6.3 2.2.9l1.6-1.6A5.5 5.5 0 0 0 3 5.9l1.9 1.5A3.3 3.3 0 0 1 8 4.6z',
  film: 'M2.5 3h11v10h-11zM5 3v10M11 3v10M2.5 6.5h2.5M11 6.5h2.5M2.5 9.5h2.5M11 9.5h2.5',
  palette: 'M8 2a6 6 0 0 0 0 12c1 0 1.3-.7 1-1.3-.4-.7 0-1.7 1-1.7h1a3 3 0 0 0 3-3c0-3.3-2.9-6-6-6zM5 6.5h.01M8 5h.01M11 6.5h.01M10.5 9.5h.01',
  audio: 'M4 6v4M6.5 4v8M9 6.5v3M11.5 5v6',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 17, title, className = '' }:
  { name: IconName; size?: number; title?: string; className?: string }) {
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };
  return (
    <svg className={`reda-icon ${className}`} width={size} height={size} viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" {...(a11y as object)}>
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/Icon.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Icon.tsx src/components/ui/Icon.test.tsx
git commit -m "feat(ui): Icon component with REDA line-icon set"
```

---

## Task 3: Button component

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Button.test.tsx`

**Interfaces:**
- Produces: `Button`. Props: `variant?: 'primary'|'secondary'|'ghost'|'danger'` (default `'primary'`), `size?: 'md'|'sm'`, `iconLeft?: IconName`, plus all native `<button>` attributes. Emits `class="btn btn--{variant}[ btn--sm]"`.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/Button.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders label and default primary class', () => {
    render(<Button>Publish</Button>);
    const btn = screen.getByRole('button', { name: 'Publish' });
    expect(btn.className).toContain('btn');
    expect(btn.className).toContain('btn--primary');
  });
  it('applies variant and size', () => {
    render(<Button variant="danger" size="sm">Delete</Button>);
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toContain('btn--danger');
    expect(btn.className).toContain('btn--sm');
  });
  it('fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it('renders a leading icon marked aria-hidden', () => {
    const { container } = render(<Button iconLeft="plus">Add</Button>);
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/Button.test.tsx`
Expected: FAIL — cannot find module `./Button`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/ui/Button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary', size = 'md', iconLeft, className = '', children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant; size?: 'md' | 'sm'; iconLeft?: IconName;
}) {
  const cls = ['btn', `btn--${variant}`, size === 'sm' ? 'btn--sm' : '', className]
    .filter(Boolean).join(' ');
  return (
    <button className={cls} {...rest}>
      {iconLeft && <Icon name={iconLeft} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/Button.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Button.tsx src/components/ui/Button.test.tsx
git commit -m "feat(ui): Button component"
```

---

## Task 4: Field components (TextField, TextArea, SelectField)

**Files:**
- Create: `src/components/ui/fields/TextField.tsx`, `TextArea.tsx`, `SelectField.tsx`
- Create: `src/components/ui/fields/fields.test.tsx`

**Interfaces:**
- Produces:
  - `TextField(props: { label: string; id: string; hint?: string; error?: string } & InputHTMLAttributes)` — renders `<label htmlFor>` + `<input class="reda-field__control">` inside `.reda-field`.
  - `TextArea` — same shape with `<textarea>`.
  - `SelectField(props: { label; id; hint?; error? } & SelectHTMLAttributes)` — `<select>` with children `<option>`.
- Label is always visible (never placeholder-only). Errors get `aria-invalid` + `role="alert"`.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/fields/fields.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextField } from './TextField';
import { TextArea } from './TextArea';
import { SelectField } from './SelectField';

describe('TextField', () => {
  it('associates a visible label with the input', () => {
    render(<TextField id="t1" label="Title" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Title');
    expect(input.tagName).toBe('INPUT');
    expect(input.className).toContain('reda-field__control');
  });
  it('calls onChange when typed', async () => {
    const onChange = vi.fn();
    render(<TextField id="t2" label="Name" value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Name'), 'a');
    expect(onChange).toHaveBeenCalled();
  });
  it('shows an error with role=alert and aria-invalid', () => {
    render(<TextField id="t3" label="Email" value="" onChange={() => {}} error="Required" />);
    expect(screen.getByRole('alert').textContent).toBe('Required');
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true');
  });
});
describe('TextArea', () => {
  it('renders a labeled textarea', () => {
    render(<TextArea id="d1" label="Desc" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Desc').tagName).toBe('TEXTAREA');
  });
});
describe('SelectField', () => {
  it('renders a labeled select with options', () => {
    render(
      <SelectField id="s1" label="Room" value="a" onChange={() => {}}>
        <option value="a">A</option><option value="b">B</option>
      </SelectField>
    );
    const sel = screen.getByLabelText('Room') as HTMLSelectElement;
    expect(sel.tagName).toBe('SELECT');
    expect(sel.value).toBe('a');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/fields/fields.test.tsx`
Expected: FAIL — cannot find module `./TextField`.

- [ ] **Step 3: Write the three implementations**

Create `src/components/ui/fields/TextField.tsx`:
```tsx
import type { InputHTMLAttributes } from 'react';

export function TextField({ id, label, hint, error, className = '', ...rest }:
  InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string; error?: string }) {
  return (
    <div className="reda-field">
      <label className="reda-field__label" htmlFor={id}>{label}</label>
      <input id={id} className={`reda-field__control ${className}`}
        aria-invalid={error ? true : undefined} {...rest} />
      {hint && !error && <p className="reda-field__hint">{hint}</p>}
      {error && <p className="reda-field__error" role="alert">{error}</p>}
    </div>
  );
}
```

Create `src/components/ui/fields/TextArea.tsx`:
```tsx
import type { TextareaHTMLAttributes } from 'react';

export function TextArea({ id, label, hint, error, className = '', ...rest }:
  TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string; hint?: string; error?: string }) {
  return (
    <div className="reda-field">
      <label className="reda-field__label" htmlFor={id}>{label}</label>
      <textarea id={id} className={`reda-field__control ${className}`}
        aria-invalid={error ? true : undefined} {...rest} />
      {hint && !error && <p className="reda-field__hint">{hint}</p>}
      {error && <p className="reda-field__error" role="alert">{error}</p>}
    </div>
  );
}
```

Create `src/components/ui/fields/SelectField.tsx`:
```tsx
import type { SelectHTMLAttributes } from 'react';

export function SelectField({ id, label, hint, error, className = '', children, ...rest }:
  SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string; hint?: string; error?: string }) {
  return (
    <div className="reda-field">
      <label className="reda-field__label" htmlFor={id}>{label}</label>
      <select id={id} className={`reda-field__control ${className}`}
        aria-invalid={error ? true : undefined} {...rest}>
        {children}
      </select>
      {hint && !error && <p className="reda-field__hint">{hint}</p>}
      {error && <p className="reda-field__error" role="alert">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/fields/fields.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/fields
git commit -m "feat(ui): TextField, TextArea, SelectField"
```

---

## Task 5: Toggle, SegmentedControl, Tabs

**Files:**
- Create: `src/components/ui/Toggle.tsx`, `src/components/ui/SegmentedControl.tsx`, `src/components/ui/Tabs.tsx`
- Create: `src/components/ui/controls.test.tsx`

**Interfaces:**
- Produces:
  - `Toggle({ checked: boolean; onChange(next: boolean): void; label: string })` — `role="switch"`, `aria-checked`.
  - `SegmentedControl<T extends string>({ options: {value:T;label:string}[]; value: T; onChange(v:T):void; ariaLabel: string })` — buttons with `aria-pressed`.
  - `Tabs({ tabs: {id:string;label:string}[]; active: string; onChange(id:string):void })` — `role="tablist"`, tabs with `aria-selected`.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/controls.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from './Toggle';
import { SegmentedControl } from './SegmentedControl';
import { Tabs } from './Tabs';

describe('Toggle', () => {
  it('exposes switch role and toggles', async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Wall label" />);
    const sw = screen.getByRole('switch', { name: 'Wall label' });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    await userEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
describe('SegmentedControl', () => {
  it('marks the active option pressed and switches', async () => {
    const onChange = vi.fn();
    render(<SegmentedControl ariaLabel="Mode" value="place"
      options={[{ value: 'roam', label: 'Roam' }, { value: 'place', label: 'Place' }]}
      onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Place' }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: 'Roam' }));
    expect(onChange).toHaveBeenCalledWith('roam');
  });
});
describe('Tabs', () => {
  it('renders a tablist and selects', async () => {
    const onChange = vi.fn();
    render(<Tabs active="details" onChange={onChange}
      tabs={[{ id: 'details', label: 'Details' }, { id: 'transform', label: 'Transform' }]} />);
    expect(screen.getByRole('tab', { name: 'Details' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.click(screen.getByRole('tab', { name: 'Transform' }));
    expect(onChange).toHaveBeenCalledWith('transform');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/controls.test.tsx`
Expected: FAIL — cannot find module `./Toggle`.

- [ ] **Step 3: Write the three implementations**

Create `src/components/ui/Toggle.tsx`:
```tsx
export function Toggle({ checked, onChange, label }:
  { checked: boolean; onChange(next: boolean): void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label}
      className="reda-toggle" onClick={() => onChange(!checked)}>
      <span className="reda-toggle__track" data-on={checked}>
        <span className="reda-toggle__knob" />
      </span>
    </button>
  );
}
```

Create `src/components/ui/SegmentedControl.tsx`:
```tsx
export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel }:
  { options: { value: T; label: string }[]; value: T; onChange(v: T): void; ariaLabel: string }) {
  return (
    <div className="reda-seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button" className="reda-seg__opt"
          aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

Create `src/components/ui/Tabs.tsx`:
```tsx
export function Tabs({ tabs, active, onChange }:
  { tabs: { id: string; label: string }[]; active: string; onChange(id: string): void }) {
  return (
    <div className="reda-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === active}
          className="reda-tabs__tab" onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/controls.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Toggle.tsx src/components/ui/SegmentedControl.tsx src/components/ui/Tabs.tsx src/components/ui/controls.test.tsx
git commit -m "feat(ui): Toggle, SegmentedControl, Tabs"
```

---

## Task 6: Primitives (Kicker, HairlineRule, SectionTitle, Panel) + Plate/WallLabel

**Files:**
- Create: `src/components/ui/primitives.tsx`, `src/components/ui/Plate.tsx`
- Create: `src/components/ui/primitives.test.tsx`

**Interfaces:**
- Produces:
  - `Kicker({ children })` → `<p class="reda-kicker">`.
  - `HairlineRule()` → `<hr class="reda-rule">`.
  - `SectionTitle({ as?, children })` → heading (`h2` default) with `reda-section-title`.
  - `Panel({ variant?: 'dark'|'parch'; className?; children })` → `<div class="reda-panel[ reda-panel--parch]">`.
  - `Plate({ src; alt; className? })` → `<figure class="reda-plate"><img alt></figure>`.
  - `WallLabel({ title; lines: string[] })` → parchment plaque.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/primitives.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Kicker, HairlineRule, SectionTitle, Panel } from './primitives';
import { Plate, WallLabel } from './Plate';

describe('primitives', () => {
  it('Kicker renders reda-kicker text', () => {
    render(<Kicker>Now showing</Kicker>);
    expect(screen.getByText('Now showing').className).toContain('reda-kicker');
  });
  it('SectionTitle renders a heading', () => {
    render(<SectionTitle>Artworks</SectionTitle>);
    const h = screen.getByRole('heading', { name: 'Artworks' });
    expect(h.className).toContain('reda-section-title');
  });
  it('HairlineRule renders an hr', () => {
    const { container } = render(<HairlineRule />);
    expect(container.querySelector('hr.reda-rule')).toBeTruthy();
  });
  it('Panel applies parch variant', () => {
    const { container } = render(<Panel variant="parch">x</Panel>);
    expect(container.querySelector('.reda-panel--parch')).toBeTruthy();
  });
  it('Plate renders an img with alt', () => {
    render(<Plate src="/x.jpg" alt="Untitled" />);
    expect((screen.getByAltText('Untitled') as HTMLImageElement).tagName).toBe('IMG');
  });
  it('WallLabel renders title and lines', () => {
    render(<WallLabel title="Untitled" lines={['The Artist', '1974']} />);
    expect(screen.getByText('Untitled')).toBeTruthy();
    expect(screen.getByText('1974')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/primitives.test.tsx`
Expected: FAIL — cannot find module `./primitives`.

- [ ] **Step 3: Write implementations**

Create `src/components/ui/primitives.tsx`:
```tsx
import type { ReactNode } from 'react';

export const Kicker = ({ children }: { children: ReactNode }) =>
  <p className="reda-kicker">{children}</p>;

export const HairlineRule = () => <hr className="reda-rule" />;

export function SectionTitle({ as: Tag = 'h2', children, className = '' }:
  { as?: 'h1' | 'h2' | 'h3'; children: ReactNode; className?: string }) {
  return <Tag className={`reda-section-title ${className}`}>{children}</Tag>;
}

export function Panel({ variant = 'dark', className = '', children }:
  { variant?: 'dark' | 'parch'; className?: string; children: ReactNode }) {
  return <div className={`reda-panel ${variant === 'parch' ? 'reda-panel--parch' : ''} ${className}`}>{children}</div>;
}
```

Create `src/components/ui/Plate.tsx`:
```tsx
export function Plate({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <figure className={`reda-plate ${className}`}>
      <img src={src} alt={alt} />
    </figure>
  );
}

export function WallLabel({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="reda-walllabel">
      <div className="reda-walllabel__title">{title}</div>
      <div className="reda-walllabel__meta">
        {lines.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/primitives.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/primitives.tsx src/components/ui/Plate.tsx src/components/ui/primitives.test.tsx
git commit -m "feat(ui): primitives (Kicker, Rule, SectionTitle, Panel) + Plate/WallLabel"
```

---

## Task 7: Barrel export + full suite green

**Files:**
- Create: `src/components/ui/index.ts`

**Interfaces:**
- Produces: a single import surface: `import { Button, TextField, TextArea, SelectField, Toggle, SegmentedControl, Tabs, Icon, Kicker, HairlineRule, SectionTitle, Panel, Plate, WallLabel } from '@/components/ui'`.

- [ ] **Step 1: Create the barrel**

Create `src/components/ui/index.ts`:
```ts
export { Icon } from './Icon';
export type { IconName } from './Icon';
export { Button } from './Button';
export { TextField } from './fields/TextField';
export { TextArea } from './fields/TextArea';
export { SelectField } from './fields/SelectField';
export { Toggle } from './Toggle';
export { SegmentedControl } from './SegmentedControl';
export { Tabs } from './Tabs';
export { Kicker, HairlineRule, SectionTitle, Panel } from './primitives';
export { Plate, WallLabel } from './Plate';
```

- [ ] **Step 2: Run the full test suite**

Run: `pnpm test`
Expected: PASS — all pre-existing tests plus the new UI suites (design-tokens, Icon, Button, fields, controls, primitives).

- [ ] **Step 3: Typecheck the build**

Run: `pnpm build`
Expected: `tsc -b` exits 0, Vite build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/index.ts
git commit -m "feat(ui): barrel export for REDA component kit"
```

---

## Self-Review

**Spec coverage:** Palette (§3) → Task 1 tokens.css. Type system (§4) → fonts.ts + tokens vars + base.css headings. Components (§7: buttons, inputs, tabs, toggles, cards, plate, wall label, kicker, hairline) → Tasks 2–6. Accessibility (§9: focus ring, labels, reduced-motion, no color-only) → base.css + labeled fields + role/aria on controls. Neutral-stage token (§2) → `--reda-wall` distinct from `--reda-char`. Motion (§8) → reduced-motion in base.css (component-level GSAP deferred to surface plans). Registers (§5) → `.reda-dark`/`.reda-parch` scopes.
**Gaps (intentional, deferred to surface plans):** GSAP reveal presets, the Vitruvian SVG motif (surface-specific art, not a core control), gizmo/hotspot markers (Studio/Viewer specific), and the knockout logo asset (to-provide). Noted in the Studio/Viewer plans.
**Placeholder scan:** none — every step has runnable code/commands.
**Type consistency:** `IconName` defined in Icon.tsx, consumed by Button `iconLeft`. Field props `{id,label,hint?,error?}` consistent across TextField/TextArea/SelectField. `SegmentedControl` generic `<T>` matches usage.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-30-reda-foundation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
