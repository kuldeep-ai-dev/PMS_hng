import { SkeletonPageHeader, SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function LicenseLoading() {
    return (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full animate-pulse">
            <SkeletonPageHeader />
            <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="space-y-1.5">
                        <SkeletonBar h="h-3" w="w-24" />
                        <SkeletonBar h="h-6" w="w-48" />
                    </div>
                ))}
                <SkeletonBar h="h-11" w="w-full" className="mt-4" />
            </div>
        </div>
    );
}
