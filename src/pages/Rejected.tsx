import React from 'react';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Rejected() {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            <div className="flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-24 py-24">
                <div className="max-w-xl w-full text-center">
                    <div className="w-20 h-20 bg-red-50 flex items-center justify-center mx-auto mb-10">
                        <XCircle className="text-red-500" size={36} />
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400 mb-6 block">
                        Application Update
                    </span>

                    <h1 className="text-5xl font-heading font-light text-gray-900 tracking-tight mb-6 leading-[1.1]">
                        We were unable <br />
                        <span className="italic font-serif text-gray-400">to proceed.</span>
                    </h1>

                    <p className="text-sm text-gray-500 leading-relaxed mb-4 max-w-md mx-auto">
                        We appreciate your interest in joining Muncheez. After reviewing your
                        application, we were unable to approve it at this time. You are welcome
                        to reapply at any point in the future.
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
                            href="mailto:partners@muncheez.co.ke"
                            className="inline-flex items-center justify-between gap-3 px-8 py-4 text-xs font-mono uppercase tracking-widest text-gray-700 border border-gray-200 hover:border-black transition-colors"
                        >
                            <span>Discuss Your Application</span>
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