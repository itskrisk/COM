import { Navigate, useLocation } from 'react-router-dom';

/**
 * LegacyRedirect — permanent compatibility redirect for pre-restructure URLs.
 * Preserves query parameters (e.g. /c/stores?v=market → /stores?v=market).
 * All legacy routes are declared in App.tsx in the "LEGACY REDIRECTS" section
 * with an inline old → new mapping. Do not add new routes here.
 */
export default function LegacyRedirect({ to }: { to: string }) {
    const location = useLocation();
    return <Navigate to={`${to}${location.search}`} replace />;
}
