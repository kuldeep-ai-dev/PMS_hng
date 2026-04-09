import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getTrendAnalytics } from '../actions-trends';
import TrendDashboardClient from './TrendDashboardClient';

export const revalidate = 30;

export default async function TrendAnalyticsPage() {
    const supabase = await createClient();
    // Parallel Data Fetching: Auth and Trend Data
    const [
        { data: { user } },
        data
    ] = await Promise.all([
        supabase.auth.getUser(),
        getTrendAnalytics()
    ]);

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="p-6 bg-slate-50/30 min-h-screen">
            <TrendDashboardClient data={data} />
        </div>
    );
}
