import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, FileText, Check, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { termsService, TERMS_ACCEPTED_EVENT } from '../../lib/termsService';
import { AgreementDocument } from '../../types/agreements';
import AgreementViewerModal from './AgreementViewerModal';

export default function TermsAcceptanceGate() {
    const { user, profile, signOut } = useAuth();
    const [agreement, setAgreement] = useState<AgreementDocument | null>(null);
    const [needsAcceptance, setNeedsAcceptance] = useState(false);
    const [isAcceptedChecked, setIsAcceptedChecked] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isViewerOpen, setIsViewerOpen] = useState(false);

    const userRole = (profile?.role || (profile?.roles?.[0]) || user?.user_metadata?.role || 'customer') as string;

    const checkStatus = async () => {
        if (!user) {
            setNeedsAcceptance(false);
            return;
        }

        const res = await termsService.checkAcceptance(user.id, userRole);
        setAgreement(res.requiredAgreement);
        setNeedsAcceptance(!res.hasAccepted);
    };

    useEffect(() => {
        checkStatus();

        // Listen for acceptance events across the app
        const handleTermsEvent = (e: any) => {
            if (e.detail?.userId === user?.id) {
                setNeedsAcceptance(false);
            }
        };

        window.addEventListener(TERMS_ACCEPTED_EVENT, handleTermsEvent);
        return () => window.removeEventListener(TERMS_ACCEPTED_EVENT, handleTermsEvent);
    }, [user, userRole]);

    const handleAccept = async () => {
        if (!user || !agreement || !isAcceptedChecked) return;
        setIsSubmitting(true);

        try {
            await termsService.recordAcceptance({
                userId: user.id,
                role: userRole,
                agreementId: agreement.id,
                source: 'gate'
            });
            setNeedsAcceptance(false);
        } catch (err) {
            console.error('[TermsAcceptanceGate] Error recording acceptance:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDecline = async () => {
        await signOut();
        setNeedsAcceptance(false);
    };

    if (!needsAcceptance || !agreement) return null;

    return (
        <>
            <AnimatePresence>
                <div className="fixed inset-0 z-[1040] flex items-center justify-center p-4 sm:p-6 text-black">
                    {/* Dark Backdrop (Non-dismissible) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Gate Container — STRICT unboxed editorial design */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-xl bg-white border border-neutral-300 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 sm:px-8 pt-8 pb-5 border-b border-neutral-100 flex items-start gap-4">
                            <div className="w-10 h-10 border border-neutral-900 flex items-center justify-center shrink-0 mt-0.5 text-neutral-900">
                                <ShieldAlert size={20} />
                            </div>
                            <div>
                                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block mb-1">
                                    Action Required · Regulatory Governance
                                </span>
                                <h3 className="text-xl font-heading font-light tracking-tight text-neutral-900 leading-snug">
                                    Review &amp; Accept Updated Agreement
                                </h3>
                                <p className="text-xs text-neutral-500 mt-1">
                                    {agreement.title} (v{agreement.version})
                                </p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5 text-neutral-700 text-xs leading-relaxed font-sans">
                            <p className="text-neutral-600">
                                To continue using the Muncheez platform in compliance with Kenyan laws and our updated operating policies, please review and accept your role-specific agreement below.
                            </p>

                            {/* Summary Highlights */}
                            <div className="border-t border-b border-neutral-100 py-3.5 space-y-2">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">
                                    Key Provisions Overview
                                </span>
                                <ul className="space-y-1.5 text-neutral-600 list-disc list-inside">
                                    {agreement.summaryPoints.map((point, idx) => (
                                        <li key={idx}>{point}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Full Document Link / Preview Trigger */}
                            <div className="flex items-center justify-between py-2 text-[11px] font-mono uppercase tracking-wider">
                                <button
                                    type="button"
                                    onClick={() => setIsViewerOpen(true)}
                                    className="inline-flex items-center gap-1.5 text-neutral-900 hover:text-neutral-600 underline underline-offset-4 transition-colors"
                                >
                                    <FileText size={13} />
                                    <span>Read Full Agreement Text</span>
                                </button>
                                <a
                                    href={agreement.fullDocumentPath}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-neutral-400 hover:text-neutral-900 inline-flex items-center gap-1 transition-colors"
                                >
                                    <span>Legal Hub</span>
                                    <ExternalLink size={11} />
                                </a>
                            </div>

                            {/* Explicit Unchecked Checkbox (Mandatory Affirmative Action) */}
                            <div className="pt-3 border-t border-neutral-100">
                                <label className="flex items-start gap-3 cursor-pointer group select-none">
                                    <div className="relative flex items-center justify-center mt-0.5">
                                        <input
                                            type="checkbox"
                                            checked={isAcceptedChecked}
                                            onChange={(e) => setIsAcceptedChecked(e.target.checked)}
                                            className="w-4 h-4 border border-neutral-400 rounded-none checked:bg-neutral-900 checked:border-neutral-900 transition-colors cursor-pointer appearance-none"
                                        />
                                        {isAcceptedChecked && (
                                            <Check size={11} className="text-white absolute pointer-events-none" />
                                        )}
                                    </div>
                                    <span className="text-xs text-neutral-800 leading-normal">
                                        I confirm that I am at least 18 years of age, have read the{' '}
                                        <strong className="font-semibold text-neutral-900">{agreement.title}</strong>, and agree to be bound by its terms.
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="px-6 sm:px-8 py-4 border-t border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-wider shrink-0">
                            <button
                                type="button"
                                onClick={handleDecline}
                                className="px-4 py-2.5 text-neutral-500 hover:text-neutral-900 text-center transition-colors"
                            >
                                Decline &amp; Sign Out
                            </button>
                            <button
                                type="button"
                                onClick={handleAccept}
                                disabled={!isAcceptedChecked || isSubmitting}
                                className="px-6 py-2.5 bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin" />
                                        <span>Recording...</span>
                                    </>
                                ) : (
                                    <span>Accept &amp; Continue</span>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>

            {/* Nested Agreement Viewer Modal */}
            <AgreementViewerModal
                isOpen={isViewerOpen}
                onClose={() => setIsViewerOpen(false)}
                agreement={agreement}
            />
        </>
    );
}
