import { SkeletonPageHeader, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function RestaurantMenuLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <SkeletonPageHeader />
            <div className="flex gap-2 animate-pulse mb-2">
                {[0, 1, 2, 3].map(i => <SkeletonBar key={i} h="h-9" w="w-24" />)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 animate-pulse">
                        <div className="h-36 bg-slate-200 rounded-xl w-full" />
                        <SkeletonBar h="h-5" w="w-32" />
                        <SkeletonBar h="h-3" w="w-48" />
                        <SkeletonBar h="h-6" w="w-24" />
                    </div>
                ))}
            </div>
        </div>
    );
}
