import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

export interface AdminDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
  className?: string;
}

const WIDTH_STYLES: Record<NonNullable<AdminDrawerProps['width']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function AdminDrawer({ open, onClose, title, subtitle, children, footer, width = 'md', className = '' }: AdminDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`absolute top-0 right-0 h-full ${WIDTH_STYLES[width]} bg-surface-card border-l border-ink-100 shadow-apple-lg flex flex-col ${className}`}
      >
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
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-ink-100 bg-ink-50/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDrawer;