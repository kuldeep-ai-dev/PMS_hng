import { SkeletonPageHeader, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function RestaurantTablesLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <SkeletonPageHeader />
            {/* Table map grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 animate-pulse flex flex-col items-center">
                        <div className="h-16 w-16 bg-slate-200 rounded-full" />
                        <SkeletonBar h="h-4" w="w-20" />
                        <SkeletonBar h="h-3" w="w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}
