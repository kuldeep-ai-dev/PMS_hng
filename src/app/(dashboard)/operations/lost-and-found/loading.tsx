import { SkeletonPageHeader, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function LostAndFoundLoading() {
    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <SkeletonPageHeader />
            <div className="flex gap-3 animate-pulse">
                <SkeletonBar h="h-11" w="w-full" />
                <SkeletonBar h="h-11" w="w-40" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 animate-pulse">
                        <SkeletonBar h="h-5" w="w-40" />
                        <SkeletonBar h="h-3" w="w-56" />
                        <SkeletonBar h="h-3" w="w-32" />
                        <SkeletonBar h="h-9" w="w-full" className="mt-2" />
                    </div>
                ))}
            </div>
        </div>
    );
}
