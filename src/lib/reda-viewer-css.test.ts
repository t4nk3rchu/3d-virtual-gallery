import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../styles/reda-viewer.css'), 'utf8');

describe('reda-viewer.css', () => {
  it('defines every viewer component region', () => {
    for (const s of [
      '.intro-video-overlay', '.viewer-progress', '.viewer-controls-hint',
      '.artwork-hover-tooltip', '.virtual-joystick', '.focus-header-bar',
      '.focus-info-modal', '.focus-nav-rail', '.inspect-lightbox',
      '.inspect-lightbox__header', '.inspect-lightbox__controls',
      '.inspect-lightbox__sidebar', '.inspect-lightbox__drawer', '.hotspot-pin',
      '.hotspot-card', '.artist-modal-container', '.settings-modal',
      '.settings-toggle', '.range-input', '.fallback-catalog',
    ]) {
      expect(css).toContain(s);
    }
  });

  it('uses REDA tokens and contains no raw hex colors', () => {
    expect(css).toContain('var(--reda-');
    // no #rgb / #rrggbb anywhere (tokens only)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });

  it('focus-info-modal and inspect-lightbox__drawer adapt to landscape mobile drawer (<=667px)', () => {
    const cssPath = resolve(__dirname, '../styles/reda-viewer.css');
    const cssContent = readFileSync(cssPath, 'utf8');
    const idx667 = cssContent.indexOf('max-width: 667px');
    expect(idx667).toBeGreaterThan(-1);
    const nextBlock = cssContent.slice(idx667, idx667 + 2500);
    expect(nextBlock).toContain('.focus-info-modal');
    expect(nextBlock).toContain('.inspect-lightbox__drawer');
    expect(nextBlock).toContain('border-radius: 0');
  });
});
