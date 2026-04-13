'use client';

import { Zap, AlertTriangle, LogOut } from 'lucide-react';
import { toggleSandboxModeAction } from '@/app/actions/sandbox';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SandboxBannerProps {
    isActive: boolean;
}

export function SandboxBanner({ isActive }: SandboxBannerProps) {
    const router = useRouter();
    const [isExiting, setIsExiting] = useState(false);

    if (!isActive) return null;

    const handleExit = async () => {
        if (!confirm('Are you sure you want to EXIT Sandbox Mode? ALL test data created will be permanently deleted.')) return;
        
        setIsExiting(true);
        const result = await toggleSandboxModeAction(false);
        if (result.success) {
            router.refresh();
        } else {
            alert('Failed to exit sandbox: ' + result.error);
            setIsExiting(false);
        }
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-600 text-white shadow-lg animate-in slide-in-from-top duration-500">
            <div className="max-w-7xl mx-auto px-4 h-10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-200 animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Sandbox Mode Active</span>
                    <span className="hidden md:inline-block text-[10px] font-bold text-orange-200 opacity-80">
                        — All data added here is for testing and will be wiped.
                    </span>
                </div>
                
                <button 
                    onClick={handleExit}
                    disabled={isExiting}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        isExiting && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <LogOut className="w-3 h-3" />
                    {isExiting ? 'Purging Data...' : 'Exit & Clear Sandbox'}
                </button>
            </div>
        </div>
    );
}
