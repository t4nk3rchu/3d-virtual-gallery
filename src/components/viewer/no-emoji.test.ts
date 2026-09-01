import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2100}-\u{214F}\u{27F0}-\u{27FF}\u{FE0F}]/u;
const dir = __dirname;

describe('viewer is fully icon-based', () => {
  const files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
  for (const f of files) {
    it(`${f} has no emoji or glyph icons`, () => {
      const src = readFileSync(resolve(dir, f), 'utf8');
      expect(EMOJI.test(src)).toBe(false);
    });
  }
});
