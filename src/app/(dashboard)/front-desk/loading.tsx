import React from 'react';

export default function FrontDeskLoading() {
    return (
        <div className="p-4 md:p-8 space-y-8 animate-pulse max-w-[1600px] mx-auto w-full">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
                    <div className="h-4 w-64 bg-slate-100 rounded-lg"></div>
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-40 bg-slate-200 rounded-xl"></div>
                    <div className="h-10 w-24 bg-teal-100 rounded-xl"></div>
                </div>
            </div>

            {/* Room Categories/Filters Skeleton */}
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 w-28 bg-slate-100 rounded-xl shrink-0"></div>
                ))}
            </div>

            {/* Room Grid Skeleton - Simulating the Room Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {[...Array(18)].map((_, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm h-32 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="h-6 w-12 bg-slate-200 rounded-lg"></div>
                            <div className="h-4 w-4 bg-slate-100 rounded-full"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-20 bg-slate-100 rounded"></div>
                            <div className="h-3 w-16 bg-slate-50 rounded"></div>
                        </div>
                        <div className="h-1 w-full bg-slate-100 rounded-full"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
