'use client';

import { AlertTriangle, Info, ZapOff } from 'lucide-react';
import { toggleSandboxMode } from '@/app/actions/sandbox';
import { useState } from 'react';
import { toast } from 'sonner';

export function SandboxBanner() {
    const [isDisabling, setIsDisabling] = useState(false);

    const handleDisable = async () => {
        if (!confirm('Turn off Sandbox Mode? All test records created since activation will be PERMANENTLY deleted.')) return;
        
        setIsDisabling(true);
        try {
            await toggleSandboxMode(false);
            toast.success('Sandbox Mode disabled. Test data wiped.');
            window.location.reload();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsDisabling(false);
        }
    };

    return (
        <div className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 text-white px-4 py-2 flex items-center justify-between shadow-lg shadow-orange-500/20 sticky top-0 z-[100] animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-1.5 rounded-lg animate-pulse">
                    <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-sm font-black uppercase tracking-tighter leading-none">Sandbox Mode Active</h4>
                    <p className="text-[10px] font-black opacity-90 uppercase tracking-widest mt-1">
                        Isolated Test Data Layer — Real operations hidden
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full border border-white/20">
                    <Info className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-tight">Changes will be wiped on exit</span>
                </div>
                <button 
                    onClick={handleDisable}
                    disabled={isDisabling}
                    className="bg-white text-orange-600 hover:bg-orange-50 px-4 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-tighter shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                    {isDisabling ? (
                        <>Cleaning up...</>
                    ) : (
                        <>
                            <ZapOff className="w-3.5 h-3.5" />
                            Exit & Clear Data
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
