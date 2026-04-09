import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LogoutButton } from './LogoutButton';
import { createClient } from '@/utils/supabase/server';
import { MobileSidebar } from './MobileSidebar';
import { SidebarNav } from './SidebarNav';

interface SidebarProps {
    className?: string;
    role?: string;
    initials?: string;
    displayName?: string;
}

export async function Sidebar({ className, role: propRole, initials: propInitials, displayName: propDisplayName }: SidebarProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Use props if available, otherwise fetch as fallback
    let role = propRole;
    let initials = propInitials;
    let displayName = propDisplayName;

    if (!role || !initials || !displayName) {
        const { data: profile } = user ? await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single() : { data: null };

        role = role || profile?.role || 'Guest';
        initials = initials || profile?.name?.split(' ')?.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
        displayName = displayName || profile?.name || user?.email?.split('@')[0] || 'User';
    }

    return (
        <>
            {/* Desktop Sidebar - fixed position, full-height standard layout */}
            <aside className={cn("hidden md:flex fixed top-0 left-0 bottom-0 z-40 w-64 bg-white border-r border-slate-200 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)] flex-col", className)}>
                <div className="flex items-center justify-center px-4 py-3 border-b border-slate-100">
                    <img
                        src="/pmslogo.svg"
                        alt="Geny PMS"
                        className="w-32 h-auto object-contain"
                    />
                </div>

                <SidebarNav key={role} role={role!} />

                <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-full bg-slate-200 flex shrink-0 items-center justify-center font-bold text-slate-500 text-sm shadow-inner">{initials}</div>
                            <div className="flex flex-col truncate">
                                <span className="text-sm font-semibold text-slate-700 truncate">{displayName}</span>
                                <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">{role!.replace('_', ' ')}</span>
                            </div>
                        </div>
                        <LogoutButton />
                    </div>
                </div>
            </aside>

            {/* Spacer to push main content right on desktop */}
            <div className="hidden md:block shrink-0 w-64" />

            {/* Mobile Sidebar */}
            <MobileSidebar
                initials={initials!}
                displayName={displayName!}
                role={role!}
            />
        </>
    );
}
