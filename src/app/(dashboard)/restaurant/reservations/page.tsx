'use client';

import { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    Plus,
    Search,
    Clock,
    Users,
    MoreVertical,
    CheckCircle2,
    XCircle,
    UserPlus,
    Table as TableIcon,
    AlertCircle,
    ChevronRight,
    Filter
} from 'lucide-react';
import { BentoCard } from '@/components/ui/BentoCard';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getReservations, addReservation, updateReservationStatus, deleteReservation } from './actions';
import { createClient } from '@/utils/supabase/client';

export default function ReservationsPage() {
    const [loading, setLoading] = useState(true);
    const [reservations, setReservations] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Form state
    const [newRes, setNewRes] = useState({
        guest_name: '',
        phone: '',
        pax: 2,
        table_id: '',
        reservation_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        notes: ''
    });

    const supabase = createClient();

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [resData, tablesData] = await Promise.all([
                getReservations(),
                supabase.from('restaurant_tables').select('id, table_number').order('table_number')
            ]);
            setReservations(resData || []);
            setTables(tablesData.data || []);
        } catch (error) {
            toast.error('Failed to load reservations');
        } finally {
            setLoading(false);
        }
    };

    const handleAddReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addReservation(newRes);
            toast.success('Reservation added successfully');
            setShowModal(false);
            setNewRes({
                guest_name: '',
                phone: '',
                pax: 2,
                table_id: '',
                reservation_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                notes: ''
            });
            fetchData();
        } catch (error) {
            toast.error('Failed to add reservation');
        }
    };

    const handleStatusUpdate = async (id: string, status: any, tableId: string) => {
        try {
            await updateReservationStatus(id, status, tableId);
            toast.success(`Status updated to ${status}`);
            fetchData();
        } catch (error) {
            toast.error('Update failed');
        }
    };

    const filteredReservations = reservations.filter(res => {
        const matchesSearch = res.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            res.phone?.includes(searchTerm);
        const matchesFilter = filterStatus === 'all' || res.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    if (!mounted) return null;

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <CalendarIcon className="w-8 h-8 text-teal-500" />
                        Table Reservations
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1 opacity-70">
                        Manage dining bookings and guest arrivals
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all w-64 md:w-80 shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-teal-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-teal-100 hover:bg-teal-600 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        NEW BOOKING
                    </button>
                </div>
            </div>

            {/* Quick Stats & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Today Arrivals', value: reservations.filter(r => r.status === 'confirmed').length, color: 'text-teal-600', bg: 'bg-teal-50' },
                    { label: 'Currently Seated', value: reservations.filter(r => r.status === 'seated').length, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Cancellations', value: reservations.filter(r => r.status === 'cancelled').length, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Avg Pax', value: reservations.length > 0 ? (reservations.reduce((sum, r) => sum + (r.pax || 0), 0) / reservations.length).toFixed(1) : 0, color: 'text-slate-600', bg: 'bg-slate-50' }
                ].map((stat, i) => (
                    <BentoCard key={i} className={cn("p-6 border-none shadow-sm flex flex-col items-center justify-center gap-2", stat.bg)}>
                        <span className={cn("text-3xl font-black", stat.color)}>{stat.value}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
                    </BentoCard>
                ))}
            </div>

            {/* Reservations List */}
            <BentoCard className="bg-white border border-slate-100 shadow-xl rounded-[2.5rem] overflow-hidden min-h-[600px] flex flex-col">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-6">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Booking Log</h2>
                        <div className="flex gap-2">
                            {['all', 'confirmed', 'seated', 'cancelled'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                        filterStatus === s ? "bg-slate-900 text-white" : "bg-white text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                    {loading ? (
                        <div className="h-full flex items-center justify-center py-40">
                            <div className="w-10 h-10 border-4 border-slate-100 border-t-teal-500 rounded-full animate-spin" />
                        </div>
                    ) : filteredReservations.length > 0 ? (
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-slate-50">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest Detail</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timing</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Table / Pax</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredReservations.map((res) => (
                                    <tr key={res.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-500 uppercase">
                                                    {res.guest_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{res.guest_name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400">{res.phone || 'No phone'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                                                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                                                    {format(new Date(res.reservation_time), 'hh:mm a')}
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{format(new Date(res.reservation_time), 'MMM dd, yyyy')}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg">
                                                    <TableIcon className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-xs font-black text-slate-700">TB-{res.table?.table_number || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="w-3.5 h-3.5 text-slate-300" />
                                                    <span className="text-xs font-black text-slate-500">{res.pax} Pax</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                                res.status === 'confirmed' ? "bg-teal-100 text-teal-600" :
                                                    res.status === 'seated' ? "bg-blue-100 text-blue-600" :
                                                        res.status === 'cancelled' ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"
                                            )}>
                                                {res.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {res.status === 'confirmed' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(res.id, 'seated', res.table_id)}
                                                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                        title="Mark as Seated"
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {res.status !== 'cancelled' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(res.id, 'cancelled', res.table_id)}
                                                        className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                                        title="Cancel Booking"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-40 flex flex-col items-center justify-center opacity-30">
                            <CalendarIcon className="w-16 h-16 mb-4" />
                            <p className="text-sm font-black uppercase tracking-[0.2em]">No Reservations Found</p>
                        </div>
                    )}
                </div>
            </BentoCard>

            {/* New Reservation Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <BentoCard className="bg-white w-full max-w-xl p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">New Table Booking</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Record guest arrival details</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors">
                                <XCircle className="w-6 h-6 text-slate-300" />
                            </button>
                        </div>

                        <form onSubmit={handleAddReservation} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Guest Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="E.g. John Doe"
                                        className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-teal-500/10 transition-all"
                                        value={newRes.guest_name}
                                        onChange={e => setNewRes({ ...newRes, guest_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input
                                        type="text"
                                        placeholder="+91 99999 99999"
                                        className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-teal-500/10 transition-all"
                                        value={newRes.phone}
                                        onChange={e => setNewRes({ ...newRes, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date \ Time</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-teal-500/10 transition-all"
                                        value={newRes.reservation_time}
                                        onChange={e => setNewRes({ ...newRes, reservation_time: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Table</label>
                                    <select
                                        required
                                        className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-teal-500/10 transition-all appearance-none"
                                        value={newRes.table_id}
                                        onChange={e => setNewRes({ ...newRes, table_id: e.target.value })}
                                    >
                                        <option value="">Choose Table</option>
                                        {tables.map(t => (
                                            <option key={t.id} value={t.id}>TB-{t.table_number}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pax Count</label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-teal-500/10 transition-all"
                                        value={newRes.pax}
                                        onChange={e => setNewRes({ ...newRes, pax: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Special Notes</label>
                                <textarea
                                    placeholder="Any allergies or VIP requests..."
                                    className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-teal-500/10 transition-all h-24"
                                    value={newRes.notes}
                                    onChange={e => setNewRes({ ...newRes, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 bg-slate-50 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-teal-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-teal-100 hover:bg-teal-600 transition-all active:scale-95"
                                >
                                    Confirm Reservation
                                </button>
                            </div>
                        </form>
                    </BentoCard>
                </div>
            )}
        </div>
    );
}
