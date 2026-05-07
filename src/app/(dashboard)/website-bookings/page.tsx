'use client';

import { useState, useEffect, useCallback } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { Search, RefreshCw, Loader2, CheckCircle2, XCircle, Globe, Calendar, Phone, User, Filter } from 'lucide-react';
import { getWebsiteBookings, syncBookingsFromWebsite, confirmWebsiteBooking, rejectWebsiteBooking } from '@/app/actions/sync-bookings';
import { updateSettings, getSettings } from '../settings/actions';
import { useRouter } from 'next/navigation';

export default function WebsiteBookingsPage() {
    const router = useRouter();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('pending');
    const [confirming, setConfirming] = useState<string | null>(null);

    const fetchBookings = useCallback(async () => {
        const data = await getWebsiteBookings(statusFilter);
        setBookings(data);
        setLoading(false);
    }, [statusFilter]);

    useEffect(() => {
        fetchBookings();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchBookings, 30000);
        return () => clearInterval(interval);
    }, [fetchBookings]);

    const handleSync = async () => {
        setSyncing(true);
        setSyncMsg(null);
        try {
            // Auto-save settings first
            const settings = await getSettings();
            await updateSettings(settings);
            const result = await syncBookingsFromWebsite();
            setSyncMsg(result.message);
            await fetchBookings();
        } catch (err: any) {
            setSyncMsg(`Error: ${err.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const handleConfirm = async (booking: any) => {
        setConfirming(booking.id);
        await confirmWebsiteBooking(booking.id);
        // Redirect to advance-booking with pre-filled data via query params
        const params = new URLSearchParams({
            prefill: 'true',
            name: booking.guest_name || '',
            phone: booking.phone || '',
            email: booking.email || '',
            check_in: booking.check_in_date || '',
            check_out: booking.check_out_date || '',
            room_type: booking.room_type || '',
            total: String(booking.total_price || 0),
        });
        router.push(`/operations/advance-booking?${params.toString()}`);
    };

    const handleReject = async (id: string) => {
        if (!confirm('Are you sure you want to dismiss this booking request?')) return;
        await rejectWebsiteBooking(id);
        await fetchBookings();
    };

    const filtered = bookings.filter(b => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (b.guest_name || '').toLowerCase().includes(q) ||
            (b.phone || '').toLowerCase().includes(q) ||
            (b.email || '').toLowerCase().includes(q)
        );
    });

    const formatDate = (d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="flex flex-col gap-6 h-full max-w-6xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Globe className="w-6 h-6 text-indigo-600" />
                        Website Bookings
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Incoming booking requests from your website. Auto-refreshes every 30s.</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Sync from Website
                </button>
            </div>

            {syncMsg && (
                <div className={`p-3 rounded-xl text-sm border ${syncMsg.startsWith('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    {syncMsg}
                </div>
            )}

            {/* Filters */}
            <BentoCard className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setLoading(true); }}
                            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="rejected">Dismissed</option>
                            <option value="all">All</option>
                        </select>
                    </div>
                </div>
            </BentoCard>

            {/* Bookings List */}
            {loading ? (
                <div className="space-y-6 animate-pulse">
                    <div className="h-16 bg-white rounded-xl border border-slate-100" />
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-white rounded-xl border border-slate-100" />
                        ))}
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <BentoCard className="py-16 text-center">
                    <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No {statusFilter !== 'all' ? statusFilter : ''} website bookings found.</p>
                    <p className="text-sm text-slate-400 mt-1">Click "Sync from Website" to pull the latest bookings.</p>
                </BentoCard>
            ) : (
                <div className="space-y-3">
                    {filtered.map(booking => (
                        <BentoCard key={booking.id} className="p-5 hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Guest Info */}
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                                            {(booking.guest_name || 'G')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{booking.guest_name}</p>
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <Phone className="w-3 h-3" />
                                                {booking.phone || '—'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <div>
                                            <p className="text-xs text-slate-500">Check-in</p>
                                            <p className="font-medium text-slate-700">{formatDate(booking.check_in_date)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-4 h-4 text-red-400 shrink-0" />
                                        <div>
                                            <p className="text-xs text-slate-500">Check-out</p>
                                            <p className="font-medium text-slate-700">{formatDate(booking.check_out_date)}</p>
                                        </div>
                                    </div>

                                    <div className="text-sm">
                                        {booking.room_type && (
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                                                {booking.room_type}
                                            </span>
                                        )}
                                        {booking.total_price > 0 && (
                                            <span className="ml-2 text-slate-600 font-semibold text-xs">
                                                ₹{Number(booking.total_price).toLocaleString('en-IN')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {booking.status === 'pending' ? (
                                        <>
                                            <button
                                                onClick={() => handleConfirm(booking)}
                                                disabled={confirming === booking.id}
                                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                {confirming === booking.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                )}
                                                Confirm Booking
                                            </button>
                                            <button
                                                onClick={() => handleReject(booking.id)}
                                                className="px-3 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                title="Dismiss"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        </>
                                    ) : booking.status === 'confirmed' ? (
                                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wider">Confirmed</span>
                                    ) : (
                                        <span className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold uppercase tracking-wider">Dismissed</span>
                                    )}
                                </div>
                            </div>
                        </BentoCard>
                    ))}
                </div>
            )}

            <p className="text-center text-xs text-slate-400 mt-4">
                Showing {filtered.length} of {bookings.length} booking(s) • Auto-refreshes every 30s
            </p>
        </div>
    );
}
