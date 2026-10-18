import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Profile modal guard.
 *
 * Tapping the account icon opens the Profile modal in all states:
 *   - Authenticated  -> shows full account management, orders, addresses
 *   - Unauthenticated -> shows a clean Apple-style guest view with direct Login & Sign Up actions
 */
export function useProfileGuard() {
  const { user, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [initialView, setInitialView] = useState<any>('main');

  const open = useCallback((view: any = 'main') => {
    setInitialView(view);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close, initialView, isAuthenticated: !!user, loading };
}

export default useProfileGuard;