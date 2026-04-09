import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getGrowthAnalytics } from '../actions-growth';
import GrowthDashboardClient from './GrowthDashboardClient';

export const revalidate = 30; // ISR for performance

export default async function GrowthAnalyticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const data = await getGrowthAnalytics();

    return (
        <div className="p-6 bg-slate-50/30 min-h-screen">
            <GrowthDashboardClient data={data} />
        </div>
    );
}
