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

    const role = profile?.role || 'staff';
    const initials = profile?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
    const displayName = profile?.name || user?.email?.split('@')[0] || 'User';
    const hotelName = settings?.hotel_name || '';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SYSTEM LOCKDOWN LOGIC (NIGHT AUDIT ENFORCEMENT)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const { data: latestAudit } = await supabase
        .from('night_audit_logs')
        .select('audit_date')
        .order('audit_date', { ascending: false })
        .limit(1)
        .single();

    let businessDate = new Date();
    if (latestAudit?.audit_date) {
        const lastAuditDate = new Date(latestAudit.audit_date + 'T00:00:00Z');
        businessDate = new Date(lastAuditDate);
        businessDate.setDate(businessDate.getDate() + 1); // Business Date is Audit + 1
    }
    businessDate.setHours(0, 0, 0, 0);

    const physicalDate = new Date();
    let isLockedDown = false;

    const auditEndTime = settings?.audit_window_end || "02:00";
    const [endHrs, endMins] = auditEndTime.split(':').map(Number);

    const physicalDateMidnight = new Date(physicalDate);
    physicalDateMidnight.setHours(0, 0, 0, 0);

    // If we've physically advanced to the next day, but business date hasn't rolled
    if (physicalDateMidnight > businessDate) {
        const currentHrs = physicalDate.getHours();
        const currentMins = physicalDate.getMinutes();

        // If the current time is strictly past the window end time (e.g. 02:00)
        if (currentHrs > endHrs || (currentHrs === endHrs && currentMins > endMins)) {
            isLockedDown = true;
        }

        // Failsafe: if somehow they are more than 1 day behind, instantly lock at any time
        const diffTime = Math.abs(physicalDateMidnight.getTime() - businessDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 1) {
            isLockedDown = true;
        }
    }

    const isAdmin = role === 'admin' || role === 'owner' || role === 'manager';

    if (isLockedDown && !isAdmin) {
        return (
            <DashboardShell hotelName={hotelName}>
                <div className="flex flex-col min-h-screen items-center justify-center bg-slate-900 text-white p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-900/10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900"></div>

                    <div className="text-center max-w-lg z-10 p-10 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl">
                        <div className="mx-auto w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
                            <Lock className="w-10 h-10 text-rose-500 relative z-10" />
                        </div>
                        <h1 className="text-3xl font-black mb-3 tracking-tight">System Locked</h1>
                        <p className="text-slate-300 mb-8 leading-relaxed text-sm font-medium">
                            The mandatory Day Closing / Night Audit was not executed by the Front Office within the designated operational window ({settings?.audit_window_start || '23:00'} - {auditEndTime}).
                            <br /><br />
                            For financial and ledger security, all frontline operations are currently disabled. <strong className="text-white">Please contact the Hotel Administrator to securely override and execute the Day Closing.</strong>
                        </p>

                        <form action={async () => {
                            "use server";
                            const supa = await createClient();
                            await supa.auth.signOut();
                            redirect('/login');
                        }}>
                            <button type="submit" className="w-full px-6 py-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-500/25 transition-all outline-none focus:ring-2 focus:ring-rose-500/50">
                                Log Out Securely
                            </button>
                        </form>
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
                <div className="print:hidden"><Sidebar /></div>
                <main className="flex-1 flex flex-col min-w-0 p-4 md:p-6 lg:p-8 print:p-0">
                    <div className="print:hidden"><Topbar /></div>
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

