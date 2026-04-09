import { SkeletonPageHeader, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function WhatsappAnalyticsLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <SkeletonPageHeader />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map(i => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 h-32 animate-pulse" />
                ))}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 h-80 animate-pulse" />
        </div>
    );
}
