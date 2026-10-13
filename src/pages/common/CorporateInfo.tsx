import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Mail, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

/**
 * CORPORATE INFORMATION: Legal & Company Profile
 * Sequence: Blue (#4A90E2) header → Gold overview → Blue details → Gold offices → Blue signature band → Footer
 * Rules: NO black, NO white sections, NO card boxes, NO rounded containers
 */

const BottomCurve = ({ fill }: { fill: string }) => (
    <div className="absolute bottom-[-1px] left-0 w-full leading-[0] z-20">
        <svg viewBox="0 0 1440 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-[60px] md:h-[100px] block" preserveAspectRatio="none">
            <path fill={fill} fillOpacity="1" d="M0,0L48,10C96,20,192,40,288,50C384,60,480,60,576,50C672,40,768,20,864,15C960,10,1056,20,1152,30C1248,40,1344,50,1392,55L1440,60L1440,100L1392,100C1056,100,960,100,864,100C768,100,672,100,576,100C480,100,384,100,288,100C192,100,96,100,48,100L0,100Z"></path>
        </svg>
    </div>
);

const corporateFields = [
    { label: 'Legal Name', value: 'Muncheez Technologies Ltd.' },
    { label: 'Incorporated', value: 'Kenya, 2026' },
    { label: 'Registration No.', value: 'CPR/2026/MUNCHEEZ' },
    { label: 'Headquarters', value: 'Nairobi, Kenya' },
    { label: 'Sector', value: 'Urban Logistics & Technology' },
    { label: 'Verticals', value: 'Food · Grocery · Pharma · Retail' },
    { label: 'Coverage', value: 'Primary Nairobi Urban Corridors' },
    { label: 'Model', value: 'Three-Sided Platform Marketplace' },
];

const office = [
    { label: 'Head Office', value: 'Nairobi, Kenya' },
    { label: 'Region', value: 'East Africa' },
    { label: 'Timezone', value: 'EAT (UTC+3)' },
    { label: 'Status', value: 'Privately Held' },
];

const companyOverview = [
    'Muncheez Technologies Ltd. is a logistics technology company building the digital infrastructure that powers real-time urban commerce across East Africa.',
    'The platform operates as a synchronized three-sided network. Consumers, merchant partners, and courier fleets connect through one system that dispatches orders in real time, clears payments automatically, and manages an entire rider fleet without a single manual call.',
    'What began as a culinary delivery platform is now the foundation for a multi-vertical urban commerce engine spanning food, groceries, pharmacy, and retail, with expansion across major commercial corridors planned through 2027.',
];

export default function CorporateInfo() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#4A90E2] text-white font-sans selection:bg-white selection:text-[#4A90E2] overflow-x-hidden">
            <Navbar />

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
                        Press &amp; Media · Muncheez Technologies
                    </span>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading font-light tracking-tighter text-white leading-[0.95] mb-6">
                        Corporate <span className="font-bold">Information.</span>
                    </h1>
                    <p className="text-sm md:text-base text-white/80 font-light leading-relaxed max-w-2xl">
                        Legal identity, registration, and operating profile for Muncheez Technologies Ltd.
                    </p>
                </div>

                <BottomCurve fill="#D4AF37" />
            </header>

            {/* ── Company Overview: GOLD (#D4AF37) ── */}
            <section className="relative bg-[#D4AF37] text-gray-900 py-20 md:py-28 px-6 md:px-16">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-multiply" />
                <div className="relative z-10 max-w-7xl mx-auto">
                    <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-gray-900/50 block mb-8">Overview</span>
                    <div className="max-w-3xl space-y-6">
                        {companyOverview.map((paragraph, i) => (
                            <motion.p
                                key={i}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: i * 0.08 }}
                                className="text-base md:text-lg text-gray-900/80 font-light leading-relaxed"
                            >
                                {paragraph}
                            </motion.p>
                        ))}
                    </div>
                </div>

                <BottomCurve fill="#4A90E2" />
            </section>

            {/* ── Registered Details: BLUE (#4A90E2) ── */}
            <section className="relative bg-[#4A90E2] text-white py-20 md:py-28 px-6 md:px-16">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
                <div className="relative z-10 max-w-7xl mx-auto">
                    <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/60 block mb-12">Registered Details</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10">
                        {corporateFields.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.04 }}
                                className="space-y-1.5 border-t border-white/20 pt-6"
                            >
                                <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 block">{item.label}</span>
                                <p className="text-sm font-light text-white/90 leading-relaxed">{item.value}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <BottomCurve fill="#D4AF37" />
            </section>

            {/* ── Offices: GOLD (#D4AF37) ── */}
            <section className="relative bg-[#D4AF37] text-gray-900 py-20 md:py-28 px-6 md:px-16">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-multiply" />
                <div className="relative z-10 max-w-7xl mx-auto">
                    <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-gray-900/50 block mb-12">Offices</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10">
                        {office.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.04 }}
                                className="space-y-1.5 border-t border-gray-900/10 pt-6"
                            >
                                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-900/50 block">{item.label}</span>
                                <p className="text-sm font-light text-gray-900/90 leading-relaxed">{item.value}</p>
                            </motion.div>
                        ))}
                    </div>
                    <div className="pt-12 flex flex-col sm:flex-row gap-4">
                        <a
                            href="mailto:corporate@muncheez.com"
                            className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-900 border-b border-gray-900/30 pb-1 hover:text-[#4A90E2] hover:border-[#4A90E2] transition-colors group w-fit"
                        >
                            <MapPin size={12} /> corporate@muncheez.com <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                        <a
                            href="mailto:investors@muncheez.com"
                            className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-900 border-b border-gray-900/30 pb-1 hover:text-[#4A90E2] hover:border-[#4A90E2] transition-colors group w-fit"
                        >
                            <Mail size={12} /> investors@muncheez.com <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                    </div>
                </div>

                <BottomCurve fill="#4A90E2" />
            </section>

            {/* ── Signature Band: BLUE (#4A90E2) ── */}
            <section className="relative bg-[#4A90E2] text-white py-24 lg:py-32 px-6">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
                <div className="container max-w-5xl mx-auto relative z-10 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/70 mb-6 block font-mono">
                        Muncheez Technologies Ltd.
                    </span>
                    <h2 className="text-4xl md:text-6xl font-heading font-light tracking-tight text-white mb-8 leading-[0.95]">
                        Engineering the Future of <br />
                        <span className="font-bold text-white">East African Logistics.</span>
                    </h2>
                    <div className="border-t border-white/20 pt-8">
                        <p className="font-heading font-bold text-2xl tracking-widest uppercase text-white mb-3">
                            Muncheez Technologies Ltd<span className="text-[#D4AF37]">.</span>
                        </p>
                        <span className="text-xs font-mono tracking-widest text-white/70 uppercase">
                            Nairobi, Kenya · Reg No. CPR/2026/MUNCHEEZ · Urban Logistics Infrastructure
                        </span>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
