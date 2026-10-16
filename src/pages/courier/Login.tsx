import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import courierImg from '../../assets/images/courierloginndsignup.jpg';

export default function CourierLogin() {
    const navigate = useNavigate();
    const { user, profile, loading: authLoading, signIn } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-redirect if already authenticated
    useEffect(() => {
        if (!authLoading && user && profile) {
            const roles: string[] = profile.roles || (profile.role ? [profile.role] : []);
            if (roles.includes('courier')) {
                const status = profile.account_status || profile.status;
                if (status === 'active' || status === 'APPROVED') {
                    navigate('/rider/dashboard', { replace: true });
                } else if (status === 'pending_approval') {
                    navigate('/pending-approval', { replace: true });
                } else if (status === 'rejected') {
                    navigate('/rejected', { replace: true });
                } else {
                    navigate('/rider/onboarding', { replace: true });
                }
            }
        }
    }, [authLoading, user, profile, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const cleanEmail = email.trim();
            const { error: loginError, profile: loggedProfile } = await signIn(cleanEmail, password);
            if (loginError) {
                setError(loginError);
                return;
            }

            // Immediately route
            const status = loggedProfile?.account_status || loggedProfile?.status;
            if (status === 'active' || status === 'APPROVED') {
                navigate('/rider/dashboard', { replace: true });
            } else if (status === 'pending_approval') {
                navigate('/pending-approval', { replace: true });
            } else if (status === 'rejected') {
                navigate('/rejected', { replace: true });
            } else {
                navigate('/rider/onboarding', { replace: true });
            }
        } catch (err: any) {
            setError(err.message || 'Access denied. Verification failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex overflow-hidden">
            {/* Left Side: Editorial Image (Desktop Only) */}
            <div className="hidden lg:block lg:w-1/2 relative">
                <img
                    src={courierImg}
                    alt="Courier Fleet"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute bottom-20 left-20 z-10 max-w-lg">
                    <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/60 mb-6 block">Fleet Terminal</span>
                    <h2 className="text-6xl font-heading font-light text-white leading-[1.1] tracking-tight mb-8">
                        Precision <br />
                        <span className="italic opacity-50">Logistics</span>.
                    </h2>
                    <p className="text-lg text-white/70 font-light leading-relaxed">
                        Join Nairobi's premier dispatch network. Competitive rates, rapid payouts, and intelligent route mapping.
                    </p>
                </div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12 relative">
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
                    <h1 className="text-4xl font-heading font-light text-gray-900 tracking-tight mb-3">Rider Terminal.</h1>
                    <p className="text-sm text-gray-500">
                        Want to ride with us?{' '}
                        <Link to="/rider/signup" className="font-medium text-[#2563EB] hover:underline transition-all">
                            Sign up here
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
                                Rider Email
                            </label>
                            <input
                                id="courier-email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full px-0 py-3 border-b border-gray-200 bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#2563EB] sm:text-sm transition-all"
                                placeholder="rider@email.com"
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
                                id="courier-login-password"
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
                            disabled={isLoading}
                            className="group w-full flex justify-between items-center py-5 px-8 text-sm font-bold text-white bg-black hover:bg-[#2563EB] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 uppercase tracking-widest"
                        >
                            {isLoading ? (
                                <>
                                    <span>Signing in...</span>
                                    <Loader2 size={18} className="animate-spin" />
                                </>
                            ) : (
                                <>
                                    <span>Access Terminal</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Switch Portals</span>
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="text-xs font-bold text-gray-900 hover:text-[#2563EB] hover:underline uppercase tracking-widest">Customer App</Link>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <Link to="/merchant/login" className="text-xs font-bold text-[#D4AF37] hover:underline uppercase tracking-widest">Merchant Portal</Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
