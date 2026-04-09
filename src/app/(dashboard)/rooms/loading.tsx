import { SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function RoomsLoading() {
    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between animate-pulse">
                <div className="space-y-2">
                    <SkeletonBar h="h-8" w="w-48" />
                    <SkeletonBar h="h-4" w="w-64" />
                </div>
                <SkeletonBar h="h-11" w="w-36" />
            </div>
            {/* Room card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 animate-pulse">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1.5">
                                <SkeletonBar h="h-7" w="w-28" />
                                <SkeletonBar h="h-3" w="w-20" />
                            </div>
                            <div className="h-12 w-12 bg-slate-200 rounded-xl" />
                        </div>
                        <SkeletonBar h="h-px" w="w-full" />
                        <SkeletonBar h="h-4" w="w-32" />
                        <SkeletonBar h="h-px" w="w-full" />
                        <SkeletonBar h="h-4" w="w-24" />
                        <div className="flex gap-2 mt-2">
                            <SkeletonBar h="h-9" w="w-full" />
                            <SkeletonBar h="h-9" w="w-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
