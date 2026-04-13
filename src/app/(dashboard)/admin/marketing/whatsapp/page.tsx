import { Suspense } from 'react';
import { Send, TrendingUp } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { WhatsAppCampaigns } from '../WhatsAppCampaigns';
import { getSettings } from '@/app/(dashboard)/settings/actions';

export const metadata = {
    title: 'WhatsApp Marketing | PMS',
    description: 'Launch AI-powered WhatsApp campaigns to guests and restaurant customers',
};

export default async function WhatsAppMarketingPage() {
    const supabase = await createClient();
    const settings = await getSettings();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const hotelBranding = {
        name: settings?.hotel_name || 'Our Hotel',
        logo: settings?.logo_url || ''
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-2xl text-green-600 shadow-sm">
                        <Send className="w-8 h-8" />
                    </div>
                    WhatsApp Campaigns
                </h1>
                <p className="text-slate-500 mt-2 font-medium">
                    Run AI-powered outreach campaigns to your guest database and restaurant customers.
                </p>
            </div>

            <Suspense fallback={<div className="h-96 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-[2rem] border border-slate-100 shadow-sm animate-pulse">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <TrendingUp className="w-12 h-12 animate-bounce" />
                    <p className="font-bold tracking-widest uppercase text-[10px]">Filtering Audience...</p>
                </div>
            </div>}>
                <WhatsAppCampaigns hotelBranding={hotelBranding} />
            </Suspense>
        </div>
    );
}
