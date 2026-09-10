import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'publish';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: ToastAction;
}

export interface ToastOptions {
  title?: string;
  duration?: number;
  action?: ToastAction;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  publish: (message: string, options?: ToastOptions) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3500,
  error: 6000,
  info: 3500,
  warning: 5000,
  publish: 6500,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = toast.duration ?? DEFAULT_DURATION[toast.type];

      const newToast: Toast = {
        ...toast,
        id,
        duration,
      };

      setToasts((prev) => {
        // Limit to max 4 active toasts to avoid screen clutter
        const next = [...prev, newToast];
        return next.length > 4 ? next.slice(next.length - 4) : next;
      });

      return id;
    },
    []
  );

  const success = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast({ type: 'success', message, ...options }),
    [addToast]
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast({ type: 'error', message, ...options }),
    [addToast]
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast({ type: 'info', message, ...options }),
    [addToast]
  );

  const warning = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast({ type: 'warning', message, ...options }),
    [addToast]
  );

  const publish = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast({ type: 'publish', message, ...options }),
    [addToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      addToast,
      dismissToast,
      clearToasts,
      success,
      error,
      info,
      warning,
      publish,
    }),
    [toasts, addToast, dismissToast, clearToasts, success, error, info, warning, publish]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
