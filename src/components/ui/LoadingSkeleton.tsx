/**
 * Shared skeleton primitives used in loading.tsx files across all pages.
 */

export function SkeletonBar({ h = 'h-4', w = 'w-full', className = '' }: { h?: string; w?: string; className?: string }) {
    return <div className={`${h} ${w} bg-slate-200 rounded-lg animate-pulse ${className}`} />;
}

export function SkeletonCard() {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="flex justify-between items-start">
                <SkeletonBar h="h-5" w="w-32" />
                <div className="h-10 w-10 bg-slate-200 rounded-xl" />
            </div>
            <SkeletonBar h="h-8" w="w-24" />
            <SkeletonBar h="h-3" w="w-20" />
        </div>
    );
}

export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="animate-pulse">
            {/* Header */}
            <div className="flex gap-4 pb-3 border-b border-slate-200 mb-3">
                {Array.from({ length: cols }).map((_, i) => (
                    <SkeletonBar key={i} h="h-3" w="w-24" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4 py-4 border-b border-slate-100">
                    {Array.from({ length: cols }).map((_, j) => (
                        <SkeletonBar key={j} h="h-4" w={j === 0 ? 'w-36' : 'w-24'} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function SkeletonPageHeader() {
    return (
        <div className="flex items-center justify-between mb-6 animate-pulse">
            <div className="space-y-2">
                <SkeletonBar h="h-8" w="w-48" />
                <SkeletonBar h="h-4" w="w-64" />
            </div>
            <SkeletonBar h="h-10" w="w-36" />
        </div>
    );
}

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
    return (
        <div className="space-y-5 animate-pulse">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                    <SkeletonBar h="h-3" w="w-28" />
                    <SkeletonBar h="h-12" w="w-full" />
                </div>
            ))}
            <SkeletonBar h="h-12" w="w-full" className="mt-4" />
        </div>
    );
}
