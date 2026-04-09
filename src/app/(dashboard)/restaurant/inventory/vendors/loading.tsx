import { SkeletonPageHeader, SkeletonTable } from '@/components/ui/LoadingSkeleton';

export default function RestaurantVendorsLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <SkeletonPageHeader />
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <SkeletonTable rows={8} cols={5} />
            </div>
        </div>
    );
}
