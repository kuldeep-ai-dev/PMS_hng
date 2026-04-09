import { SkeletonPageHeader, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function MasterControlLicenseLoading() {
    return (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
            <SkeletonPageHeader />
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 animate-pulse">
                <SkeletonBar h="h-8" w="w-full" />
                <SkeletonBar h="h-4" w="w-3/4" />
                <SkeletonBar h="h-4" w="w-1/2" />
                <div className="pt-4">
                    <SkeletonBar h="h-10" w="w-32" />
                </div>
            </div>
        </div>
    );
}
