import { useEffect, useRef } from 'react';
import { useToast, type Toast } from '../../context/ToastContext';
import { Icon, type IconName } from './Icon';

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    if (toast.duration && toast.duration > 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration);
    }
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [toast.id, toast.duration, onDismiss]);

  const getIconName = (): IconName => {
    switch (toast.type) {
      case 'success':
        return 'check';
      case 'error':
        return 'alertTriangle';
      case 'warning':
        return 'alertTriangle';
      case 'publish':
        return 'check';
      case 'info':
      default:
        return 'info';
    }
  };

  const isAlert = toast.type === 'error';

  return (
    <div
      className={`reda-toast reda-toast--${toast.type}`}
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
    >
      <span className="reda-toast__icon" aria-hidden="true">
        <Icon name={getIconName()} size={15} />
      </span>

      <div className="reda-toast__content">
        {toast.title && <h4 className="reda-toast__title">{toast.title}</h4>}
        <p className="reda-toast__msg">{toast.message}</p>

        {toast.action && (
          <div className="reda-toast__actions">
            <button
              type="button"
              className="reda-toast__action-btn"
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
            >
              <span>{toast.action.label}</span>
              <Icon name="arrowRight" size={12} />
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        className="reda-toast__close-btn"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="reda-toast-container" aria-label="Notifications" role="region">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
