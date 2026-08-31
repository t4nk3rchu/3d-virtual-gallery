import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudioApp } from './StudioApp';

function stubFetch(handler: (url: string) => unknown) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const body = handler(url);
    return { ok: body != null, json: async () => body, text: async () => '' } as Response;
  }));
}

describe('StudioApp shell', () => {
  beforeEach(() => stubFetch((url) => (url.includes('/api/auth/me') ? null : null)));
  afterEach(() => vi.unstubAllGlobals());

  it('renders the Login screen inside a REDA scope when unauthenticated', async () => {
    const { container } = render(<StudioApp />);
    // waits out the checking state
    expect(await screen.findByRole('link', { name: /Continue with Google|Sign in with Google/i })).toBeTruthy();
    expect(container.querySelector('.reda-dark, .login-page')).toBeTruthy();
  });

  it('renders dashboard with exhibitions in grid when authenticated', async () => {
    stubFetch((url) => {
      if (url.includes('/api/auth/me')) return { email: 'curator@gallery.com' };
      if (url.includes('/api/exhibitions')) {
        return [
          {
            id: 'ex-1',
            slug: 'lacquer-2026',
            title: 'Masterpieces of Lacquer',
            curator_name: 'Elena',
            is_published: 1,
            room: { name: 'Classic White Cube' },
            artworks: [],
            artists: [],
          },
        ];
      }
      return null;
    });

    const { container } = render(<StudioApp />);
    expect(await screen.findByText('Masterpieces of Lacquer')).toBeTruthy();
    expect(container.querySelector('.dgrid')).toBeTruthy();
    expect(container.querySelector('.dcard')).toBeTruthy();
    expect(screen.getByText(/Live/i)).toBeTruthy();
  });
});
