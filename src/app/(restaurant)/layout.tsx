import { Toaster } from 'sonner';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { RestaurantNav } from './restaurant/RestaurantNav';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getSettings } from '../(dashboard)/settings/actions';
import { GlobalNotificationListener } from '@/components/restaurant/GlobalNotificationListener';
import { isSystemValid } from '@/app/actions/license';
import { SessionTimeoutProvider } from '@/components/layout/SessionTimeoutProvider';
import { SandboxBanner } from '@/components/layout/SandboxBanner';
import { syncSystemDateAction } from '@/app/actions/audit';

export default async function RestaurantIsolatedLayout({
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

    // ALL ROLES in this group get the Isolated Restaurant Layout
    return (
        <DashboardShell hotelName={hotelName}>
            {settings?.is_sandbox_mode && <SandboxBanner />}
            <div className="flex min-h-screen relative text-slate-900 bg-slate-100/80 print:p-0 print:m-0 print:block">
                <RestaurantNav
                    initials={initials}
                    displayName={displayName}
                    role={role}
                    isFixed
                />

                <main className="flex-1 flex flex-col min-w-0 p-2 md:p-4 print:p-0">
                    <div className="flex-1 pb-4 print:pb-0 print:bg-white">
                        {children}
                    </div>
                </main>

                <div className="print:hidden">
                    <Toaster position="top-center" richColors />
                </div>
            </div>
            {(role === 'restaurant_staff' || role === 'admin' || role === 'master') && (
                <GlobalNotificationListener userRole={role} />
            )}
            <SessionTimeoutProvider userId={user.id} />
        </DashboardShell>
    );
}
