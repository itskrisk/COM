import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface PageHeaderAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: PageHeaderAction[];
  children?: ReactNode;
  className?: string;
}

const ACTION_STYLES: Record<NonNullable<PageHeaderAction['variant']>, string> = {
  primary:   'bg-ink-900 text-white hover:bg-ink-800',
  secondary: 'bg-surface-card text-ink-700 border border-ink-200 hover:bg-ink-50',
  danger:     'bg-danger-soft text-danger-ink hover:bg-danger/10',
};

export function PageHeader({ title, subtitle, actions, children, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 ${className}`}>
      <div className="min-w-0">
        <h1 className="admin-page-title">{title}</h1>
        {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions?.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${ACTION_STYLES[action.variant || 'primary']}`}
            >
              {Icon && <Icon size={16} />}
              {action.label}
            </button>
          );
        })}
        {children}
      </div>
    </div>
  );
}

export default PageHeader;