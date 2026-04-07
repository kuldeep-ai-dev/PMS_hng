import React from 'react';

export default function TrendAnalyticsLoading() {
    return (
        <div className="p-4 md:p-8 space-y-8 animate-pulse max-w-[1600px] mx-auto w-full">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-slate-200 rounded-lg"></div>
                    <div className="h-4 w-80 bg-slate-100 rounded-lg"></div>
                </div>
            </div>

            {/* Main Growth Chart Skeleton */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden p-8 h-[500px] flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <div className="h-6 w-56 bg-slate-50 rounded"></div>
                    <div className="flex gap-2">
                        <div className="h-8 w-24 bg-slate-50 rounded-lg"></div>
                        <div className="h-8 w-24 bg-slate-50 rounded-lg"></div>
                    </div>
                </div>
                <div className="flex-1 w-full bg-slate-50/30 rounded-2xl p-8 relative overflow-hidden">
                    {/* Simulated Line Chart Svg skeleton can be complex, using a simple wave-like block instead */}
                    <div className="absolute inset-0 flex items-end">
                        <div className="w-full h-1/2 bg-gradient-to-t from-teal-50/50 to-transparent"></div>
                    </div>
                </div>
            </div>

            {/* Category Breakdown Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-64 flex flex-col gap-4">
                        <div className="h-5 w-32 bg-slate-50 rounded"></div>
                        <div className="flex-1 flex flex-col gap-3 justify-center">
                            {[1, 2, 3].map((j) => (
                                <div key={j} className="flex items-center gap-3">
                                    <div className="h-3 w-3 bg-slate-100 rounded-full"></div>
                                    <div className="h-3 flex-1 bg-slate-50 rounded"></div>
                                    <div className="h-3 w-10 bg-slate-50 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
