import { motion } from 'framer-motion';
import { Mail, ArrowRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import PageSEO from '../../components/SEO';

/**
 * NEWSROOM: Press, Media & Corporate Information
 * Design sequence: Blue (#4A90E2) → Gold (#D4AF37) → Blue → Gold → Blue → Footer
 * Strict Rules: NO black anywhere (footer only), NO white sections, NO card boxes, NO rounded containers
 */

const BottomCurve = ({ fill }: { fill: string }) => (
    <div className="absolute bottom-[-1px] left-0 w-full leading-[0] z-20">
        <svg viewBox="0 0 1440 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-[60px] md:h-[100px] block" preserveAspectRatio="none">
            <path fill={fill} fillOpacity="1" d="M0,0L48,10C96,20,192,40,288,50C384,60,480,60,576,50C672,40,768,20,864,15C960,10,1056,20,1152,30C1248,40,1344,50,1392,55L1440,60L1440,100L1392,100C1056,100,960,100,864,100C768,100,672,100,576,100C480,100,384,100,288,100C192,100,96,100,48,100L0,100Z"></path>
        </svg>
    </div>
);

const pressReleases = [
    {
        date: 'October 2026',
        tag: 'Launch',
        headline: 'Muncheez Technologies Launches Hyper-Local Delivery Platform in Nairobi',
    },
    {
        date: 'September 2026',
        tag: 'Technology',
        headline: 'Muncheez Introduces Real-Time Dispatch AI for Sub-30 Minute Delivery SLAs',
    },
    {
        date: 'August 2026',
        tag: 'Expansion',
        headline: 'Supermarket Express Category Goes Live Across Nairobi',
    }
];

const mediaKit = [
    {
        label: '01 · Logos',
        title: 'Brand Logos',
        desc: 'Full suite of Muncheez logos in SVG, PNG (light/dark variants). For editorial, digital, and print use.',
        action: 'Download Pack',
    },
    {
        label: '02 · Color & Typography',
        title: 'Brand Guidelines',
        desc: 'Official color palette, typography system, and usage rules for editorial and co-branded materials.',
        action: 'View Guidelines',
    },
    {
        label: '03 · Photography',
        title: 'Press Images',
        desc: 'High-resolution editorial images of the platform, team, and operations for media use.',
        action: 'View Gallery',
    }
];

const corporateInfo = [
    { label: 'Legal Name', value: 'Muncheez Technologies Ltd.' },
    { label: 'Incorporated', value: 'Kenya, 2026' },
    { label: 'Registration No.', value: 'CPR/2026/MUNCHEEZ' },
    { label: 'Headquarters', value: 'Nairobi, Kenya' },
    { label: 'Sector', value: 'Urban Logistics & Technology' },
    { label: 'Verticals', value: 'Food · Grocery · Pharma · Retail' },
    { label: 'Coverage', value: 'Primary Nairobi Urban Corridors' },
    { label: 'Model', value: 'Three-Sided Platform Marketplace' },
];

const pressContacts = [
    {
        role: 'Press & Media',
        desc: 'Editorial requests, interview coordination, and media partnerships.',
        email: 'press@muncheez.com'
    },
    {
        role: 'Investor Relations',
        desc: 'Funding enquiries, investor decks, financial information.',
        email: 'investors@muncheez.com'
    },
    {
        role: 'Corporate Partnerships',
        desc: 'Enterprise partnerships, B2B integration, strategic alliances.',
        email: 'corporate@muncheez.com'
    }
];

export default function Newsroom() {
    return (
        <div className="min-h-screen bg-[#4A90E2] text-white font-sans selection:bg-white selection:text-[#4A90E2] overflow-x-hidden">
            <Navbar />
            <PageSEO
                title="Newsroom"
                description="Press releases, media assets, and corporate information for Muncheez Technologies Ltd."
                path="/company/news"
            />

            {/* ── HERO: BLUE (#4A90E2) ── */}
            <section className="relative bg-[#4A90E2] text-white pt-40 pb-32 lg:pt-48 lg:pb-44 px-6">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
                <div className="container max-w-7xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start"
                    >
                        <div className="lg:col-span-5">
                            <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/60 mb-6 block font-mono">
                                Press &amp; Media · Muncheez Technologies
                            </span>
                            <h1 className="text-5xl sm:text-6xl md:text-8xl font-heading font-light tracking-tighter text-white leading-[0.92] mb-8">
                                News&shy;<br />
                                <span className="font-bold">room.</span>
                            </h1>
                            <p className="text-xs font-mono tracking-widest uppercase text-white/60">
                                Nairobi, Kenya · Muncheez Technologies Ltd.
                            </p>
                        </div>

                        <div className="lg:col-span-7 border-t border-white/20 pt-8 lg:pt-0 lg:border-t-0 space-y-6">
                            <p className="font-heading font-light text-2xl md:text-3xl text-white leading-snug">
                                The official press and media resource for <strong>Muncheez Technologies Ltd.</strong>
                            </p>
                            <p className="text-white/80 text-sm md:text-base font-light leading-relaxed">
                                Press releases, media assets, and corporate information. For press enquiries, contact the communications team directly.
                            </p>
                            <div className="border-t border-white/20 pt-6">
                                <a
                                    href="mailto:press@muncheez.com"
                                    className="inline-flex items-center gap-3 text-white hover:text-white/70 transition-colors group"
                                >
                                    <Mail size={14} className="shrink-0" />
                                    <span className="text-xs font-mono uppercase tracking-widest border-b border-white/30 pb-0.5 group-hover:border-white/0 transition-colors">
                                        press@muncheez.com
                                    </span>
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <BottomCurve fill="#D4AF37" />
            </section>

            {/* ── PRESS RELEASES OVERVIEW: GOLD (#D4AF37) ── */}
            <section className="relative bg-[#D4AF37] text-gray-900 py-24 lg:py-32 px-6">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-multiply" />
                <div className="container max-w-7xl mx-auto relative z-10">
                    <div className="border-b border-gray-900/10 pb-8 mb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                        <div>
                            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-gray-900/50 block mb-2">Latest</span>
                            <h2 className="text-2xl md:text-3xl font-heading font-light tracking-tight text-gray-900">Press Releases</h2>
                        </div>
                        <Link
                            to="/company/news/press-releases"
                            className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-900 border-b border-gray-900/30 pb-1 hover:text-[#4A90E2] hover:border-[#4A90E2] transition-colors group"
                        >
                            All Releases <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-900/10">
                        {pressReleases.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.08 }}
                                className="py-10 grid grid-cols-1 md:grid-cols-12 gap-6"
                            >
                                <div className="md:col-span-2 flex flex-col gap-2">
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-900/50">{item.date}</span>
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-[#4A90E2]">{item.tag}</span>
                                </div>
                                <div className="md:col-span-8 flex items-center">
                                    <h3 className="text-base md:text-lg font-heading font-light text-gray-900 leading-snug">
                                        {item.headline}
                                    </h3>
                                </div>
                                <div className="md:col-span-2 flex md:justify-end items-start">
                                    <Link
                                        to="/company/news/press-releases"
                                        className="text-[10px] font-mono uppercase tracking-widest text-gray-900/50 hover:text-[#4A90E2] transition-colors flex items-center gap-1.5 border-b border-transparent hover:border-[#4A90E2] pb-0.5"
                                    >
                                        <FileText size={12} />Full Release
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <BottomCurve fill="#4A90E2" />
            </section>

            {/* ── MEDIA KIT OVERVIEW: BLUE (#4A90E2) ── */}
            <section className="relative bg-[#4A90E2] text-white py-24 lg:py-32 px-6">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
                <div className="container max-w-7xl mx-auto relative z-10">
                    <div className="border-b border-white/10 pb-8 mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                        <div>
                            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/60 block mb-2">Media Assets</span>
                            <h2 className="text-2xl md:text-3xl font-heading font-light tracking-tight text-white">Brand &amp; Media Kit</h2>
                        </div>
                        <Link
                            to="/company/news/media-kit"
                            className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white border-b border-white/30 pb-1 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors group"
                        >
                            Full Kit <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-16">
                        {mediaKit.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="space-y-4 border-t border-white/15 pt-8"
                            >
                                <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 block">{item.label}</span>
                                <h3 className="text-xl font-heading font-light text-white">{item.title}</h3>
                                <p className="text-xs text-white/80 font-light leading-relaxed">{item.desc}</p>
                                <Link
                                    to="/company/news/media-kit"
                                    className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white border-b border-white/30 pb-0.5 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors group"
                                >
                                    {item.action} <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <BottomCurve fill="#D4AF37" />
            </section>

            {/* ── CORPORATE INFORMATION OVERVIEW: GOLD (#D4AF37) ── */}
            <section className="relative bg-[#D4AF37] text-gray-900 py-24 lg:py-32 px-6">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-multiply" />
                <div className="container max-w-7xl mx-auto relative z-10">
                    <div className="border-b border-gray-900/10 pb-8 mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                        <div>
                            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-gray-900/50 block mb-2">Corporate</span>
                            <h2 className="text-2xl md:text-3xl font-heading font-light tracking-tight text-gray-900">Corporate Information</h2>
                        </div>
                        <Link
                            to="/company/news/corporate"
                            className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-900 border-b border-gray-900/30 pb-1 hover:text-[#4A90E2] hover:border-[#4A90E2] transition-colors group"
                        >
                            Full Profile <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10">
                        {corporateInfo.map((item, i) => (
                            <div key={i} className="space-y-1.5 border-t border-gray-900/10 pt-6">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-900/50 block">{item.label}</span>
                                <p className="text-sm font-light text-gray-900/90 leading-relaxed">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <BottomCurve fill="#4A90E2" />
            </section>

            {/* ── PRESS CONTACT: BLUE (#4A90E2) ── */}
            <section className="relative bg-[#4A90E2] text-white py-24 lg:py-32 px-6">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
                <div className="container max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                        <div className="lg:col-span-5">
                            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/60 block mb-6">Media Enquiries</span>
                            <h2 className="text-4xl md:text-6xl font-heading font-light tracking-tighter leading-[0.95] text-white">
                                Talk to<br /><span className="font-bold">our team.</span>
                            </h2>
                        </div>
                        <div className="lg:col-span-7 border-t border-white/20 pt-8 lg:pt-0 lg:border-t-0 space-y-0">
                            <div className="divide-y divide-white/10">
                                {pressContacts.map((contact, i) => (
                                    <div key={i} className="py-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 block mb-1">{contact.role}</span>
                                            <p className="text-xs text-white/70 font-light leading-relaxed">{contact.desc}</p>
                                        </div>
                                        <div className="flex items-center sm:justify-end">
                                            <a
                                                href={`mailto:${contact.email}`}
                                                className="inline-flex items-center gap-2 text-xs font-mono text-white hover:text-white/70 transition-colors border-b border-white/30 hover:border-white/0 pb-0.5"
                                            >
                                                {contact.email}
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-white/20 pt-8">
                                <p className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                                    Response time · Within 48 business hours · Nairobi, Kenya (EAT, UTC+3)
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
