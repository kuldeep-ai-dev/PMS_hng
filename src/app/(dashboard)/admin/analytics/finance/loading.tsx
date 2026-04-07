import React from 'react';

export default function FinanceAnalyticsLoading() {
    return (
        <div className="p-4 md:p-8 space-y-8 animate-pulse max-w-[1600px] mx-auto w-full">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-slate-200 rounded-lg"></div>
                    <div className="h-4 w-80 bg-slate-100 rounded-lg"></div>
                </div>
                <div className="h-10 w-44 bg-slate-100 rounded-xl"></div>
            </div>

            {/* Summary Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-32 flex flex-col justify-between">
                        <div className="flex justify-between items-center">
                            <div className="h-4 w-24 bg-slate-100 rounded"></div>
                            <div className="h-8 w-8 bg-slate-50 rounded-lg"></div>
                        </div>
                        <div className="h-8 w-32 bg-slate-100 rounded-lg"></div>
                    </div>
                ))}
            </div>

            {/* Main Chart Area Skeleton */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden p-8 h-[450px] flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <div className="h-6 w-48 bg-slate-50 rounded"></div>
                    <div className="h-8 w-32 bg-slate-50 rounded-lg"></div>
                </div>
                <div className="flex-1 w-full bg-slate-50/50 rounded-2xl flex items-end justify-around p-6 gap-4">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="bg-slate-100 w-full rounded-t-lg" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
                    ))}
                </div>
            </div>

            {/* Bottom Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-lg h-[350px] p-8 space-y-6">
                    <div className="h-6 w-40 bg-slate-50 rounded"></div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex justify-between items-center">
                                <div className="h-4 w-32 bg-slate-50 rounded"></div>
                                <div className="h-4 w-16 bg-slate-50 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-lg h-[350px] p-8 space-y-6">
                    <div className="h-6 w-40 bg-slate-50 rounded"></div>
                    <div className="grid grid-cols-2 gap-4 h-full pt-4">
                        <div className="h-32 bg-slate-50 rounded-2xl"></div>
                        <div className="h-32 bg-slate-50 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
