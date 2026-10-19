import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: string;
  isPositive?: boolean;
  icon?: LucideIcon;
  tone?: 'ink' | 'accent' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

const TONE_STYLES: Record<NonNullable<StatCardProps['tone']>, string> = {
  ink:      'text-ink-900',
  accent:   'text-accent',
  success:  'text-success-ink',
  warning:  'text-warning-ink',
  danger:   'text-danger-ink',
};

export function StatCard({ label, value, subValue, change, isPositive, icon: Icon, tone = 'ink', onClick }: StatCardProps) {
  const clickable = !!onClick;
  const Wrapper = clickable ? 'button' : 'div';

  return (
    <Wrapper
      type={clickable ? 'button' : undefined}
      onClick={onClick}
      className={`text-left w-full rounded-lg border border-ink-100 bg-surface-card px-5 py-4 transition-colors hover:border-ink-200 ${clickable ? 'hover:bg-ink-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-ink-400 uppercase tracking-wide truncate">{label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className={`text-2xl font-bold tracking-tight text-ink-900 ${change ? 'mr-1' : ''}`}>{value}</p>
            {change && (
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${isPositive ? 'bg-success-soft text-success-ink' : 'bg-danger-soft text-danger-ink'}`}>
                {isPositive ? '↑' : '↓'} {change}
              </span>
            )}
          </div>
          {subValue && <p className="text-[11px] text-ink-400 mt-1 font-medium">{subValue}</p>}
        </div>
        {Icon && (
          <div className={`shrink-0 w-9 h-9 rounded-lg bg-ink-50 flex items-center justify-center ${TONE_STYLES[tone]}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </Wrapper>
  );
}

export default StatCard;