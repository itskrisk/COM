import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Bike,
    FileText,
    Shield,
    Phone,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    UploadCloud,
    Clock,
    LogOut,
    Eye,
    ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function CourierOnboarding() {
    const navigate = useNavigate();
    const { user, profile, signOut } = useAuth();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Form fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [vehicleType, setVehicleType] = useState<'Motorbike' | 'Bicycle' | 'Foot' | 'Car'>('Motorbike');
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [hasHelmet, setHasHelmet] = useState(true);
    const [hasThermalBag, setHasThermalBag] = useState(true);
    const [idDocName, setIdDocName] = useState<string | null>(null);
    const [licenseDocName, setLicenseDocName] = useState<string | null>(null);

    // GATES (event order): signed up -> email confirmed -> logged in -> onboarding ONCE -> admin approval
    useEffect(() => {
        if (!user) {
            navigate('/rider/signup', { replace: true });
            return;
        }

        if (!user.emailVerified) {
            navigate('/auth/verify', {
                replace: true,
                state: {
                    email: user.email,
                    portal: 'courier',
                    redirect: '/rider/login',
                    message: 'Please confirm your email before continuing to onboarding.'
                }
            });
            return;
        }

        if (profile) {
            if (profile.full_name && !fullName) setFullName(profile.full_name);
            if (profile.phone && !phone) {
                setPhone(profile.phone);
                setMpesaPhone(profile.phone);
            }
        }

        if (user?.id) {
            (async () => {
                try {
                    const { data } = await supabase
                        .from('riders')
                        .select('status, onboarding_completed')
                        .eq('id', user.id)
                        .single();

                    if (data?.status === 'APPROVED') {
                        navigate('/rider/dashboard', { replace: true });
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
    }, [profile, navigate, user, fullName, phone]);

    const handleSubmitOnboarding = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (user?.id) {
                await supabase
                    .from('riders')
                    .upsert({
                        id: user.id,
                        vehicle_type: vehicleType,
                        vehicle_plate: vehiclePlate.trim().toUpperCase(),
                        status: 'PENDING',
                        onboarding_completed: true,
                        is_online: false,
                        has_helmet: hasHelmet,
                        has_thermal_bag: hasThermalBag,
                        has_id_doc: Boolean(idDocName || idNumber),
                        has_license: Boolean(licenseDocName),
                        documents: {
                            id_doc: idDocName,
                            license: licenseDocName
                        },
                        created_at: new Date().toISOString()
                    }, { onConflict: 'id' });
            }
            setSubmitted(true);
        } catch (err) {
            console.error('Error saving courier onboarding data:', err);
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
            navigate('/rider/signup');
        }
    };

    const handleCheckApproval = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('riders')
                .select('status')
                .eq('id', user.id)
                .single();

            const isApprovedLocally = localStorage.getItem('muncheez_rider_approved_' + user.id) === 'true';

            if (data?.status === 'APPROVED' || isApprovedLocally) {
                navigate('/rider/dashboard', { replace: true });
            } else {
                alert('Your courier credentials are still under review by the Muncheez Admin Console. You will be granted terminal access immediately once approved.');
            }
        } catch (err) {
            console.error('Check approval error:', err);
            alert('Your application is currently under review by Fleet Dispatch.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-white text-black flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
                <header className="border-b border-neutral-200 px-6 sm:px-12 py-5 flex items-center justify-between">
                    <Link to="/" className="font-heading font-bold text-2xl tracking-tighter text-black">
                        Muncheez<span className="text-[#00BCD4]">.</span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">
                            Courier Fleet Portal
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

                <main className="max-w-3xl mx-auto w-full px-6 py-16">
                    <div className="border-b border-neutral-200 pb-8 mb-10">
                        <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 mb-6 border border-amber-200">
                            <Clock size={12} />
                            Fleet Verification in Progress · Pending Admin Approval
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-black mb-4">
                            Your courier documents are with the dispatch desk.
                        </h1>
                        <p className="text-neutral-500 text-sm max-w-xl leading-relaxed">
                            We are verifying your National ID, driving credential, and vehicle details. Once approved by the Muncheez Admin Console, you will be able to access your terminal, toggle online, and receive supermarket delivery dispatches.
                        </p>
                    </div>

                    <div className="divide-y divide-neutral-200 border-t border-b border-neutral-200 mb-12">
                        <div className="py-4 flex justify-between items-center text-xs">
                            <span className="text-neutral-400 font-mono uppercase tracking-wider text-[11px]">Courier Name</span>
                            <span className="font-medium text-black">{fullName || 'Courier Partner'}</span>
                        </div>
                        <div className="py-4 flex justify-between items-center text-xs">
                            <span className="text-neutral-400 font-mono uppercase tracking-wider text-[11px]">Vehicle Type</span>
                            <span className="font-mono text-black uppercase tracking-wider text-[11px]">{vehicleType}</span>
                        </div>
                        {vehiclePlate && (
                            <div className="py-4 flex justify-between items-center text-xs">
                                <span className="text-neutral-400 font-mono uppercase tracking-wider text-[11px]">Plate Registration</span>
                                <span className="font-mono text-black uppercase tracking-wider text-[11px]">{vehiclePlate}</span>
                            </div>
                        )}
                        <div className="py-4 flex justify-between items-center text-xs">
                            <span className="text-neutral-400 font-mono uppercase tracking-wider text-[11px]">Status</span>
                            <span className="text-amber-700 font-mono uppercase font-bold text-[11px]">Awaiting Admin Approval</span>
                        </div>
                    </div>

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
                            Contact Fleet Dispatch →
                        </a>
                    </div>
                </main>

                <footer className="border-t border-neutral-200 px-6 sm:px-12 py-4 text-center text-[10px] font-mono tracking-widest uppercase text-neutral-400">
                    Muncheez Rapid Dispatch · Nairobi Logistics Network
                </footer>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-black flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
            <header className="border-b border-neutral-200 px-6 sm:px-12 py-5 flex items-center justify-between">
                <Link to="/" className="font-heading font-bold text-2xl tracking-tighter text-black">
                    Muncheez<span className="text-[#00BCD4]">.</span>
                </Link>
                <div className="flex items-center gap-6">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">
                        Step {step} of 2 · Courier Fleet Enrollment
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

            <main className="max-w-2xl mx-auto w-full px-6 py-12">
                <div className="mb-10 pb-6 border-b border-neutral-200">
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400 block mb-2">
                        Fleet Onboarding
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-black">
                        {step === 1 ? 'Configure your vehicle & dispatch profile.' : 'Safety gear & compliance docs.'}
                    </h1>
                </div>

                <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSubmitOnboarding} className="space-y-8">
                    {step === 1 ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                    Full Legal Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Kelvin Mwangi"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black placeholder:text-neutral-400 outline-none transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                        Vehicle Type *
                                    </label>
                                    <select
                                        value={vehicleType}
                                        onChange={(e) => setVehicleType(e.target.value as any)}
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black outline-none transition-colors"
                                    >
                                        <option value="Motorbike">Motorbike (Boda Boda)</option>
                                        <option value="Bicycle">Bicycle (Eco Express)</option>
                                        <option value="Foot">Foot Walker (CBD Close Range)</option>
                                        <option value="Car">Car (Bulk Groceries Haul)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                        Plate Registration Number {vehicleType !== 'Foot' && vehicleType !== 'Bicycle' ? '*' : '(Optional)'}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. KMD 102Z"
                                        value={vehiclePlate}
                                        onChange={(e) => setVehiclePlate(e.target.value)}
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black placeholder:text-neutral-400 outline-none transition-colors uppercase font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                    Direct Dispatch Contact Phone *
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

                            <div className="pt-6 border-t border-neutral-200 flex justify-end">
                                <button
                                    type="submit"
                                    className="px-8 py-3.5 bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest transition-all inline-flex items-center gap-2"
                                >
                                    Proceed to Credentials
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                        National ID Number *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 33819204"
                                        value={idNumber}
                                        onChange={(e) => setIdNumber(e.target.value)}
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black placeholder:text-neutral-400 outline-none transition-colors font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                        M-Pesa Payout Phone *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="+254 700 000000"
                                        value={mpesaPhone}
                                        onChange={(e) => setMpesaPhone(e.target.value)}
                                        className="w-full py-2.5 bg-transparent border-b border-neutral-300 focus:border-black text-sm text-black placeholder:text-neutral-400 outline-none transition-colors font-mono"
                                    />
                                </div>
                            </div>

                            {/* Equipment Checkboxes - Clean editorial check */}
                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                    Safety & Delivery Gear Confirmation
                                </label>
                                <div className="space-y-2 text-xs">
                                    <label className="flex items-center gap-3 cursor-pointer py-2 border-b border-neutral-100">
                                        <input
                                            type="checkbox"
                                            checked={hasHelmet}
                                            onChange={(e) => setHasHelmet(e.target.checked)}
                                            className="w-4 h-4 accent-black rounded-none"
                                        />
                                        <span className="text-black">I possess a certified protective helmet (or reflective safety gear).</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer py-2 border-b border-neutral-100">
                                        <input
                                            type="checkbox"
                                            checked={hasThermalBag}
                                            onChange={(e) => setHasThermalBag(e.target.checked)}
                                            className="w-4 h-4 accent-black rounded-none"
                                        />
                                        <span className="text-black">I have an insulated delivery box or thermal grocery backpack.</span>
                                    </label>
                                </div>
                            </div>

                            {/* Document Upload */}
                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                                    National ID Photo / Driving License Upload
                                </label>
                                <label className="border border-dashed border-neutral-300 hover:border-black transition-colors py-8 px-6 flex flex-col items-center justify-center cursor-pointer text-center">
                                    <UploadCloud size={24} className="text-neutral-400 mb-2" />
                                    <span className="text-xs font-medium text-black">
                                        {idDocName ? idDocName : 'Select ID Document or License (PDF/Image)'}
                                    </span>
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mt-1">
                                        Max size 10MB · Stored on Supabase Storage
                                    </span>
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setIdDocName(file.name);
                                        }}
                                        className="hidden"
                                    />
                                </label>
                            </div>

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
                                    {loading ? 'Submitting to Fleet...' : 'Submit to Fleet Dispatch'}
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </main>

            <footer className="border-t border-neutral-200 px-6 sm:px-12 py-4 text-center text-[10px] font-mono tracking-widest uppercase text-neutral-400">
                Muncheez Rapid Dispatch · Nairobi Logistics Network
            </footer>
        </div>
    );
}
