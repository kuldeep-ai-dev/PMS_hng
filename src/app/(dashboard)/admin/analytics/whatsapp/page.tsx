import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getWhatsAppAnalytics } from '../actions-wa-analytics';
import { WhatsAppAnalyticsDashboard } from '../WhatsAppAnalyticsDashboard';

export const dynamic = 'force-dynamic';

export default async function WhatsAppAnalyticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const data = await getWhatsAppAnalytics();

    return <WhatsAppAnalyticsDashboard data={data as any} />;
}
