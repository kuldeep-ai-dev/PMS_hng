import { SkeletonPageHeader, SkeletonTable } from '@/components/ui/LoadingSkeleton';

export default function VerifyBillLoading() {
    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <SkeletonPageHeader />
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <SkeletonTable rows={6} cols={4} />
            </div>
        </div>
    );
}
