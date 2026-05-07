'use client';

import { useState, useEffect } from 'react';
import {
    Wallet,
    Settings,
    TrendingUp,
    History,
    Save,
    Search,
    ArrowLeft,
    Gift,
    Coins,
    Percent,
    ChevronRight,
    ArrowRightLeft,
    CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import {
    getLoyaltySettings,
    updateLoyaltySettings,
    getCustomerWallet,
    getLoyaltyTransactions
} from './actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function LoyaltyManagementPage() {
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Wallet Search
    const [searchMobile, setSearchMobile] = useState('');
    const [selectedWallet, setSelectedWallet] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await getLoyaltySettings();
            setSettings(data);
        } catch (error) {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await updateLoyaltySettings(settings);
            toast.success('Loyalty program updated!');
            loadSettings(); // Reload to get ID if it was an insert
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSearchWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchMobile.trim()) return;

        setIsSearching(true);
        try {
            const [wallet, logs] = await Promise.all([
                getCustomerWallet(searchMobile.trim()),
                getLoyaltyTransactions(searchMobile.trim())
            ]);

            if (wallet) {
                setSelectedWallet(wallet);
                setTransactions(logs);
            } else {
                toast.error('No wallet found for this number');
                setSelectedWallet(null);
            }
        } catch (error) {
            toast.error('Error searching wallet');
        } finally {
            setIsSearching(false);
        }
    };

    if (!mounted || loading) {
        return (
            <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <div className="h-8 w-64 bg-slate-100 rounded-lg" />
                        <div className="h-4 w-48 bg-slate-50 rounded" />
                    </div>
                    <div className="h-12 w-48 bg-slate-100 rounded-2xl" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 h-[600px] bg-white rounded-[2.5rem] border border-slate-100" />
                    <div className="lg:col-span-7 h-[600px] bg-white rounded-[2.5rem] border border-slate-100" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Link href="/restaurant" className="p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 leading-tight">Loyalty Wallet</h1>
                        <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 mt-1 flex items-center gap-2">
                            <Gift className="w-3 h-3" />
                            Customer Retention & Rewards System
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="bg-teal-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    UPDATE LOYALTY DESIGN
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Panel 1: Loyalty Designer */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                                <Settings className="w-5 h-5 text-teal-600" />
                                Reward Rules
                            </h3>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* System Status Toggle */}
                            <div className="flex items-center justify-between p-6 bg-teal-50/50 rounded-3xl border border-teal-100/50">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-500",
                                        settings?.is_active ? "bg-teal-600 text-white rotate-0" : "bg-slate-200 text-slate-400 -rotate-12"
                                    )}>
                                        <Gift className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900">Program Status</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                            {settings?.is_active ? "Active & Running" : "Currently Disabled"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, is_active: !settings.is_active })}
                                    className={cn(
                                        "relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ring-offset-2 focus:ring-2 focus:ring-teal-500/20",
                                        settings?.is_active ? "bg-teal-600" : "bg-slate-300"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-500 shadow-sm",
                                        settings?.is_active ? "translate-x-7 flex items-center justify-center" : "translate-x-0"
                                    )} >
                                        {settings?.is_active && <div className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />}
                                    </div>
                                </button>
                            </div>

                            {/* Points Earn Rate */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Points Earning Rule</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Spent (₹)</p>
                                        <p className="text-lg font-black text-slate-900">1.00</p>
                                    </div>
                                    <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100 relative group">
                                        <p className="text-[10px] font-bold text-teal-600 uppercase mb-1">Points Earned</p>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={settings?.points_per_rupee}
                                            onChange={(e) => setSettings({ ...settings, points_per_rupee: parseFloat(e.target.value) })}
                                            className="bg-transparent border-none p-0 text-lg font-black text-teal-900 outline-none w-full"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 transition-opacity group-hover:opacity-100">
                                            <Coins className="w-5 h-5 text-teal-600" />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 italic">Example: 0.1 means customer gets 1 point for every ₹10 spent.</p>
                            </div>

                            {/* Points Value */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Point Monetary Value</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Point Balance</p>
                                        <p className="text-lg font-black text-slate-900">1.00</p>
                                    </div>
                                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 relative group">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Value in (₹)</p>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={settings?.rupee_value_per_point}
                                            onChange={(e) => setSettings({ ...settings, rupee_value_per_point: parseFloat(e.target.value) })}
                                            className="bg-transparent border-none p-0 text-lg font-black text-emerald-900 outline-none w-full"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 transition-opacity group-hover:opacity-100">
                                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 italic">Example: 1 means 1 point can be redeemed for ₹1 Discount.</p>
                            </div>

                            {/* Min Redeem */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Min. Redemption Threshold</label>
                                <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 relative group">
                                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-2">Minimum Points to Redeem</p>
                                    <div className="flex items-end gap-3">
                                        <input
                                            type="number"
                                            value={settings?.min_redeem_points}
                                            onChange={(e) => setSettings({ ...settings, min_redeem_points: parseInt(e.target.value) })}
                                            className="bg-transparent border-none p-0 text-3xl font-black text-amber-900 outline-none w-full"
                                        />
                                        <span className="text-xs font-black text-amber-600 uppercase mb-1 tracking-widest">Points</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel 2: Customer Wallet Investigator */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col h-full min-h-[600px]">
                        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                                    <Wallet className="w-5 h-5 text-indigo-600" />
                                    Investigate Wallet
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Lookup customer balance and history</p>
                            </div>

                            <form onSubmit={handleSearchWallet} className="relative group min-w-[300px]">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Enter Mobile Number..."
                                    value={searchMobile}
                                    onChange={(e) => setSearchMobile(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-indigo-500/20 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                />
                                <button type="submit" className="hidden"></button>
                            </form>
                        </div>

                        {selectedWallet ? (
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                {/* Wallet Card */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Available Balance</p>
                                        <div className="flex items-end gap-3">
                                            <h4 className="text-5xl font-black tracking-tighter tabular-nums">{selectedWallet.points_balance}</h4>
                                            <span className="text-xs font-black uppercase tracking-widest opacity-60 mb-2">Points</span>
                                        </div>
                                        <div className="mt-8 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Monetary Value</span>
                                                <span className="text-lg font-black">₹ {(selectedWallet.points_balance * (settings?.rupee_value_per_point || 0)).toLocaleString()}</span>
                                            </div>
                                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                                <Coins className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Wallet Verified</p>
                                                <p className="text-sm font-black text-slate-900">{selectedWallet.mobile_number}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                    Active
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Last Updated</p>
                                                <p className="text-[11px] font-black">{new Date(selectedWallet.updated_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Transaction History */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <History className="w-3.5 h-3.5" />
                                            Recent Activity
                                        </h4>
                                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-widest">
                                            {transactions.length} Records
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {transactions.map((tx) => (
                                            <div key={tx.id} className="bg-white border border-slate-50 p-5 rounded-3xl hover:border-slate-200 transition-colors group flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                                                        tx.points_delta > 0 ? "bg-emerald-50 text-emerald-600 group-hover:scale-110" : "bg-rose-50 text-rose-600 group-hover:scale-110"
                                                    )}>
                                                        {tx.transaction_type === 'earn' ? <TrendingUp className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{tx.description}</p>
                                                        <div className="flex items-center gap-3 mt-0.5">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                                                            {tx.order_id && (
                                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Bill #{tx.order?.bill_no}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={cn(
                                                        "text-lg font-black tracking-tight",
                                                        tx.points_delta > 0 ? "text-emerald-600" : "text-rose-600"
                                                    )}>
                                                        {tx.points_delta > 0 ? '+' : ''}{tx.points_delta}
                                                    </p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Points</p>
                                                </div>
                                            </div>
                                        ))}
                                        {transactions.length === 0 && (
                                            <div className="py-20 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No transactions yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6 opacity-40">
                                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center animate-pulse">
                                    <Wallet className="w-12 h-12 text-slate-300" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-slate-900">Search for points history</h4>
                                    <p className="text-sm font-bold text-slate-400 max-w-[300px] mt-2 leading-relaxed">Enter a customer's mobile number above to view their wallet balance and earn/redeem history.</p>
                                </div>
                                <div className="pt-8 grid grid-cols-3 gap-6 w-full max-w-md opacity-25">
                                    <div className="h-2 rounded-full bg-slate-200"></div>
                                    <div className="h-2 rounded-full bg-slate-200"></div>
                                    <div className="h-2 rounded-full bg-slate-200"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

