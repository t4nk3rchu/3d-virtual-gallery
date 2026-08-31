import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudioApp } from './StudioApp';

function stubFetch(map: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const key = Object.keys(map).find((k) => url.includes(k));
    const body = key ? map[key] : null;
    return { ok: body != null, json: async () => body, text: async () => '' } as Response;
  }));
}
afterEach(() => vi.unstubAllGlobals());

describe('Dashboard (redesigned)', () => {
  it('renders exhibition cards with slug and status in the REDA dash layout', async () => {
    stubFetch({
      '/api/auth/me': { id: 'u1', email: 'c@x.com', full_name: 'C', role: 'curator' },
      '/api/exhibitions': [{ id: 'e1', title: 'Testing GLB Room', slug: 'glb-room', is_published: 0 }],
    });
    const { container } = render(<StudioApp />);
    expect(await screen.findByText('Testing GLB Room')).toBeTruthy();
    expect(screen.getByText('/e/glb-room')).toBeTruthy();
    expect(container.querySelector('.dgrid')).toBeTruthy();
  });
});
