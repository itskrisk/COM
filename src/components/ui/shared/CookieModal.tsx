import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Lock } from 'lucide-react';

interface CookieModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface CookiePreferences {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
    updatedAt?: string;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
    essential: true,
    analytics: true,
    marketing: false,
    personalization: true,
};

export default function CookieModal({ isOpen, onClose }: CookieModalProps) {
    const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
    const [savedSuccess, setSavedSuccess] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('muncheez_cookie_preferences');
        if (stored) {
            try {
                setPreferences(JSON.parse(stored));
            } catch (err) {
                console.error('Failed to parse cookie preferences:', err);
            }
        }
    }, [isOpen]);

    const handleSave = (customPrefs?: CookiePreferences) => {
        const toSave = customPrefs || {
            ...preferences,
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('muncheez_cookie_preferences', JSON.stringify(toSave));

        const maxAge = 31536000; // 1 year
        document.cookie = `muncheez_essential=true; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `muncheez_analytics=${toSave.analytics}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `muncheez_marketing=${toSave.marketing}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `muncheez_personalization=${toSave.personalization}; path=/; max-age=${maxAge}; SameSite=Lax`;

        window.dispatchEvent(new CustomEvent('muncheez_cookies_updated', { detail: toSave }));

        setPreferences(toSave);
        setSavedSuccess(true);
        setTimeout(() => {
            setSavedSuccess(false);
            onClose();
        }, 700);
    };

    const handleAcceptAll = () => {
        handleSave({
            essential: true,
            analytics: true,
            marketing: true,
            personalization: true,
            updatedAt: new Date().toISOString(),
        });
    };

    const toggle = (key: keyof CookiePreferences) => {
        if (key === 'essential') return;
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
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
                                    Privacy Settings
                                </span>
                                <h3 className="text-xl font-heading font-light tracking-tight text-neutral-900">
                                    Cookie Preferences
                                </h3>
                                <p className="text-xs text-neutral-500 mt-1">
                                    Manage how Muncheez stores session data on your device.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-neutral-400 hover:text-neutral-900 transition-colors pt-1"
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
                                        {/* Essential */}
                                        <div className="py-4 flex items-center justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <Lock size={14} className="text-neutral-400 mt-0.5 shrink-0" />
                                                <div>
                                                    <span className="text-xs font-semibold text-neutral-900 block">
                                                        Strictly Necessary
                                                    </span>
                                                    <p className="text-[11px] text-neutral-500 leading-relaxed mt-0.5">
                                                        Authentication, security, and cart preservation. Always active.
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider shrink-0">
                                                Required
                                            </span>
                                        </div>

                                        {/* Analytics */}
                                        <div className="py-4 flex items-center justify-between gap-4">
                                            <div>
                                                <span className="text-xs font-semibold text-neutral-900 block">
                                                    Performance & Analytics
                                                </span>
                                                <p className="text-[11px] text-neutral-500 leading-relaxed mt-0.5">
                                                    Anonymized telemetry to measure supermarket page load speeds.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => toggle('analytics')}
                                                className={`w-11 h-6 transition-colors border ${
                                                    preferences.analytics ? 'bg-neutral-900 border-neutral-900' : 'bg-neutral-100 border-neutral-300'
                                                } relative shrink-0`}
                                            >
                                                <span
                                                    className={`block w-4 h-4 bg-white transition-transform ${
                                                        preferences.analytics ? 'translate-x-5' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Personalization */}
                                        <div className="py-4 flex items-center justify-between gap-4">
                                            <div>
                                                <span className="text-xs font-semibold text-neutral-900 block">
                                                    Neighborhood & Personalization
                                                </span>
                                                <p className="text-[11px] text-neutral-500 leading-relaxed mt-0.5">
                                                    Remembers your selected Nairobi delivery sector and aisle filters.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => toggle('personalization')}
                                                className={`w-11 h-6 transition-colors border ${
                                                    preferences.personalization ? 'bg-neutral-900 border-neutral-900' : 'bg-neutral-100 border-neutral-300'
                                                } relative shrink-0`}
                                            >
                                                <span
                                                    className={`block w-4 h-4 bg-white transition-transform ${
                                                        preferences.personalization ? 'translate-x-5' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Marketing */}
                                        <div className="py-4 flex items-center justify-between gap-4">
                                            <div>
                                                <span className="text-xs font-semibold text-neutral-900 block">
                                                    Promotions & Vouchers
                                                </span>
                                                <p className="text-[11px] text-neutral-500 leading-relaxed mt-0.5">
                                                    Curated deals and supermarket partner notifications.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => toggle('marketing')}
                                                className={`w-11 h-6 transition-colors border ${
                                                    preferences.marketing ? 'bg-neutral-900 border-neutral-900' : 'bg-neutral-100 border-neutral-300'
                                                } relative shrink-0`}
                                            >
                                                <span
                                                    className={`block w-4 h-4 bg-white transition-transform ${
                                                        preferences.marketing ? 'translate-x-5' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 font-mono text-[11px] uppercase tracking-wider">
                                        <button
                                            onClick={() => handleSave()}
                                            className="px-4 py-2 border border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                                        >
                                            Save Current
                                        </button>
                                        <button
                                            onClick={handleAcceptAll}
                                            className="px-5 py-2 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                                        >
                                            Accept All
                                        </button>
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
