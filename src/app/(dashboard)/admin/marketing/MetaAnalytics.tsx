'use client';

import { Facebook, Instagram, TrendingUp, Users, Eye, BarChart2, Activity, ImageIcon } from 'lucide-react';
import { BentoCard } from '@/components/ui/BentoCard';
import { cn } from '@/lib/utils';

interface MetaAnalyticsProps {
    platform?: 'facebook' | 'instagram' | 'both';
}

export function MetaAnalytics({ platform = 'both' }: MetaAnalyticsProps) {
    // Mock analytics data
    const insights = {
        facebook: {
            reach: 8420,
            engagement: 1240,
            likes: 450,
            trending: true,
        },
        instagram: {
            reach: 15600,
            engagement: 3800,
            followers: 1200,
            trending: true,
        }
    };

    const recentPosts = [
        { id: 1, platform: 'instagram', type: 'image', reach: 5200, engagement: 850, date: '2h ago', preview: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&auto=format&fit=crop&q=60' },
        { id: 2, platform: 'facebook', type: 'video', reach: 3100, engagement: 420, date: '5h ago', preview: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60' },
        { id: 3, platform: 'instagram', type: 'carousel', reach: 8900, engagement: 1200, date: '1d ago', preview: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=500&auto=format&fit=crop&q=60' },
    ];

    const ads = [
        { id: 1, name: 'Weekend Gateway Promo', status: 'Active', spend: 2500, impressions: 45000, clicks: 1200, ctr: '2.6%' },
        { id: 2, name: 'Restaurant Special Buffet', status: 'Paused', spend: 4200, impressions: 82000, clicks: 3500, ctr: '4.2%' },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Facebook Insights */}
                {(platform === 'facebook' || platform === 'both') && (
                    <BentoCard className="p-6 overflow-hidden group">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-[#1877F2]/10 rounded-2xl text-[#1877F2]">
                                    <Facebook className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900">Facebook Page</h3>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Performance</p>
                                </div>
                            </div>
                            <div className="p-2 bg-green-50 rounded-xl text-green-600">
                                <Activity className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-500">Post Reach</p>
                                <div className="text-2xl font-black text-slate-900">{insights.facebook.reach.toLocaleString()}</div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-500">Engagement</p>
                                <div className="text-2xl font-black text-slate-900">{insights.facebook.engagement.toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="mt-6 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#1877F2] w-[65%] rounded-full animate-in slide-in-from-left duration-1000" />
                        </div>
                        <p className="mt-2 text-[10px] font-bold text-slate-400">Target Reached: 65% of monthly goal</p>
                    </BentoCard>
                )}

                {/* Instagram Insights */}
                {(platform === 'instagram' || platform === 'both') && (
                    <BentoCard className={cn("p-6 overflow-hidden group", platform === 'instagram' && "md:col-span-2")}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-2xl text-white">
                                    <Instagram className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900">Instagram Profile</h3>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Engagement</p>
                                </div>
                            </div>
                            <div className="p-2 bg-green-50 rounded-xl text-green-600">
                                <Activity className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-500">Reach</p>
                                <div className="text-2xl font-black text-slate-900">{insights.instagram.reach.toLocaleString()}</div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-500">Interactions</p>
                                <div className="text-2xl font-black text-slate-900">{insights.instagram.engagement.toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="mt-6 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-pink-500 to-purple-600 w-[82%] rounded-full animate-in slide-in-from-left duration-1000" />
                        </div>
                        <p className="mt-2 text-[10px] font-bold text-slate-400">Target Reached: 82% of monthly goal</p>
                    </BentoCard>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Posts Grid */}
                <BentoCard className="p-6 lg:col-span-2">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-teal-500" />
                        Top Performing Content
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {recentPosts
                            .filter(post => platform === 'both' || post.platform === platform)
                            .map((post) => (
                            <div key={post.id} className="group relative rounded-2xl overflow-hidden aspect-[4/5] bg-slate-100 border border-slate-200">
                                <img src={post.preview} alt="Post preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        {post.platform === 'instagram' ? <Instagram className="w-4 h-4 text-white" /> : <Facebook className="w-4 h-4 text-white" />}
                                        <span className="text-[10px] font-bold text-white uppercase">{post.date}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-white">
                                        <div className="flex items-center gap-1">
                                            <Eye className="w-3 h-3" />
                                            <span className="text-xs font-bold">{post.reach}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Activity className="w-3 h-3" />
                                            <span className="text-xs font-bold">{post.engagement}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </BentoCard>

                {/* Ad Stats Card */}
                <BentoCard className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-teal-500" />
                        Active Ads Performance
                    </h3>
                    <div className="space-y-6">
                        {ads.map((ad) => (
                            <div key={ad.id} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-slate-900">{ad.name}</h4>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight",
                                        ad.status === 'Active' ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-600"
                                    )}>
                                        {ad.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Impressions</p>
                                        <p className="text-sm font-black text-slate-900">{ad.impressions.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">CTR</p>
                                        <p className="text-sm font-black text-slate-900">{ad.ctr}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95">
                            View Ads Manager
                        </button>
                    </div>
                </BentoCard>
            </div>
        </div>
    );
}
