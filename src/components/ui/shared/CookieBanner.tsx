import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import CookieModal from './CookieModal';
import { useCookieConsent } from '../../../hooks/useCookieConsent';

export default function CookieBanner() {
    const { hasChosen, acceptAll, rejectOptional } = useCookieConsent();
    const [isVisible, setIsVisible] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // If user has not made a choice yet, display banner gracefully
        if (!hasChosen) {
            const timer = setTimeout(() => setIsVisible(true), 1200);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [hasChosen]);

    const handleAcceptAll = () => {
        acceptAll();
        setIsVisible(false);
    };

    const handleRejectOptional = () => {
        rejectOptional();
        setIsVisible(false);
    };

    if (!isVisible && !isModalOpen) return null;

    return (
        <>
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed bottom-0 inset-x-0 z-[60] bg-white/95 backdrop-blur-md border-t border-neutral-200 text-neutral-900"
                    >
                        <div className="max-w-7xl mx-auto px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 text-[11px] text-neutral-600 font-sans tracking-tight">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 shrink-0" />
                                <span>
                                    Muncheez uses cookies to deliver a fast, secure shopping experience across Nairobi in compliance with Kenya DPA 2019.{' '}
                                    <Link
                                        to="/cookies"
                                        className="text-neutral-900 underline underline-offset-2 hover:text-neutral-500 transition-colors"
                                    >
                                        Cookie Policy
                                    </Link>
                                </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-wider shrink-0 self-end sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-3 py-1.5 text-neutral-500 hover:text-neutral-900 transition-colors"
                                >
                                    Preferences
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRejectOptional}
                                    className="px-3 py-1.5 border border-neutral-300 text-neutral-800 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                                >
                                    Reject Optional
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAcceptAll}
                                    className="px-4 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                                >
                                    Accept All
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <CookieModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    if (hasChosen) {
                        setIsVisible(false);
                    }
                }}
            />
        </>
    );
}
