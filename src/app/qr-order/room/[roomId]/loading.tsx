import { SkeletonBar } from '@/components/ui/LoadingSkeleton';

export default function QrRoomOrderLoading() {
    return (
        <div className="max-w-md mx-auto p-4 space-y-6 animate-pulse">
            <div className="h-48 bg-slate-200 rounded-2xl w-full" />
            <div className="space-y-2">
                <SkeletonBar h="h-8" w="w-3/4" />
                <SkeletonBar h="h-4" w="w-1/2" />
            </div>
            <div className="grid grid-cols-1 gap-4">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 items-center">
                        <div className="h-16 w-16 bg-slate-200 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2">
                            <SkeletonBar h="h-4" w="w-full" />
                            <SkeletonBar h="h-3" w="w-24" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
