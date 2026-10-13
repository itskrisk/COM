import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Store,
    MapPin,
    FileText,
    Clock,
    Phone,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    UploadCloud,
    ShieldCheck,
    AlertCircle,
    LogOut,
    Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function MerchantOnboarding() {
    const navigate = useNavigate();
    const { user, profile, signOut } = useAuth();

    // Step state: 1: Store Profile, 2: Compliance & Legal, 3: Review / Submitted
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    // Form fields
    const [storeName, setStoreName] = useState('');
    const [branchName, setBranchName] = useState('Westlands');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [kraPin, setKraPin] = useState('');
    const [businessPermitNumber, setBusinessPermitNumber] = useState('');
    const [mpesaTill, setMpesaTill] = useState('');
    const [operatingHours, setOperatingHours] = useState('08:00 AM - 10:00 PM');
    const [packTimeMin, setPackTimeMin] = useState('20');
    const [permitDocName, setPermitDocName] = useState<string | null>(null);

    // GATES (event order): signed up -> email confirmed -> logged in -> onboarding ONCE -> admin approval
    useEffect(() => {
        if (!user) {
            navigate('/merchant/signup', { replace: true });
            return;
        }

        if (!user.emailVerified) {
            navigate('/auth/verify', {
                replace: true,
                state: {
                    email: user.email,
                    portal: 'merchant',
                    redirect: '/merchant/login',
                    message: 'Please confirm your email before continuing to onboarding.'
                }
            });
            return;
        }

        if (profile) {
            if (profile.full_name && !storeName) setStoreName(profile.full_name);
            if (profile.phone && !phone) setPhone(profile.phone);
        }

        if (user?.id) {
            (async () => {
                try {
                    const { data } = await supabase
                        .from('merchants')
                        .select('status, onboarding_completed')
                        .eq('id', user.id)
                        .single();

                    if (data?.status === 'APPROVED') {
                        navigate('/merchant/dashboard', { replace: true });
                    } else if (data && data.onboarding_completed) {
                        // ONCE-ONLY: onboarding already submitted, only the waiting screen remains
                        setSubmitted(true);
                    }
                } catch {
                    if (profile?.status === 'PENDING' || profile?.status === 'UNDER_REVIEW') {
                        setSubmitted(true);
                    }
                }
            })();
        }
    }, [profile, navigate, user, storeName, phone]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPermitDocName(file.name);
        }
    };

    const handleSubmitOnboarding = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (user?.id) {
                await supabase
                    .from('merchants')
                    .upsert({
                        id: user.id,
                        business_name: storeName.trim(),
                        address: `${branchName} - ${address.trim()}`,
                        phone: phone.trim(),
                        kra_pin: kraPin.trim(),
                        health_permit: businessPermitNumber.trim(),
                        mpesa_till: mpesaTill.trim(),
                        status: 'PENDING',
                        onboarding_completed: true,
                        documents: permitDocName ? { permit: permitDocName } : null,
                        created_at: new Date().toISOString()
                    }, { onConflict: 'id' });
            }
            setSubmitted(true);
        } catch (err) {
            console.error('Error saving onboarding data:', err);
            // Still allow proceeding to review state
            setSubmitted(true);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (e) {
            console.error(e);
        } finally {
            navigate('/merchant/signup');
        }
    };

    const handleCheckApproval = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('merchants')
                .select('status')
                .eq('id', user.id)
                .single();

            const isApprovedLocally = localStorage.getItem('muncheez_merchant_approved_' + user.id) === 'true';

            if (data?.status === 'APPROVED' || isApprovedLocally) {
                navigate('/merchant/dashboard', { replace: true });
            } else {
                alert('Your application is still under review by the Muncheez Admin Console. You will be granted access immediately once approved.');
            }
        } catch (err) {
            console.error('Check approval error:', err);
            alert('Your application is currently under review by Admin.');
        } finally {
            setLoading(false);
        }
    };

    // If submitted or application is under review
    if (submitted && !previewMode) {
        return (
            <div className="min-h-screen bg-white text-black flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
                {/* Minimalist Header */}
                <header className="border-b border-neutral-200 px-6 sm:px-12 py-5 flex items-center justify-between">
                    <Link to="/" className="font-heading font-bold text-2xl tracking-tighter text-black">
                        Muncheez<span className="text-[#00BCD4]">.</span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">
                            Merchant Portal · Supermarkets
                        </span>
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black transition-colors font-mono uppercase tracking-wider"
                        >
                            <LogOut size={13} />
                            Logout
                        </button>
                    </div>
                </header>

                {/* Editorial Application Review Canvas */}
                <main className="max-w-3xl mx-auto w-full px-6 py-16">
                    <div className="border-b border-neutral-200 pb-8 mb-10">
                        <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 mb-6 border border-amber-200">
                            <Clock size={12} />
                            Application Under Review · Pending Admin Approval
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-black mb-4">
                            Your Supermarket onboarding is with compliance.
                        </h1>
                        <p className="text-neutral-500 text-sm max-w-xl leading-relaxed">
                            We are verifying your KRA PIN and municipal business registration. Once approved by the Muncheez Admin Console, your full store inventory suite and universal storefront presence will unlock.
                        </p>
                    </div>

                    {/* Unboxed Editorial Spec Breakdown */}
                    <div className="divide-y divide-neutral-200 border-t border-b border-neutral-200 mb-12">
                        <div className="py-4 flex justify-between items-center text-xs">
                            <span className="text-neutral-400 font-mono uppercase tracking-wider text-[11px]">Trading Entity</span>
                            <span className="font-medium text-black">{storeName || 'Supermarket Provisions Store'}</span>
                        </div>
                        <div className="py-4 flex justify-between items-center text-xs">
                            <span className="text-neutral-400 font-mono uppercase tracking-wider text-[11px]">Primary Branch</span>
                            <span className="font-medium text-black">{branchName}</span>
                        </div>
                        <div className="py-4 flex justify-between items-center text-xs">
                            <span className="text-neutral-400 font-mono uppercase tracking-wider text-[11px]">Assigned Model</span>
                            <span className="font-mono text-black uppercase tracking-wider text-[11px]">The Market · Supermarket</span>
                        </div>
                        <div className="py-4 flex justify-between items-center text-xs">
                            <span className="text-neutral-400 font-mono uppercase tracking-wider text-[11px]">Status</span>
                            <span className="text-amber-700 font-mono uppercase font-bold text-[11px]">Awaiting Admin Approval</span>
                        </div>
                    </div>

                    {/* Action Row */}
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <button
                            onClick={handleCheckApproval}
                            disabled={loading}
                            className="w-full sm:w-auto px-8 py-3.5 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                            <ShieldCheck size={14} />
                            {loading ? 'Checking Status...' : 'Check Approval Status'}
                        </button>
                        <a
                            href="https://wa.me/254700000000"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full sm:w-auto px-6 py-3.5 border border-neutral-300 hover:border-black text-xs font-mono uppercase tracking-widest text-black transition-colors text-center"
                        >
                            Contact Compliance Desk →
                        </a>
                    </div>
                </main>

                {/* Minimalist Footer */}
                <footer className="border-t border-neutral-200 px-6 sm:px-12 py-4 text-center text-[10px] font-mono tracking-widest uppercase text-neutral-400">
                    Muncheez Metropolis Logistics · Nairobi, Kenya
                </footer>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-black flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
            {/* Header */}
            <header className="border-b border-neutral-200 px-6 sm:px-12 py-5 flex items-center justify-between">
                <Link to="/" className="font-heading font-bold text-2xl tracking-tighter text-black">
                    Muncheez<span className="text-[#00BCD4]">.</span>
                </Link>
                <div className="flex items-center gap-6">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">
                        Step {step} of 2 · Supermarket Onboarding
                    </span>
                    <button
                        onClick={() => signOut()}
                        className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black transition-colors"
                    >
                        <LogOut size={13} />
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Main Form Content */}
            <main className="max-w-2xl mx-auto w-full px-6 py-12">
                <div className="mb-10 pb-6 border-b border-neutral-200">
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400 block mb-2">
                        Merchant Enrollment
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-black">
                        {step === 1 ? 'Configure your supermarket profile.' : 'Compliance & payout settlement.'}
                    </h1>
                </div>

                <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSubmitOnboarding} className="space-y-8">
                    {step === 1 ? (
                        <>
                            {/* Supermarket Trading Name */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                    Supermarket Trading Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Westlands Fresh Market"
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.target.value)}
                                    className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black placeholder:text-neutral-400 outline-none transition-colors"
                                />
                            </div>

                            {/* Branch Selection & Physical Address */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                        Nairobi Branch Zone *
                                    </label>
                                    <select
                                        value={branchName}
                                        onChange={(e) => setBranchName(e.target.value)}
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none transition-colors"
                                    >
                                        <option value="Westlands">Westlands & Parklands</option>
                                        <option value="Kilimani">Kilimani & Hurlingham</option>
                                        <option value="Lavington">Lavington & Kileleshwa</option>
                                        <option value="CBD">Nairobi CBD & Upper Hill</option>
                                        <option value="Karen">Karen & Langata</option>
                                        <option value="ThikaRoad">Garden Estate & Thika Road</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                        Physical Street / Building *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Mpaka Road, Ground Floor"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black placeholder:text-neutral-400 outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Contact Phone & Standard Packing Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                        Store Dispatch Phone *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="+254 700 000000"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black placeholder:text-neutral-400 outline-none transition-colors"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                        Estimated Pack Time (Minutes)
                                    </label>
                                    <select
                                        value={packTimeMin}
                                        onChange={(e) => setPackTimeMin(e.target.value)}
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none transition-colors"
                                    >
                                        <option value="15">15 Minutes (Express)</option>
                                        <option value="20">20 Minutes (Standard)</option>
                                        <option value="30">30 Minutes (Large Baskets)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Next Button */}
                            <div className="pt-6 border-t border-neutral-200 flex justify-end">
                                <button
                                    type="submit"
                                    className="px-8 py-3.5 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest transition-all inline-flex items-center gap-2"
                                >
                                    Proceed to Compliance
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* KRA PIN & Permit */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                        KRA PIN Number *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. P051234567Z"
                                        value={kraPin}
                                        onChange={(e) => setKraPin(e.target.value)}
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black placeholder:text-neutral-400 outline-none transition-colors uppercase font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                        County Business Permit No.
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. NBO-SBP-2026-991"
                                        value={businessPermitNumber}
                                        onChange={(e) => setBusinessPermitNumber(e.target.value)}
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black placeholder:text-neutral-400 outline-none transition-colors uppercase font-mono"
                                    />
                                </div>
                            </div>

                            {/* Settlement: M-Pesa Till or Paybill */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                    M-Pesa Settlement Till or Paybill *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Till 928371 or Paybill 882200"
                                    value={mpesaTill}
                                    onChange={(e) => setMpesaTill(e.target.value)}
                                    className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black placeholder:text-neutral-400 outline-none transition-colors"
                                />
                                <span className="text-[11px] text-neutral-400 block">
                                    Disbursements for customer grocery orders are settled daily to this account.
                                </span>
                            </div>

                            {/* Document Upload Area (Hairline Border, No Rounded Box) */}
                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                    Upload Business Registration / Permit Document
                                </label>
                                <label className="border border-dashed border-neutral-300 hover:border-black transition-colors py-8 px-6 flex flex-col items-center justify-center cursor-pointer text-center">
                                    <UploadCloud size={24} className="text-neutral-400 mb-2" />
                                    <span className="text-xs font-medium text-black">
                                        {permitDocName ? permitDocName : 'Select PDF or Image of Business Registration'}
                                    </span>
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mt-1">
                                        Max size 10MB · Stored on Supabase Storage
                                    </span>
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            {/* Button Bar */}
                            <div className="pt-6 border-t border-neutral-200 flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="px-5 py-3 border border-neutral-300 hover:border-black text-xs font-mono uppercase tracking-widest text-neutral-600 transition-colors inline-flex items-center gap-2"
                                >
                                    <ArrowLeft size={14} />
                                    Back
                                </button>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3.5 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest transition-all inline-flex items-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? 'Submitting Application...' : 'Submit to Compliance Desk'}
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </main>

            {/* Footer */}
            <footer className="border-t border-neutral-200 px-6 sm:px-12 py-4 text-center text-[10px] font-mono tracking-widest uppercase text-neutral-400">
                Muncheez Supermarket Network · Nairobi Provisions Edition
            </footer>
        </div>
    );
}
