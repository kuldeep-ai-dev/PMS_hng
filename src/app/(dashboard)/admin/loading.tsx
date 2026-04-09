import { SkeletonPageHeader, SkeletonCard, SkeletonTable, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function AdminLoading() {
    return (
        <div className="flex flex-col gap-6 w-full">
            <SkeletonPageHeader />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <SkeletonBar h="h-6" w="w-48" className="mb-6" />
                <SkeletonTable rows={6} cols={5} />
            </div>
        </div>
    );
}
