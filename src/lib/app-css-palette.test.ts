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
