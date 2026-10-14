import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
    const navigate = useNavigate();
    const { user, profile, loading: authLoading, signIn } = useAuth();
    const [email, setEmail] = useState('admin@muncheez.co.ke');
    const [password, setPassword] = useState('admin123');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-redirect if already authenticated as admin
    useEffect(() => {
        if (!authLoading && user && profile?.roles?.includes('admin')) {
            navigate('/admin', { replace: true });
        }
    }, [authLoading, user, profile, navigate]);

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const result = await signIn(email, password);

            if (result.error) {
                setError(result.error);
                return;
            }

            navigate('/admin', { replace: true });
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex overflow-hidden">
            {/* Left Side: Editorial Image (Desktop Only) */}
            <div className="hidden lg:block lg:w-1/2 relative">
                <img
                    src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2000"
                    alt="Muncheez Operations"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-20 left-20 z-10 max-w-lg">
                    <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/60 mb-6 block">Restricted Access</span>
                    <h2 className="text-6xl font-heading font-light text-white leading-[1.1] tracking-tight mb-8">
                        Command <br />
                        <span className="italic opacity-50">Center</span>.
                    </h2>
                    <p className="text-lg text-white/70 font-light leading-relaxed">
                        Approvals, merchants, riders, orders, and platform intelligence in one terminal.
                    </p>
                </div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12 relative overflow-y-auto">
                <div className="mb-12 relative">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A90E2] mb-8 hover:opacity-70 transition-all group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Selection
                    </Link>
                    <div className="flex items-center justify-between mb-8">
                        <span className="font-heading font-bold text-3xl tracking-tighter text-gray-900">
                            Muncheez<span className="text-[#4A90E2]">.</span>
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Admin Console</span>
                    </div>
                    <h1 className="text-4xl font-heading font-light text-gray-900 tracking-tight mb-3">Admin Sign In.</h1>
                    <p className="text-sm text-gray-500">Restricted to Muncheez operations staff.</p>
                </div>

                {error && (
                    <div className="mb-6 border-b border-red-500 pb-3">
                        <p className="text-xs text-red-600 font-medium font-mono">{error}</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-8 max-w-md w-full">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                            Admin Email
                        </label>
                        <input
                            id="admin-email"
                            name="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full px-0 py-3 border-b border-gray-100 bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#4A90E2] sm:text-sm transition-all"
                            placeholder="admin@muncheez.co.ke"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                            Password
                        </label>
                        <input
                            id="admin-password"
                            name="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full px-0 py-3 border-b border-gray-100 bg-transparent text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#4A90E2] sm:text-sm transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group w-full flex justify-between items-center py-5 px-8 rounded-2xl text-sm font-bold text-white bg-gray-900 hover:bg-[#4A90E2] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-500 uppercase tracking-widest shadow-xl shadow-gray-200"
                    >
                        {isLoading ? (
                            <>
                                <span>Authenticating...</span>
                                <Loader2 size={18} className="animate-spin" />
                            </>
                        ) : (
                            <>
                                <span>Access Console</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <p className="text-[10px] text-gray-400 mt-12 font-mono uppercase tracking-widest">
                    Master Admin: admin / admin123
                </p>
            </div>
        </div>
    );
}
