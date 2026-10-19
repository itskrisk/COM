import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import PageSEO from "../../components/SEO";
import { careersService, JobPosition } from '../../lib/careersService';

const DEFAULT_RESPONSIBILITIES = [
    'Coordinate executive schedule, meetings, and agendas',
    'Manage executive communications and follow-ups',
    'Support day-to-day administrative operations'
];
const DEFAULT_REQUIREMENTS = [
    'Experience in executive administrative support',
    'Strong communication in English & Swahili',
    'Based full-time in Nairobi'
];

export default function Careers() {
    const navigate = useNavigate();
    const [positions, setPositions] = useState<JobPosition[]>([]);
    const [expandedInfoId, setExpandedInfoId] = useState<string | null>(null);

    useEffect(() => {
        const loadPositions = async () => {
            const data = await careersService.getPositions();
            const activeOnly = data.filter(p => p.is_active);
            setPositions(activeOnly);
        };

        loadPositions();

        const handleUpdate = () => loadPositions();
        window.addEventListener('muncheez_positions_updated', handleUpdate);
        return () => window.removeEventListener('muncheez_positions_updated', handleUpdate);
    }, []);

    const toggleInfo = (id: string) => {
        setExpandedInfoId(prev => prev === id ? null : id);
    };

    const handleApply = (pos: JobPosition) => {
        navigate(`/company/careers/apply/${pos.id}`);
    };

    return (
        <div className="min-h-screen bg-[#4A90E2] text-white font-sans selection:bg-white selection:text-[#4A90E2] flex flex-col justify-between overflow-x-hidden">
            <div>
                <Navbar />
                <PageSEO
                    title="Careers"
                    description="Join Muncheez. Current open positions in Nairobi, Kenya."
                    path="/company/careers"
                />

                {/* Direct, clean header */}
                <header className="pt-32 pb-8 md:pt-40 md:pb-10 border-b border-white/20">
                    <div className="container max-w-4xl mx-auto px-6">
                        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/70 block mb-2 font-semibold">
                            Muncheez &bull; Nairobi
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-2">
                            Careers
                        </h1>
                        <p className="text-white/80 text-sm md:text-base font-light">
                            Current open positions in Nairobi. Review role details and click Apply to begin the application process.
                        </p>
                    </div>
                </header>

                {/* Job Listings */}
                <main className="container max-w-4xl mx-auto px-6 py-12 pb-28">
                    <div className="divide-y divide-white/20">
                        {positions.length === 0 ? (
                            <div className="py-12 text-white/70 text-sm text-center font-light">
                                No open positions available at this time.
                            </div>
                        ) : (
                            positions.map((pos) => {
                                const isExpanded = expandedInfoId === pos.id;
                                return (
                                    <div key={pos.id} className="py-8 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            {/* Role Title & Meta */}
                                            <div>
                                                <div className="flex items-center gap-2 text-xs font-mono text-white/75 uppercase tracking-wider mb-1">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={12} /> {pos.location}
                                                    </span>
                                                    <span>&bull;</span>
                                                    <span>{pos.type}</span>
                                                </div>
                                                <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white">
                                                    {pos.title}
                                                </h2>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-4 shrink-0">
                                                <button
                                                    onClick={() => toggleInfo(pos.id)}
                                                    className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-white/80 hover:text-white border-b border-white/40 pb-1 cursor-pointer"
                                                >
                                                    {isExpanded ? (
                                                        <>Hide Info <ChevronUp size={13} /></>
                                                    ) : (
                                                        <>Review Info <ChevronDown size={13} /></>
                                                    )}
                                                </button>

                                                <button
                                                    onClick={() => handleApply(pos)}
                                                    className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-white border-b-2 border-white pb-1 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors cursor-pointer"
                                                >
                                                    Apply for this Position <ArrowRight size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expandable Info */}
                                        {isExpanded && (
                                            <div className="border-t border-white/10 pt-4 space-y-4 text-white/90 text-sm font-light leading-relaxed">
                                                <p>{pos.summary}</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                                    <div>
                                                        <span className="text-[10px] font-mono uppercase tracking-wider text-white font-bold block mb-1">
                                                            Responsibilities
                                                        </span>
                                                        <ul className="space-y-1 text-xs text-white/80">
                                                            {(pos.responsibilities && pos.responsibilities.length > 0
                                                                ? pos.responsibilities
                                                                : DEFAULT_RESPONSIBILITIES
                                                            ).map((r, i) => (
                                                                <li key={i}>&bull; {r}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-mono uppercase tracking-wider text-white font-bold block mb-1">
                                                            Requirements
                                                        </span>
                                                        <ul className="space-y-1 text-xs text-white/80">
                                                            {(pos.requirements && pos.requirements.length > 0
                                                                ? pos.requirements
                                                                : DEFAULT_REQUIREMENTS
                                                            ).map((r, i) => (
                                                                <li key={i}>&bull; {r}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </main>
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
}
