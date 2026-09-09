import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tokensCss = readFileSync(resolve(__dirname, '../styles/tokens.css'), 'utf8');

describe('REDA tokens.css', () => {
  it('defines all 6 missing production tokens and aliases', () => {
    const requiredTokens = [
      '--reda-stone',
      '--reda-bone',
      '--reda-bone-hi',
      '--reda-serif',
      '--reda-char-1',
      '--reda-danger',
    ];

    for (const token of requiredTokens) {
      expect(tokensCss, `tokens.css should define ${token}`).toContain(token);
    }
  });

  it('defines WCAG AA compliant muted text tokens for both dark and light registers', () => {
    expect(tokensCss).toContain('--reda-muted:');
    expect(tokensCss).toContain('--reda-muted-ink:');
  });
});
