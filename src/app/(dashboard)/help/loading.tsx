import { SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function HelpLoading() {
    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full animate-pulse">
            <SkeletonBar h="h-8" w="w-48" />
            <SkeletonBar h="h-4" w="w-72" />
            <div className="space-y-4 mt-4">
                {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                        <SkeletonBar h="h-5" w="w-56" />
                        <SkeletonBar h="h-3" w="w-full" />
                        <SkeletonBar h="h-3" w="w-4/5" />
                    </div>
                ))}
            </div>
        </div>
    );
}
