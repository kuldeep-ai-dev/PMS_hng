import React from 'react';
import { BentoCard } from '@/components/ui/BentoCard';

export default function GuestsLoading() {
    return (
        <div className="flex flex-col gap-6 h-full max-w-6xl mx-auto animate-pulse">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-slate-100 rounded-lg" />
                    <div className="h-4 w-48 bg-slate-50 rounded" />
                </div>
                <div className="h-10 w-44 bg-slate-100 rounded-xl" />
            </div>

            <BentoCard className="p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <div className="h-10 w-full max-w-sm bg-white border border-slate-200 rounded-lg" />
                </div>

                <div className="overflow-x-auto">
                    <div className="w-full">
                        <div className="h-12 bg-slate-50 border-b border-slate-100" />
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-16 border-b border-slate-50 flex items-center px-6 gap-4">
                                <div className="h-4 w-1/4 bg-slate-50 rounded" />
                                <div className="h-4 w-1/6 bg-slate-50 rounded" />
                                <div className="h-4 w-1/6 bg-slate-50 rounded" />
                                <div className="h-4 w-1/6 bg-slate-50 rounded" />
                                <div className="h-4 w-1/6 bg-slate-50 rounded" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="flex gap-2">
                        <div className="h-8 w-20 bg-white rounded border border-slate-200" />
                        <div className="h-8 w-20 bg-white rounded border border-slate-200" />
                    </div>
                </div>
            </BentoCard>
        </div>
    );
}
