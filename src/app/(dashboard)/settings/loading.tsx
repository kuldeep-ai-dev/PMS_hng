import { SkeletonPageHeader, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function SettingsLoading() {
    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
            <SkeletonPageHeader />
            {/* Tab bar */}
            <div className="flex gap-2 animate-pulse border-b border-slate-200 pb-2">
                {[0, 1, 2, 3].map(i => (
                    <SkeletonBar key={i} h="h-9" w="w-28" />
                ))}
            </div>
            {/* Form skeleton */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                        <SkeletonBar h="h-3" w="w-28" />
                        <SkeletonBar h="h-12" w="w-full" />
                    </div>
                ))}
                <SkeletonBar h="h-12" w="w-40" className="mt-4" />
            </div>
        </div>
    );
}
