import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  children?: ReactNode;
}

const VARIANT_STYLES: Record<NonNullable<AdminButtonProps['variant']>, string> = {
  primary:   'bg-ink-900 text-white hover:bg-ink-800 border-transparent',
  secondary: 'bg-surface-card text-ink-700 border border-ink-200 hover:bg-ink-50',
  ghost:      'bg-transparent text-ink-600 hover:bg-ink-100 border-transparent',
  danger:     'bg-danger-soft text-danger-ink hover:bg-danger/10 border-transparent',
};

const SIZE_STYLES: Record<NonNullable<AdminButtonProps['size']>, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export function AdminButton({ variant = 'primary', size = 'md', icon: Icon, children, className = '', ...props }: AdminButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}

export default AdminButton;