import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Workbench } from './Workbench';

const EX = {
  id: 'e1',
  title: 'Testing GLB Room',
  slug: 'glb-room',
  is_published: 0,
  room: { id: 'r1', name: 'The Salon' },
  artworks: [],
  artists: [],
  curation_type: 'solo',
};

function stub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const body = url.includes('/api/rooms')
        ? [{ id: 'r1', name: 'The Salon', is_public: 1 }]
        : url.includes('/api/exhibitions/e1')
        ? EX
        : null;
      return { ok: true, json: async () => body, text: async () => '' } as Response;
    }),
  );
}
afterEach(() => vi.unstubAllGlobals());

describe('Workbench shell', () => {
  it('renders top bar, rail, viewport and status once loaded', async () => {
    stub();
    const { container } = render(<Workbench exhibitionId="e1" onBack={() => {}} />);
    expect(await screen.findByText('Testing GLB Room')).toBeTruthy();
    expect(container.querySelector('.wb-rail')).toBeTruthy();
    expect(container.querySelector('.wb-view')).toBeTruthy();
    expect(container.querySelector('.wb-status')).toBeTruthy();
  });

  it('switches mode via the pill', async () => {
    stub();
    render(<Workbench exhibitionId="e1" onBack={() => {}} />);
    await screen.findByText('Testing GLB Room');
    const waypoints = screen.getByRole('button', { name: /Waypoints/i });
    await userEvent.click(waypoints);
    expect(waypoints.getAttribute('aria-pressed')).toBe('true');
  });
});
