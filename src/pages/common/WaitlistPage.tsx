import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Mail, Phone, MapPin, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import PageSEO from '../../components/SEO';

/**
 * JOIN THE WAITLIST — Early Access Signup
 * Sequence: Blue (#4A90E2) header → Gold (#D4AF37) form → Blue (#4A90E2) closing → Footer
 * Rules: NO black, NO white sections, NO card boxes, NO rounded containers
 */

const BottomCurve = ({ fill }: { fill: string }) => (
    <div className="absolute bottom-[-1px] left-0 w-full leading-[0] z-20">
        <svg viewBox="0 0 1440 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-[60px] md:h-[100px] block" preserveAspectRatio="none">
            <path fill={fill} fillOpacity="1" d="M0,0L48,10C96,20,192,40,288,50C384,60,480,60,576,50C672,40,768,20,864,15C960,10,1056,20,1152,30C1248,40,1344,50,1392,55L1440,60L1440,100L1392,100C1056,100,960,100,864,100C768,100,672,100,576,100C480,100,384,100,288,100C192,100,96,100,48,100L0,100Z"></path>
        </svg>
    </div>
);

const roles = [
    { value: 'CUSTOMER', label: 'Customer' },
    { value: 'MERCHANT', label: 'Merchant' },
    { value: 'RIDER', label: 'Rider' },
] as const;

const neighborhoods = [
    'Kilimani',
    'Westlands',
    'Lavington',
    'Kileleshwa',
    'Parklands',
    'CBD',
    'Upper Hill',
    'Karen',
    'Gigiri / Runda',
];

export default function WaitlistPage() {
    const navigate = useNavigate();
    const [role, setRole] = useState<'CUSTOMER' | 'MERCHANT' | 'RIDER'>('CUSTOMER');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [neighborhood, setNeighborhood] = useState('Kilimani');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim() || !email.trim()) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('waitlist').insert([{
                full_name: fullName,
                email: email,
                phone: phone || null,
                role: role,
                neighborhood: neighborhood,
                created_at: new Date().toISOString()
            }]);

            if (error) {
                console.warn('Supabase waitlist insert error (saving locally as fallback):', error);
                const localWaitlist = JSON.parse(localStorage.getItem('muncheez_waitlist') || '[]');
                localWaitlist.push({ fullName, email, phone, role, neighborhood, createdAt: new Date().toISOString() });
                localStorage.setItem('muncheez_waitlist', JSON.stringify(localWaitlist));
            }

            setIsSuccess(true);
        } catch (err) {
            console.error('Waitlist submission failed:', err);
            const localWaitlist = JSON.parse(localStorage.getItem('muncheez_waitlist') || '[]');
            localWaitlist.push({ fullName, email, phone, role, neighborhood, createdAt: new Date().toISOString() });
            localStorage.setItem('muncheez_waitlist', JSON.stringify(localWaitlist));
            setIsSuccess(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const roleLabel = roles.find((r) => r.value === role)?.label.toLowerCase() || 'customer';

    return (
        <div className="min-h-screen bg-[#4A90E2] text-white font-sans selection:bg-white selection:text-[#4A90E2] overflow-x-hidden">
            <Navbar />
            <PageSEO
                title="Join the Waitlist"
                description="Be first when Muncheez opens in your Nairobi neighborhood. Early access signup."
                path="/waitlist"
            />

            {/* ── Back + Header: BLUE (#4A90E2) ── */}
            <header className="relative bg-[#4A90E2] text-white px-6 md:px-16 pt-28 pb-20 lg:pb-28">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
                <div className="relative z-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-white/80 hover:text-white text-[11px] font-bold tracking-[0.3em] uppercase transition-colors group cursor-pointer mb-12"
                    >
                        <ArrowLeft size={14} strokeWidth={2} className="group-hover:-translate-x-1 transition-transform" />
                        Back
                    </button>

                    <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/60 mb-6 block font-mono">
                        Early Access · Muncheez Technologies
                    </span>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading font-light tracking-tighter text-white leading-[0.95] mb-6">
                        Join the <span className="font-bold">Waitlist.</span>
                    </h1>
                    <p className="text-sm md:text-base text-white/80 font-light leading-relaxed max-w-2xl">
                        We open neighborhood by neighborhood across Nairobi. Leave your details and we will reach out when your area goes live.
                    </p>
                </div>

                <BottomCurve fill="#D4AF37" />
            </header>

            {/* ── Form: GOLD (#D4AF37) ── */}
            <main className="relative bg-[#D4AF37] text-gray-900 py-20 md:py-28 px-6 md:px-16">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-multiply" />
                <div className="relative z-10 max-w-3xl mx-auto">
                    {isSuccess ? (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="space-y-8 border-t border-gray-900/15 pt-14"
                        >
                            <div className="flex items-center gap-4">
                                <span className="flex items-center justify-center w-12 h-12 border-2 border-gray-900">
                                    <Check size={22} strokeWidth={2.5} />
                                </span>
                                <h2 className="text-3xl md:text-4xl font-heading font-light tracking-tight text-gray-900">
                                    You're on the <span className="font-bold">list.</span>
                                </h2>
                            </div>
                            <p className="text-base md:text-lg text-gray-900/80 font-light leading-relaxed max-w-xl">
                                We saved your spot as a {roleLabel}. We will reach out to <span className="font-medium text-gray-900">{email}</span> when your area goes live.
                            </p>
                            <button
                                onClick={() => navigate(-1)}
                                className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-900 border-b-2 border-gray-900 pb-1 hover:text-[#4A90E2] hover:border-[#4A90E2] transition-colors group cursor-pointer"
                            >
                                Done <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-12">
                            {/* Role Selection */}
                            <div>
                                <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-900/50 block mb-6">I am a</span>
                                <div className="flex flex-wrap gap-x-10 gap-y-4 border-b border-gray-900/15 pb-6">
                                    {roles.map((r) => (
                                        <button
                                            key={r.value}
                                            type="button"
                                            onClick={() => setRole(r.value)}
                                            className={`text-sm font-mono uppercase tracking-widest pb-1 border-b-2 transition-colors cursor-pointer ${role === r.value ? 'border-gray-900 text-gray-900 font-bold' : 'border-transparent text-gray-900/40 hover:text-gray-900/70'}`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Full Name */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-gray-900/50">
                                    <User size={12} /> Full Name *
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="e.g. Amina Hassan"
                                    required
                                    className="w-full bg-transparent border-b border-gray-900/25 focus:border-gray-900 outline-none pb-3 text-base font-light text-gray-900 placeholder:text-gray-900/30 transition-colors"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-gray-900/50">
                                    <Mail size={12} /> Email Address *
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="e.g. amina@example.com"
                                    required
                                    className="w-full bg-transparent border-b border-gray-900/25 focus:border-gray-900 outline-none pb-3 text-base font-light text-gray-900 placeholder:text-gray-900/30 transition-colors"
                                />
                            </div>

                            {/* Phone + Neighborhood */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-gray-900/50">
                                        <Phone size={12} /> Phone (Optional)
                                    </label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+254 7..."
                                        className="w-full bg-transparent border-b border-gray-900/25 focus:border-gray-900 outline-none pb-3 text-base font-light text-gray-900 placeholder:text-gray-900/30 transition-colors"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-gray-900/50">
                                        <MapPin size={12} /> Neighborhood
                                    </label>
                                    <select
                                        value={neighborhood}
                                        onChange={(e) => setNeighborhood(e.target.value)}
                                        className="w-full bg-transparent border-b border-gray-900/25 focus:border-gray-900 outline-none pb-3 text-base font-light text-gray-900 transition-colors"
                                    >
                                        {neighborhoods.map((n) => (
                                            <option key={n} value={n} className="text-gray-900">{n}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="border-t border-gray-900/15 pt-10">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-3 text-xs font-mono font-bold uppercase tracking-[0.25em] text-gray-900 border-b-2 border-gray-900 pb-2 hover:text-[#4A90E2] hover:border-[#4A90E2] transition-colors group cursor-pointer disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving Your Spot' : 'Join the Waitlist'} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <BottomCurve fill="#4A90E2" />
            </main>

            {/* ── Closing: BLUE (#4A90E2) ── */}
            <section className="relative bg-[#4A90E2] text-white py-24 px-6">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
                <div className="container max-w-5xl mx-auto relative z-10 text-center">
                    <p className="text-lg md:text-2xl font-heading font-light text-white leading-snug max-w-3xl mx-auto">
                        Nairobi first. Then the rest of East Africa.
                    </p>
                </div>
            </section>

            <Footer />
        </div>
    );
}
