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

                const emailConfirmed = Boolean(verifiedUser.email_confirmed_at);
                if (!emailConfirmed) {
                    setStatus('error');
                    setMessage('Email not confirmed yet. Please click the link in your email again.');
                    return;
                }

                // Deep check: resolve role from metadata, profiles, merchants, or riders tables
                let detectedRole = verifiedUser.user_metadata?.role;

                // 1. Check profiles
                const { data: profileRow } = await supabase
                    .from('profiles')
                    .select('account_status, roles, role')
                    .eq('id', verifiedUser.id)
                    .maybeSingle();

                if (!detectedRole) {
                    if (profileRow?.role) {
                        detectedRole = profileRow.role;
                    } else if (profileRow?.roles && profileRow.roles.length > 0) {
                        detectedRole = profileRow.roles[0];
                    }
                }

                // 2. Check merchants table
                const { data: merchantRow } = await supabase
                    .from('merchants')
                    .select('status, onboarding_completed')
                    .eq('id', verifiedUser.id)
                    .maybeSingle();

                if (merchantRow) {
                    detectedRole = 'merchant';
                }

                // 3. Check riders table
                const { data: riderRow } = await supabase
                    .from('riders')
                    .select('status, onboarding_completed')
                    .eq('id', verifiedUser.id)
                    .maybeSingle();

                if (riderRow) {
                    detectedRole = 'courier';
                }

                // Default fallback
                const role = detectedRole || 'customer';
                const accountStatus = profileRow?.account_status || 'pending_onboarding';

                // Sync phone, full name, and role to guarantee Supabase persistence
                const verifiedPhone = verifiedUser.user_metadata?.phone;
                const verifiedFullName = verifiedUser.user_metadata?.full_name || verifiedUser.email?.split('@')[0];

                if (verifiedPhone) {
                    const { error: profileUpdateError } = await supabase.from('profiles').update({
                        phone: verifiedPhone,
                        full_name: verifiedFullName,
                        status: 'ACTIVE'
                    }).eq('id', verifiedUser.id);
                    if (profileUpdateError) {
                        setStatus('error');
                        setMessage('Email verified, but saving your profile failed. Please sign in and update your profile.');
                        return;
                    }
                } else if (verifiedFullName) {
                    const { error: profileUpdateError } = await supabase.from('profiles').update({
                        full_name: verifiedFullName,
                        status: 'ACTIVE'
                    }).eq('id', verifiedUser.id);
                    if (profileUpdateError) {
                        setStatus('error');
                        setMessage('Email verified, but saving your profile failed. Please sign in and update your profile.');
                        return;
                    }
                }

                fetch('/api/auth/sync-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: verifiedUser.id,
                        email: verifiedUser.email,
                        phone: verifiedPhone,
                        fullName: verifiedFullName,
                        role
                    })
                }).catch(() => {});

                setStatus('success');
                setMessage('Email verified successfully! Directing you to your portal...');

                setTimeout(() => {
                    if (cancelled) return;

                    // Route by detected role and portal status
                    if (role === 'merchant') {
                        const isApproved = merchantRow?.status === 'APPROVED';
                        // Only show pending-approval AFTER onboarding has been submitted
                        const onboardingDone = Boolean(merchantRow?.onboarding_completed);
                        const isPending = onboardingDone && !isApproved;
                        
                        if (isApproved) {
                            navigate('/merchant/dashboard', { replace: true });
                        } else if (isPending) {
                            navigate('/pending-approval', { replace: true });
                        } else {
                            // First time after email verify — go to onboarding
                            navigate('/merchant/login', { replace: true });
                        }
                    } else if (role === 'courier' || role === 'rider') {
                        const isApproved = riderRow?.status === 'APPROVED';
                        // Only show pending-approval AFTER onboarding has been submitted
                        const onboardingDone = Boolean(riderRow?.onboarding_completed);
                        const isPending = onboardingDone && !isApproved;
                        
                        if (isApproved) {
                            navigate('/rider/dashboard', { replace: true });
                        } else if (isPending) {
                            navigate('/pending-approval', { replace: true });
                        } else {
                            // First time after email verify — go to rider login
                            navigate('/rider/login', { replace: true });
                        }
                    } else if (role === 'admin') {
                        navigate('/admin/dashboard', { replace: true });
                    } else {
                        // Customer
                        navigate('/login', { replace: true, state: { verified: true } });
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
                            className="w-full py-3.5 px-6 text-xs font-mono uppercase tracking-widest text-white bg-black hover:bg-[#2563EB] transition-colors text-center block"
                        >
                            Customer Login
                        </a>
                        <div className="grid grid-cols-2 gap-2">
                            <a
                                href="/merchant/login"
                                className="py-3 px-3 text-[11px] font-mono uppercase tracking-wider text-gray-700 border border-gray-200 hover:border-black transition-colors text-center block"
                            >
                                Merchant Login
                            </a>
                            <a
                                href="/rider/login"
                                className="py-3 px-3 text-[11px] font-mono uppercase tracking-wider text-gray-700 border border-gray-200 hover:border-black transition-colors text-center block"
                            >
                                Rider Login
                            </a>
                        </div>
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