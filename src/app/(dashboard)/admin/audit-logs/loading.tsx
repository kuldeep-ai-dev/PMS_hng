import React from 'react';
import { BentoCard } from '@/components/ui/BentoCard';

export default function AuditLogsLoading() {
    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-pulse">
            <div className="space-y-2">
                <div className="h-10 w-96 bg-slate-100 rounded-xl" />
                <div className="h-4 w-[600px] bg-slate-50 rounded" />
            </div>

            <BentoCard className="flex flex-col bg-white overflow-hidden shadow-sm border border-slate-200">
                <div className="h-[600px] w-full bg-slate-50/50" />
            </BentoCard>
        </div>
    );
}
