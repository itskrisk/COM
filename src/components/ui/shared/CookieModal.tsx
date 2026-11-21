import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Lock } from 'lucide-react';
import { useCookieConsent } from '../../../hooks/useCookieConsent';
import { CookieConsentPreferences } from '../../../lib/cookieService';

export type CookiePreferences = CookieConsentPreferences;

interface CookieModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CookieModal({ isOpen, onClose }: CookieModalProps) {
    const { preferences, savePreferences, acceptAll, rejectOptional } = useCookieConsent();
    const [localState, setLocalState] = useState({
        analytics: preferences.analytics,
        personalization: preferences.personalization,
        marketing: preferences.marketing,
    });
    const [savedSuccess, setSavedSuccess] = useState(false);

    // Sync with global preferences whenever opened
    useEffect(() => {
        if (isOpen) {
            setLocalState({
                analytics: preferences.analytics,
                personalization: preferences.personalization,
                marketing: preferences.marketing,
            });
        }
    }, [isOpen, preferences]);

    const handleSave = () => {
        savePreferences(localState);
        setSavedSuccess(true);
        setTimeout(() => {
            setSavedSuccess(false);
            onClose();
        }, 600);
    };

    const handleAcceptAll = () => {
        acceptAll();
        setSavedSuccess(true);
        setTimeout(() => {
            setSavedSuccess(false);
            onClose();
        }, 600);
    };

    const handleRejectOptional = () => {
        rejectOptional();
        setSavedSuccess(true);
        setTimeout(() => {
            setSavedSuccess(false);
            onClose();
        }, 600);
    };

    const toggle = (key: 'analytics' | 'personalization' | 'marketing') => {
        setLocalState(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1020] flex items-center justify-center p-4 text-black">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-lg bg-white border border-neutral-200 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="px-8 pt-8 pb-6 border-b border-neutral-100 flex items-start justify-between">
                            <div>
                                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 block mb-1">
                                    Privacy Settings · Compliance
                                </span>
                                <h3 className="text-xl font-heading font-light tracking-tight text-neutral-900">
                                    Cookie Preferences
                                </h3>
                                <p className="text-xs text-neutral-500 mt-1">
                                    Manage data storage preferences under Kenya DPA 2019 &amp; GDPR.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-neutral-400 hover:text-neutral-900 transition-colors pt-1"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-8 py-6">
                            {savedSuccess ? (
                                <div className="py-12 text-center space-y-2">
                                    <div className="w-10 h-10 border border-neutral-900 flex items-center justify-center mx-auto text-neutral-900">
                                        <Check size={18} />
                                    </div>
                                    <h4 className="text-sm font-mono uppercase tracking-wider text-neutral-900">
                                        Preferences Saved
                                    </h4>
                                    <p className="text-xs text-neutral-400">Your privacy choices are active.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="divide-y divide-neutral-100 mb-8">
                                        {/* Strictly Necessary */}
                                        <div className="py-4 flex items-center justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <Lock size={14} className="text-neutral-400 mt-0.5 shrink-0" />
                                                <div>
                                                    <span className="text-xs font-semibold text-neutral-900 block">
                                                        Strictly Necessary (Essential)
                                                    </span>
                                                    <p className="text-[11px] text-neutral-500 leading-relaxed mt-0.5">
                                                        Authentication sessions, cart checkout, and payment security. Always active.
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider shrink-0">
                                                Required
                                            </span>
                                        </div>

                                        {/* Performance & Analytics */}
                                        <div className="py-4 flex items-center justify-between gap-4">
                                            <div>
                                                <span className="text-xs font-semibold text-neutral-900 block">
                                                    Performance &amp; Analytics
                                                </span>
                                                <p className="text-[11px] text-neutral-500 leading-relaxed mt-0.5">
                                                    Anonymized telemetry to measure supermarket page load speeds and service reliability.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => toggle('analytics')}
                                                className={`w-11 h-6 transition-colors border ${
                                                    localState.analytics ? 'bg-neutral-900 border-neutral-900' : 'bg-neutral-100 border-neutral-300'
                                                } relative shrink-0`}
                                                aria-label="Toggle analytics cookies"
                                            >
                                                <span
                                                    className={`block w-4 h-4 bg-white transition-transform ${
                                                        localState.analytics ? 'translate-x-5' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Neighborhood & Personalization */}
                                        <div className="py-4 flex items-center justify-between gap-4">
                                            <div>
                                                <span className="text-xs font-semibold text-neutral-900 block">
                                                    Neighborhood &amp; Personalization
                                                </span>
                                                <p className="text-[11px] text-neutral-500 leading-relaxed mt-0.5">
                                                    Saves your selected Nairobi delivery sector across visits instead of resetting.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => toggle('personalization')}
                                                className={`w-11 h-6 transition-colors border ${
                                                    localState.personalization ? 'bg-neutral-900 border-neutral-900' : 'bg-neutral-100 border-neutral-300'
                                                } relative shrink-0`}
                                                aria-label="Toggle personalization cookies"
                                            >
                                                <span
                                                    className={`block w-4 h-4 bg-white transition-transform ${
                                                        localState.personalization ? 'translate-x-5' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Marketing & Promotions */}
                                        <div className="py-4 flex items-center justify-between gap-4">
                                            <div>
                                                <span className="text-xs font-semibold text-neutral-900 block">
                                                    Promotions &amp; Vouchers
                                                </span>
                                                <p className="text-[11px] text-neutral-500 leading-relaxed mt-0.5">
                                                    Curated supermarket promotions and voucher notifications.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => toggle('marketing')}
                                                className={`w-11 h-6 transition-colors border ${
                                                    localState.marketing ? 'bg-neutral-900 border-neutral-900' : 'bg-neutral-100 border-neutral-300'
                                                } relative shrink-0`}
                                                aria-label="Toggle marketing cookies"
                                            >
                                                <span
                                                    className={`block w-4 h-4 bg-white transition-transform ${
                                                        localState.marketing ? 'translate-x-5' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-neutral-100 font-mono text-[11px] uppercase tracking-wider">
                                        <button
                                            type="button"
                                            onClick={handleRejectOptional}
                                            className="px-3 py-2 text-neutral-500 hover:text-neutral-900 text-left sm:text-center transition-colors"
                                        >
                                            Reject Optional
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleSave}
                                                className="flex-1 sm:flex-none px-4 py-2 border border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                                            >
                                                Save Current
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleAcceptAll}
                                                className="flex-1 sm:flex-none px-5 py-2 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                                            >
                                                Accept All
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
