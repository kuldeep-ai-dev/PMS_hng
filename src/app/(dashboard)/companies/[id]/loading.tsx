import { SkeletonPageHeader, SkeletonCard, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function CompanyDetailLoading() {
    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <SkeletonPageHeader />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                        <SkeletonBar h="h-6" w="w-48" />
                        <div className="grid grid-cols-2 gap-4">
                            {[0, 1, 2, 3].map(i => <SkeletonBar key={i} h="h-10" w="w-full" />)}
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </div>
        </div>
    );
}
