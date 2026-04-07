import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { Toaster } from 'sonner';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { RestaurantNav } from './restaurant/RestaurantNav';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getSettings } from './settings/actions';
import { AlertTriangle, Lock } from 'lucide-react';
import { GlobalNotificationListener } from '@/components/restaurant/GlobalNotificationListener';
import { isSystemValid } from '@/app/actions/license';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const [{ data: profile }, settings] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        getSettings(),
    ]);

    const role = profile?.role || 'Guest';

    // 2. STRICT LICENSE CHECK
    // Only 'master' role can bypass the expiry check
    if (role !== 'master') {
        const { valid } = await isSystemValid();
        if (!valid) {
            redirect('/license-expired');
        }
    }

    const initials = profile?.name?.split(' ')?.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
    const displayName = profile?.name || user?.email?.split('@')[0] || 'User';
    const hotelName = settings?.hotel_name || '';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SYSTEM DATE LOGIC (Removed Manual Lockdown)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Date logic is now handled automatically by the real clock (IST).

    const isAdmin = role === 'admin' || role === 'owner' || role === 'manager';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MASTER: Dedicated Master Dashboard Layout
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (role === 'master') {
        return (
            <DashboardShell hotelName={hotelName}>
                <div className="flex min-h-screen relative text-slate-900 bg-slate-50/50">
                    <Sidebar role={role} initials={initials} displayName={displayName} />
                    <main className="flex-1 flex flex-col min-w-0 p-4 md:p-6 lg:p-8">
                        {/* No Topbar for Master - Clean interface */}
                        <div className="flex-1 pb-4">
                            {children}
                        </div>
                    </main>
                    <div className="print:hidden">
                        <Toaster position="top-center" richColors />
                    </div>
                </div>
            </DashboardShell>
        );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RESTAURANT STAFF: Completely isolated layout — no PMS UI
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (role === 'restaurant_staff') {
        return (
            <DashboardShell hotelName={hotelName}>
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
                {role === 'restaurant_staff' && (
                    <GlobalNotificationListener userRole={role} />
                )}
            </DashboardShell>
        );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ALL OTHER ROLES: Normal PMS Layout
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    return (
        <DashboardShell hotelName={hotelName}>
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
            {role === 'restaurant_staff' && (
                <GlobalNotificationListener userRole={role} />
            )}
        </DashboardShell>
    );
}

