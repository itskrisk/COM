import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, ShieldCheck } from 'lucide-react';
import { AgreementDocument } from '../../types/agreements';

interface AgreementViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    agreement: AgreementDocument | null;
}

export default function AgreementViewerModal({
    isOpen,
    onClose,
    agreement
}: AgreementViewerModalProps) {
    if (!isOpen || !agreement) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 sm:p-6 text-black">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Container — Strict NO card padding / NO rounded box styling */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-full max-w-2xl bg-white border border-neutral-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
                >
                    {/* Header: Edge-to-edge border */}
                    <div className="px-6 sm:px-8 py-5 border-b border-neutral-200 flex items-start justify-between bg-white shrink-0">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldCheck size={14} className="text-[#D4AF37]" />
                                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
                                    Legal Contract · Version {agreement.version}
                                </span>
                            </div>
                            <h3 className="text-xl font-heading font-light tracking-tight text-neutral-900">
                                {agreement.title}
                            </h3>
                            <p className="text-xs text-neutral-500 mt-0.5">
                                Last updated: {agreement.lastUpdated} · Kenya Jurisdiction
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-neutral-400 hover:text-neutral-900 transition-colors p-1"
                            aria-label="Close Agreement Viewer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body: Scrollable Agreement Sections */}
                    <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6 text-neutral-800 text-xs leading-relaxed font-sans divide-y divide-neutral-100">
                        {/* Summary Box (editorial) */}
                        <div className="pb-4">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-2">
                                Plain-English Overview
                            </span>
                            <ul className="space-y-1.5 text-neutral-600 list-disc list-inside">
                                {agreement.summaryPoints.map((pt, i) => (
                                    <li key={i}>{pt}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Agreement Sections */}
                        {agreement.sections.map((sec) => (
                            <div key={sec.id} className="pt-5 space-y-1.5">
                                <h4 className="text-xs font-bold text-neutral-900 font-sans tracking-tight">
                                    {sec.title}
                                </h4>
                                <p className="text-neutral-600 leading-relaxed">
                                    {sec.body}
                                </p>
                            </div>
                        ))}

                        {/* Audit Verification Footnote */}
                        <div className="pt-6 border-t border-neutral-100 text-[10px] font-mono text-neutral-400 space-y-1">
                            <div>Document Fingerprint (SHA-256):</div>
                            <div className="break-all text-neutral-500 font-mono text-[9px]">
                                {agreement.documentHash}
                            </div>
                        </div>
                    </div>

                    {/* Footer: Edge-to-edge */}
                    <div className="px-6 sm:px-8 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between shrink-0">
                        <a
                            href={agreement.fullDocumentPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                            <span>Open In Legal Hub</span>
                            <ExternalLink size={12} />
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 bg-neutral-900 text-white hover:bg-neutral-800 font-mono text-[11px] uppercase tracking-wider transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
