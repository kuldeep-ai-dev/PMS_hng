import { SkeletonPageHeader, SkeletonCard, SkeletonTable } from '@/components/ui/LoadingSkeleton';

export default function MasterControlLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <SkeletonPageHeader />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <SkeletonTable rows={5} cols={4} />
            </div>
        </div>
    );
}
