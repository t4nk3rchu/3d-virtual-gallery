import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Account, type CuratorUser } from './Account';
import { ToastProvider } from '../../context/ToastContext';
import { ToastContainer } from '../ui';

const mockUser: CuratorUser = {
  id: 'user-123',
  email: 'curator@example.com',
  full_name: 'Nguyen Van A',
  role: 'curator',
};

function renderWithToast(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      {ui}
      <ToastContainer />
    </ToastProvider>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Account component', () => {
  it('renders profile information and security panel matching the light register design', () => {
    renderWithToast(<Account user={mockUser} onBack={vi.fn()} />);

    expect(screen.getByText('Your account')).toBeTruthy();
    expect(screen.getByText('Profile information')).toBeTruthy();
    expect(screen.getByText('Security')).toBeTruthy();

    const nameInput = screen.getByLabelText('Full name') as HTMLInputElement;
    expect(nameInput.value).toBe('Nguyen Van A');
    expect(nameInput.readOnly).toBe(true);

    const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
    expect(emailInput.value).toBe('curator@example.com');
    expect(emailInput.readOnly).toBe(true);

    expect(screen.getByText('N')).toBeTruthy(); // Initial avatar
  });

  it('disables submit button and shows error when passwords mismatch', () => {
    renderWithToast(<Account user={mockUser} onBack={vi.fn()} />);

    const currentInput = screen.getByLabelText('Current password');
    const newInput = screen.getByLabelText('New password');
    const confirmInput = screen.getByLabelText('Confirm new password');
    const submitBtn = screen.getByRole('button', { name: 'Change password' });

    // Initially disabled because fields are empty
    expect(submitBtn).toBeDisabled();

    fireEvent.change(currentInput, { target: { value: 'oldpass123' } });
    fireEvent.change(newInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'passwordXYZ' } });

    expect(screen.getByText("Passwords don't match.")).toBeTruthy();
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit button when passwords match and are at least 8 characters', () => {
    renderWithToast(<Account user={mockUser} onBack={vi.fn()} />);

    const currentInput = screen.getByLabelText('Current password');
    const newInput = screen.getByLabelText('New password');
    const confirmInput = screen.getByLabelText('Confirm new password');
    const submitBtn = screen.getByRole('button', { name: 'Change password' });

    fireEvent.change(currentInput, { target: { value: 'oldpass123' } });
    fireEvent.change(newInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });

    expect(screen.queryByText("Passwords don't match.")).toBeNull();
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls POST /api/auth/change-password and displays success toast on valid submit', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/auth/change-password')) {
        return {
          ok: true,
          json: async () => ({ ok: true }),
        } as Response;
      }
      return { ok: false } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithToast(<Account user={mockUser} onBack={vi.fn()} />);

    const currentInput = screen.getByLabelText('Current password') as HTMLInputElement;
    const newInput = screen.getByLabelText('New password') as HTMLInputElement;
    const confirmInput = screen.getByLabelText('Confirm new password') as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: 'Change password' });

    fireEvent.change(currentInput, { target: { value: 'oldpass123' } });
    fireEvent.change(newInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu đã được cập nhật thành công.')).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/change-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          current_password: 'oldpass123',
          new_password: 'newpassword123',
        }),
      })
    );

    // Inputs cleared on success
    expect(currentInput.value).toBe('');
    expect(newInput.value).toBe('');
    expect(confirmInput.value).toBe('');
  });

  it('displays server error toast when endpoint returns error', async () => {
    const fetchMock = vi.fn(async () => {
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid current password' }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithToast(<Account user={mockUser} onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'wrongpass' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpassword123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid current password')).toBeTruthy();
    });
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    renderWithToast(<Account user={mockUser} onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
