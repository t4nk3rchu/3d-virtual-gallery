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
  it('hotspot list button is hidden on mobile (gated by !isMobile)', () => {
    // The "Hotspots List" button must only render when !isMobile
    // Find the line with the title="Toggle Hotspots Directory"
    // and ensure it is within a !isMobile conditional
    const buttonIdx = src.indexOf('Toggle Hotspots Directory');
    expect(buttonIdx).toBeGreaterThan(-1);
    // The !isMobile guard must appear before the button in the same JSX block
    // We check that !isMobile appears within 300 chars before the button title
    // (300 instead of 200 to account for CRLF line endings on Windows)
    const context = src.slice(Math.max(0, buttonIdx - 300), buttonIdx);
    expect(context).toContain('!isMobile');
  });
});
