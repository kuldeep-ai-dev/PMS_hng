import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getTrendAnalytics } from '../actions-trends';
import TrendDashboardClient from './TrendDashboardClient';

export const dynamic = 'force-dynamic';

export default async function TrendAnalyticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const data = await getTrendAnalytics();

    return (
        <div className="p-6 bg-slate-50/30 min-h-screen">
            <TrendDashboardClient data={data} />
        </div>
    );
}
