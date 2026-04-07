import React from 'react';
import { BentoCard } from '@/components/ui/BentoCard';

export default function CheckInLoading() {
    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-20 animate-pulse">
            <div>
                <div className="h-8 w-48 bg-slate-100 rounded-lg mb-2" />
                <div className="h-4 w-64 bg-slate-50 rounded" />
            </div>

            {/* Step 1 Skeleton */}
            <BentoCard className="p-6 border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-slate-100" />
                    <div className="h-6 w-32 bg-slate-100 rounded" />
                </div>
                <div className="space-y-6">
                    <div className="h-12 w-full bg-slate-50 rounded-xl" />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-20 bg-slate-50 rounded-xl" />
                        <div className="h-20 bg-slate-50 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-12 bg-slate-50 rounded-xl" />
                        <div className="h-12 bg-slate-50 rounded-xl" />
                        <div className="h-12 bg-slate-50 rounded-xl" />
                    </div>
                </div>
            </BentoCard>

            {/* Step 2 Skeleton Preview */}
            <BentoCard className="p-6 opacity-50 border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100" />
                    <div className="h-6 w-32 bg-slate-100 rounded" />
                </div>
            </BentoCard>
        </div>
    );
}
