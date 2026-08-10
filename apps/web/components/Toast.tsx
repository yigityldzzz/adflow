'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

// Global toast state
let addToastFn: ((toast: Omit<ToastMessage, 'id'>) => void) | null = null;

export function toast(message: Omit<ToastMessage, 'id'>) {
  if (addToastFn) {
    addToastFn(message);
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastFn = (message) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { ...message, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    return () => {
      addToastFn = null;
    };
  }, []);

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success" />,
    error: <XCircle className="w-5 h-5 text-error" />,
    warning: <AlertCircle className="w-5 h-5 text-warning" />,
    info: <AlertCircle className="w-5 h-5 text-primary" />,
  };

  const borders = {
    success: 'border-l-success',
    error: 'border-l-error',
    warning: 'border-l-warning',
    info: 'border-l-primary',
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 bg-card border border-border border-l-4 ${borders[t.type]} rounded-lg p-4 shadow-2xl min-w-[320px] max-w-[420px] toast-enter`}
        >
          {icons[t.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">{t.title}</p>
            {t.description && (
              <p className="text-xs text-text-secondary mt-0.5">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => remove(t.id)}
            className="text-text-muted hover:text-text-secondary transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
