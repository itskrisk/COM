import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Search,
    MapPin,
    ShoppingBag,
    User,
    Tag,
    X,
    ChevronDown,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

interface StorefrontNavProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    searchPlaceholder?: string;
    userLocation: string;
    onOpenLocation: () => void;
    onOpenProfile: (initialView?: 'main' | 'orders') => void;
    onCategoriesClick?: () => void;
    onOffersClick?: () => void;
    activeCategory?: string;
    currentTab?: 'home' | 'categories' | 'orders' | 'account' | 'offers';
}

export default function StorefrontNav({
    searchQuery,
    onSearchChange,
    searchPlaceholder = 'Search products, essentials...',
    userLocation,
    onOpenLocation,
    onOpenProfile,
    onCategoriesClick,
    onOffersClick,
    activeCategory,
    currentTab = 'home'
}: StorefrontNavProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, profile } = useAuth();
    const { itemCount } = useCart();

    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const mobileSearchInputRef = useRef<HTMLInputElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // Auto-focus mobile search input when opened
    useEffect(() => {
        if (isMobileSearchOpen) {
            setTimeout(() => {
                mobileSearchInputRef.current?.focus();
            }, 100);
        }
    }, [isMobileSearchOpen]);

    // Close profile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const userDisplayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Account';
    const userInitials = (profile?.full_name || user?.email || 'U')
        .split(' ')
        .slice(0, 2)
        .map((n: string) => n.charAt(0))
        .join('')
        .toUpperCase();

    const handleCartClick = () => {
        const cartItems = JSON.parse(localStorage.getItem('muncheez_cart_items') || '[]');
        if (cartItems.length > 0) {
            window.dispatchEvent(new CustomEvent('open-glass-cart'));
        } else {
            navigate('/checkout');
        }
    };

    const handleHomeClick = () => {
        if (location.pathname === '/stores') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            navigate('/stores?v=market');
        }
    };

    const handleCategoriesClick = () => {
        if (onCategoriesClick) {
            onCategoriesClick();
        } else if (location.pathname !== '/stores') {
            navigate('/stores?v=market#categories');
        } else {
            const el = document.getElementById('store-categories');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 260, behavior: 'smooth' });
            }
        }
    };

    const handleOffersClick = () => {
        if (onOffersClick) {
            onOffersClick();
        } else if (location.pathname !== '/stores') {
            navigate('/stores?v=market&tag=promotions');
        } else {
            onSearchChange('Promotions');
        }
    };

    return (
        <header className="relative z-40 w-full border-b border-white/10 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* ═══ PRIMARY TOP BAR ═══ */}
                <div className="flex items-center justify-between gap-3 sm:gap-6 py-3 md:py-4">
                    
                    {/* 1. BRAND & DELIVERY LOCATION */}
                    <div className="flex items-center gap-3 sm:gap-6 shrink-0 min-w-0">
                        {/* Muncheez Logo */}
                        <button
                            onClick={() => navigate('/')}
                            className="group flex items-center text-xl sm:text-2xl font-heading font-black tracking-tighter text-white hover:opacity-90 transition-opacity shrink-0"
                            aria-label="Muncheez Home"
                        >
                            Muncheez<span className="text-[#D4AF37]">.</span>
                        </button>

                        {/* Visible Address Selector (Mobile & Web) */}
                        <button
                            onClick={onOpenLocation}
                            className="flex items-center gap-1.5 text-left border-b border-white/20 hover:border-[#D4AF37] pb-0.5 transition-colors group cursor-pointer max-w-[120px] xs:max-w-[150px] sm:max-w-[200px]"
                            title={userLocation || 'Select delivery location'}
                            aria-label="Delivery location selector"
                        >
                            <MapPin size={12} className="text-[#D4AF37] shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] sm:text-xs font-medium text-white/90 truncate tracking-wide">
                                {userLocation || 'Select location'}
                            </span>
                            <ChevronDown size={10} className="text-white/40 shrink-0 hidden sm:inline" />
                        </button>
                    </div>

                    {/* 2. WEB PERSISTENT SEARCH & MAIN NAVIGATION (Desktop / Tablet) */}
                    <div className="hidden lg:flex items-center flex-1 max-w-2xl mx-4 gap-6">
                        {/* Persistent Search Field */}
                        <div className="flex-1 relative flex items-center border-b border-white/20 focus-within:border-[#D4AF37] transition-colors py-1">
                            <Search size={14} className="text-white/40 shrink-0 mr-2.5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full bg-transparent text-xs text-white placeholder-white/30 outline-none font-sans"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => onSearchChange('')}
                                    className="text-white/40 hover:text-white p-1 transition-colors"
                                    aria-label="Clear search"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Main Navigation Links (Desktop) */}
                        <nav className="flex items-center gap-6 shrink-0 text-[11px] font-bold tracking-widest uppercase">
                            <button
                                onClick={handleHomeClick}
                                className={`transition-colors hover:text-[#D4AF37] border-b pb-0.5 ${
                                    currentTab === 'home' && !activeCategory ? 'border-[#D4AF37] text-white' : 'border-transparent text-white/70'
                                }`}
                            >
                                Home
                            </button>
                            <button
                                onClick={handleCategoriesClick}
                                className={`transition-colors hover:text-[#D4AF37] border-b pb-0.5 ${
                                    activeCategory ? 'border-[#D4AF37] text-white' : 'border-transparent text-white/70'
                                }`}
                            >
                                Categories
                            </button>
                            <button
                                onClick={handleOffersClick}
                                className="transition-colors text-[#D4AF37] hover:text-white flex items-center gap-1 border-b border-transparent pb-0.5"
                            >
                                <Tag size={11} />
                                Offers
                            </button>
                        </nav>
                    </div>

                    {/* 3. RIGHT ICONS: SEARCH TOGGLE (Mobile/Tablet) + CART + ACCOUNT */}
                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        
                        {/* Search Icon (Mobile & Tablet - opens search) */}
                        <button
                            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                            className="lg:hidden text-white/80 hover:text-white p-2 transition-colors cursor-pointer"
                            aria-label="Toggle search field"
                        >
                            {isMobileSearchOpen ? <X size={19} /> : <Search size={19} />}
                        </button>

                        {/* Shopping Bag with item count */}
                        <button
                            onClick={handleCartClick}
                            className="relative p-2 text-white/90 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            aria-label="Shopping Cart"
                        >
                            <ShoppingBag size={20} />
                            {itemCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 bg-[#D4AF37] text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-black shadow-sm">
                                    {itemCount > 99 ? '99+' : itemCount}
                                </span>
                            )}
                        </button>

                        {/* Account Menu Button & Dropdown (Mobile & Web) */}
                        <div className="relative" ref={profileMenuRef}>
                            <button
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="flex items-center gap-2 text-left group border-b border-transparent hover:border-white/30 pb-0.5 transition-colors cursor-pointer p-1"
                                aria-label="Account Profile Menu"
                            >
                                <span className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-[#D4AF37] group-hover:text-black flex items-center justify-center text-[10px] font-black text-white transition-colors">
                                    {user ? userInitials : <User size={14} />}
                                </span>
                                <span className="text-xs font-semibold text-white/90 tracking-tight max-w-[90px] truncate hidden sm:inline">
                                    {user ? userDisplayName : 'Account'}
                                </span>
                                <ChevronDown size={11} className="text-white/40 group-hover:text-white transition-colors" />
                            </button>

                            {/* Unboxed Clean White Profile Dropdown */}
                            <AnimatePresence>
                                {isProfileMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        transition={{ duration: 0.18 }}
                                        className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 shadow-2xl py-2 z-50 text-gray-900"
                                    >
                                        <div className="px-4 py-2.5 border-b border-gray-100 mb-1">
                                            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Signed in as</p>
                                            <p className="text-xs font-bold text-gray-900 truncate">{user?.email || 'Guest User'}</p>
                                        </div>

                                        <button
                                            onClick={() => { setIsProfileMenuOpen(false); onOpenProfile('main'); }}
                                            className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:text-black hover:bg-gray-50 flex items-center justify-between transition-colors font-medium"
                                        >
                                            <span>My Account</span>
                                            <User size={14} className="text-gray-400" />
                                        </button>

                                        <button
                                            onClick={() => { setIsProfileMenuOpen(false); onOpenProfile('orders'); }}
                                            className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:text-black hover:bg-gray-50 flex items-center justify-between transition-colors font-medium"
                                        >
                                            <span>My Orders</span>
                                            <Clock size={14} className="text-gray-400" />
                                        </button>

                                        <button
                                            onClick={() => { setIsProfileMenuOpen(false); onOpenLocation(); }}
                                            className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:text-black hover:bg-gray-50 flex items-center justify-between transition-colors font-medium"
                                        >
                                            <span>Delivery Location</span>
                                            <MapPin size={14} className="text-gray-400" />
                                        </button>

                                        {!user ? (
                                            <div className="mt-1 pt-1.5 border-t border-gray-100 px-4 py-1">
                                                <button
                                                    onClick={() => { setIsProfileMenuOpen(false); navigate('/login'); }}
                                                    className="w-full py-2 text-center text-xs font-bold uppercase tracking-wider text-black bg-gray-100 hover:bg-gray-200 transition-colors"
                                                >
                                                    Sign In / Register
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="mt-1 pt-1.5 border-t border-gray-100 px-4 py-1">
                                                <button
                                                    onClick={() => { setIsProfileMenuOpen(false); onOpenProfile('main'); }}
                                                    className="w-full py-1 text-left text-[11px] font-semibold text-red-600 hover:text-red-700"
                                                >
                                                    Sign Out
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                    </div>

                </div>

                {/* ═══ MOBILE EXPANDABLE SEARCH BAR ═══ */}
                <AnimatePresence>
                    {isMobileSearchOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="lg:hidden pb-3 pt-1 border-t border-white/10 overflow-hidden"
                        >
                            <div className="flex items-center border-b border-[#D4AF37] py-1.5">
                                <Search size={15} className="text-[#D4AF37] mr-2 shrink-0" />
                                <input
                                    ref={mobileSearchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full bg-transparent text-xs text-white placeholder-white/30 outline-none font-sans"
                                />
                                {searchQuery ? (
                                    <button
                                        onClick={() => onSearchChange('')}
                                        className="text-white/40 hover:text-white p-1"
                                        aria-label="Clear text"
                                    >
                                        <X size={14} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsMobileSearchOpen(false)}
                                        className="text-white/40 hover:text-white text-[10px] font-mono uppercase tracking-wider pl-2"
                                    >
                                        Close
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ═══ MOBILE RESPONSIVE NAVIGATION ROW (Home, Categories, Offers) ═══ */}
                <nav
                    className="lg:hidden border-t border-white/10 py-2.5 flex items-center justify-center gap-8 text-[11px] font-bold tracking-widest uppercase"
                    aria-label="Storefront Mobile Navigation"
                >
                    <button
                        onClick={handleHomeClick}
                        className={`transition-colors whitespace-nowrap pb-0.5 border-b ${
                            currentTab === 'home' && !activeCategory ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-white/70 hover:text-white'
                        }`}
                    >
                        Home
                    </button>
                    <button
                        onClick={handleCategoriesClick}
                        className={`transition-colors whitespace-nowrap pb-0.5 border-b ${
                            activeCategory ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-white/70 hover:text-white'
                        }`}
                    >
                        Categories
                    </button>
                    <button
                        onClick={handleOffersClick}
                        className="transition-colors whitespace-nowrap pb-0.5 text-[#D4AF37] hover:text-white flex items-center gap-1 border-b border-transparent"
                    >
                        <Tag size={11} />
                        Offers
                    </button>
                </nav>

            </div>
        </header>
    );
}
