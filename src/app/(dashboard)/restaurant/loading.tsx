import React from 'react';

export default function RestaurantLoading() {
    return (
        <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto h-full pb-10 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 mt-2 gap-4 px-4 md:px-0">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-slate-100 rounded-lg" />
                    <div className="h-4 w-48 bg-slate-50 rounded" />
                </div>
                <div className="h-10 w-48 bg-slate-900 rounded-xl" />
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 px-4 md:px-0">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-40 bg-white border border-slate-100 rounded-[24px] p-6 space-y-6">
                        <div className="flex justify-between">
                            <div className="h-12 w-12 bg-slate-50 rounded-2xl" />
                            <div className="h-6 w-16 bg-slate-50 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 w-20 bg-slate-50 rounded" />
                            <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-6 px-4 md:px-0">
                {/* Floor Plan Skeleton */}
                <div className="h-[600px] bg-white border border-slate-100 rounded-3xl p-10 flex flex-col">
                    <div className="flex justify-between mb-12">
                        <div className="space-y-2">
                            <div className="h-8 w-48 bg-slate-100 rounded-lg" />
                            <div className="h-4 w-32 bg-slate-50 rounded" />
                        </div>
                        <div className="h-10 w-48 bg-slate-50 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-20">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                            <div key={i} className="h-32 w-32 bg-slate-50 rounded-2xl mx-auto" />
                        ))}
                    </div>
                </div>

                {/* Chart Skeleton */}
                <div className="h-[400px] bg-white border border-slate-100 rounded-3xl p-8">
                    <div className="h-6 w-48 bg-slate-100 rounded-lg mb-8" />
                    <div className="h-64 w-full bg-slate-50 rounded-xl" />
                </div>

                {/* List Skeletons */}
                <div className="grid grid-cols-1 gap-6">
                    {[1, 2].map(i => (
                        <div key={i} className="h-[400px] bg-white border border-slate-100 rounded-3xl overflow-hidden">
                            <div className="p-8 border-b border-slate-50 h-20 bg-slate-50/30" />
                            <div className="p-8 space-y-6">
                                {[1, 2, 3, 4].map(j => (
                                    <div key={j} className="flex justify-between items-center">
                                        <div className="flex gap-4 items-center">
                                            <div className="h-10 w-10 bg-slate-100 rounded-xl" />
                                            <div className="h-4 w-48 bg-slate-50 rounded" />
                                        </div>
                                        <div className="h-6 w-24 bg-slate-50 rounded-xl" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
