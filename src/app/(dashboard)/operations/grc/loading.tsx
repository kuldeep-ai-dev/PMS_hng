import { SkeletonPageHeader, SkeletonTable, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function GrcLoading() {
    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <SkeletonPageHeader />
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex gap-3 animate-pulse">
                    <SkeletonBar h="h-11" w="w-full" />
                    <SkeletonBar h="h-11" w="w-36" />
                </div>
                <SkeletonTable rows={6} cols={4} />
            </div>
        </div>
    );
}
