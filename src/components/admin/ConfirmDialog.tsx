import React, { ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  children,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmStyles = variant === 'danger'
    ? 'bg-danger text-white hover:bg-danger/90'
    : variant === 'warning'
      ? 'bg-warning text-ink-900 hover:bg-warning/90'
      : 'bg-ink-900 text-white hover:bg-ink-800';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-surface-card rounded-lg border border-ink-100 shadow-apple-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-danger-soft' : variant === 'warning' ? 'bg-warning-soft' : 'bg-ink-100'}`}>
              <AlertTriangle size={20} className={variant === 'danger' ? 'text-danger-ink' : variant === 'warning' ? 'text-warning-ink' : 'text-ink-500'} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-ink-900">{title}</h3>
              {message && <p className="text-xs text-ink-500 mt-1 leading-relaxed">{message}</p>}
              {children}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-ink-100 bg-ink-50/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 rounded-md transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); }}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${confirmStyles}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;