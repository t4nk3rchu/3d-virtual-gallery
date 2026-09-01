import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { IntroVideoLoader } from './IntroVideoLoader';

describe('IntroVideoLoader', () => {
  it('uses icons, not emoji, in its chrome', () => {
    const { container } = render(
      <IntroVideoLoader videoFileId="x" isSceneReady onEnterGallery={() => {}} />
    );
    expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThan(0);
    expect(container.textContent ?? '').not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});
