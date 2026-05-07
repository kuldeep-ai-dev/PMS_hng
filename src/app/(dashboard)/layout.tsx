import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { Toaster } from 'sonner';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getSettings } from './settings/actions';
import { isSystemValid } from '@/app/actions/license';
import { SessionTimeoutProvider } from '@/components/layout/SessionTimeoutProvider';
import { SandboxBanner } from '@/components/layout/SandboxBanner';
import { syncSystemDateAction } from '@/app/actions/audit';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    // Batch 1: Auth + Settings
    const [{ data: { user } }, settings] = await Promise.all([
        supabase.auth.getUser(),
        getSettings(),
    ]);

    if (!user) {
        redirect('/login');
    }

    // Batch 2: Profile + License check
    const [{ data: profile }, licenseResult] = await Promise.all([
        supabase.from('profiles').select('id, name, role').eq('id', user.id).single(),
        isSystemValid(),
    ]);

    const role = profile?.role || 'Guest';

    // STRICT LICENSE CHECK
    if (role !== 'master' && !licenseResult.valid) {
        redirect('/license-expired');
    }

    const initials = profile?.name?.split(' ')?.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
    const displayName = profile?.name || user?.email?.split('@')[0] || 'User';
    const hotelName = settings?.hotel_name || '';

    // Automated Background Sync
    if (role === 'admin' || role === 'owner' || role === 'master') {
        syncSystemDateAction().catch(console.error);
    }

    // MASTER: Dedicated Master Dashboard Layout
    if (role === 'master') {
        return (
            <DashboardShell hotelName={hotelName}>
                {settings?.is_sandbox_mode && <SandboxBanner />}
                <div className="flex min-h-screen relative text-slate-900 bg-slate-50/50">
                    <Sidebar role={role} initials={initials} displayName={displayName} />
                    <main className="flex-1 flex flex-col min-w-0 p-4 md:p-6 lg:p-8">
                        <div className="flex-1 pb-4">
                            {children}
                        </div>
                    </main>
                    <div className="print:hidden">
                        <Toaster position="top-center" richColors />
                    </div>
                </div>
                <SessionTimeoutProvider userId={user.id} />
            </DashboardShell>
        );
    }

    // ALL OTHER ROLES: Normal PMS Layout
    // Note: Restaurant redirects and isolated layouts are now handled in the (restaurant) group
    return (
        <DashboardShell hotelName={hotelName}>
            {settings?.is_sandbox_mode && <SandboxBanner />}
            <div className="flex min-h-screen relative text-slate-900 bg-slate-50/50 print:p-0 print:m-0 print:block">
                <div className="print:hidden"><Sidebar role={role} initials={initials} displayName={displayName} /></div>
                <main className="flex-1 flex flex-col min-w-0 p-4 md:p-6 lg:p-8 print:p-0">
                    <div className="print:hidden"><Topbar role={role} /></div>
                    <div className="flex-1 pb-4 print:pb-0 print:bg-white">
                        {children}
                    </div>
                </main>
                <div className="print:hidden">
                    <Toaster position="top-center" richColors />
                </div>
            </div>
            <SessionTimeoutProvider userId={user.id} />
        </DashboardShell>
    );
}
