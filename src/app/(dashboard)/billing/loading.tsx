import { SkeletonPageHeader, SkeletonTable, SkeletonCard } from '@/components/ui/LoadingSkeleton';

export default function BillingLoading() {
    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
            <SkeletonPageHeader />
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
            </div>
            {/* Main table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="h-5 w-40 bg-slate-200 rounded-lg animate-pulse mb-6" />
                <SkeletonTable rows={8} cols={5} />
            </div>
        </div>
    );
}
