import { Suspense } from 'react';
import { Instagram, TrendingUp } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { MetaAnalytics } from '../MetaAnalytics';

export const metadata = {
    title: 'Instagram Marketing | PMS',
    description: 'Manage Instagram Business insights and follower engagement',
};

export default async function InstagramMarketingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-pink-100 rounded-2xl text-[#E1306C] shadow-sm">
                        <Instagram className="w-8 h-8" />
                    </div>
                    Instagram Insights
                </h1>
                <p className="text-slate-500 mt-2 font-medium">
                    Monitor your Instagram Business profile reach, follower interactions, and top content performance.
                </p>
            </div>

            <Suspense fallback={<div className="h-96 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-[2rem] border border-slate-100 shadow-sm animate-pulse">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <TrendingUp className="w-12 h-12 animate-bounce" />
                    <p className="font-bold tracking-widest uppercase text-[10px]">Loading Analytics...</p>
                </div>
            </div>}>
                <MetaAnalytics platform="instagram" />
            </Suspense>
        </div>
    );
}
