import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getFinanceAnalytics } from '../actions-finance';
import FinanceDashboardClient from './FinanceDashboardClient';

export const dynamic = 'force-dynamic';

export default async function FinanceAnalyticsPage() {
    const supabase = await createClient();
    // Parallel Data Fetching: Auth and Initial Data
    const [
        { data: { user } },
        initialData
    ] = await Promise.all([
        supabase.auth.getUser(),
        getFinanceAnalytics('30d')
    ]);

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="p-6 bg-slate-50/30 min-h-screen">
            <FinanceDashboardClient initialData={initialData} />
        </div>
    );
}
