import React from 'react';

export interface StatusConfig {
  label: string;
  tone: 'pending' | 'approved' | 'rejected' | 'suspended' | 'active' | 'inactive' | 'busy' | 'online' | 'offline' | 'neutral' | 'completed' | 'cancelled' | 'failed' | 'in-progress' | 'draft' | 'info';
}

const TONE_STYLES: Record<StatusConfig['tone'], string> = {
  pending:      'bg-ink-100 text-ink-500',
  approved:     'bg-success-soft text-success-ink',
  rejected:     'bg-danger-soft text-danger-ink',
  suspended:    'bg-ink-100 text-ink-500',
  active:       'bg-success-soft text-success-ink',
  inactive:     'bg-ink-100 text-ink-400',
  busy:         'bg-warning-soft text-warning-ink',
  online:       'bg-success-soft text-success-ink',
  offline:      'bg-ink-100 text-ink-400',
  neutral:      'bg-ink-100 text-ink-500',
  completed:    'bg-success-soft text-success-ink',
  cancelled:    'bg-ink-100 text-ink-400',
  failed:       'bg-danger-soft text-danger-ink',
  'in-progress':'bg-warning-soft text-warning-ink',
  draft:        'bg-ink-100 text-ink-400',
  info:         'bg-accent-soft text-accent',
};

export function StatusBadge({ status, tone, label }: { status?: string; tone?: StatusConfig['tone']; label?: string }) {
  const resolvedTone = tone || (status ? (statusMap[status.toUpperCase()] || 'neutral') : 'neutral');
  const display = label || (status ? status.replace(/_/g, ' ') : '');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${TONE_STYLES[resolvedTone]}`}>
      {display}
    </span>
  );
}

const statusMap: Record<string, StatusConfig['tone']> = {
  CREATED: 'neutral',
  PENDING: 'pending',
  PENDING_APPROVAL: 'pending',
  UNDER_REVIEW: 'pending',
  APPROVED: 'approved',
  ACTIVE: 'active',
  LIVE: 'active',
  COMPLETED: 'completed',
  DELIVERED: 'completed',
  DELIVER: 'completed',
  IN_PROGRESS: 'in-progress',
  INPROGRESS: 'in-progress',
  RESOLVED: 'approved',
  CANCELLED: 'cancelled',
  CANCELED: 'cancelled',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  SUSPEND: 'suspended',
  FAILED: 'failed',
  BUSY: 'busy',
  ONLINE: 'online',
  OFFLINE: 'offline',
  DRAFT: 'draft',
  OPEN: 'pending',
  CLOSED: 'neutral',
  JOINED: 'approved',
  INVITED: 'info',
  WAITING: 'pending',
  NEW: 'info',
  FREQUENT: 'info',
};

export default StatusBadge;