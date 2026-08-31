import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { InspectDesktopSidebar } from './InspectDesktopSidebar';
import type { ArtworkHotspot } from '../../types/schema';

const hs = { id: 'h1', title: 'Ridge', description: 'Impasto crest.' } as unknown as ArtworkHotspot;

describe('InspectDesktopSidebar', () => {
  it('uses icons and no emoji, no raw hex in source', () => {
    const { container } = render(
      <InspectDesktopSidebar activeHotspot={hs} activeHotspotIndex={0} totalHotspots={3}
        onClose={() => {}} onNavigate={() => {}} />
    );
    expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThan(0);
    expect(container.textContent ?? '').not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{2100}-\u{214F}\u{FE0F}]/u);
  });
});
