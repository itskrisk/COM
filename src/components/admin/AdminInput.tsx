import React, { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

type AdminInputVariant = 'line' | 'filled' | 'ghost';

export interface AdminInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  variant?: AdminInputVariant;
  wrapperClassName?: string;
}

export function AdminInput({
  label,
  error,
  hint,
  icon: Icon,
  iconPosition = 'left',
  variant = 'line',
  wrapperClassName = '',
  className = '',
  id,
  ...props
}: AdminInputProps) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

  const baseStyles = variant === 'line'
    ? 'w-full px-0 py-2.5 bg-transparent border-0 border-b border-ink-200 text-sm text-ink-800 placeholder-ink-300 focus:outline-none focus:border-accent transition-colors disabled:bg-transparent disabled:cursor-not-allowed'
    : variant === 'filled'
      ? 'w-full px-3.5 py-2.5 bg-ink-50 border border-ink-100 rounded-md text-sm text-ink-800 placeholder-ink-300 focus:outline-none focus:border-accent focus:bg-surface-card transition-colors disabled:bg-ink-100 disabled:cursor-not-allowed'
      : 'w-full px-3.5 py-2.5 bg-transparent border border-transparent rounded-md text-sm text-ink-800 placeholder-ink-300 focus:outline-none focus:border-ink-300 focus:bg-ink-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-ink-500 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && iconPosition === 'left' && (
          <Icon size={16} className="text-ink-300 mr-2 shrink-0" aria-hidden />
        )}
        <input id={inputId} className={[baseStyles, className].filter(Boolean).join(' ')} {...props} />
        {Icon && iconPosition === 'right' && (
          <Icon size={16} className="text-ink-300 ml-2 shrink-0" aria-hidden />
        )}
      </div>
      {error && <p className="text-xs text-danger-ink font-medium">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export interface AdminTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export function AdminTextarea({ label, error, hint, wrapperClassName = '', className = '', id, ...props }: AdminTextareaProps) {
  const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-ink-500 uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full px-0 py-2.5 bg-transparent border-0 border-b border-ink-200 text-sm text-ink-800 placeholder-ink-300 focus:outline-none focus:border-accent transition-colors resize-none disabled:bg-transparent disabled:cursor-not-allowed ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger-ink font-medium">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export default AdminInput;