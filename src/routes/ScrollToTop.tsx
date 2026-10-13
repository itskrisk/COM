import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop — restores scroll position on client-side navigation.
 * Without this, SPA route changes (e.g. footer links) keep the
 * previous page's scroll offset. Mount once inside <BrowserRouter>.
 */
export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}
