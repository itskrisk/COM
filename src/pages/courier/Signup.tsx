import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2, AlertCircle, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '../../lib/api';
import { supabase } from '../../lib/supabaseClient';
import { adminSupabase } from '../../lib/adminSupabase';
import { useAuth } from '../../context/AuthContext';
import { isValidKenyanPhone, normalizeKenyanPhone } from '../../utils/phone';
import courierImg from '../../assets/images/courierloginndsignup.jpg';

export default function CourierSignup() {
    const navigate = useNavigate();
    const { user, profile, signOut, loading: authLoading } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [portalHint, setPortalHint] = useState<{ message: string; link: string; label: string } | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);

    const currentRole = profile?.roles?.[0] || user?.profile?.roles?.[0] || 'courier';
    const isOtherRoleActive = Boolean(user && currentRole !== 'courier');
    const currentRoleLabel = currentRole === 'courier' ? 'Rider' : currentRole === 'merchant' ? 'Merchant' : currentRole === 'admin' ? 'Admin' : 'Customer';
    const currentPortalUrl = currentRole === 'customer' ? '/stores' : currentRole === 'merchant' ? '/merchant/dashboard' : currentRole === 'admin' ? '/admin' : '/rider/dashboard';

    const handleLogout = async () => {
        setLoggingOut(true);
        setError(null);
        setPortalHint(null);
        try {
            await signOut();
        } finally {
            setLoggingOut(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setPortalHint(null);

        // Guard: One email = one role, and one active session at a time
        if (user) {
            setError(`You are currently signed in as ${user.email} (${currentRoleLabel}). One email can only be used for one role. Please log out first to create a new fleet account.`);
            return;
        }

        if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
            setError('Please fill in all required fields.');
            return;
        }

        if (!isValidKenyanPhone(phone)) {
            setError('Please enter a valid Kenyan phone number (e.g. 0712 345 678 or +254 712 345 678).');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        const normalizedPhone = normalizeKenyanPhone(phone);

        try {
            const signupResult = await authApi.signupCourier({
                email: email.trim(),
                password: password,
                name: fullName.trim(),
                phone: normalizedPhone
            });

            if (signupResult.error) throw new Error(signupResult.error);

            if (signupResult.user) {
                // 1. Ensure profile exists first to satisfy foreign key constraint riders_id_fkey
                const profPayload: Record<string, any> = {
                    id: signupResult.user.id,
                    full_name: fullName.trim(),
                    roles: ['courier'],
                    status: 'ACTIVE',
                    account_status: 'pending_onboarding'
                };
                if (normalizedPhone) profPayload.phone = normalizedPhone;

                const { error: profErr } = await adminSupabase
                    .from('profiles')
                    .upsert(profPayload, { onConflict: 'id' });

                if (profErr && (profErr.code === '23505' || profErr.message?.includes('profiles_phone_key'))) {
                    delete profPayload.phone;
                    await adminSupabase.from('profiles').upsert(profPayload, { onConflict: 'id' });
                }

                // 2. Now seed riders record
                const { error: upsertError } = await adminSupabase
                    .from('riders')
                    .upsert({
                        id: signupResult.user.id,
                        status: 'PENDING',
                        is_online: false,
                        rating: 5.0,
                        total_deliveries: 0,
                        created_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                if (upsertError) {
                    console.warn('Rider record creation notice:', upsertError);
                }

                // Sync phone and courier info to Supabase Auth & public.profiles
                fetch('/api/auth/sync-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: signupResult.user.id,
                        email: email.trim(),
                        phone: normalizedPhone,
                        fullName: fullName.trim(),
                        role: 'courier'
                    })
                }).catch(() => {});
            }

            // EVENT ORDER: signup -> email confirmation -> login -> onboarding (once) -> approval
            navigate('/auth/verify', {
                state: {
                    email: email.trim(),
                    portal: 'courier',
                    redirect: '/rider/login',
                    message: 'Account created! Please check your inbox to verify your email, then sign in to complete onboarding.'
                }
            });
        } catch (err: any) {
            let message = err.message || 'An error occurred during signup.';
            const lower = message.toLowerCase();
            if (lower.includes('already registered') || lower.includes('already exists') || lower.includes('email in use')) {
                setPortalHint({
                    message: 'This email is already registered. Each email can only be used for one role.',
                    link: '/rider/login',
                    label: 'Proceed to Fleet Terminal Login'
                });
                setError("An account with this email already exists. Each email can only be used for one role.");
            } else if (lower.includes('rate limit')) {
                setError("Email rate limit reached. Please wait a moment before trying again, or use a different email.");
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Redirect if already authenticated as courier
    if (!authLoading && user) {
        const roles = profile?.roles || (profile?.role ? [profile.role] : []);
        if (roles.includes('courier')) {
            navigate('/rider/dashboard', { replace: true });
            return null;
        }
    }

    return (
        <div className="min-h-screen bg-white flex overflow-hidden">
            {/* Left Side: Editorial Image (Desktop Only) */}
            <div className="hidden lg:block lg:w-1/2 relative">
                <img
                    src={courierImg}
                    alt="Courier Fleet"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-20 left-20 z-10 max-w-lg">
                    <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/60 mb-6 block">Fleet Network</span>
                    <h2 className="text-6xl font-heading font-light text-white leading-[1.1] tracking-tight mb-8">
                        Deliver <br />
                        <span className="italic opacity-50">Freedom</span>.
                    </h2>
                    <p className="text-lg text-white/70 font-light leading-relaxed">
                        Earn on your own terms. Instant payouts, real-time dispatch, and drive with pride.
                    </p>
                </div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12 relative overflow-y-auto">
                {/* Logo & Header */}
                <div className="mb-12 relative">
                    <Link
                        to="/rider/login"
                        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A90E2] mb-8 hover:opacity-70 transition-all group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Login
                    </Link>
                    <div className="flex items-center justify-between mb-8">
                        <Link to="/" className="inline-block">
                            <span className="font-heading font-bold text-3xl tracking-tighter text-gray-900">
                                Muncheez<span className="text-[#4A90E2]">.</span>
                            </span>
                        </Link>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Rider Terminal</span>
                    </div>
                    <h1 className="text-4xl font-heading font-light text-gray-900 tracking-tight mb-3">Join the Fleet.</h1>
                    <p className="text-sm text-gray-500">
                        Already a courier?{' '}
                        <Link to="/rider/login" className="font-medium text-[#4A90E2] hover:underline transition-all">
                            Sign in
                        </Link>
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-md w-full"
                >
                    {/* Active Session Notice: Strict unboxed editorial layout */}
                    {user && (
                        <div className="mb-8 border-b border-amber-500 pb-5">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 block">
                                            Active Session Detected
                                        </span>
                                        <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                                            You are currently signed in as <strong className="text-black">{user.email}</strong> ({currentRoleLabel}).
                                            {isOtherRoleActive
                                                ? " One email can only be used for one role. You must log out first before creating a new fleet account."
                                                : " You already have an active session."}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 pt-1">
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            disabled={loggingOut}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-600 hover:text-red-700 underline disabled:opacity-50"
                                        >
                                            {loggingOut ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                                            Log Out Current Session
                                        </button>
                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                        <Link
                                            to={currentPortalUrl}
                                            className="text-xs font-bold uppercase tracking-widest text-[#2563EB] hover:underline"
                                        >
                                            Continue to {currentRoleLabel} &rarr;
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {portalHint && (
                        <div className="mb-6 border-b border-blue-500 pb-3">
                            <p className="text-xs text-blue-600 font-medium mb-2">{portalHint.message}</p>
                            <Link to={portalHint.link} className="text-xs font-bold text-blue-700 hover:underline uppercase tracking-widest block">
                                {portalHint.label} &rarr;
                            </Link>
                        </div>
                    )}

                    {error && !portalHint && (
                        <div className="mb-6 border-b border-red-500 pb-3">
                            <p className="text-xs text-red-600 font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-8">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                                Full Name
                            </label>
                            <input
                                id="courier-signup-name"
                                type="text"
                                required
                                disabled={Boolean(user)}
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="block w-full px-0 py-3 border-b border-gray-100 bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#4A90E2] sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                                Email Address
                            </label>
                            <input
                                id="courier-signup-email"
                                type="email"
                                required
                                disabled={Boolean(user)}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full px-0 py-3 border-b border-gray-100 bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#4A90E2] sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                placeholder="rider@email.com"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="courier-signup-phone"
                                type="tel"
                                required
                                disabled={Boolean(user)}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="block w-full px-0 py-3 border-b border-gray-100 bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#4A90E2] sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                placeholder="0712 345 678 or +254 712 345 678"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                                    Password
                                </label>
                                <input
                                    id="courier-signup-pass"
                                    type="password"
                                    required
                                    disabled={Boolean(user)}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full px-0 py-3 border-b border-gray-100 bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#4A90E2] sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                                    Confirm Password
                                </label>
                                <input
                                    id="courier-signup-confirmpass"
                                    type="password"
                                    required
                                    disabled={Boolean(user)}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full px-0 py-3 border-b border-gray-100 bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#4A90E2] sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            By signing up, you agree to our <Link to="/terms" className="underline hover:text-[#4A90E2]">Rider Terms</Link> and <Link to="/privacy" className="underline hover:text-[#4A90E2]">Privacy Policy</Link>.
                        </p>

                        <button
                            type="submit"
                            disabled={loading || Boolean(user)}
                            className="group w-full flex justify-between items-center py-5 px-8 text-sm font-bold text-white bg-black hover:bg-[#4A90E2] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 uppercase tracking-widest"
                        >
                            {loading ? (
                                <>
                                    <span>Creating Account...</span>
                                    <Loader2 size={18} className="animate-spin" />
                                </>
                            ) : (
                                <>
                                    <span>Register Rider Account</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
