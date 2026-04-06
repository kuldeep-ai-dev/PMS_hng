'use client';

import React, { useState } from 'react';
import { HelpCircle, X, CheckCircle2, Info, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideSection {
    title: string;
    description: string;
    details?: string[];
}

interface Props {
    title: string;
    subtitle: string;
    sections: GuideSection[];
}

export function AnalyticsGuide({ title, subtitle, sections }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Guide Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white hover:bg-slate-800 transition-all shadow-lg group"
            >
                <HelpCircle className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Data Guide</span>
            </button>

            {/* Backdrop & Drawer */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Drawer Content */}
                    <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-slate-900 rounded-2xl shadow-xl">
                                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
                            <p className="text-sm text-slate-500 font-medium mt-1">{subtitle}</p>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {sections.map((section, idx) => (
                                <div key={idx} className="space-y-3">
                                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tight">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {section.title}
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        {section.description}
                                    </p>
                                    {section.details && (
                                        <div className="grid grid-cols-1 gap-2 pl-2">
                                            {section.details.map((detail, dIdx) => (
                                                <div key={dIdx} className="flex items-start gap-2 group">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                    <span className="text-[11px] text-slate-500 font-bold group-hover:text-slate-800 transition-colors uppercase tracking-tight">
                                                        {detail}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Trust Seal */}
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white mt-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Zap className="w-20 h-20" />
                                </div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-2 flex items-center gap-2">
                                    <Info className="w-4 h-4" />
                                    Data Integrity
                                </h4>
                                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                                    This dashboard aggregates real-time data directly from your database. No estimations are used. All financial figures account for refunds and settlements automatically.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                            >
                                Got it, thanks!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
