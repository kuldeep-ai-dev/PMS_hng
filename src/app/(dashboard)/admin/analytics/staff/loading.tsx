import React from 'react';

export default function StaffPerformanceLoading() {
    return (
        <div className="p-4 md:p-8 space-y-8 animate-pulse max-w-[1600px] mx-auto w-full">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-slate-200 rounded-lg"></div>
                    <div className="h-4 w-80 bg-slate-100 rounded-lg"></div>
                </div>
            </div>

            {/* Performance Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-[32px] border border-slate-100 shadow-lg p-8 flex flex-col items-center gap-6 text-center">
                        <div className="h-20 w-20 bg-slate-50 rounded-full"></div>
                        <div className="space-y-2 w-full">
                            <div className="h-5 w-32 bg-slate-100 mx-auto rounded"></div>
                            <div className="h-3 w-20 bg-slate-50 mx-auto rounded"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-slate-50">
                            <div className="space-y-1">
                                <div className="h-4 w-12 bg-slate-50 mx-auto rounded"></div>
                                <div className="h-3 w-16 bg-slate-50 mx-auto rounded"></div>
                            </div>
                            <div className="space-y-1">
                                <div className="h-4 w-12 bg-slate-50 mx-auto rounded"></div>
                                <div className="h-3 w-16 bg-slate-50 mx-auto rounded"></div>
                            </div>
                        </div>
                        <div className="w-full h-2 bg-slate-50 rounded-full mt-2">
                            <div className="h-full bg-teal-100 rounded-full" style={{ width: `${Math.random() * 60 + 30}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
