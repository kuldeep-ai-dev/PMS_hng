import { SkeletonPageHeader, SkeletonTable, SkeletonCard } from '@/components/ui/LoadingSkeleton';

export default function RestaurantMoneyReceiptsLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <SkeletonPageHeader />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <SkeletonTable rows={8} cols={5} />
            </div>
        </div>
    );
}
