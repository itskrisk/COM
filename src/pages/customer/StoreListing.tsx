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
import StorefrontNav from '../../components/layout/StorefrontNav';
import LocationModal from '../../components/marketing/LocationModal';
import ProfileModal from '../../components/ui/shared/ProfileModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import { useProfileGuard } from '../../hooks/useProfileGuard';
import { publicApi } from '../../lib/api';
import PageSEO from '../../components/SEO';
import { supabase } from '../../lib/supabaseClient';

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
    const { user, profile, signOut, refreshUser } = useAuth();
    const [searchParams] = useSearchParams();
    const activeView = 'market';
    const activeTag = searchParams.get('tag');
    const config = SEGMENT_MAP.market;

    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Location State - synced between localStorage and Supabase profile
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [userLocation, setUserLocation] = useState('');
    const { isOpen: isProfileOpen, open: openProfile, close: closeProfile, initialView } = useProfileGuard();

    // Sync location from profile or localStorage on mount/profile change
    useEffect(() => {
        const profileLocation = profile?.location_preferences?.neighborhood;
        const storageLocation = localStorage.getItem('muncheez_delivery_address');
        const fallback = profileLocation || storageLocation || '';
        setUserLocation(fallback);
    }, [profile]);

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

    // Unified location handler - saves to both localStorage and Supabase profile
    const handleLocationSelect = async (loc: string) => {
        setUserLocation(loc);
        localStorage.setItem('muncheez_delivery_address', loc);
        
        if (user?.id) {
            try {
                await supabase
                    .from('profiles')
                    .update({ 
                        location_preferences: { 
                            neighborhood: loc,
                            delivery_notes: profile?.location_preferences?.delivery_notes || ''
                        } 
                    })
                    .eq('id', user.id);
                refreshUser();
            } catch (err) {
                console.error('Failed to save location to profile:', err);
            }
        }
    };

    // Unified Market Data (Wired to Supabase)
    const MARKET_STORES = useMemo(() => {
        return stores.map((m: any) => ({
            id: m.id,
            name: m.business_name || 'Supermarket',
            promo: m.branding?.promo || '',
            status: m.is_active ? 'Open' : 'Closed',
            rating: m.rating ? `${m.rating}` : '--',
            count: m.review_count ? `(${m.review_count})` : '(0)',
            type: m.type || 'Supermarket',
            departments: m.branding?.departments || ['market'],
            tags: m.branding?.tags || [],
            actionText: 'Order Now',
            image: m.cover_url || m.logo_url || m.branding?.bannerUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800',
            isTopRated: m.rating >= 4.5,
            operatingHours: m.operating_hours?.hours || '08:00 AM - 10:00 PM',
            deliverySpeed: `${m.pack_time_min ? m.pack_time_min + 15 : 35} mins`,
            deliveryFee: m.delivery_fee ? `KES ${m.delivery_fee}` : 'KES 150',
            address: m.address || 'Nairobi'
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
            <div className="relative aspect-[4/3] sm:aspect-[16/10] rounded-2xl sm:rounded-[2rem] overflow-hidden mb-2 sm:mb-4 shadow-xl group-hover:shadow-black/20 transition-all duration-700">
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

                {/* Speed / Delivery Badge */}
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
                    <span className="text-[9px] font-black tracking-wider text-white uppercase bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full">
                        ⚡ {store.deliverySpeed}
                    </span>
                </div>

                {/* Status Overlay for Closed Stores */}
                {store.status === 'Closed' && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
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
            <div className="px-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        {store.isTopRated && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] shrink-0">Top Selection</span>
                        )}
                        <h3 className="text-sm sm:text-xl font-heading font-black tracking-tighter leading-tight transition-colors truncate">
                            {store.name}
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-[11px] font-bold text-gray-700 flex-wrap">
                    <span className={`${store.status.includes('Closed') ? 'text-amber-700' : 'text-green-600'}`}>
                        {store.status}
                    </span>

                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="text-gray-500 font-medium text-[10px]">
                        🕒 {store.operatingHours}
                    </span>

                    {store.rating !== '--' && (
                        <>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <div className="flex items-center gap-1.5 font-black text-gray-900">
                                <span>★ {store.rating}</span>
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

                {/* Storefront Navigation (Desktop & Mobile) */}
                <StorefrontNav
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Find Nairobi's best fresh foods, groceries..."
                    userLocation={userLocation}
                    onOpenLocation={() => setIsLocationModalOpen(true)}
                    onOpenProfile={(view) => openProfile(view)}
                    activeCategory={activeCategory !== 'All' ? activeCategory : undefined}
                    onCategoriesClick={() => {
                        const el = document.getElementById('store-categories');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    onOffersClick={() => setActiveCategory('Promotions')}
                    currentTab={activeCategory === 'Promotions' ? 'offers' : 'home'}
                />

                {/* Location Modal */}
                <LocationModal
                    isOpen={isLocationModalOpen}
                    onClose={() => setIsLocationModalOpen(false)}
                    onSelectLocation={handleLocationSelect}
                />

                {/* Profile Modal */}
                <ProfileModal
                    isOpen={isProfileOpen}
                    onClose={() => closeProfile()}
                    initialView={initialView}
                />

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

                <div id="store-categories" className="max-w-7xl mx-auto relative z-20">
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
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 lg:gap-12">
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
