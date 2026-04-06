import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getFinanceAnalytics } from '../actions-finance';
import FinanceDashboardClient from './FinanceDashboardClient';

export const dynamic = 'force-dynamic';

export default async function FinanceAnalyticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const initialData = await getFinanceAnalytics('30d');

    return (
        <div className="p-6 bg-slate-50/30 min-h-screen">
            <FinanceDashboardClient initialData={initialData} />
        </div>
    );
}
