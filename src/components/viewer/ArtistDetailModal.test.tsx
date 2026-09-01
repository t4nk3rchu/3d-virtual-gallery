import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ArtistDetailModal } from './ArtistDetailModal';
import type { Artist } from '../../types/schema';

const artist = { id: 'ar1', name: 'E. Marchetti', life_dates: '1928–1994',
  contact_info: 'Rome', biography: 'Bio.', quote: 'Colour is memory.' } as unknown as Artist;

describe('ArtistDetailModal', () => {
  it('renders icons and no emoji', () => {
    const { container } = render(<ArtistDetailModal artist={artist} onClose={() => {}} />);
    expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThan(0);
    expect(container.textContent ?? '').not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u);
  });
});
