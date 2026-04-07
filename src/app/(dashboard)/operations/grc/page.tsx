'use client';

import { useState, useEffect } from 'react';
import {
    Search,
    Printer,
    User,
    Home,
    Calendar,
    ChevronRight,
    ArrowLeft,
    Loader2,
    FileText
} from 'lucide-react';
import { getCheckedInBookings, getArchiveBookings } from './actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { RealtimeRefresh } from '@/components/pms/RealtimeRefresh';
import { formatISTDate } from '@/utils/date';
import { BentoCard } from '@/components/ui/BentoCard';

export default function GRCPage() {
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const router = useRouter();

    useEffect(() => {
        loadBookings();
    }, [activeTab, startDate, endDate]);

    const loadBookings = async () => {
        try {
            setLoading(true);
            const data = activeTab === 'active'
                ? await getCheckedInBookings()
                : await getArchiveBookings(startDate, endDate);
            setBookings(data);
        } catch (error) {
            toast.error('Failed to load GRC data');
        } finally {
            setLoading(false);
        }
    };

    const filteredBookings = bookings.filter(b => {
        const name = (b.guests?.name || '').toLowerCase();
        const room = (b.rooms?.number?.toString() || '').toLowerCase();
        const grcNo = `GRC-${b.id.slice(-8).toUpperCase()}`.toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search) || room.includes(search) || grcNo.includes(search);
    });

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-20 mt-4 px-4">
            {/* Header Area */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        GRC Management
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        View and print Guest Registration Cards
                    </p>
                </div>
                <div className="ml-auto flex items-center bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'active' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Active In-House
                    </button>
                    <button
                        onClick={() => setActiveTab('archive')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'archive' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        GRC Archive
                    </button>
                </div>
            </div>

            {/* Search & Filters */}
            <BentoCard className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search Name, Room or GRC No (e.g. GRC-AF...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
                        />
                    </div>
                    {activeTab === 'archive' && (
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="flex-1 md:w-40">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">From</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-400 transition-all"
                                />
                            </div>
                            <div className="flex-1 md:w-40">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">To</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-400 transition-all"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </BentoCard>

            {/* Guest Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 bg-white rounded-2xl border border-slate-100 shadow-sm" />
                    ))}
                </div>
            ) : filteredBookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBookings.map((b) => (
                        <BentoCard key={b.id} className="group hover:shadow-md transition-all hover:-translate-y-0.5">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                                            {b.guests?.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-base leading-tight">
                                                {b.guests?.name || 'Unknown Guest'}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {b.guests?.phone || 'No Phone Registered'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room</p>
                                        <p className="text-xl font-black text-slate-900 italic">#{b.rooms?.number}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm py-2 border-y border-slate-50">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span>Arr: {formatISTDate(b.check_in_date)}</span>
                                        </div>
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                            {b.food_plan || 'EP'}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => window.open(`/print-grc/${b.id}`, '_blank')}
                                        className="w-full mt-4 py-3 bg-teal-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Printer className="w-4 h-4" /> Print GRC Card
                                    </button>
                                </div>
                            </div>
                        </BentoCard>
                    ))}
                </div>
            ) : (
                <BentoCard className="p-20 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <User className="w-8 h-8 text-slate-200" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">No In-House Guests</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        There are no guests currently checked in matching your criteria.
                    </p>
                </BentoCard>
            )}
        </div>
    );
}
