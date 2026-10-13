import { motion } from 'framer-motion';
import { ArrowLeft, Download, FileText, Image as ImageIcon, Type, Palette, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

/**
 * BRAND & MEDIA KIT: Official Assets for Press & Media
 * Canvas: Gold (#D4AF37) · Text: Gray-900
 * Rules: NO black, NO card boxes, NO rounded containers
 */

const assetGroups = [
    {
        label: 'Asset 01',
        icon: ImageIcon,
        title: 'Logos',
        desc: 'The complete Muncheez wordmark and mark suite. Primary, stacked, and monochrome variants for editorial, digital, and print use.',
        files: ['Muncheez_Wordmark_Primary.svg', 'Muncheez_Wordmark_Stacked.svg', 'Muncheez_Mark_Mono.svg', 'Muncheez_Wordmark_Light.png', 'Muncheez_Wordmark_Dark.png'],
        action: 'Download Logo Pack',
    },
    {
        label: 'Asset 02',
        icon: Palette,
        title: 'Brand Guidelines',
        desc: 'Official color palette, typography system, spacing rules, and usage guidelines for editorial and co-branded materials.',
        files: ['Muncheez_Brand_Guidelines.pdf', 'Muncheez_Color_Palette.ase', 'Muncheez_Typography_Spec.pdf'],
        action: 'View Guidelines',
    },
    {
        label: 'Asset 03',
        icon: Type,
        title: 'Typography',
        desc: 'The Muncheez type system. Outfit for headlines, Plus Jakarta Sans for body, with licensed usage for press layouts.',
        files: ['Muncheez_Type_Scale.pdf', 'Outfit_Family.zip', 'PlusJakartaSans_Family.zip'],
        action: 'Get Type Files',
    },
    {
        label: 'Asset 04',
        icon: FileText,
        title: 'Press Images',
        desc: 'High-resolution editorial photography of the platform, operations, team, and Nairobi corridors, cleared for media use.',
        files: ['Muncheez_Press_Kit_2026.zip', 'Operations_Hero_01.jpg', 'Operations_Hero_02.jpg', 'Team_Portraits.zip', 'City_Corridors.zip'],
        action: 'View Gallery',
    },
];

const usageRules = [
    { rule: 'Do', text: 'Use the primary wordmark on clean, uncluttered layouts with clear breathing room.' },
    { rule: 'Do', text: 'Request the full press kit for launch coverage and feature stories.' },
    { rule: 'Don\'t', text: 'Recolor, stretch, or re-typeset the Muncheez wordmark.' },
    { rule: 'Don\'t', text: 'Use press imagery in advertising without written approval.' },
];

export default function MediaKit() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#D4AF37] text-gray-900 font-sans selection:bg-white selection:text-gray-900 overflow-x-hidden">
            <Navbar />

            {/* ── Back ── */}
            <div className="px-6 md:px-16 pt-28">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-gray-900/60 hover:text-gray-900 text-[11px] font-bold tracking-[0.3em] uppercase transition-colors group cursor-pointer"
                >
                    <ArrowLeft size={14} strokeWidth={2} className="group-hover:-translate-x-1 transition-transform" />
                    Back
                </button>
            </div>

            {/* ── Header ── */}
            <header className="px-6 md:px-16 pt-10 pb-16 md:pb-24">
                <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-gray-900/50 mb-6 block font-mono">
                    Press &amp; Media · Muncheez Technologies
                </span>
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading font-light tracking-tighter text-gray-900 leading-[0.95] mb-6">
                    Brand &amp; Media <span className="font-bold">Kit.</span>
                </h1>
                <p className="text-sm md:text-base text-gray-900/70 font-light leading-relaxed max-w-2xl">
                    Official logos, guidelines, typography, and press photography. All assets are cleared for editorial and media use unless stated otherwise.
                </p>
            </header>

            {/* ── Asset Groups ── */}
            <main className="px-6 md:px-16 pb-28">
                <div className="divide-y divide-gray-900/15 border-t border-b border-gray-900/15">
                    {assetGroups.map((group, i) => (
                        <motion.section
                            key={i}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.06 }}
                            className="py-12 md:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8"
                        >
                            <div className="lg:col-span-4 flex items-start gap-4">
                                <group.icon size={22} strokeWidth={1.5} className="shrink-0 mt-1 text-gray-900/70" />
                                <div>
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-900/50 block mb-2">{group.label}</span>
                                    <h2 className="text-2xl md:text-3xl font-heading font-light text-gray-900 tracking-tight">{group.title}</h2>
                                </div>
                            </div>
                            <div className="lg:col-span-8">
                                <p className="text-sm md:text-base text-gray-900/70 font-light leading-relaxed max-w-2xl mb-8">
                                    {group.desc}
                                </p>
                                <div className="border-t border-gray-900/15 pt-6 space-y-2 mb-8">
                                    {group.files.map((file, j) => (
                                        <p key={j} className="text-xs font-mono text-gray-900/60 tracking-wide">{file}</p>
                                    ))}
                                </div>
                                <button className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-900 border-b-2 border-gray-900 pb-1 hover:text-white hover:border-white transition-colors group cursor-pointer">
                                    <Download size={12} className="group-hover:-translate-y-0.5 transition-transform" />
                                    {group.action} <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </motion.section>
                    ))}
                </div>

                {/* ── Usage Rules ── */}
                <section className="pt-24">
                    <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-gray-900/50 block mb-8">Usage Rules</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        {usageRules.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.05 }}
                                className="border-t border-gray-900/15 pt-6 space-y-2"
                            >
                                <span className={`text-[10px] font-mono font-bold uppercase tracking-widest block ${item.rule === 'Do' ? 'text-gray-900' : 'text-gray-900/50'}`}>
                                    {item.rule}
                                </span>
                                <p className="text-sm text-gray-900/75 font-light leading-relaxed">{item.text}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="pt-16">
                        <p className="text-xs text-gray-900/50 font-light leading-relaxed max-w-xl mb-6">
                            Need a custom asset, embargoed materials, or interview coordination? The communications team handles all media requests.
                        </p>
                        <a
                            href="mailto:press@muncheez.com"
                            className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-900 border-b border-gray-900/30 pb-1 hover:border-gray-900/70 transition-colors group"
                        >
                            press@muncheez.com <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
