import { SkeletonPageHeader, SkeletonTable, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function OperationsLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <SkeletonPageHeader />
            {/* Sub-nav tabs */}
            <div className="flex gap-2 animate-pulse border-b border-slate-200 pb-2">
                {[0, 1, 2, 3, 4].map(i => (
                    <SkeletonBar key={i} h="h-9" w="w-32" />
                ))}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <SkeletonTable rows={8} cols={5} />
            </div>
        </div>
    );
}
