import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppRole } from '../context/AuthContext';

const LOGIN_PATHS: Record<string, string> = {
    customer: '/login',
    merchant: '/merchant/login',
    courier: '/rider/login',
    admin: '/admin/login',
};

const ONBOARDING_PATHS: Record<string, string> = {
    merchant: '/merchant/onboarding',
    courier: '/rider/onboarding',
};

const ADMIN_SESSION_KEY = 'muncheez_admin_session';

const isAdminSessionValid = (): boolean => {
    try {
        const session = sessionStorage.getItem(ADMIN_SESSION_KEY);
        if (!session) return false;
        const { expiry } = JSON.parse(session);
        return Date.now() < expiry;
    } catch {
        return false;
    }
};

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: AppRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const { user, profile, loading } = useAuth();
    const location = useLocation();

    // Wait for auth to initialize
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Admin: check hardcoded session first
    if (requiredRole === 'admin') {
        if (!isAdminSessionValid()) {
            return <Navigate to={LOGIN_PATHS.admin} state={{ from: location }} replace />;
        }
        return <>{children}</>;
    }

    // No user at all — send to the appropriate login page
    if (!user) {
        const loginPath = requiredRole ? (LOGIN_PATHS[requiredRole] || '/login') : '/login';
        return <Navigate to={loginPath} state={{ from: location }} replace />;
    }

    // Email confirmation gate: unverified accounts cannot reach protected pages
    if (user.emailVerified === false) {
        return <Navigate to="/auth/verify" replace />;
    }

    // User is logged in but profile not loaded yet — wait
    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
                <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Role check: The silo layouts handle the UX for wrong-role users who
    // navigate to a portal *page*. ProtectedRoute handles blocking access
    // to the actual *dashboards* — so we redirect to the correct login for
    // the required role, not the user's own dashboard, to avoid ping-ponging.
    if (requiredRole && !profile.roles?.includes(requiredRole)) {
        const loginPath = LOGIN_PATHS[requiredRole] || '/login';
        return <Navigate to={loginPath} replace />;
    }

    // Onboarding status enforcement for merchant and courier roles
    if (requiredRole === 'merchant' || requiredRole === 'courier') {
        const onboardingPath = ONBOARDING_PATHS[requiredRole];
        const merchantData = (user as any)?.merchant;
        const riderData = (user as any)?.rider;
        const status = requiredRole === 'merchant'
            ? merchantData?.status
            : riderData?.status;

        // If onboarding not completed, redirect to onboarding
        if (status === 'PENDING' || status === 'VERIFICATION_PENDING' || status === 'UNDER_REVIEW') {
            // Allow access to onboarding page itself
            if (location.pathname !== onboardingPath) {
                return <Navigate to={onboardingPath} replace />;
            }
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;