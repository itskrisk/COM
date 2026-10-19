import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
      <Loader2 size={28} className="text-ink-300 animate-spin mb-3" />
      <p className="text-xs text-ink-400 font-medium">{message}</p>
    </div>
  );
}

export default LoadingState;