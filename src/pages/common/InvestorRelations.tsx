import { motion } from 'framer-motion';
import { ArrowLeft, Mail, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

/**
 * INVESTOR RELATIONS: Corporate Investors Page
 * Sequence: Blue (#4A90E2) header → Gold (#D4AF37) body → Blue (#4A90E2) contact → Footer
 * Rules: NO black, NO white sections, NO card boxes, NO rounded containers
 */

const BottomCurve = ({ fill }: { fill: string }) => (
    <div className="absolute bottom-[-1px] left-0 w-full leading-[0] z-20">
        <svg viewBox="0 0 1440 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-[60px] md:h-[100px] block" preserveAspectRatio="none">
            <path fill={fill} fillOpacity="1" d="M0,0L48,10C96,20,192,40,288,50C384,60,480,60,576,50C672,40,768,20,864,15C960,10,1056,20,1152,30C1248,40,1344,50,1392,55L1440,60L1440,100L1392,100C1056,100,960,100,864,100C768,100,672,100,576,100C480,100,384,100,288,100C192,100,96,100,48,100L0,100Z"></path>
        </svg>
    </div>
);

const businessSections = [
    {
        label: 'The Problem',
        body: 'Ordering food in Nairobi still means phone calls. Customers call, wait, and hope their order arrives. Merchants juggle WhatsApp messages. Riders search for work. It is slow, and nobody knows where the order is.',
    },
    {
        label: 'Our Solution',
        body: 'Muncheez puts everything in one app. Customers order from local kitchens, supermarkets, and pharmacies in a few taps. Merchants see every order on a live screen. Riders are dispatched automatically. No calls, no guesswork, and delivery in under 30 minutes.',
    },
    {
        label: 'How We Make Money',
        body: 'Muncheez earns a commission on every order a merchant delivers through the platform. More customers bring more orders. More orders bring more merchants. The platform grows as the city uses it.',
    },
];

const traction = [
    { label: 'Launch', value: 'October 2026, Nairobi' },
    { label: 'Coverage', value: 'Primary urban corridors' },
    { label: 'Next', value: 'East African cities from 2027' },
];

export default function InvestorRelations() {
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
                        Corporate · Muncheez Technologies Ltd.
                    </span>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading font-light tracking-tighter text-white leading-[0.95] mb-8">
                        Investor <span className="font-bold">Relations.</span>
                    </h1>
                    <p className="text-sm md:text-lg text-white/85 font-light leading-relaxed max-w-3xl">
                        Muncheez Technologies Ltd. is building the urban commerce infrastructure layer for East Africa. A three-sided logistics marketplace with network effects on every side.
                    </p>
                </div>

                <BottomCurve fill="#D4AF37" />
            </header>

            {/* ── The Business: GOLD (#D4AF37) ── */}
            <section className="relative bg-[#D4AF37] text-gray-900 py-20 md:py-28 px-6 md:px-16">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-multiply" />
                <div className="relative z-10 max-w-7xl mx-auto">
                    <div className="space-y-14">
                        {businessSections.map((section, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: i * 0.08 }}
                                className={i === 0 ? 'space-y-6' : 'space-y-6 border-t border-gray-900/15 pt-14'}
                            >
                                <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-gray-900/50 block">{section.label}</span>
                                <p className="text-base md:text-lg text-gray-900/80 font-light leading-relaxed max-w-3xl">{section.body}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-12 gap-y-8 border-t border-gray-900/15 pt-10 mt-16">
                        {traction.map((item, i) => (
                            <div key={i} className="space-y-1.5">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-900/50 block">{item.label}</span>
                                <p className="text-sm font-light text-gray-900/90 leading-relaxed">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <BottomCurve fill="#4A90E2" />
            </section>

            {/* ── Get in Touch: BLUE (#4A90E2) ── */}
            <section className="relative bg-[#4A90E2] text-white py-24 lg:py-32 px-6">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
                <div className="container max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                        <div className="lg:col-span-5">
                            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/60 block mb-6">Get in Touch</span>
                            <h2 className="text-4xl md:text-6xl font-heading font-light tracking-tighter leading-[0.95] text-white mb-8">
                                Talk to<br /><span className="font-bold">our team.</span>
                            </h2>
                            <p className="text-white/80 text-sm md:text-base font-light leading-relaxed max-w-md">
                                For investment enquiries, investor decks, and data room access, contact the investor relations team directly.
                            </p>
                        </div>
                        <div className="lg:col-span-7 border-t border-white/20 pt-8 lg:pt-0 lg:border-t-0 space-y-0">
                            <div className="divide-y divide-white/10">
                                <div className="py-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 block mb-1">Investor Relations</span>
                                        <p className="text-xs text-white/70 font-light leading-relaxed">Funding enquiries, investor decks, financial information.</p>
                                    </div>
                                    <div className="flex items-center sm:justify-end">
                                        <a
                                            href="mailto:investors@muncheez.com"
                                            className="inline-flex items-center gap-2 text-xs font-mono text-white hover:text-white/70 transition-colors border-b border-white/30 hover:border-white/0 pb-0.5"
                                        >
                                            <Mail size={12} />
                                            investors@muncheez.com
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-white/20 pt-8 flex flex-col sm:flex-row sm:items-center gap-6">
                                <p className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                                    Response time · Within 48 business hours · Nairobi, Kenya (EAT, UTC+3)
                                </p>
                                <a
                                    href="mailto:investors@muncheez.com?subject=Investor%20Deck%20Request"
                                    className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-white border-b-2 border-white pb-1 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors group shrink-0 cursor-pointer"
                                >
                                    Request Investor Deck <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
