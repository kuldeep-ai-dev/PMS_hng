import React from 'react';

export default function DashboardLoading() {
    return (
        <div className="p-4 md:p-8 space-y-8 animate-pulse max-w-[1600px] mx-auto w-full">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
                    <div className="h-4 w-64 bg-slate-100 rounded-lg"></div>
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
                    <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
                </div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-32 flex flex-col justify-between">
                        <div className="flex justify-between items-center">
                            <div className="h-4 w-24 bg-slate-100 rounded"></div>
                            <div className="h-8 w-8 bg-slate-50 rounded-lg"></div>
                        </div>
                        <div className="h-8 w-32 bg-slate-100 rounded-lg"></div>
                    </div>
                ))}
            </div>

            {/* Content Area Skeleton */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden min-h-[500px]">
                <div className="p-6 border-b border-slate-50 flex items-center gap-4">
                    <div className="h-10 flex-1 bg-slate-50 rounded-xl"></div>
                    <div className="h-10 w-32 bg-slate-50 rounded-xl"></div>
                    <div className="h-10 w-32 bg-slate-50 rounded-xl"></div>
                </div>
                <div className="p-8 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex gap-4 items-center">
                            <div className="h-12 w-full bg-slate-50 rounded-xl"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
