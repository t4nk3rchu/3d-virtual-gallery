import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioApp } from './StudioApp';


const storage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => { for (const k in storage) delete storage[k]; },
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}

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

  it('toggles auth theme between light and dark and persists to localStorage', async () => {
    localStorage.clear();
    render(<StudioApp />);
    const loginPage = await screen.findByRole('main');
    expect(loginPage).toHaveAttribute('data-theme', 'light');

    const toggleBtn = screen.getByRole('button', { name: /Switch to dark theme/i });
    fireEvent.click(toggleBtn);

    expect(loginPage).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('reda-theme')).toBe('dark');

    const lightBtn = screen.getByRole('button', { name: /Switch to light theme/i });
    fireEvent.click(lightBtn);

    expect(loginPage).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('reda-theme')).toBe('light');
  });

  it('navigates from dashboard to account view and back', async () => {
    stubFetch((url) => {
      if (url.includes('/api/auth/me')) return { id: 'u1', email: 'curator@gallery.com', full_name: 'Elena Curator', role: 'curator' };
      if (url.includes('/api/exhibitions')) return [];
      return null;
    });

    render(<StudioApp />);
    expect(await screen.findByText('Your exhibitions')).toBeTruthy();

    const accountBtn = screen.getByRole('button', { name: /Manage your account/i });
    fireEvent.click(accountBtn);

    expect(await screen.findByText('Your account')).toBeTruthy();
    expect(screen.getByText('Personal information, curator profile, and security settings.')).toBeTruthy();

    const backBtn = screen.getByRole('button', { name: 'Back to dashboard' });
    fireEvent.click(backBtn);

    expect(await screen.findByText('Your exhibitions')).toBeTruthy();
  });

  it('renders New Exhibition form in light register and toggles custom space', async () => {
    stubFetch((url) => {
      if (url.includes('/api/auth/me')) return { email: 'curator@gallery.com' };
      if (url.includes('/api/exhibitions')) return [];
      if (url.includes('/api/rooms')) return [{ id: 'room-1', name: 'Classic Room', is_public: 1 }];
      return null;
    });

    const { container } = render(<StudioApp />);
    const newBtns = await screen.findAllByRole('button', { name: /New exhibition/i });
    await userEvent.click(newBtns[0]);

    expect(await screen.findByText('Create New Exhibition')).toBeTruthy();
    expect(container.querySelector('.studio-new-exhibition.reda-parch')).toBeTruthy();
    expect(container.querySelector('.studio-card[role="dialog"]')).toBeTruthy();

    // Toggle custom space
    const customSpaceBtn = screen.getByRole('button', { name: /Custom 3D Space/i });
    await userEvent.click(customSpaceBtn);
    expect(await screen.findByLabelText(/Custom Space Name/i)).toBeTruthy();

    // Cancel back to dashboard
    const cancelBtn = screen.getAllByRole('button', { name: /^Cancel$/i })[0];
    await userEvent.click(cancelBtn);
    expect(await screen.findByText('Your exhibitions')).toBeTruthy();
  });
});
