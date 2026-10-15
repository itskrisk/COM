import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Suspended() {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            <div className="flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-24 py-24">
                <div className="max-w-xl w-full text-center">
                    <div className="w-20 h-20 bg-amber-50 flex items-center justify-center mx-auto mb-10">
                        <ShieldAlert className="text-amber-500" size={36} />
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400 mb-6 block">
                        Account Suspended
                    </span>

                    <h1 className="text-5xl font-heading font-light text-gray-900 tracking-tight mb-6 leading-[1.1]">
                        This account <br />
                        <span className="italic font-serif text-gray-400">is temporarily suspended.</span>
                    </h1>

                    <p className="text-sm text-gray-500 leading-relaxed mb-4 max-w-md mx-auto">
                        Your account has been suspended pending review by our trust and safety
                        team. Please contact support for more information.
                    </p>

                    <div className="w-full h-px bg-gray-100 mb-10" />

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            to="/"
                            className="inline-flex items-center justify-between gap-3 px-8 py-4 text-xs font-mono uppercase tracking-widest text-white bg-black hover:bg-[#2563EB] transition-colors"
                        >
                            <ArrowLeft size={14} />
                            <span>Back to Home</span>
                        </Link>
                        <a
                            href="mailto:support@muncheez.co.ke"
                            className="inline-flex items-center justify-between gap-3 px-8 py-4 text-xs font-mono uppercase tracking-widest text-gray-700 border border-gray-200 hover:border-black transition-colors"
                        >
                            <span>Contact Support</span>
                        </a>
                    </div>
                </div>
            </div>

            <footer className="py-8 px-6 border-t border-gray-100">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <span className="font-heading font-bold text-lg tracking-tighter text-gray-900">
                        Muncheez<span className="text-[#2563EB]">.</span>
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                        Fast. Fresh. Fam.
                    </span>
                </div>
            </footer>
        </div>
    );
}