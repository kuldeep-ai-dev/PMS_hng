import React from 'react';

export default function OrdersLoading() {
    return (
        <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto h-full pb-20 px-4 md:px-6 animate-pulse">
            {/* Top Bar Skeleton */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="space-y-2">
                    <div className="h-10 w-64 bg-slate-100 rounded-lg" />
                    <div className="h-4 w-80 bg-slate-50 rounded" />
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex gap-6 pr-6 border-r border-slate-100">
                        <div className="space-y-2">
                            <div className="h-3 w-16 bg-slate-50 rounded" />
                            <div className="h-6 w-12 bg-slate-100 rounded" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 w-16 bg-slate-50 rounded" />
                            <div className="h-6 w-12 bg-slate-100 rounded" />
                        </div>
                    </div>
                    <div className="h-12 w-32 bg-slate-100 rounded-2xl" />
                </div>
            </div>

            {/* Main Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="min-h-[420px] bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="h-2 w-full bg-slate-100" />
                        <div className="p-6 flex flex-col flex-1 space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                    <div className="h-3 w-20 bg-slate-100 rounded" />
                                    <div className="h-8 w-32 bg-slate-100 rounded-lg" />
                                    <div className="h-3 w-24 bg-slate-50 rounded" />
                                </div>
                                <div className="h-12 w-12 bg-slate-100 rounded-2xl" />
                            </div>
                            <div className="h-12 w-full bg-slate-50 rounded-2xl border border-slate-100" />
                            <div className="flex-1 space-y-3 py-4 border-y border-slate-50">
                                <div className="h-3 w-24 bg-slate-50 rounded mb-4" />
                                {[1, 2, 3].map(j => (
                                    <div key={j} className="flex justify-between items-center">
                                        <div className="h-4 w-3/4 bg-slate-50 rounded" />
                                        <div className="h-2 w-2 bg-slate-100 rounded-full" />
                                    </div>
                                ))}
                            </div>
                            <div className="pt-6 space-y-3">
                                <div className="flex gap-2">
                                    <div className="h-10 flex-1 bg-slate-50 rounded-xl" />
                                    <div className="h-10 flex-1 bg-slate-50 rounded-xl" />
                                </div>
                                <div className="h-12 w-full bg-slate-100 rounded-2xl" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
