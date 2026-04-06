import { NightAuditClient } from '@/app/(dashboard)/admin/night-audit/NightAuditClient';
import { getBusinessDate } from '@/app/(dashboard)/admin/actions-night-audit';
import { format } from 'date-fns';
import { getSettings } from '../../settings/actions';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DayClosingPage() {
    const businessDate = await getBusinessDate();
    const dateStr = format(businessDate, 'yyyy-MM-dd');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'manager';

    const settings = await getSettings();

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-800">Front Office Day Closing</h1>
                <p className="text-slate-500 font-medium max-w-3xl">
                    Follow the Pre-Flight checklist to ensure all Front Desk and POS operations are settled before rolling the business date forward.
                </p>
            </div>

            <div className="-mx-4 md:mx-0">
                <NightAuditClient date={dateStr} settings={settings} isAdmin={isAdmin} />
            </div>
        </div>
    );
}
