'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Phone,
    Calendar,
    Utensils,
    TrendingUp,
    UserPlus,
    Filter,
    SearchX,
    ChevronRight,
    Leaf,
    Flame
} from 'lucide-react';
import { getRestaurantCustomerList, getRestaurantCustomerStats } from './actions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function RestaurantCustomersPage() {
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPreference, setFilterPreference] = useState('All');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [list, statistics] = await Promise.all([
                getRestaurantCustomerList(),
                getRestaurantCustomerStats()
            ]);
            setCustomers(list);
            setStats(statistics);
        } catch (error) {
            toast.error('Failed to load customer database');
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch =
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.includes(searchTerm);
        const matchesPref = filterPreference === 'All' || c.mealPreference === filterPreference;
        return matchesSearch && matchesPref;
    });

    if (loading || !mounted) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Users className="w-8 h-8 text-orange-600" />
                        Customer Database
                    </h1>
                    <p className="text-slate-500 mt-1">Marketing dashboard for direct restaurant visitors</p>
                </div>
            </div>

            {/* Stats Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-50 rounded-full group-hover:scale-110 transition-transform" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Total Customers</span>
                            <div className="p-2 bg-orange-100 rounded-2xl text-orange-600">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-4xl font-black text-slate-900">{stats?.total || 0}</div>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tighter">Direct POS registrations</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Veg Preference</span>
                            <div className="p-2 bg-emerald-100 rounded-2xl text-emerald-600">
                                <Leaf className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-4xl font-black text-slate-900">{stats?.vegPrefCount || 0}</div>
                        <p className="text-[10px] text-emerald-600 font-bold mt-2 uppercase tracking-tighter">
                            {stats?.total > 0 ? Math.round((stats.vegPrefCount / stats.total) * 100) : 0}% of your base
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full group-hover:scale-110 transition-transform" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Top Visitor</span>
                            <div className="p-2 bg-rose-100 rounded-2xl text-rose-600">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-slate-900 truncate pr-4">{stats?.topVisitorName || 'N/A'}</div>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tighter">
                            Visited {stats?.topVisitorCount || 0} times
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Non-Veg Split</span>
                            <div className="p-2 bg-blue-100 rounded-2xl text-blue-600">
                                <Flame className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-4xl font-black text-slate-900">{stats?.nonVegPrefCount || 0}</div>
                        <p className="text-[10px] text-blue-600 font-bold mt-2 uppercase tracking-tighter">
                            {stats?.total > 0 ? Math.round((stats.nonVegPrefCount / stats.total) * 100) : 0}% of your base
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by Name or Phone Number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                    />
                </div>

                <select
                    value={filterPreference}
                    onChange={(e) => setFilterPreference(e.target.value)}
                    className="px-6 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 transition-all outline-none cursor-pointer"
                >
                    <option value="All">All Preferences</option>
                    <option value="Vegetarian">Vegetarian Only</option>
                    <option value="Non-Vegetarian">Non-Vegetarian Only</option>
                </select>

                <button
                    onClick={loadData}
                    className="p-3 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-100 transition-colors"
                    title="Refresh Data"
                >
                    <UserPlus className="w-5 h-5" />
                </button>
            </div>

            {/* Customer Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Identity</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Visits</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Meal Preference</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Last Seen</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Marketing</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-black text-sm shadow-md">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{customer.name}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Joined {new Date(customer.joinedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-sm font-semibold tracking-tight">{customer.phone}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-orange-50 text-orange-700 text-xs font-black">
                                            {customer.visitCount}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                            customer.mealPreference === 'Vegetarian'
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                : customer.mealPreference === 'Non-Vegetarian'
                                                    ? "bg-rose-50 text-rose-700 border border-rose-100"
                                                    : "bg-slate-50 text-slate-500 border border-slate-100"
                                        )}>
                                            {customer.mealPreference === 'Vegetarian' ? <Leaf className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
                                            {customer.mealPreference}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-xs font-bold tracking-tight">
                                                {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <button className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all">
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredCustomers.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 bg-slate-50/20">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                                <SearchX className="w-10 h-10 text-slate-200" />
                            </div>
                            <h3 className="text-slate-900 font-black text-lg">No marketing leads found</h3>
                            <p className="text-slate-400 text-sm font-medium mt-1">Try broadening your search or preference filter</p>
                            <button
                                onClick={() => { setSearchTerm(''); setFilterPreference('All'); }}
                                className="mt-6 text-orange-600 font-black hover:underline text-sm uppercase tracking-widest"
                            >
                                Reset all filters
                            </button>
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Database Coverage: {filteredCustomers.length} of {customers.length} Entries
                    </span>
                    <p className="text-[10px] italic text-slate-400 font-medium">Data automatically synced from Restaurant POS</p>
                </div>
            </div>
        </div>
    );
}
