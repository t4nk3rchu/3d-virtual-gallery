import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../styles/reda-workbench.css'), 'utf8');

describe('reda-workbench.css', () => {
  it('defines the shell regions', () => {
    for (const s of ['.wb', '.wb-top', '.wb-rail', '.wb-pane', '.wb-view', '.wb-insp', '.wb-status', '.dcard']) {
      expect(css).toContain(s);
    }
  });

  it('uses REDA tokens only (no legacy slate/indigo)', () => {
    expect(css).toContain('var(--reda-');
    expect(css).not.toMatch(/#0f172a|#6366f1|#1e293b/i);
  });
});
