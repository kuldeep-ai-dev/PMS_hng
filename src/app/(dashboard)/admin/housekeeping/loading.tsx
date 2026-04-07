import React from 'react';
import { BentoCard } from '@/components/ui/BentoCard';

export default function HousekeepingLoading() {
    return (
        <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto animate-pulse">
            <div>
                <div className="h-9 w-64 bg-slate-100 rounded-lg mb-2" />
                <div className="h-4 w-80 bg-slate-50 rounded" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <BentoCard key={i} className="p-6 h-24 bg-slate-50 border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm" />
                            <div className="space-y-2">
                                <div className="h-3 w-16 bg-slate-200 rounded" />
                                <div className="h-6 w-24 bg-slate-200 rounded" />
                            </div>
                        </div>
                    </BentoCard>
                ))}
            </div>

            <BentoCard className="overflow-hidden border-slate-200">
                <div className="overflow-x-auto">
                    <div className="w-full">
                        <div className="h-14 bg-slate-50 border-b border-slate-100" />
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-20 border-b border-slate-50 flex items-center px-6 gap-8">
                                <div className="h-10 w-1/4 bg-slate-50 rounded-xl" />
                                <div className="h-10 w-1/4 bg-slate-50 rounded-xl" />
                                <div className="h-8 w-1/6 bg-slate-50 rounded-full" />
                                <div className="h-12 w-1/4 bg-slate-50 rounded-lg" />
                                <div className="h-10 w-20 ml-auto bg-slate-100 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </div>
            </BentoCard>
        </div>
    );
}
