import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

export interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_STYLES: Record<NonNullable<AdminModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function AdminModal({ open, onClose, title, subtitle, children, footer, size = 'md', className = '' }: AdminModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${SIZE_STYLES[size]} bg-surface-card rounded-lg border border-ink-100 shadow-apple-lg overflow-hidden flex flex-col max-h-[92vh] ${className}`}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-ink-100">
            <div className="min-w-0">
              {title && <h2 className="text-base font-bold text-ink-900 truncate">{title}</h2>}
              {subtitle && <p className="text-xs text-ink-400 mt-0.5 truncate">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 text-ink-400 hover:text-ink-900 hover:bg-ink-100 rounded-md transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-100 bg-ink-50/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminModal;