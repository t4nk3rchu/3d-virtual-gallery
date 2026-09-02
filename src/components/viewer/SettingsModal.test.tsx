import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SettingsModal, DEFAULT_VIEWER_SETTINGS } from './SettingsModal';

describe('SettingsModal', () => {
  it('renders icons and no emoji', () => {
    const { container } = render(
      <SettingsModal settings={DEFAULT_VIEWER_SETTINGS} onChange={() => {}} onClose={() => {}} />
    );
    expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThan(0);
    expect(container.textContent ?? '').not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u);
  });

  it('supports controlMode in settings and renders mode toggle', () => {
    expect(DEFAULT_VIEWER_SETTINGS.controlMode).toBe('gallery');
    const { getByText } = render(
      <SettingsModal settings={DEFAULT_VIEWER_SETTINGS} onChange={() => {}} onClose={() => {}} />
    );
    expect(getByText(/Camera Control Mode/i)).toBeDefined();
  });
});
