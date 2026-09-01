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
