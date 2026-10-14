import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search,
    MapPin,
    User,
    ShoppingBag,
    ArrowRight,
    Menu,
    X,
    LogOut,
} from 'lucide-react';
import LocationModal from '../../components/marketing/LocationModal';
import ProfileModal from '../../components/ui/shared/ProfileModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import { publicApi } from '../../lib/api';
import PageSEO from '../../components/SEO';

// 1. BRAND PILLARS (Functional FOUNDATIONS)
const SEGMENT_MAP: Record<string, { title: string; subtitle: string; description: string; categories: string[] }> = {
    'market': {
        title: "The Market",
        subtitle: "Supermarkets & Mama Mboga",
        description: "Full supermarket hauls and fresh produce from local stalls, handled with the respect they deserve.",
        categories: ['All', 'Supermarket', 'Mama Mboga', 'Snacks', 'Alcohol', 'Promotions']
    }
};

export default function StoreListing() {
    const navigate = useNavigate();
    const { user, profile, signOut } = useAuth();
    const [searchParams] = useSearchParams();
    const activeView = 'market';
    const activeTag = searchParams.get('tag'); // Get the deep-link tag
    const config = SEGMENT_MAP.market;

    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Location State
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [userLocation, setUserLocation] = useState('');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Load stores from Supabase
    useEffect(() => {
        loadStores();
    }, []);

    const loadStores = async () => {
        const result = await publicApi.getStores();
        if (result.data) {
            setStores(result.data);
        }
        setLoading(false);
    };

    const categories = config.categories;
    const isFiltered = searchQuery !== '' || activeCategory !== 'All' || !!activeTag;

    // Scroll Review: Ensure we start at the top when tag changes
    useEffect(() => {
        window.scrollTo(0, 0);
        if (activeTag) {
            setSearchQuery(activeTag.replace(/-/g, ' '));
        } else {
            setSearchQuery('');
        }
    }, [activeTag]);

    // Unified Market Data (Wired to Supabase)
    const MARKET_STORES = useMemo(() => {
        return stores.map((m: any) => ({
            id: m.id,
            name: m.business_name,
            promo: m.branding?.promo || '',
            status: 'Open',
            rating: m.rating ? `${m.rating}` : '--',
            count: m.review_count ? `(${m.review_count})` : '(0)',
            type: m.type,
            departments: m.branding?.departments || ['market'],
            tags: m.branding?.tags || [],
            actionText: 'Order Now',
            image: m.cover_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800',
            isTopRated: m.rating >= 4.5
        }));
    }, [stores]);

    // Filter logic
    const filteredMarketStores = MARKET_STORES.filter((store: any) => {
        // 1. Check category filter
        const matchesCategory = activeCategory === 'All'
            ? true
            : activeCategory === 'Promotions'
                ? !!store.promo
                : (store.type && store.type.toLowerCase() === activeCategory.toLowerCase());

        // 2. Check search query
        const lowerCaseSearchQuery = searchQuery.toLowerCase();
        const matchesSearch = store.name.toLowerCase().includes(lowerCaseSearchQuery) ||
            (store.tags && store.tags.some((tag: string) => tag.toLowerCase().includes(lowerCaseSearchQuery)));

        return matchesCategory && matchesSearch;
    });

    // --- Sub-Component: StoreCard ---
    const StoreCard = ({ store, idx }: { store: any, idx: number }) => (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => navigate(`/stores/${store.id}`)}
            className="group cursor-pointer"
        >
            {/* Glass Container */}
            <div className="relative aspect-[16/10] rounded-[2rem] overflow-hidden mb-4 shadow-2xl group-hover:shadow-black/20 transition-all duration-700">
                <img
                    src={store.image}
                    alt={store.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale-[0.1] group-hover:grayscale-0"
                />

                {/* Dynamic Promo Tag - Minimalist Sliver (No Border) */}
                {store.promo && (
                    <div className="absolute top-4 left-4 z-10">
                        <span className="text-[9px] font-black tracking-widest text-[#D4AF37] uppercase bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                            {store.promo}
                        </span>
                    </div>
                )}

                {/* Status Overlay for Closed Stores */}
                {store.status === 'Closed' && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-2xl">
                            Currently Closed
                        </span>
                    </div>
                )}

                {/* Minimalist Action Reveal - Corner Arrow */}
                <div className="absolute bottom-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 hover:bg-[#D4AF37] hover:border-[#D4AF37] hover:text-black">
                    <ArrowRight size={14} className="text-white group-hover:text-black transition-colors" />
                </div>
            </div>

            {/* Meta Content */}
            <div className="px-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                        {store.isTopRated && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Premium Selection</span>
                        )}
                        <h3 className="text-xl font-heading font-black tracking-tighter leading-tight transition-colors">
                            {store.name}
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-bold text-gray-700">
                    <span className={`${store.status.includes('Closed') ? 'text-amber-700' : 'text-green-600'}`}>
                        {store.status}
                    </span>

                    {store.rating !== '--' && (
                        <>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <div className="flex items-center gap-1.5 font-black text-gray-900">
                                <span>{store.rating}</span>
                                <span className="text-gray-400 font-medium">{store.count}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );

    // SVG Curves (Standardized from OurStory.tsx)
    const BottomCurve = ({ fill }: { fill: string }) => (
        <div className="absolute bottom-[-1px] left-0 w-full leading-[0] z-20 pointer-events-none">
            <svg viewBox="0 0 1440 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-[40px] md:h-[100px] block" preserveAspectRatio="none">
                <path fill={fill} fillOpacity="1" d="M0,0L48,10C96,20,192,40,288,50C384,60,480,60,576,50C672,40,768,20,864,15C960,10,1056,20,1152,30C1248,40,1344,50,1392,55L1440,60L1440,100L1392,100C1344,100,1248,100,1152,100C1056,100,960,100,864,100C768,100,672,100,576,100C480,100,384,100,288,100C192,100,96,100,48,100L0,100Z"></path>
            </svg>
        </div>
    );

    return (
        <div className="min-h-screen font-sans selection:bg-black selection:text-white overflow-x-hidden relative bg-black">
            <PageSEO
                title="The Market"
                description="Supermarkets, mama mboga stalls, snacks, and promotions across Nairobi. Browse the full Muncheez market and order delivery in minutes."
                path="/stores"
            />

            {/* 1. HEADER & ORIGIN - BLUE SECTION */}
            <section className="relative bg-[#4A90E2] text-white pt-6 pb-24 px-6 lg:px-12 overflow-hidden">
                <div className="absolute inset-0 z-[5] opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />

                {/* Brand Top Nav */}
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8 mb-16 relative z-30">
                    <div className="flex items-center gap-6">
                        {/* Hamburger for Mobile */}
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className="lg:hidden w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center border border-white/10 transition-colors"
                        >
                            <Menu size={20} />
                        </button>

                        <div onClick={() => navigate('/')} className="cursor-pointer flex items-center gap-2 shrink-0 text-2xl font-heading font-bold tracking-tighter">
                            Muncheez<span className="text-[#D4AF37]">.</span>
                        </div>

                        {/* Location - Restored (Interactive) */}
                        <div
                            onClick={() => setIsLocationModalOpen(true)}
                            className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full cursor-pointer hover:bg-white/10 transition-all"
                        >
                            <MapPin size={12} className="text-[#D4AF37]" />
                            <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]">
                                {userLocation || 'Set delivery location'}
                            </span>
                        </div>
                    </div>

                    {/* Integrated Search */}
                    <div className="flex-1 max-w-xl relative group">
                        <Search size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            placeholder="Find Nairobi's best..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 backdrop-blur-md rounded-full outline-none focus:bg-white/10 transition-all text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white text-black rounded-lg flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95"><ShoppingBag size={18} /></div>
                        <button
                            onClick={() => setIsProfileOpen(true)}
                            aria-label="Open account"
                            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95 shrink-0"
                        >
                            <span className="text-[11px] font-semibold tracking-tight text-white/90 leading-none select-none">
                                {profile?.full_name
                                    ? profile.full_name.split(' ').slice(0, 2).map((n: string) => n.charAt(0)).join('').toUpperCase()
                                    : <User size={15} className="text-white/70" />}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Location Modal */}
                <LocationModal
                    isOpen={isLocationModalOpen}
                    onClose={() => setIsLocationModalOpen(false)}
                    onSelectLocation={(loc) => {
                        setUserLocation(loc);
                        setIsLocationModalOpen(false);
                    }}
                />

                {/* Profile Modal */}
                <ProfileModal
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                />

                {/* High-End Mobile Menu Overlay (Matching Home Navbar) */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-3xl pt-28 px-8 flex flex-col justify-between pb-12"
                        >
                            {/* Mobile Menu Logo */}
                            <button
                                onClick={() => { setIsMenuOpen(false); navigate('/'); }}
                                className="absolute top-8 left-8 flex items-center gap-2 group text-left"
                            >
                                <span className="font-heading font-bold text-2xl tracking-tighter text-white">
                                    Muncheez<span className="text-[#4A90E2]">.</span>
                                </span>
                            </button>

                            {/* Close Button */}
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="absolute top-8 right-8 p-3 text-white/50 hover:text-white transition-colors"
                            >
                                <X size={28} strokeWidth={1.5} />
                            </button>

                            {/* Navigation Links */}
                            <div className="flex flex-col gap-6 mt-6">
                                {[
                                    { label: 'The Market', path: '/stores?v=market' },
                                    { label: 'Home', path: '/' },
                                    { label: 'Our Story', path: '/company/story' }
                                ].map((link, i) => (
                                    <motion.button
                                        key={link.label}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.1 + (i * 0.04) }}
                                        onClick={() => { navigate(link.path); setIsMenuOpen(false); }}
                                        className="flex items-center gap-4 group text-left"
                                    >
                                        <span className="text-[#4A90E2]/60 font-mono text-xs group-hover:text-[#4A90E2] transition-colors pt-0.5">
                                            0{i + 1}
                                        </span>
                                        <span className="text-lg font-heading font-light tracking-wide text-white group-hover:text-[#4A90E2] transition-colors">
                                            {link.label}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>

                            {/* Auth & Profile Actions */}
                            <div className="flex flex-col gap-3 mt-8">
                                {user ? (
                                    <button
                                        onClick={() => { setIsMenuOpen(false); setIsProfileOpen(true); }}
                                        className="w-full py-3.5 px-6 bg-[#4A90E2] text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-between shadow-lg"
                                    >
                                        <span>{profile?.full_name || user.email?.split('@')[0] || 'My Profile'}</span>
                                        <User size={16} />
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => { setIsMenuOpen(false); navigate('/login'); }}
                                            className="w-full py-3.5 text-center text-xs font-bold uppercase tracking-widest bg-white text-black rounded-xl hover:bg-gray-100 transition-all"
                                        >
                                            Log In
                                        </button>
                                        <button
                                            onClick={() => { setIsMenuOpen(false); navigate('/signup'); }}
                                            className="w-full py-3.5 text-center text-xs font-bold uppercase tracking-widest border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all"
                                        >
                                            Create Account
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Atmospheric Title Section */}
                <div className="max-w-7xl mx-auto relative z-20 mb-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.4em] block blur-[0.3px]">{config.subtitle}</span>
                            <h1 className="text-4xl md:text-8xl font-heading font-light tracking-tighter text-white leading-none">
                                {config.title}
                            </h1>
                        </div>
                        <p className="text-white/30 text-xs md:text-sm max-w-sm font-medium leading-relaxed opacity-80">
                            {config.description}
                        </p>
                    </div>
                </div>

                <BottomCurve fill="#D4AF37" />
            </section>

            {/* 2. CATEGORIES & STORES - YELLOW SECTION */}
            <section className="relative bg-[#D4AF37] text-gray-900 pt-16 pb-48 px-6 lg:px-12 overflow-hidden">
                <div className="absolute inset-0 z-[5] opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-multiply" />

                <div className="max-w-7xl mx-auto relative z-20">
                    {/* Category Filter Pills & Reset */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-black text-white shadow-xl' : 'bg-black/5 text-black/40 hover:bg-black/10'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Reset Filter UI */}
                        {isFiltered && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={() => {
                                    setSearchQuery('');
                                    setActiveCategory('All');
                                }}
                                className="flex items-center gap-2 px-6 py-3 bg-black/10 hover:bg-black/20 rounded-full transition-all group shrink-0"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest">Clear Discovery</span>
                                <X size={14} className="group-hover:rotate-90 transition-transform" />
                            </motion.button>
                        )}
                    </div>

                    {/* Store Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                        <AnimatePresence mode='popLayout'>
                            {filteredMarketStores.map((store: any, idx: number) => (
                                <StoreCard key={store.id} store={store} idx={idx} />
                            ))}
                        </AnimatePresence>
                    </div>

                    {filteredMarketStores.length === 0 && (
                        <div className="text-center py-32">
                            <ShoppingBag size={64} className="mx-auto text-black/10 mb-6" />
                            <h3 className="text-3xl font-heading font-black mb-2">No matches found</h3>
                            <p className="text-black/40 font-medium">Try searching for something else or clearing your filters.</p>
                        </div>
                    )}
                </div>
            </section>

            <Footer />
        </div>
    );
}
