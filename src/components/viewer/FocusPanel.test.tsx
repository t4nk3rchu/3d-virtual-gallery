import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FocusPanel } from './FocusPanel';
import type { Artwork } from '../../types/schema';

const artwork = {
  id: 'a1', title: 'Study in Ochre', artist: 'E. Marchetti', year: 1971,
  medium: 'Oil on linen', dimensions: '92 x 68 cm', description: 'A warm field.',
  artwork_type: 'IMAGE_2D', media_file_id: 'm1', updated_at: 1,
} as unknown as Artwork;

describe('FocusPanel', () => {
  it('renders icons and no emoji', () => {
    const { container } = render(
      <FocusPanel artwork={artwork} onInspect={() => {}} onClose={() => {}} />
    );
    expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThan(0);
    expect(container.textContent ?? '').not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{2100}-\u{214F}\u{FE0F}]/u);
  });
});
