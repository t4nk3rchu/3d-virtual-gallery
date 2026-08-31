import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readCss = () => readFileSync(resolve(__dirname, '../styles/reda-studio.css'), 'utf8');

describe('reda-studio.css', () => {
  it('re-skins the core Studio class names', () => {
    const css = readCss();
    for (const sel of ['.studio-dashboard', '.studio-header', '.studio-card',
      '.exhibition-list__item', '.artwork-card', '.badge--live', '.badge--draft',
      '.login-card', '.form-label', '.artwork-type-badge']) {
      expect(css).toContain(sel);
    }
  });
  it('uses REDA tokens, not raw slate/indigo hex', () => {
    const css = readCss();
    expect(css).toContain('var(--reda-');
    expect(css).not.toMatch(/#0f172a|#6366f1|#1e293b/i); // old palette gone
  });

  it('defines studio tabs, dossier grid, drawer, and bento grid layout classes', () => {
    const css = readCss();
    for (const sel of [
      '.studio-tabs',
      '.studio-tab-btn',
      '.studio-dossier-grid',
      '.studio-dossier-col',
      '.studio-drawer',
      '.studio-drawer--open',
      '.dashboard-bento-grid',
      '.dashboard-exhibition-card',
    ]) {
      expect(css).toContain(sel);
    }
  });
});
