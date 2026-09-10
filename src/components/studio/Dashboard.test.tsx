import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
    expect(container.querySelector('.badge.b-draft')).toBeTruthy();
  });

  it('renders empty state when there are no exhibitions', async () => {
    stubFetch({
      '/api/auth/me': { id: 'u1', email: 'c@x.com', full_name: 'C', role: 'curator' },
      '/api/exhibitions': [],
    });
    const { container } = render(<StudioApp />);
    expect(await screen.findByText('You have no exhibitions yet')).toBeTruthy();
    expect(screen.getByText('Create your first exhibition')).toBeTruthy();
    expect(container.querySelector('.empty')).toBeTruthy();
  });

  it('requires 2-step confirmation before deleting an exhibition', async () => {
    const deleteFetch = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/me')) {
        return { ok: true, json: async () => ({ id: 'u1', email: 'c@x.com', full_name: 'C', role: 'curator' }), text: async () => '' } as Response;
      }
      if (url.includes('/api/exhibitions/e1') && init?.method === 'DELETE') {
        return { ok: true, json: async () => ({ ok: true }), text: async () => '' } as Response;
      }
      if (url.includes('/api/exhibitions')) {
        return { ok: true, json: async () => [{ id: 'e1', title: 'To Delete', slug: 'to-delete', is_published: 1 }], text: async () => '' } as Response;
      }
      return { ok: false } as Response;
    });
    vi.stubGlobal('fetch', deleteFetch);

    render(<StudioApp />);
    expect(await screen.findByText('To Delete')).toBeTruthy();

    const delBtn = screen.getByLabelText('Delete To Delete');
    expect(delBtn).toBeTruthy();

    // First click: arms the button
    act(() => {
      fireEvent.click(delBtn);
    });
    expect(delBtn.classList.contains('armed')).toBe(true);
    expect(delBtn.textContent).toContain('Confirm delete');
    expect(deleteFetch).not.toHaveBeenCalledWith('/api/exhibitions/e1', expect.objectContaining({ method: 'DELETE' }));

    // Second click: triggers delete
    await act(async () => {
      fireEvent.click(delBtn);
    });
    expect(deleteFetch).toHaveBeenCalledWith('/api/exhibitions/e1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('renders Share button on published exhibition cards and opens ShareModal on click', async () => {
    stubFetch({
      '/api/auth/me': { id: 'u1', email: 'c@x.com', full_name: 'C', role: 'curator' },
      '/api/exhibitions': [{ id: 'e1', title: 'Published Masterpiece', slug: 'masterpiece', is_published: 1 }],
    });
    render(<StudioApp />);
    expect(await screen.findByText('Published Masterpiece')).toBeTruthy();

    const shareBtn = screen.getByTitle('Share Published Masterpiece');
    expect(shareBtn).toBeTruthy();

    fireEvent.click(shareBtn);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Share Exhibition')).toBeTruthy();
    expect(screen.getAllByText('Published Masterpiece').length).toBeGreaterThanOrEqual(2);
  });
});
