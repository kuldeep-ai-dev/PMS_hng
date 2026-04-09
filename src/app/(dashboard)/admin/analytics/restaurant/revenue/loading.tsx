import { SkeletonPageHeader, SkeletonTable, SkeletonCard } from '@/components/ui/LoadingSkeleton';

export default function RestaurantRevenueAnalyticsLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <SkeletonPageHeader />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonCard />
                <SkeletonCard />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <SkeletonTable rows={10} cols={5} />
            </div>
        </div>
    );
}
