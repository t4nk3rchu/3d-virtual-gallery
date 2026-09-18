import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Model360Viewer } from './Model360Viewer';

// Babylon needs no real WebGL for this smoke test: assert the loading chrome renders.
const artwork = {
  id: 'a1', artwork_type: 'MODEL_3D', media_file_id: 'full', model_proxy_file_id: 'p',
  title: 'Statue', artist: 'A', updated_at: 1,
} as any;

describe('Model360Viewer', () => {
  it('renders the loading state and a close button', () => {
    render(<Model360Viewer artwork={artwork} hotspots={[]} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /close|exit/i })).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
