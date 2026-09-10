import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../../context/ToastContext';
import { ToastContainer } from './ToastContainer';

function TestConsumer() {
  const toast = useToast();

  return (
    <div>
      <button onClick={() => toast.success('Artwork saved successfully.')}>
        Trigger Success
      </button>
      <button onClick={() => toast.error('Failed to save settings.')}>
        Trigger Error
      </button>
      <button onClick={() => toast.info('Moved to storage.')}>
        Trigger Info
      </button>
      <button onClick={() => toast.warning('Unsaved changes.')}>
        Trigger Warning
      </button>
      <button
        onClick={() =>
          toast.publish('Exhibition published successfully.', {
            action: {
              label: 'View Live',
              onClick: vi.fn(),
            },
          })
        }
      >
        Trigger Publish
      </button>
    </div>
  );
}

describe('Toast Notification System', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders success toast when triggered and auto-dismisses after duration', () => {
    render(
      <ToastProvider>
        <TestConsumer />
        <ToastContainer />
      </ToastProvider>
    );

    expect(screen.queryByText('Artwork saved successfully.')).toBeNull();

    fireEvent.click(screen.getByText('Trigger Success'));

    const toastElement = screen.getByText('Artwork saved successfully.');
    expect(toastElement).toBeDefined();

    // Auto-dismiss after 3500ms
    act(() => {
      vi.advanceTimersByTime(3600);
    });

    expect(screen.queryByText('Artwork saved successfully.')).toBeNull();
  });

  it('renders error toast with alert role and dismiss button', () => {
    render(
      <ToastProvider>
        <TestConsumer />
        <ToastContainer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Error'));

    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
    expect(screen.getByText('Failed to save settings.')).toBeDefined();

    const closeButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(closeButton);

    expect(screen.queryByText('Failed to save settings.')).toBeNull();
  });

  it('renders celebratory publish toast with custom action button and executes onClick', () => {
    const onActionMock = vi.fn();

    function PublishConsumer() {
      const toast = useToast();
      return (
        <button
          onClick={() =>
            toast.publish('Exhibition published successfully.', {
              action: {
                label: 'View Live',
                onClick: onActionMock,
              },
            })
          }
        >
          Publish
        </button>
      );
    }

    render(
      <ToastProvider>
        <PublishConsumer />
        <ToastContainer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Publish'));

    expect(screen.getByText('Exhibition published successfully.')).toBeDefined();
    const actionBtn = screen.getByText('View Live');
    expect(actionBtn).toBeDefined();

    fireEvent.click(actionBtn);
    expect(onActionMock).toHaveBeenCalledTimes(1);
  });
});
