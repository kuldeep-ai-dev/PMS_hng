'use client';

import { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/app/login/actions';
import { SidebarNav } from './SidebarNav';

interface MobileSidebarProps {
    initials: string;
    displayName: string;
    role: string;
}

export function MobileSidebar({ initials, displayName, role }: MobileSidebarProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Hamburger Button - visible only on mobile */}
            <button
                onClick={() => setOpen(true)}
                className="md:hidden fixed top-5 left-5 z-50 p-2.5 bg-white border border-slate-200 rounded-xl shadow-lg text-slate-700 hover:bg-slate-50 transition-colors"
                aria-label="Open menu"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Backdrop */}
            {open && (
                <div
                    className="md:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Slide-in Sidebar */}
            <div
                className={cn(
                    "md:hidden fixed top-0 left-0 z-[70] h-full w-72 bg-white border-r border-slate-200 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
                    open ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                    <img
                        src="/pmslogo.svg"
                        alt="Geny PMS"
                        className="w-28 h-auto object-contain"
                    />
                    <button onClick={() => setOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation (uses shared SidebarNav component) */}
                <SidebarNav key={role} role={role} onNavigate={() => setOpen(false)} />

                {/* User Section */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex shrink-0 items-center justify-center font-bold text-slate-500 text-sm shadow-inner">{initials}</div>
                        <div className="flex flex-col truncate">
                            <span className="text-sm font-semibold text-slate-700 truncate">{displayName}</span>
                            <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">{role.replace('_', ' ')}</span>
                        </div>
                    </div>
                    <form action={logout}>
                        <button title="Sign Out" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
