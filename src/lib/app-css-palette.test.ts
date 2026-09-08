import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const appCss = readFileSync(
  fileURLToPath(new URL('../App.css', import.meta.url)),
  'utf8',
);

// Legacy indigo brand palette that must not survive in App.css.
const LEGACY_INDIGO = /#6366f1|#818cf8|#a5b4fc|#4f46e5|#c7d2fe|#4338ca/i;

// Legacy Tailwind slate/zinc neutrals + raw near-white/black text.
const LEGACY_NEUTRALS =
  /#0f172a|#1e293b|#334155|#3f3f46|#94a3b8|#a1a1aa|#cbd5e1|#e2e8f0|#f8fafc|#ffffff\b|#fff\b/i;

describe('App.css palette', () => {
  it('contains no legacy indigo brand colors (use --reda-* tokens)', () => {
    expect(appCss).not.toMatch(LEGACY_INDIGO);
  });

  it('contains no legacy slate/near-white neutrals (use --reda-* tokens)', () => {
    expect(appCss).not.toMatch(LEGACY_NEUTRALS);
  });
});

const indexCss = readFileSync(
  fileURLToPath(new URL('../index.css', import.meta.url)),
  'utf8',
);
const indexRoot = indexCss.slice(
  indexCss.indexOf(':root'),
  indexCss.indexOf('}', indexCss.indexOf(':root')) + 1,
);

describe('index.css tokens', () => {
  it(':root aliases onto --reda-* tokens (no standalone hex)', () => {
    expect(indexRoot).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(indexRoot).toMatch(/var\(--reda-/);
  });
});

describe('App.css token adoption', () => {
  it('has no bare hex color values outside allowed utilities', () => {
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
