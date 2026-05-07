'use client';

import { useState, useEffect } from 'react';
import { 
    Zap, 
    Sparkles, 
    Users, 
    MessageCircle,
    TrendingUp,
    ShieldCheck
} from 'lucide-react';
import { BentoCard } from '@/components/ui/BentoCard';
import { WhatsAppCampaigns } from './WhatsAppCampaigns';
import { createClient } from '@/utils/supabase/client';
import { getSettings } from '@/app/(dashboard)/settings/actions';

export default function MarketingDashboard() {
    const [settings, setSettings] = useState<any>(null);
    const [stats, setStats] = useState({ totalLeads: 0, activeCampaigns: 0, totalDelivered: 0 });
    const supabase = createClient();

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const s = await getSettings();
        setSettings(s);

        // Fetch stats for the header
        const { count: leads } = await supabase.from('marketing_leads').select('*', { count: 'exact', head: true });
        const { data: campaignStats } = await supabase.from('whatsapp_campaigns').select('sent_count, delivered_count');
        
        const delivered = campaignStats?.reduce((acc, curr) => acc + (curr.delivered_count || 0), 0) || 0;
        
        setStats({
            totalLeads: leads || 0,
            activeCampaigns: campaignStats?.length || 0,
            totalDelivered: delivered
        });
    }

    const hotelBranding = {
        name: settings?.hotel_name || 'Our Hotel',
        logo: settings?.logo_url || ''
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header section with stats */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-200">
                            <Zap className="w-4 h-4 text-white fill-current" />
                        </div>
                        <span className="text-blue-600 font-black text-xs uppercase tracking-[0.2em]">Marketing Suite</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Campaign Hub</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Growth & Lifecycle Marketing Engine</p>
                </div>

                <div className="flex items-center gap-6 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Reach</span>
                        <span className="text-xl font-black text-slate-900 flex items-center gap-2">
                            {stats.totalLeads.toLocaleString()}
                            <Users className="w-4 h-4 text-blue-500" />
                        </span>
                    </div>
                    <div className="w-px h-8 bg-slate-100" />
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Delivered</span>
                        <span className="text-xl font-black text-slate-900 flex items-center gap-2">
                            {stats.totalDelivered.toLocaleString()}
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        </span>
                    </div>
                </div>
            </div>

            {/* The Core Engine */}
            <WhatsAppCampaigns hotelBranding={hotelBranding} />
            
        </div>
    );
}
