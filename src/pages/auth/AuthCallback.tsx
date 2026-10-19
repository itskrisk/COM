import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { adminSupabase } from '../../lib/adminSupabase';
import { useAuth } from '../../context/AuthContext';

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
                const searchParams = new URLSearchParams(window.location.search);
                const code = searchParams.get('code');
                const tokenHash = searchParams.get('token_hash');
                const typeParam = searchParams.get('type');

                // ── Step 1: Try to establish a session from URL params or hash ───────

                // Legacy/Implicit flow: Supabase sends access_token & refresh_token in URL hash
                const hash = window.location.hash;
                const hashParams = new URLSearchParams(hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const hashType = hashParams.get('type');

                if (cancelled) return;

                // Password reset is a special case — redirect to reset page
                if (accessToken && hashType === 'recovery') {
                    setStatus('success');
                    setMessage('Password reset link confirmed. Redirecting...');
                    setTimeout(() => {
                        if (!cancelled) navigate('/auth/reset-password', { replace: true });
                    }, 1500);
                    return;
                }

                // If tokens are present in the hash, set session explicitly immediately
                if (accessToken && refreshToken) {
                    try {
                        const { error: setErr } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        });
                        if (setErr) {
                            console.warn('[AuthCallback] setSession notice:', setErr.message);
                        }
                    } catch (err: any) {
                        console.warn('[AuthCallback] setSession exception:', err.message);
                    }
                }

                // PKCE code flow (Supabase sends ?code= when PKCE is used)
                if (code) {
                    try {
                        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                        if (exchangeError) {
                            console.warn('[AuthCallback] PKCE exchange notice:', exchangeError.message);
                        }
                    } catch (err: any) {
                        console.warn('[AuthCallback] PKCE exception:', err.message);
                    }
                }

                // OTP / token_hash flow (Supabase sends ?token_hash=&type=signup or type=email)
                if (tokenHash) {
                    const otpType = (typeParam === 'email' || typeParam === 'signup' || typeParam === 'magiclink') 
                        ? typeParam 
                        : 'signup';
                    try {
                        const { error: otpError } = await supabase.auth.verifyOtp({
                            token_hash: tokenHash,
                            type: otpType as any
                        });
                        if (otpError) {
                            console.warn('[AuthCallback] OTP verify notice:', otpError.message);
                        }
                    } catch (err: any) {
                        console.warn('[AuthCallback] OTP verify exception:', err.message);
                    }
                }

                // ── Step 2: Get the current session (most reliable post-exchange) ──

                // Give Supabase client a brief moment to finish setting session
                await new Promise(res => setTimeout(res, 250));

                const { data: { session } } = await supabase.auth.getSession();
                let verifiedUser = session?.user ?? null;

                // If session is still null, try getUser() as a fallback (handles edge-cases)
                if (!verifiedUser) {
                    const { data: { user: directUser } } = await supabase.auth.getUser();
                    verifiedUser = directUser ?? null;
                }

                if (cancelled) return;

                if (!verifiedUser) {
                    setStatus('error');
                    setMessage('Session not found or link has expired. Please sign in with your credentials to access your portal.');
                    return;
                }

                // ── Step 3: Refresh AuthContext state ────────────────────────────
                await refreshUser();

                // ── Step 4: Resolve the user's role ──────────────────────────────
                let detectedRole = verifiedUser.user_metadata?.role as string | undefined;

                // 1. Check merchants table
                const { data: merchantRow } = await adminSupabase
                    .from('merchants')
                    .select('status, onboarding_completed')
                    .eq('id', verifiedUser.id)
                    .maybeSingle();

                if (merchantRow) detectedRole = 'merchant';

                // 2. Check riders table
                const { data: riderRow } = await adminSupabase
                    .from('riders')
                    .select('status, onboarding_completed')
                    .eq('id', verifiedUser.id)
                    .maybeSingle();

                if (riderRow) detectedRole = 'courier';

                // 3. Check profiles table for role
                const { data: profileRow } = await adminSupabase
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

                const role = detectedRole || 'customer';

                // ── Step 5: Sync profile data (non-blocking) ─────────────────────
                const verifiedPhone = verifiedUser.user_metadata?.phone;
                const verifiedFullName = verifiedUser.user_metadata?.full_name || verifiedUser.email?.split('@')[0];

                const profileUpdate: Record<string, any> = { status: 'ACTIVE' };
                if (verifiedFullName) profileUpdate.full_name = verifiedFullName;
                if (verifiedPhone) profileUpdate.phone = verifiedPhone;

                await Promise.resolve(adminSupabase.from('profiles').update(profileUpdate).eq('id', verifiedUser.id)).catch(() => {});

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

                // ── Step 6: Route to the proper portal ────────────────────────────
                setStatus('success');
                setMessage('Email verified! Taking you to your portal...');

                setTimeout(() => {
                    if (cancelled) return;

                    if (role === 'merchant') {
                        const isApproved = merchantRow?.status === 'APPROVED';
                        const onboardingDone = Boolean(merchantRow?.onboarding_completed);

                        if (isApproved) {
                            navigate('/merchant/dashboard', { replace: true });
                        } else if (onboardingDone) {
                            navigate('/pending-approval', { replace: true });
                        } else {
                            // First time after email verify — go straight to onboarding
                            navigate('/merchant/onboarding', { replace: true });
                        }
                    } else if (role === 'courier' || role === 'rider') {
                        const isApproved = riderRow?.status === 'APPROVED';
                        const onboardingDone = Boolean(riderRow?.onboarding_completed);

                        if (isApproved) {
                            navigate('/rider/dashboard', { replace: true });
                        } else if (onboardingDone) {
                            navigate('/pending-approval', { replace: true });
                        } else {
                            // First time after email verify — go straight to onboarding
                            navigate('/rider/onboarding', { replace: true });
                        }
                    } else if (role === 'admin') {
                        navigate('/admin/dashboard', { replace: true });
                    } else {
                        // Customer
                        navigate('/login', { replace: true, state: { verified: true } });
                    }
                }, 1200);

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
    }, []);

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
                    {status === 'error' && 'Verification Issue'}
                </h1>

                <p className="text-sm text-gray-500 leading-relaxed mb-8">{message}</p>

                {status === 'success' && (
                    <div className="w-full bg-gray-100 h-0.5 overflow-hidden">
                        <div
                            className="h-full bg-[#2563EB] transition-all"
                            style={{ animation: 'progress-fill 1.8s linear forwards' }}
                        />
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col gap-3 mt-6">
                        <a
                            href="/merchant/login"
                            className="w-full py-3.5 px-6 text-xs font-mono uppercase tracking-widest text-white bg-black hover:bg-[#2563EB] transition-colors text-center block"
                        >
                            Merchant Login
                        </a>
                        <div className="grid grid-cols-2 gap-2">
                            <a
                                href="/login"
                                className="py-3 px-3 text-[11px] font-mono uppercase tracking-wider text-gray-700 border border-gray-200 hover:border-black transition-colors text-center block"
                            >
                                Customer Login
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