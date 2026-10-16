import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';

const ADMIN_CREDENTIALS = {
    email: 'admin@muncheez.co.ke',
    password: 'Admin@Muncheez2025!'
};

const ADMIN_SESSION_KEY = 'muncheez_admin_session';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Check existing admin session on mount
    useEffect(() => {
        const session = sessionStorage.getItem(ADMIN_SESSION_KEY);
        if (session) {
            try {
                const { expiry } = JSON.parse(session);
                if (Date.now() < expiry) {
                    navigate('/admin', { replace: true });
                } else {
                    sessionStorage.removeItem(ADMIN_SESSION_KEY);
                }
            } catch {
                sessionStorage.removeItem(ADMIN_SESSION_KEY);
            }
        }
    }, [navigate]);

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Simple validation
        if (!email || !password) {
            setError('Email and password are required');
            setIsLoading(false);
            return;
        }

        try {
            // Simulate network delay for UX
            await new Promise(resolve => setTimeout(resolve, 800));

            // Hardcoded credential check
            if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
                // Create session (24 hours)
                const session = {
                    email: ADMIN_CREDENTIALS.email,
                    role: 'admin',
                    loginTime: Date.now(),
                    expiry: Date.now() + 24 * 60 * 60 * 1000
                };
                sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
                navigate('/admin', { replace: true });
            } else {
                setError('Invalid credentials. Access denied.');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-sm">
                {/* Back Button */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-gray-600 transition-colors mb-8 group"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Muncheez
                </Link>

                {/* Apple-style Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-10">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center mx-auto mb-4">
                            <Lock size={24} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-heading font-light tracking-tight text-gray-900 mb-2">
                            Admin Console
                        </h1>
                        <p className="text-sm text-gray-500">
                            Restricted access. Muncheez operations only.
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl">
                            <p className="text-xs text-red-600 font-medium flex items-center gap-2">
                                <Lock size={12} />
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-transparent transition-all text-sm"
                            placeholder="admin@muncheez.co.ke"
                        />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-transparent transition-all text-sm pr-12"
                            placeholder="••••••••"
                        />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-black text-white rounded-xl text-sm font-semibold uppercase tracking-wider hover:bg-gray-800 active:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-[10px] text-gray-400 text-center mt-6 font-medium uppercase tracking-wider">
                    Muncheez Operations Terminal
                </p>
            </div>
        </div>
    );
}