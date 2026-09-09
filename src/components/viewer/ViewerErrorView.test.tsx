import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewerErrorView } from './ViewerErrorView';

describe('ViewerErrorView', () => {
  it('renders 404 not_found error state with return buttons and no kicker element', () => {
    const { container } = render(<ViewerErrorView type="not_found" />);

    expect(container.querySelector('.viewer-error-card__kicker')).toBeNull();
    expect(screen.getByText(/Exhibition Not Found|Không tìm thấy/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to Home|Quay lại/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Studio Login|Đăng nhập/i })).toHaveAttribute('href', '/studio');
  });

  it('renders 403 private salon error state with sign in CTA and no kicker', () => {
    const { container } = render(<ViewerErrorView type="private" />);

    expect(container.querySelector('.viewer-error-card__kicker')).toBeNull();
    expect(screen.getByText(/Private Exhibition|Triển lãm riêng tư/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign In|Đăng nhập/i })).toHaveAttribute('href', '/studio');
  });

  it('renders network error with retry button and calls onRetry when clicked', () => {
    const onRetry = vi.fn();
    const { container } = render(<ViewerErrorView type="network_error" onRetry={onRetry} />);

    expect(container.querySelector('.viewer-error-card__kicker')).toBeNull();
    expect(screen.getByText(/Connection Error|Lỗi kết nối/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Retry|Thử lại/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
