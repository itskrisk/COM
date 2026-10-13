import { useState } from 'react';
import { Instagram, Facebook, Twitter, Linkedin, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import appStoreIcon from "../../assets/app-store-icon.png";
import googlePlayIcon from "../../assets/google-play-icon.png";
import CookieModal from '../ui/shared/CookieModal';

export default function Footer() {
    const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

    const handleNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newsletterEmail.trim()) {
            setNewsletterSubscribed(true);
            setTimeout(() => {
                setNewsletterEmail('');
            }, 3000);
        }
    };

    return (
        <footer className="bg-[#121214] text-white relative z-50 border-t border-white/10" id="contact">
            <div className="container mx-auto px-6 lg:px-12">

                {/* Newsletter Strip */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 py-12 border-b border-white/10">
                    <div className="max-w-xl">
                        <h3 className="text-3xl md:text-5xl font-heading font-light tracking-tight text-white mb-3">
                            Join the Fam<span className="text-[#4A90E2]">.</span>
                        </h3>
                        <p className="text-zinc-400 font-light leading-relaxed text-xs md:text-sm">
                            Exclusive deals, city favorites, and updates delivered to your inbox.
                        </p>
                    </div>

                    <div className="w-full lg:w-auto">
                        <form className="flex flex-col w-full md:w-96" onSubmit={handleNewsletterSubmit}>
                            <div className="relative flex items-center">
                                <input
                                    type="email"
                                    required
                                    value={newsletterEmail}
                                    onChange={(e) => setNewsletterEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    className="bg-transparent border-b border-white/25 text-white w-full pb-3 pr-10 text-sm focus:outline-none focus:border-[#4A90E2] transition-colors placeholder:text-zinc-500"
                                />
                                <button
                                    type="submit"
                                    aria-label="Subscribe to newsletter"
                                    className="absolute right-0 bottom-3 text-white/70 hover:text-[#4A90E2] transition-colors cursor-pointer"
                                >
                                    {newsletterSubscribed ? <Check size={18} className="text-emerald-400" /> : <ArrowRight size={18} />}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Main Navigation Matrix */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-12 py-14">

                    {/* Col 1: Identity & Brand */}
                    <div className="col-span-2 md:col-span-3 lg:col-span-1 border-b lg:border-b-0 border-white/10 pb-8 lg:pb-0">
                        <Link to="/" className="flex items-center mb-4 group inline-flex">
                            <span className="font-heading font-bold text-2xl tracking-tighter text-white group-hover:text-[#4A90E2] transition-colors">
                                Muncheez<span className="text-[#4A90E2]">.</span>
                            </span>
                        </Link>
                        <p className="text-zinc-400 text-xs font-light leading-relaxed mb-6 max-w-xs">
                            Bringing Nairobi's favorite kitchens straight to your door.
                        </p>

                        {/* Social Links */}
                        <div className="flex gap-4">
                            {[
                                { Icon: Instagram, name: 'Instagram', href: 'https://instagram.com' },
                                { Icon: Facebook, name: 'Facebook', href: 'https://facebook.com' },
                                { Icon: Twitter, name: 'Twitter', href: 'https://twitter.com' },
                                { Icon: Linkedin, name: 'LinkedIn', href: 'https://linkedin.com' }
                            ].map((social, i) => (
                                <a
                                    key={i}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.name}
                                    className="text-zinc-500 hover:text-white transition-colors"
                                >
                                    <social.Icon size={16} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Col 2: Selection */}
                    <div>
                        <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.35em] mb-5">
                            Selection
                        </h4>
                        <ul className="space-y-3">
                            {[
                                { name: 'The Kitchens', href: '/stores' },
                                { name: 'The Pantry', href: '/stores' },
                                { name: '254 Gems', href: '/stores' },
                                { name: 'The Oven', href: '/stores' },
                                { name: 'Supermarket Express', href: '/stores' },
                                { name: 'Browse All Stores', href: '/stores' }
                            ].map((item) => (
                                <li key={item.name}>
                                    <Link
                                        to={item.href}
                                        className="text-xs text-zinc-400 hover:text-white transition-colors font-light tracking-wide block"
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Col 3: Company */}
                    <div>
                        <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.35em] mb-5">
                            Company
                        </h4>
                        <ul className="space-y-3">
                            {[
                                { name: 'Our Story', href: '/our-story' },
                                { name: 'The Team', href: '/our-team' },
                                { name: 'Careers', href: '/careers' },
                                { name: 'Join the Waitlist', href: '/waitlist' },
                                { name: 'Partner with Muncheez', href: '/partner/signup' },
                                { name: 'Ride With Muncheez', href: '/courier/signup' },
                            ].map((item) => (
                                <li key={item.name}>
                                    <Link
                                        to={item.href}
                                        className="text-xs text-zinc-400 hover:text-white transition-colors font-light tracking-wide block"
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Col 4: Press & Media */}
                    <div>
                        <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.35em] mb-5">
                            Press &amp; Media
                        </h4>
                        <ul className="space-y-3">
                            {[
                                { name: 'Newsroom', href: '/newsroom' },
                                { name: 'Press Releases', href: '/newsroom/press-releases' },
                                { name: 'Brand & Media Kit', href: '/newsroom/media-kit' },
                                { name: 'press@muncheez.com', href: 'mailto:press@muncheez.com', external: true },
                                { name: 'Investor Relations', href: '/investors' },
                                { name: 'Corporate Info', href: '/newsroom/corporate' },
                            ].map((item) => (
                                <li key={item.name}>
                                    {item.external ? (
                                        <a
                                            href={item.href}
                                            className="text-xs text-zinc-400 hover:text-white transition-colors font-light tracking-wide block"
                                        >
                                            {item.name}
                                        </a>
                                    ) : (
                                        <Link
                                            to={item.href}
                                            className="text-xs text-zinc-400 hover:text-white transition-colors font-light tracking-wide block"
                                        >
                                            {item.name}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Col 5: Support & App Download */}
                    <div>
                        <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.35em] mb-5">
                            Support &amp; Apps
                        </h4>
                        <ul className="space-y-3 mb-6">
                            {[
                                { name: 'Help Center', slug: 'help-center' },
                                { name: 'Contact Us', slug: 'contact-us' },
                                { name: 'FAQs', slug: 'faq' }
                            ].map((item) => (
                                <li key={item.name}>
                                    <Link
                                        to={`/legal/${item.slug}`}
                                        className="text-xs text-zinc-400 hover:text-white transition-colors font-light tracking-wide block"
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className="pt-2 border-t border-white/10 flex flex-col gap-2.5">
                            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500 block">
                                Mobile Experience
                            </span>
                            <a
                                href="https://apps.apple.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 text-zinc-400 hover:text-white transition-colors group"
                            >
                                <img
                                    src={appStoreIcon}
                                    alt="App Store"
                                    className="w-4 h-4 shrink-0 object-contain invert opacity-60 group-hover:opacity-100 transition-opacity"
                                />
                                <span className="text-[10px] font-bold uppercase tracking-wider">App Store</span>
                            </a>
                            <a
                                href="https://play.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 text-zinc-400 hover:text-white transition-colors group"
                            >
                                <img
                                    src={googlePlayIcon}
                                    alt="Google Play"
                                    className="w-4 h-4 shrink-0 object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                                />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Google Play</span>
                            </a>
                        </div>
                    </div>

                </div>


                {/* Bottom Bar */}
                <div className="border-t border-white/10 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono">
                    <p>© 2026 Muncheez Technologies Ltd. Built for Nairobi, Kenya.</p>
                    <div className="flex flex-wrap justify-center gap-6">
                        <Link to="/legal/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link to="/legal/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
                        <button
                            onClick={() => setIsCookieModalOpen(true)}
                            className="hover:text-white transition-colors cursor-pointer uppercase font-mono"
                        >
                            Cookie Preferences
                        </button>
                        <Link to="/admin/login" className="hover:text-white transition-colors">Admin Access</Link>
                    </div>
                </div>

            </div>

            <CookieModal
                isOpen={isCookieModalOpen}
                onClose={() => setIsCookieModalOpen(false)}
            />
        </footer>
    );
}
