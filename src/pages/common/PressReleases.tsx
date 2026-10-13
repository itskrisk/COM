import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import PageSEO from '../../components/SEO';

/**
 * PRESS RELEASES: Full Archive
 * Sequence: Blue (#4A90E2) header → Gold (#D4AF37) timeline → Blue closing → Footer
 * Rules: NO black, NO white sections, NO card boxes, NO rounded containers
 */

const BottomCurve = ({ fill }: { fill: string }) => (
    <div className="absolute bottom-[-1px] left-0 w-full leading-[0] z-20">
        <svg viewBox="0 0 1440 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-[60px] md:h-[100px] block" preserveAspectRatio="none">
            <path fill={fill} fillOpacity="1" d="M0,0L48,10C96,20,192,40,288,50C384,60,480,60,576,50C672,40,768,20,864,15C960,10,1056,20,1152,30C1248,40,1344,50,1392,55L1440,60L1440,100L1392,100C1056,100,960,100,864,100C768,100,672,100,576,100C480,100,384,100,288,100C192,100,96,100,48,100L0,100Z"></path>
        </svg>
    </div>
);

const releases = [
    {
        date: 'October 2026',
        tag: 'Launch',
        headline: 'Muncheez Technologies Launches Hyper-Local Delivery Platform in Nairobi',
        body: [
            'Muncheez Technologies Ltd. today announced the official launch of its hyper-local delivery platform in Nairobi, Kenya. The platform connects consumers with the city\'s best kitchens, supermarkets, pharmacies, and retail merchants through a single intelligent logistics network.',
            'The launch follows months of pilot operations across Nairobi\'s primary urban corridors, where the dispatch engine was refined to consistently meet sub-30 minute delivery SLAs in dense traffic.',
            '"Nairobi\'s merchants deserve infrastructure built for how this city actually moves," said the founding team. "Muncheez is not another marketplace. It is the logistics engine underneath the city\'s commerce."',
        ],
    },
    {
        date: 'September 2026',
        tag: 'Technology',
        headline: 'Muncheez Introduces Real-Time Dispatch AI for Sub-30 Minute Delivery SLAs',
        body: [
            'Muncheez Technologies has deployed a new dispatch intelligence layer across its Nairobi operations, reducing average delivery times across all categories and setting a new standard for last-mile logistics in East Africa.',
            'The system pairs real-time route telemetry with automated batch routing, enabling the platform to dispatch courier fleets without a single manual call. Merchants receive live order terminals; consumers receive live route tracking from kitchen to door.',
            'The dispatch engine is the foundation of Muncheez\'s three-sided marketplace architecture: consumers, merchants, and fleet navigators operating on a single synchronized network.',
        ],
    },
    {
        date: 'August 2026',
        tag: 'Expansion',
        headline: 'Supermarket Express Category Goes Live Across Nairobi',
        body: [
            'Muncheez has expanded beyond food delivery with the launch of Supermarket Express, with same-hour grocery delivery from major supermarket chains and local Mama Mboga vendors across Nairobi.',
            'The new category extends the platform\'s logistics rails to everyday essentials, from pantry staples to fresh produce, with the same sub-30 minute dispatch precision that defined its culinary launch.',
            'Supermarket Express marks the first step in Muncheez\'s multi-vertical roadmap: food, grocery, pharmacy, and retail, all moving on one urban commerce operating system.',
        ],
    },
    {
        date: 'July 2026',
        tag: 'Operations',
        headline: 'Muncheez Opens Courier Fleet Enrollment for Nairobi Riders',
        body: [
            'Muncheez Technologies opened enrollment for its courier fleet network, inviting Nairobi\'s riders to join a logistics operation built around fair earnings, instant digital wallet payouts, and career dignity.',
            'Fleet navigators operate through a dedicated mobile application with automated batch routing, live telemetry, and telematics-backed safety support. No phone calls, no manual dispatching, no guesswork.',
            'The program is part of Muncheez\'s commitment to building sustainable economic value for every side of its marketplace: consumers, merchants, and the riders who power the network.',
        ],
    },
    {
        date: 'June 2026',
        tag: 'Company',
        headline: 'Muncheez Technologies Ltd. Incorporated in Kenya',
        body: [
            'Muncheez Technologies Ltd. has been formally incorporated in Kenya (Registration No. CPR/2026/MUNCHEEZ), establishing its headquarters in Nairobi as the foundation for East Africa\'s premier hyper-local logistics engine.',
            'The company was founded on a simple realization: food is the ultimate stress test for last-mile logistics. Mastering the movement of temperature-sensitive meals through Nairobi\'s urban density proved the architecture for everything that follows.',
            'Muncheez now operates as a three-sided platform marketplace spanning food, grocery, pharmacy, and retail, with expansion across major commercial corridors planned through 2027.',
        ],
    },
];

export default function PressReleases() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#4A90E2] text-white font-sans selection:bg-white selection:text-[#4A90E2] overflow-x-hidden">
            <Navbar />
            <PageSEO
                title="Press Releases"
                description="Official statements, launch announcements, and company news from Muncheez Technologies Ltd."
                path="/company/news/press-releases"
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
                        Press &amp; Media · Muncheez Technologies
                    </span>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading font-light tracking-tighter text-white leading-[0.95] mb-6">
                        Press <span className="font-bold">Releases.</span>
                    </h1>
                    <p className="text-sm md:text-base text-white/80 font-light leading-relaxed max-w-2xl">
                        Launch announcements, company updates, and official statements. For media enquiries, reach the communications team directly.
                    </p>
                </div>

                <BottomCurve fill="#D4AF37" />
            </header>

            {/* ── Release Timeline: GOLD (#D4AF37) ── */}
            <main className="relative bg-[#D4AF37] text-gray-900 px-6 md:px-16 py-20 md:py-28 pb-28">
                <div className="absolute inset-0 z-[5] opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-multiply" />
                <div className="relative z-10">
                    <div className="divide-y divide-gray-900/15 border-t border-b border-gray-900/15">
                        {releases.map((release, i) => (
                            <motion.article
                                key={i}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: i * 0.05 }}
                                className="py-12 md:py-16 grid grid-cols-1 md:grid-cols-12 gap-8"
                            >
                                <div className="md:col-span-3">
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-900/50 block mb-2">{release.date}</span>
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-[#4A90E2]">{release.tag}</span>
                                </div>
                                <div className="md:col-span-9 space-y-6">
                                    <h2 className="text-2xl md:text-3xl font-heading font-light text-gray-900 leading-snug tracking-tight">
                                        {release.headline}
                                    </h2>
                                    {release.body.map((paragraph, j) => (
                                        <p key={j} className="text-sm md:text-base text-gray-900/75 font-light leading-relaxed max-w-3xl">
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            </motion.article>
                        ))}
                    </div>

                    {/* ── Archive Note ── */}
                    <div className="pt-16 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <p className="text-xs text-gray-900/60 font-light leading-relaxed max-w-xl">
                            Looking for older releases, media assets, or interview coordination? The communications team handles all editorial requests.
                        </p>
                        <a
                            href="mailto:press@muncheez.com"
                            className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-900 border-b border-gray-900/30 pb-1 hover:text-[#4A90E2] hover:border-[#4A90E2] transition-colors group shrink-0"
                        >
                            <Mail size={12} /> press@muncheez.com <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                    </div>
                </div>

                <BottomCurve fill="#4A90E2" />
            </main>

            <Footer />
        </div>
    );
}
