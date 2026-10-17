import React, { useEffect, useState } from 'react';
import { Clock, Mail, ArrowLeft, RefreshCw, CheckCircle, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function PendingApproval() {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [checking, setChecking] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const checkStatus = async () => {
        if (!user?.id) return;
        setChecking(true);
        try {
            // Check merchant status
            const { data: merchant } = await supabase
                .from('merchants')
                .select('status')
                .eq('id', user.id)
                .maybeSingle();

            const isApprovedLocally = localStorage.getItem('muncheez_merchant_approved_' + user.id) === 'true';

            if (merchant?.status === 'APPROVED' || isApprovedLocally) {
                navigate('/merchant/dashboard', { replace: true });
                return;
            }

            // Check rider status
            const { data: rider } = await supabase
                .from('riders')
                .select('status')
                .eq('id', user.id)
                .maybeSingle();

            const isRiderApprovedLocally = localStorage.getItem('muncheez_rider_approved_' + user.id) === 'true';

            if (rider?.status === 'APPROVED' || isRiderApprovedLocally) {
                navigate('/rider/dashboard', { replace: true });
                return;
            }

            setStatusMessage('Application is currently under review by the Muncheez Team.');
        } catch (err) {
            console.error('Error checking status:', err);
        } finally {
            setChecking(false);
        }
    };

    // Auto-poll every 4 seconds so approval immediately moves merchant to dashboard
    useEffect(() => {
        if (!user?.id) return;
        checkStatus();
        const interval = setInterval(checkStatus, 4000);
        return () => clearInterval(interval);
    }, [user?.id]);

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <div className="flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-24 py-24">
                <div className="max-w-xl w-full text-center">
                    <div className="w-20 h-20 bg-blue-50 flex items-center justify-center mx-auto mb-10">
                        <Clock className="text-[#2563EB]" size={36} />
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400 mb-6 block">
                        Application Under Review
                    </span>

                    <h1 className="text-5xl font-heading font-light text-gray-900 tracking-tight mb-6 leading-[1.1]">
                        Your application <br />
                        <span className="italic font-serif text-gray-400">is in review.</span>
                    </h1>

                    <p className="text-sm text-gray-500 leading-relaxed mb-4 max-w-md mx-auto">
                        Thank you for completing your onboarding. Our partner review team is
                        assessing your application. You will be redirected to your dashboard
                        immediately once approved.
                    </p>

                    {statusMessage && (
                        <p className="text-xs font-mono text-amber-600 mb-4">{statusMessage}</p>
                    )}

                    <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-8">
                        Typical review window: Instant upon Admin review
                    </p>

                    <div className="flex justify-center mb-10">
                        <button
                            onClick={checkStatus}
                            disabled={checking}
                            className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest text-black bg-gray-100 hover:bg-gray-200 transition-colors rounded-none disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
                            <span>{checking ? 'Checking...' : 'Check Status Now'}</span>
                        </button>
                    </div>

                    <div className="w-full h-px bg-gray-100 mb-10" />

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            to="/"
                            className="inline-flex items-center justify-between gap-3 px-8 py-4 text-xs font-mono uppercase tracking-widest text-white bg-black hover:bg-[#2563EB] transition-colors"
                        >
                            <ArrowLeft size={14} />
                            <span>Back to Home</span>
                        </Link>
                        <a
                            href="mailto:partners@muncheez.co.ke"
                            className="inline-flex items-center justify-between gap-3 px-8 py-4 text-xs font-mono uppercase tracking-widest text-gray-700 border border-gray-200 hover:border-black transition-colors"
                        >
                            <Mail size={14} />
                            <span>Support</span>
                        </a>
                    </div>
                </div>
            </div>

            <footer className="py-8 px-6 border-t border-gray-100">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <span className="font-heading font-bold text-lg tracking-tighter text-gray-900">
                        Muncheez<span className="text-[#2563EB]">.</span>
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                        Fast. Fresh. Fam.
                    </span>
                </div>
            </footer>
        </div>
    );
}