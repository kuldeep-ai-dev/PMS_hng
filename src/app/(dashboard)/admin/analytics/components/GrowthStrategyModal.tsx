'use client';

import React, { useState } from 'react';
import { X, Lightbulb, Target, ArrowRight, Zap, TrendingUp, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Strategy {
    id: string;
    title: string;
    impact: 'High' | 'Medium';
    effort: 'Low' | 'Medium' | 'High';
    description: string;
    steps: string[];
    icon: any;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentStats: {
        adr: number;
        revpar: number;
        retention: number;
    }
}

export function GrowthStrategyModal({ isOpen, onClose, currentStats }: Props) {
    if (!isOpen) return null;

    const strategies: Strategy[] = [
        {
            id: 'pricing',
            title: 'Dynamic Yield Management',
            impact: 'High',
            effort: 'Medium',
            description: 'Adjust room rates in real-time based on local demand and your current occupancy lead times.',
            steps: [
                'Increase rates by 15% when occupancy hits 80%',
                'Offer "Flash Sales" for mid-week vacancies',
                'Implement a 2-night minimum stay for weekends'
            ],
            icon: Zap
        },
        {
            id: 'loyalty',
            title: 'Automated Loyalty Loop',
            impact: 'Medium',
            effort: 'Low',
            description: `Your retention is at ${currentStats.retention}%. Increase this by automating post-stay "Come Back" offers via WhatsApp.`,
            steps: [
                'Send a 10% discount code 48 hours after checkout',
                'Tag repeat guests for VIP room assignments',
                'Birthday & Anniversary automated greetings'
            ],
            icon: Users
        },
        {
            id: 'direct',
            title: 'Direct Booking Push',
            impact: 'High',
            effort: 'Medium',
            description: 'Reduce OTA commissions (Booking.com/Expedia) by driving more traffic to your local WhatsApp booking engine.',
            steps: [
                'Display "Best Price Guaranteed" on your website',
                'Offer a free breakfast for direct bookings only',
                'Use WhatsApp Status for exclusive subscriber deals'
            ],
            icon: Target
        }
    ];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                            <Lightbulb className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Growth Strategy Planner</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Actionable steps to reach your 2026 goals</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {strategies.map((strat) => (
                            <div key={strat.id} className="flex flex-col bg-white border border-slate-100 rounded-3xl p-6 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all group">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors text-slate-400">
                                        <strat.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                                            strat.impact === 'High' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                        )}>
                                            Impact: {strat.impact}
                                        </span>
                                    </div>
                                </div>
                                <h3 className="text-sm font-black text-slate-800 mb-2 leading-tight">{strat.title}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium mb-6 flex-1">
                                    {strat.description}
                                </p>
                                <div className="space-y-3 mt-auto">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Steps</p>
                                    <div className="space-y-2">
                                        {strat.steps.map((step, sIdx) => (
                                            <div key={sIdx} className="flex items-start gap-2">
                                                <div className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                                <span className="text-[10px] text-slate-600 font-bold leading-tight tracking-tight">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pro Tip */}
                    <div className="mt-8 bg-gradient-to-r from-slate-900 to-indigo-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
                        <TrendingUp className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 group-hover:scale-110 transition-transform" />
                        <div className="relative z-10 max-w-xl">
                            <h4 className="text-lg font-black mb-2 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                                Advanced Prediction Model
                            </h4>
                            <p className="text-sm text-indigo-100 font-medium leading-relaxed">
                                Our AI predicts that by increasing your **Direct Booking** rate to 75%, you could save over **₹2.4 Lakhs** in annual commissions, potentially boosting your Net Profit by 12%.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-3"
                    >
                        Apply Strategic Changes
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
