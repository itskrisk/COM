import { ArrowRight, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import LocationModal from './LocationModal';
import hero1Img from '../../assets/images/heroo1.jpg';
import hero2Img from '../../assets/images/heroo2.jpg';

export default function Hero() {
    const navigate = useNavigate();
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isPadOrMobile, setIsPadOrMobile] = useState(false);

    useEffect(() => {
        const checkDevice = () => {
            const hasTouch = (navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
            const isTabletOrPhoneUA = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

            // True for all phones, tablets, and iPads (including iPad Pro 13" in portrait & landscape)
            if ((hasTouch && isTabletOrPhoneUA) || window.innerWidth < 1024) {
                setIsPadOrMobile(true);
            } else {
                setIsPadOrMobile(false);
            }
        };

        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    return (
        <>
            <style>{`
                /* Ensure touch-screen tablets and iPads never get the desktop image */
                @media (hover: none) and (pointer: coarse) {
                    .desktop-hero-img { display: none !important; }
                    .mobile-pad-hero-img { display: block !important; }
                }
            `}</style>

            <section className="relative h-screen supports-[height:100dvh]:h-[100dvh] min-h-[580px] flex items-end bg-black text-white overflow-hidden pb-16 md:pb-20 px-8 md:px-16">
                {/* Background Imagery - Full bleed, fully filled under navbar */}
                <div className="absolute inset-0 z-0">
                    {/* Mobile & Tablet (All phones, tablets, and iPads): heroo1.jpg */}
                    <img
                        src={hero1Img}
                        alt="Muncheez Supermarkets"
                        className={`mobile-pad-hero-img ${isPadOrMobile ? 'block' : 'block lg:hidden'} w-full h-full object-cover object-center`}
                        loading="eager"
                    />

                    {/* Desktop Only: heroo2.jpg - fully fills the screen edge-to-edge */}
                    <img
                        src={hero2Img}
                        alt="Muncheez Supermarkets"
                        className={`desktop-hero-img ${isPadOrMobile ? 'hidden' : 'hidden lg:block'} w-full h-full object-cover object-center`}
                        loading="eager"
                    />

                    {/* Seamless baseline vignette ensuring text readability without obscuring photography */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 z-10" />
                </div>

                {/* Minimal Luxury Content - Unboxed & Clean */}
                <div className="relative z-20 w-full max-w-xl space-y-6">
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4AF37] block">
                            Muncheez
                        </span>
                        <h1 className="text-3xl md:text-4xl font-heading font-light tracking-tight text-white leading-tight">
                            Everything you crave, delivered.
                        </h1>
                    </div>

                    {/* Transparent Bottom-Line Search Trigger */}
                    <div
                        onClick={() => setIsLocationModalOpen(true)}
                        className="group cursor-pointer border-b border-white/30 hover:border-white transition-colors pb-3 flex items-center justify-between max-w-md pt-1"
                    >
                        <div className="flex items-center gap-3">
                            <Search size={15} className="text-white/40 group-hover:text-[#D4AF37] transition-colors" />
                            <span className="text-sm font-light text-white/50 group-hover:text-white transition-colors">
                                Enter delivery address...
                            </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 group-hover:text-white transition-colors flex items-center gap-1.5">
                            Locate <ArrowRight size={12} />
                        </span>
                    </div>

                    {/* Direct Explore Link */}
                    <div className="pt-2">
                        <Link
                            to="/stores?v=market"
                            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white hover:text-[#D4AF37] border-b border-white hover:border-[#D4AF37] pb-1 transition-colors"
                        >
                            Explore All Stores
                            <ArrowRight size={12} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Location Modal */}
            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onSelectLocation={() => {
                    setIsLocationModalOpen(false);
                    navigate('/stores?v=market');
                }}
            />
        </>
    );
}