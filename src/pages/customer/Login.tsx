import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import customerLoginImg from '../../assets/images/customerloginpic.jpg';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, profile, loading: authLoading, signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Destination fallback
    const from = (location.state as any)?.from?.pathname || "/stores";

    // Auto-redirect if already authenticated
    useEffect(() => {
        if (!authLoading && user && profile) {
            const roles: string[] = profile.roles || (profile.role ? [profile.role] : []);
            if (roles.includes('customer')) {
                navigate(from, { replace: true });
            } else if (roles.includes('merchant')) {
                navigate('/merchant/dashboard', { replace: true });
            } else if (roles.includes('courier')) {
                navigate('/rider/dashboard', { replace: true });
            } else if (roles.includes('admin')) {
                navigate('/admin', { replace: true });
            }
        }
    }, [authLoading, user, profile, navigate, from]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const cleanEmail = email.trim();
            const { error: loginError, user: loggedUser, profile: loggedProfile } = await signIn(cleanEmail, password);

            if (loginError) {
                setError(loginError);
                // Add inline guidance for specific cases
                if (loginError.includes('does not exist')) {
                    setError('This account does not exist. Please sign up to create an account.');
                } else if (loginError.includes('password') || loginError.includes('Invalid')) {
                    setError('Incorrect email or password. Please try again or sign up if you don\'t have an account.');
                }
                return;
            }

            // Route immediately based on role
            const roles: string[] = loggedProfile?.roles || (loggedProfile?.role ? [loggedProfile.role] : ['customer']);
            if (roles.includes('admin')) {
                navigate('/admin', { replace: true });
            } else if (roles.includes('merchant')) {
                const status = loggedProfile?.account_status || loggedProfile?.status;
                if (status === 'active' || status === 'APPROVED') {
                    navigate('/merchant/dashboard', { replace: true });
                } else if (status === 'pending_approval') {
                    navigate('/pending-approval', { replace: true });
                } else {
                    navigate('/merchant/onboarding', { replace: true });
                }
            } else if (roles.includes('courier')) {
                const status = loggedProfile?.account_status || loggedProfile?.status;
                if (status === 'active' || status === 'APPROVED') {
                    navigate('/rider/dashboard', { replace: true });
                } else if (status === 'pending_approval') {
                    navigate('/pending-approval', { replace: true });
                } else {
                    navigate('/rider/onboarding', { replace: true });
                }
            } else {
                navigate(from, { replace: true });
            }
        } catch (err: any) {
            setError(err.message || 'Incorrect email or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex overflow-hidden">
            {/* Left Side: Editorial Image (Desktop Only) */}
            <div className="hidden lg:block lg:w-1/2 relative">
                <img
                    src={customerLoginImg}
                    alt="Customer Login"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute bottom-20 left-20 z-10 max-w-lg">
                    <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/60 mb-6 block">Welcome Back</span>
                    <h2 className="text-6xl font-heading font-light text-white leading-[1.1] tracking-tight mb-8">
                        The City <br />
                        <span className="italic opacity-50">Awaits</span>.
                    </h2>
                    <p className="text-lg text-white/70 font-light leading-relaxed">
                        Sign in to pick up where you left off. Your favorite spots are just a few clicks away.
                    </p>
                </div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12 relative">
                {/* Logo & Header */}
                <div className="mb-12 relative">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB] mb-8 hover:opacity-70 transition-all group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Selection
                    </Link>
                    <div className="flex items-center justify-between mb-8">
                        <Link to="/" className="inline-block">
                            <span className="font-heading font-bold text-3xl tracking-tighter text-gray-900">
                                Muncheez<span className="text-[#2563EB]">.</span>
                            </span>
                        </Link>
                    </div>
                    <h1 className="text-4xl font-heading font-light text-gray-900 tracking-tight mb-3">Welcome Back.</h1>
                    <p className="text-sm text-gray-500">
                        Don't have an account?{' '}
                        <Link to="/signup" className="font-medium text-[#2563EB] hover:underline transition-all">
                            Sign up now
                        </Link>
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-md w-full"
                >
                    {error && (
                        <div className="mb-6 border-b border-red-500 pb-3">
                            <div className="flex items-start gap-2.5">
                                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-8">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                                Email Address
                            </label>
                            <input
                                id="customer-email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full px-0 py-3 border-b border-gray-200 bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#2563EB] sm:text-sm transition-all"
                                placeholder="name@email.com"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    Password
                                </label>
                                <Link to="/auth/forgot-password" className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] hover:underline">
                                    Forgot?
                                </Link>
                            </div>
                            <input
                                id="customer-password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full px-0 py-3 border-b border-gray-200 bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#2563EB] sm:text-sm transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group w-full flex justify-between items-center py-5 px-8 text-sm font-bold text-white bg-black hover:bg-[#2563EB] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 uppercase tracking-widest"
                        >
                            {loading ? (
                                <>
                                    <span>Signing in...</span>
                                    <Loader2 size={18} className="animate-spin" />
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col gap-6">
                        <div className="flex flex-col gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Are you a Partner?</span>
                            <div className="flex items-center gap-4">
                                <Link to="/merchant/login" className="text-xs font-bold text-[#D4AF37] hover:underline uppercase tracking-widest">Merchant Portal</Link>
                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                <Link to="/rider/login" className="text-xs font-bold text-black hover:underline uppercase tracking-widest">Fleet Terminal</Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
