import { SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function RestaurantPosLoading() {
    return (
        <div className="flex h-[calc(100vh-6rem)] gap-4 animate-pulse">
            {/* Left: menu grid */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map(i => (
                        <SkeletonBar key={i} h="h-10" w="w-24" />
                    ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 flex-1">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                            <div className="h-24 bg-slate-200 rounded-xl w-full" />
                            <SkeletonBar h="h-4" w="w-32" />
                            <SkeletonBar h="h-3" w="w-20" />
                        </div>
                    ))}
                </div>
            </div>
            {/* Right: order summary */}
            <div className="w-80 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hidden lg:block">
                <SkeletonBar h="h-6" w="w-32" />
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                        <SkeletonBar h="h-4" w="w-32" />
                        <SkeletonBar h="h-4" w="w-16" />
                    </div>
                ))}
                <div className="border-t border-slate-200 pt-4">
                    <SkeletonBar h="h-12" w="w-full" className="mt-4" />
                </div>
            </div>
        </div>
    );
}
