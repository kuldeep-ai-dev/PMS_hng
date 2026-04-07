import React from 'react';

export default function StaffLoading() {
    return (
        <div className="p-4 md:p-8 space-y-8 animate-pulse max-w-[1600px] mx-auto w-full">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-slate-200 rounded-lg"></div>
                    <div className="h-4 w-80 bg-slate-100 rounded-lg"></div>
                </div>
                <div className="h-11 w-40 bg-teal-500/20 rounded-xl"></div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-32 flex flex-col justify-between">
                        <div className="flex justify-between items-center">
                            <div className="h-4 w-24 bg-slate-100 rounded"></div>
                            <div className="h-8 w-8 bg-slate-50 rounded-lg"></div>
                        </div>
                        <div className="h-8 w-16 bg-slate-100 rounded-lg"></div>
                    </div>
                ))}
            </div>

            {/* Table Area Skeleton */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden min-h-[600px]">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <div className="h-10 w-64 bg-slate-50 rounded-xl"></div>
                    <div className="h-10 w-32 bg-slate-50 rounded-xl"></div>
                </div>
                <div className="px-6 py-4 border-b border-slate-50 grid grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-4 bg-slate-50 rounded"></div>
                    ))}
                </div>
                <div className="p-6 space-y-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-slate-50 rounded-full shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-48 bg-slate-50 rounded"></div>
                                <div className="h-3 w-32 bg-slate-50 rounded"></div>
                            </div>
                            <div className="h-6 w-20 bg-slate-50 rounded-full"></div>
                            <div className="h-6 w-24 bg-slate-50 rounded-full"></div>
                            <div className="h-10 w-10 bg-slate-50 rounded-xl"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
