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

const STATE_SCREEN_PATHS: Record<string, string> = {
    pending_approval: '/pending-approval',
    rejected: '/rejected',
    suspended: '/suspended',
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
                <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
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

    // ── STATE MACHINE ENFORCEMENT ────────────────────────────────────────────
    // 1. Unverified email → holding screen (Customer, Merchant, Rider)
    if (user.emailVerified === false) {
        return <Navigate to="/auth/verify" state={{ email: user.email, portal: requiredRole || 'customer' }} replace />;
    }

    // 2. Partner / Courier onboarding state machine
    const accountStatus = user.accountStatus || user.profile?.account_status || 'active';
    const isPartnerRole = requiredRole === 'merchant' || requiredRole === 'courier';
    const isOnboardingRoute =
        (requiredRole === 'merchant' && location.pathname === ONBOARDING_PATHS.merchant) ||
        (requiredRole === 'courier' && location.pathname === ONBOARDING_PATHS.courier);

    if (isPartnerRole) {
        if (accountStatus === 'pending_onboarding') {
            const onboardingPath = ONBOARDING_PATHS[requiredRole];
            if (!isOnboardingRoute) {
                return <Navigate to={onboardingPath} replace />;
            }
            return <>{children}</>;
        }

        if (accountStatus === 'pending_approval') {
            if (!isOnboardingRoute) {
                return <Navigate to={STATE_SCREEN_PATHS.pending_approval} replace />;
            }
            return <>{children}</>;
        }

        if (accountStatus === 'rejected' || accountStatus === 'suspended') {
            const target = STATE_SCREEN_PATHS[accountStatus] || STATE_SCREEN_PATHS.rejected;
            if (location.pathname !== target) {
                return <Navigate to={target} replace />;
            }
            return <>{children}</>;
        }
    }

    // 3. User is logged in but profile not loaded yet — wait
    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // 4. Role check
    if (requiredRole && !profile.roles?.includes(requiredRole)) {
        const loginPath = LOGIN_PATHS[requiredRole] || '/login';
        return <Navigate to={loginPath} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;