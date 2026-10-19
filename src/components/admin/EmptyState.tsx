import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title = 'Nothing here yet', description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-ink-50 flex items-center justify-center mb-4">
          <Icon size={26} className="text-ink-300" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-ink-700">{title}</h3>
      {description && <p className="text-xs text-ink-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default EmptyState;