import { BentoCard } from '@/components/ui/BentoCard';
import { NightAuditClient } from './NightAuditClient';
import { getSettings } from '../../settings/actions';
import { createClient } from '@/utils/supabase/server';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function NightAuditPage({
    searchParams
}: {
    searchParams?: { date?: string }
}) {
    // Default to today's date in LOCAL time if not provided
    const localToday = new Date();
    const defaultDate = searchParams?.date || format(localToday, 'yyyy-MM-dd');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'manager';

    const settings = await getSettings();

    return (
        <div className="flex flex-col gap-8 h-full max-w-6xl mx-auto pb-20">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Day Closing / Night Audit</h1>
                <p className="text-sm text-slate-500 mt-1">Execute End of Day procedures, validate records, and generate Flash Reports.</p>
            </div>

            {/* Render the interactive Client Component */}
            <NightAuditClient date={defaultDate} settings={settings} isAdmin={isAdmin} />
        </div>
    );
}
