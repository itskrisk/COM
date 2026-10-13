import { Link } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import PageSEO from '../../components/SEO';

/**
 * NotFound — proper 404 experience for unknown URLs.
 * Unknown routes render this page (HTTP 200 in the SPA shell, Vercel serves
 * the fallback for client routing; the route itself is not redirected home).
 */
export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#4A90E2] text-white font-sans selection:bg-white selection:text-[#4A90E2] overflow-x-hidden">
            <PageSEO
                title="Page Not Found"
                description="The page you are looking for has moved or does not exist."
                path="/404"
            />
            <Navbar />

            <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-24">
                <span className="text-[10px] font-mono uppercase tracking-[0.5em] text-white/60 mb-8 block">
                    404
                </span>
                <h1 className="text-6xl md:text-8xl font-heading font-light tracking-tighter text-white leading-[0.95] mb-8">
                    Page <span className="font-bold">Not Found.</span>
                </h1>
                <p className="text-white/80 text-sm md:text-base font-light leading-relaxed max-w-md mb-12">
                    The page you are looking for has moved or does not exist.
                </p>
                <Link
                    to="/"
                    className="inline-block text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-white border-b-2 border-white pb-2 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors"
                >
                    Back to Homepage
                </Link>
            </main>

            <Footer />
        </div>
    );
}
