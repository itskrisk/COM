import { motion } from 'framer-motion';
import googleLogo from "../../assets/logos/google.png";
import vodaLogo from "../../assets/logos/voda.png";
import inkLogo from "../../assets/logos/ink.png";

interface PartnerItem {
    name: string;
    logo: string;
    className?: string;
}

const PARTNERS: PartnerItem[] = [
    { name: 'Google', logo: googleLogo, className: 'h-6 sm:h-7 w-auto object-contain brightness-0 invert opacity-70 hover:opacity-100 transition-opacity' },
    { name: 'Vodacom / M-Pesa', logo: vodaLogo, className: 'h-6 sm:h-7 w-auto object-contain opacity-75 hover:opacity-100 transition-opacity' },
    { name: 'Ink', logo: inkLogo, className: 'h-5 sm:h-6 w-auto object-contain brightness-0 invert opacity-70 hover:opacity-100 transition-opacity' },
];

export default function PartnerTicker() {
    // Loop the 3 partner logos continuously
    const marqueeItems = [
        ...PARTNERS,
        ...PARTNERS,
        ...PARTNERS,
        ...PARTNERS,
        ...PARTNERS,
        ...PARTNERS,
    ];

    return (
        <section className="relative z-30 bg-[#0f0f11] text-white border-t border-b border-white/10 overflow-hidden py-5">
            <div className="container mx-auto px-6 mb-3 flex items-center">
                <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">
                    Our Partners
                </span>
            </div>

            {/* Moving strip from left to right */}
            <div className="relative w-full overflow-hidden flex items-center">
                <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-[#0f0f11] to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-[#0f0f11] to-transparent z-10 pointer-events-none" />

                <motion.div
                    className="flex items-center gap-16 sm:gap-24 whitespace-nowrap will-change-transform py-1"
                    initial={{ x: '-50%' }}
                    animate={{ x: '0%' }}
                    transition={{
                        repeat: Infinity,
                        ease: 'linear',
                        duration: 25,
                    }}
                >
                    {marqueeItems.map((partner, index) => (
                        <div
                            key={`${partner.name}-${index}`}
                            className="flex items-center shrink-0 cursor-default"
                        >
                            <img
                                src={partner.logo}
                                alt={partner.name}
                                className={partner.className}
                            />
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
