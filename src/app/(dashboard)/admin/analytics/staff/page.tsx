import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getStaffAnalytics } from '../actions-staff';
import StaffDashboardClient from './StaffDashboardClient';

export const dynamic = 'force-dynamic';

export default async function StaffAnalyticsPage() {
    const supabase = await createClient();
    // Parallel Data Fetching: Auth and Staff Analytics
    const [
        { data: { user } },
        data
    ] = await Promise.all([
        supabase.auth.getUser(),
        getStaffAnalytics()
    ]);

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="p-6 bg-slate-50/30 min-h-screen">
            <StaffDashboardClient data={data} />
        </div>
    );
}
