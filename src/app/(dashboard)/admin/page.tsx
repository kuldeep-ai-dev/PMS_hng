import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { BentoCard } from '@/components/ui/BentoCard';
import { ShieldAlert, BarChart3 } from 'lucide-react';
import { SystemMaintenance } from './SystemMaintenance';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { BookingTapeChart } from './BookingTapeChart';
import { RealtimeRefresh } from '@/components/pms/RealtimeRefresh';
import { Suspense } from 'react';

export const revalidate = 30;

export default async function AdminDashboardPage() {
    const supabase = await createClient();

    // Auth & RBAC Check
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Attempt to fetch profile to check role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // For demonstration, if no profile exists or isn't admin, show unauthorized
    // Note: Since this is purely UI RBAC demo, we'll allow it if credentials are not configured
    const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (isConfigured && profile?.role !== 'admin' && profile?.role !== 'manager') {
        return (
            <div className="flex flex-col gap-6 h-full items-center justify-center">
                <BentoCard className="p-12 max-w-md text-center flex flex-col items-center">
                    <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-slate-500 text-sm">You do not have the required Administrator or Manager permissions to view this analytics dashboard.</p>
                </BentoCard>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 h-full max-w-6xl mx-auto pb-20">
            <RealtimeRefresh />
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Control Center</h1>
                <p className="text-sm text-slate-500 mt-1">Management visibility and system maintenance</p>
            </div>

            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Analytics & Reports</h2>
                <AnalyticsDashboard />
            </section>

            <section className="space-y-4 pt-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Timeline view</h2>
                <BookingTapeChart />
            </section>

            <section className="space-y-4 pt-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">System Maintenance</h2>
                <SystemMaintenance />
            </section>
        </div>
    );
}
