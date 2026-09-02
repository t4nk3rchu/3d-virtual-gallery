import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewerErrorView } from './ViewerErrorView';

describe('ViewerErrorView', () => {
  it('renders 404 not_found error state with return buttons', () => {
    render(<ViewerErrorView type="not_found" />);

    expect(screen.getByText(/ERROR 404/i)).toBeInTheDocument();
    expect(screen.getByText('Exhibition Folio Not Found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to Safety/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Curator Atelier Login/i })).toHaveAttribute('href', '/login');
  });

  it('renders 403 private salon error state with sign in CTA', () => {
    render(<ViewerErrorView type="private" />);

    expect(screen.getByText(/ACCESS REQUIRED/i)).toBeInTheDocument();
    expect(screen.getByText('Private Exhibition in Curation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign In with Curator Credentials/i })).toHaveAttribute('href', '/login');
  });

  it('renders network error with retry button and calls onRetry when clicked', () => {
    const onRetry = vi.fn();
    render(<ViewerErrorView type="network_error" onRetry={onRetry} />);

    expect(screen.getByText('Archival Vault Unreachable')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Retry Connection/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
