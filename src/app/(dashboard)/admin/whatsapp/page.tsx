import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { BentoCard } from '@/components/ui/BentoCard';
import { ShieldAlert, MessageSquare, Plus, Search, RefreshCw, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import { getWhatsAppTemplates } from '@/app/actions/whatsapp-templates';
import { WhatsAppClientPage } from './WhatsAppClientPage';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function WhatsAppControlCenterPage() {
    const supabase = await createClient();

    // Parallel Data Fetching: Auth, Profile, and Templates
    const [
        { data: { user } },
        { data: profile },
        result
    ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('profiles').select('role').eq('id', (await supabase.auth.getUser()).data.user?.id).single(),
        getWhatsAppTemplates()
    ]);

    if (!user) {
        redirect('/login');
    }

    const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (isConfigured && profile?.role !== 'admin' && profile?.role !== 'manager') {
        return (
            <div className="flex flex-col gap-6 h-full items-center justify-center">
                <BentoCard className="p-12 max-w-md text-center flex flex-col items-center">
                    <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-slate-500 text-sm">You do not have the required Administrator or Manager permissions to view the WhatsApp Control Center.</p>
                </BentoCard>
            </div>
        );
    }

    const templates = result.success ? result.data : [];
    const error = !result.success ? result.error : null;

    // Calculate stats
    const stats = {
        total: templates.length,
        approved: templates.filter((t: any) => t.status === 'APPROVED').length,
        pending: templates.filter((t: any) => t.status === 'PENDING' || t.status === 'IN_REVIEW').length,
        rejected: templates.filter((t: any) => t.status === 'REJECTED').length,
    };

    return (
        <WhatsAppClientPage
            initialTemplates={templates}
            error={error}
        />
    );
}
