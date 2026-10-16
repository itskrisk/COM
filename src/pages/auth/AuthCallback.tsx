import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const ROLE_DESTINATIONS: Record<string, string> = {
    customer: '/login',
    merchant: '/merchant/login',
    courier: '/rider/login',
    admin: '/admin/login',
};

type Status = 'loading' | 'success' | 'error';

export default function AuthCallback() {
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const [status, setStatus] = useState<Status>('loading');
    const [message, setMessage] = useState('Confirming your account...');

    useEffect(() => {
        let cancelled = false;

        async function handleCallback() {
            try {
                // 1. Check for PKCE exchange code in search query params
                const code = new URLSearchParams(window.location.search).get('code');
                if (code) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) throw exchangeError;
                }

                // 2. Check for token in URL hash
                const hash = window.location.hash;
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                const type = params.get('type');

                if (cancelled) return;

                if (accessToken && type === 'recovery') {
                    setStatus('success');
                    setMessage('Password reset link confirmed. Redirecting...');
                    setTimeout(() => {
                        if (!cancelled) navigate('/auth/reset-password', { replace: true });
                    }, 1500);
                    return;
                }

                // Refresh user state in AuthContext
                await refreshUser();

                const { data: { user: verifiedUser } } = await supabase.auth.getUser();
                if (!verifiedUser) {
                    setStatus('error');
                    setMessage('Session not found. Please sign in with your credentials.');
                    return;
                }

                const role = verifiedUser.user_metadata?.role || 'customer';
                const emailConfirmed = Boolean(verifiedUser.email_confirmed_at);

                if (!emailConfirmed) {
                    setStatus('error');
                    setMessage('Email not confirmed yet. Please click the link in your email again.');
                    return;
                }

                // Get profile for account_status routing
                const { data: profileRow } = await supabase
                    .from('profiles')
                    .select('account_status')
                    .eq('id', verifiedUser.id)
                    .maybeSingle();
                const accountStatus = profileRow?.account_status || 'pending_onboarding';

                setStatus('success');
                setMessage('Email verified successfully! Redirecting...');

                setTimeout(() => {
                    if (cancelled) return;

                    // Route by role + account state machine
                    if (role === 'customer') {
                        navigate('/login', { replace: true });
                    } else if (role === 'merchant') {
                        if (accountStatus === 'pending_approval') {
                            navigate('/pending-approval', { replace: true });
                        } else if (accountStatus === 'active' || accountStatus === 'APPROVED') {
                            navigate('/merchant/dashboard', { replace: true });
                        } else {
                            navigate('/merchant/login', { replace: true });
                        }
                    } else if (role === 'courier') {
                        if (accountStatus === 'pending_approval') {
                            navigate('/pending-approval', { replace: true });
                        } else if (accountStatus === 'active' || accountStatus === 'APPROVED') {
                            navigate('/rider/dashboard', { replace: true });
                        } else {
                            navigate('/rider/login', { replace: true });
                        }
                    } else {
                        navigate(ROLE_DESTINATIONS[role] || '/login', { replace: true });
                    }
                }, 1600);

            } catch (err: any) {
                if (!cancelled) {
                    setStatus('error');
                    setMessage(err.message || 'Something went wrong verifying your account. Please try signing in.');
                }
            }
        }

        handleCallback();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount only — user in deps causes infinite re-render loop

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
            <div className="max-w-md w-full text-center">
                <div className="mb-12">
                    <span className="font-heading font-bold text-3xl tracking-tighter text-gray-900">
                        Muncheez<span className="text-[#2563EB]">.</span>
                    </span>
                </div>

                <div className="flex justify-center mb-8">
                    {status === 'loading' && (
                        <div className="w-16 h-16 bg-blue-50 flex items-center justify-center">
                            <Loader2 className="text-[#2563EB] animate-spin" size={32} />
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="w-16 h-16 bg-green-50 flex items-center justify-center">
                            <CheckCircle className="text-green-600" size={32} />
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="w-16 h-16 bg-red-50 flex items-center justify-center">
                            <AlertCircle className="text-red-500" size={32} />
                        </div>
                    )}
                </div>

                <h1 className="text-3xl font-heading font-light text-gray-900 tracking-tight mb-4">
                    {status === 'loading' && 'Verifying your email...'}
                    {status === 'success' && 'Email Confirmed.'}
                    {status === 'error' && 'Verification Check'}
                </h1>

                <p className="text-sm text-gray-500 leading-relaxed mb-8">{message}</p>

                {status === 'success' && (
                    <div className="w-full bg-gray-100 h-0.5 overflow-hidden">
                        <div
                            className="h-full bg-[#2563EB] transition-all"
                            style={{ animation: 'progress-fill 1.6s linear forwards' }}
                        />
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col gap-3 mt-6">
                        <a
                            href="/login"
                            className="w-full py-4 px-6 text-xs font-mono uppercase tracking-widest text-white bg-black hover:bg-[#2563EB] transition-colors text-center block"
                        >
                            Continue to Login
                        </a>
                        <a
                            href="/signup"
                            className="w-full py-4 px-6 text-xs font-mono uppercase tracking-widest text-gray-600 border border-gray-200 hover:border-black transition-colors text-center block"
                        >
                            Sign Up Again
                        </a>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes progress-fill {
                    from { width: 0% }
                    to { width: 100% }
                }
            `}</style>
        </div>
    );
}