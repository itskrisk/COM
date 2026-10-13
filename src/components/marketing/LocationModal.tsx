import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Check } from 'lucide-react';
import { useState } from 'react';

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectLocation: (location: string) => void;
}

const NAIROBI_ZONES = [
    'Westlands, Nairobi',
    'Kilimani & Hurlingham',
    'Riverside Drive',
    'Kileleshwa & Lavington',
    'Karen & Langata',
    'Nairobi CBD',
    'Parklands & Highridge',
    'Upper Hill & Community'
];

export default function LocationModal({ isOpen, onClose, onSelectLocation }: LocationModalProps) {
    const [addressText, setAddressText] = useState(
        () => localStorage.getItem('muncheez_delivery_address') || ''
    );

    const handleConfirm = (location: string) => {
        const trimmed = location.trim();
        if (!trimmed) return;
        localStorage.setItem('muncheez_delivery_address', trimmed);
        onSelectLocation(trimmed);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
                    />

                    {/* Modal Wrapper */}
                    <div className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none p-4">
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 15 }}
                            className="w-full max-w-md bg-white border border-gray-200 shadow-2xl pointer-events-auto"
                        >
                            <div className="p-6 md:p-8">
                                {/* Header */}
                                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                    <div>
                                        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#067EEF] block mb-1">
                                            Text Location Service
                                        </span>
                                        <h2 className="text-xl font-heading font-bold text-gray-900 tracking-tight">
                                            Enter Delivery Address
                                        </h2>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-1 text-gray-400 hover:text-black transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <p className="text-xs text-gray-500 my-4 leading-relaxed font-light">
                                    Type your street, building, apartment, or landmark. This address is dispatched directly to the merchant and rider.
                                </p>

                                {/* Direct Address Input */}
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleConfirm(addressText);
                                    }}
                                    className="space-y-4"
                                >
                                    <div className="relative">
                                        <MapPin className="absolute left-0 top-3 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="e.g., Riverside Drive, Apt 4B, Westlands"
                                            value={addressText}
                                            onChange={(e) => setAddressText(e.target.value)}
                                            className="w-full bg-transparent border-b-2 border-gray-200 py-2.5 pl-7 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#067EEF] transition-colors font-medium"
                                            autoFocus
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!addressText.trim()}
                                        className="w-full py-3 bg-black hover:bg-[#067EEF] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Check size={14} />
                                        <span>Confirm Address</span>
                                    </button>
                                </form>

                                {/* Quick Nairobi Zones */}
                                <div className="mt-6 pt-5 border-t border-gray-100">
                                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 block mb-3">
                                        Or Quick Select Delivery Zone
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {NAIROBI_ZONES.map((zone) => (
                                            <button
                                                key={zone}
                                                type="button"
                                                onClick={() => {
                                                    setAddressText(zone);
                                                    handleConfirm(zone);
                                                }}
                                                className="text-left text-xs py-2 px-3 border border-gray-200 hover:border-[#067EEF] hover:text-[#067EEF] text-gray-700 transition-colors font-medium truncate"
                                            >
                                                {zone}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

