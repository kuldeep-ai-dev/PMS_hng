import { SkeletonPageHeader, SkeletonTable, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function FolioLoading() {
    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <SkeletonPageHeader />
            {/* Folio header card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="space-y-1.5">
                            <SkeletonBar h="h-3" w="w-20" />
                            <SkeletonBar h="h-6" w="w-32" />
                        </div>
                    ))}
                </div>
                <SkeletonTable rows={6} cols={4} />
                <div className="mt-6 flex justify-end gap-3">
                    <SkeletonBar h="h-10" w="w-32" />
                    <SkeletonBar h="h-10" w="w-40" />
                </div>
            </div>
        </div>
    );
}
