import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, AlertTriangle } from 'lucide-react';

const PORTAL_LINKS: Record<string, { label: string; path: string }> = {
    merchant: { label: 'Partner Portal', path: '/partner/login' },
    courier: { label: 'Rider Terminal', path: '/courier/login' },
    admin: { label: 'Admin Console', path: '/admin/login' },
};

export default function CustomerLayout() {
    const { user, profile, loading, signOut } = useAuth();

    const roles = profile?.roles || (profile?.role ? [profile.role] : []);
    const isCustomer = roles.includes('customer');
    const primaryRole = roles[0] || profile?.role || 'user';

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (e) {
            console.error('Sign out error:', e);
        } finally {
            const cookiePrefs = localStorage.getItem('muncheez_cookie_preferences');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('muncheez_admin_master');
            localStorage.removeItem('activeMerchantId');
            localStorage.removeItem('muncheez_user_addresses');
            localStorage.removeItem('muncheez_favorites');
            localStorage.removeItem('muncheez_notification_settings');
            localStorage.removeItem('muncheez_neighborhood');
            localStorage.removeItem('muncheez_delivery_notes');
            if (cookiePrefs) {
                localStorage.setItem('muncheez_cookie_preferences', cookiePrefs);
            }
            window.location.href = '/login';
        }
    };

    // Always render — allow seamless storefront browsing without role-blocking popups
    return <Outlet />;
}
