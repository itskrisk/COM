import { Mail, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function VerifyEmail() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || 'your email';
    const portal = location.state?.portal || 'customer';
    const [resendMessage, setResendMessage] = useState<string | null>(null);
    const [resending, setResending] = useState(false);

    const loginPath = portal === 'merchant' ? '/merchant/login' :
                      portal === 'courier' ? '/rider/login' :
                      '/login';

    const portalLabel = portal === 'merchant' ? 'Partner Portal' :
                        portal === 'courier' ? 'Rider Terminal' :
                        'Customer Login';

    const handleResend = async () => {
        if (!email || email === 'your email') {
            setResendMessage('We do not have your email on file. Please sign up again.');
            return;
        }
        setResending(true);
        setResendMessage(null);
        try {
            const { error } = await supabase.auth.resend({ type: 'signup', email });
            if (error) {
                setResendMessage(error.message || 'Could not resend verification email.');
            } else {
                setResendMessage('Verification email resent. Please check your inbox.');
            }
        } catch (err: any) {
            setResendMessage(err.message || 'Could not resend verification email.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex overflow-hidden">
            <div className="hidden lg:block lg:w-1/2 relative">
                <img
                    src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2000"
                    alt="Nairobi Lifestyle"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-20 left-20 z-10 max-w-lg">
                    <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/60 mb-6 block">Almost There</span>
                    <h2 className="text-6xl font-heading font-light text-white leading-[1.1] tracking-tight mb-8">
                        Verify your <br />
                        <span className="italic opacity-50">Identity</span>.
                    </h2>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12 relative">
                <div className="mb-12 relative">
                    <button
                        onClick={() => navigate(loginPath)}
                        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A90E2] mb-8 hover:opacity-70 transition-all group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to {portalLabel}
                    </button>
                    <div className="flex items-center justify-between mb-8">
                        <Link to="/" className="inline-block">
                            <span className="font-heading font-bold text-3xl tracking-tighter text-gray-900">
                                Muncheez<span className="text-[#4A90E2]">.</span>
                            </span>
                        </Link>
                    </div>
                    <div className="w-14 h-14 bg-blue-50 flex items-center justify-center mb-8">
                        <Mail className="text-[#4A90E2]" size={28} />
                    </div>
                    <h1 className="text-4xl font-heading font-light text-gray-900 tracking-tight mb-3">Check your inbox.</h1>
                    <p className="text-sm text-gray-500 max-w-sm mb-8 leading-relaxed">
                        We've sent a verification link to <span className="font-bold text-gray-900">{email}</span>.
                        Please click the link in your email to verify your address, then continue to your {portalLabel.toLowerCase()}.
                    </p>



                    {resendMessage && (
                        <div className="border-b border-gray-200 pb-3 mb-6">
                            <p className="text-xs text-gray-600 font-medium">{resendMessage}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-3 max-w-md">
                    <button
                        onClick={handleResend}
                        disabled={resending}
                        className="w-full flex justify-between items-center py-4 px-6 text-xs font-mono uppercase tracking-widest text-white bg-black hover:bg-[#4A90E2] disabled:bg-gray-400 transition-colors inline-flex items-center gap-2"
                    >
                        <RefreshCw size={16} className={resending ? 'animate-spin' : ''} />
                        <span>{resending ? 'Resending...' : 'Resend Verification Email'}</span>
                    </button>
                    <button
                        onClick={() => navigate(loginPath)}
                        className="w-full flex justify-between items-center py-4 px-6 text-xs font-mono uppercase tracking-widest text-white bg-black hover:bg-[#4A90E2] transition-colors"
                    >
                        <span>Continue to Login</span>
                        <ArrowRight size={16} />
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full text-center py-3 text-xs font-mono uppercase tracking-wider text-gray-500 hover:text-black border-b border-transparent hover:border-black transition-colors"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
}