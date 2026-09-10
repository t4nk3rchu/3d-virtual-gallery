// src/components/studio/ArtworkForm.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ArtworkForm } from './ArtworkForm';
import { ToastProvider } from '../../context/ToastContext';
import { ToastContainer } from '../ui';

function renderWithToast(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      {ui}
      <ToastContainer />
    </ToastProvider>
  );
}

describe('ArtworkForm', () => {
  it('renders ArtworkForm fields when artwork prop is provided', () => {
    renderWithToast(
      <ArtworkForm
        artwork="new"
        exhibitionId="exh-1"
        artists={[]}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('2D Painting / Image')).toBeDefined();
    expect(screen.getByText('Room Placement')).toBeDefined();
  });

  it('renders Frame & Placard settings for Video artworks', async () => {
    renderWithToast(
      <ArtworkForm
        artwork={{
          id: 'v1',
          exhibition_id: 'exh-1',
          title: 'Video Work',
          artist: 'Artist',
          artwork_type: 'VIDEO',
          youtube_video_id: '12345678901',
          media_file_id: null,
          artist_id: null,
          year: null,
          medium: null,
          dimensions: null,
          description: null,
          audio_guide_file_id: null,
          transform_json: '{}',
          frame_config_json: JSON.stringify({ frameType: 'gold', frameWidth: 0.05, matWidth: 0.03, showPlacard: true }),
          order_index: 0,
          updated_at: 1000,
        }}
        exhibitionId="exh-1"
        artists={[]}
        embedded
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Frame & Placard Settings')).toBeDefined();
    expect(screen.getByLabelText('Display Wall Placard under artwork')).toBeDefined();
    expect((screen.getByLabelText('Display Wall Placard under artwork') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Frame Material') as HTMLSelectElement).value).toBe('gold');
  });

  it('orders footer actions as Cancel -> Delete -> Save Changes when embedded in inspector', () => {
    renderWithToast(
      <ArtworkForm
        artwork={{
          id: 'art-1',
          exhibition_id: 'exh-1',
          title: 'Testing Artwork',
          artist: 'Artist',
          artwork_type: 'IMAGE_2D',
          youtube_video_id: null,
          media_file_id: 'img-1',
          artist_id: null,
          year: '2024',
          medium: 'Digital',
          dimensions: null,
          description: null,
          audio_guide_file_id: null,
          transform_json: '{}',
          frame_config_json: '{}',
          order_index: 0,
          updated_at: 1000,
        }}
        exhibitionId="exh-1"
        artists={[]}
        embedded
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const buttons = Array.from(document.querySelectorAll('.artwork-form-actions button'));
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    expect(buttons[0].textContent).toMatch(/Cancel/i);
    expect(buttons[1].textContent).toMatch(/Delete/i);
    expect(buttons[2].textContent).toMatch(/Save Changes/i);
  });
});

