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
