import { SkeletonPageHeader, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function GrowthAnalyticsLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <SkeletonPageHeader />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 h-80 animate-pulse">
                    <SkeletonBar h="h-full" w="w-full" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 h-80 animate-pulse">
                    <SkeletonBar h="h-full" w="w-full" />
                </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 h-64 animate-pulse">
                <SkeletonBar h="h-full" w="w-full" />
            </div>
        </div>
    );
}
