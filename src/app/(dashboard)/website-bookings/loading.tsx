import { SkeletonPageHeader, SkeletonTable, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function WebsiteBookingsLoading() {
    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <SkeletonPageHeader />
            <div className="flex gap-3 animate-pulse">
                <SkeletonBar h="h-11" w="w-full" />
                <SkeletonBar h="h-11" w="w-40" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <SkeletonTable rows={8} cols={5} />
            </div>
        </div>
    );
}
