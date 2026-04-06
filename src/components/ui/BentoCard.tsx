import React from 'react';
import { cn } from '@/lib/utils';

interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    interactive?: boolean;
}

export function BentoCard({ children, interactive = false, className, ...props }: BentoCardProps) {
    return (
        <div
            className={cn(
                "bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden",
                interactive && "transition-all duration-300 hover:shadow-md hover:border-slate-300 cursor-pointer hover:-translate-y-0.5",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
