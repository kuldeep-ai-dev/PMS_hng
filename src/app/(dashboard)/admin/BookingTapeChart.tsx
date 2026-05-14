'use client';

import { useState, useEffect } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { Loader2, CalendarRange, User, X, Phone, Calendar, Bed, ExternalLink } from 'lucide-react';
import { addDays, format, differenceInDays, startOfDay, parseISO } from 'date-fns';
import { fetchBookingChartData, TapeChartRoom, TapeChartBooking } from './actions-chart';
import Link from 'next/link';

const DAYS_TO_SHOW = 14;

export function BookingTapeChart() {
    const [rooms, setRooms] = useState<TapeChartRoom[]>([]);
    const [bookings, setBookings] = useState<TapeChartBooking[]>([]);
    const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<TapeChartBooking | null>(null);

    useEffect(() => {
        fetchBookingChartData()
            .then(res => {
                setRooms(res.rooms);
                setBookings(res.bookings);
                setStartDate(parseISO(res.startDate));
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <BentoCard className="p-12 flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </BentoCard>
        );
    }

    // Generate column headers (dates)
    const dateHeaders = Array.from({ length: DAYS_TO_SHOW }).map((_, i) => addDays(startDate, i));

    // Helper: Position booking block based on grid columns
    const getBookingStyle = (booking: TapeChartBooking) => {
        const checkIn = startOfDay(parseISO(booking.check_in_date));
        const checkOut = booking.check_out_date ? startOfDay(parseISO(booking.check_out_date)) : startOfDay(addDays(checkIn, 1));

        let startGridCol = differenceInDays(checkIn, startDate) + 1; // +1 because grid columns are 1-indexed
        let span = differenceInDays(checkOut, checkIn);

        // Handle bookings that start before our window
        if (startGridCol < 1) {
            span += (startGridCol - 1); // shrink span
            startGridCol = 1;
        }

        // Handle spans that exceed our window
        if (startGridCol + span > DAYS_TO_SHOW + 1) {
            span = (DAYS_TO_SHOW + 1) - startGridCol;
        }

        // If span is 0 or negative after clipping, don't render
        if (span <= 0) return { display: 'none' };

        return {
            gridColumn: `${startGridCol} / span ${span}`,
        };
    };

    // Helper: Get color badge based on status
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-emerald-500 hover:bg-emerald-600';
            case 'Confirmed': return 'bg-blue-500 hover:bg-blue-600';
            case 'Advance_Booking': return 'bg-orange-500 hover:bg-orange-600';
            case 'Checked_Out': return 'bg-slate-400 hover:bg-slate-500';
            default: return 'bg-slate-300';
        }
    };

    return (
        <BentoCard className="p-0 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <CalendarRange className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800">Room Booking Timeline</h2>
                        <p className="text-xs text-slate-500">14-Day Occupancy Overview</p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto p-4 bg-slate-50/50">
                <div className="min-w-[1000px] border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                    {/* Header Row (Dates) */}
                    <div className="flex border-b border-slate-200 bg-slate-50">
                        <div className="w-48 shrink-0 border-r border-slate-200 p-3 font-semibold text-slate-600 text-sm flex items-center bg-white">
                            Rooms
                        </div>
                        <div
                            className="flex-1 grid"
                            style={{ gridTemplateColumns: `repeat(${DAYS_TO_SHOW}, minmax(60px, 1fr))` }}
                        >
                            {dateHeaders.map((d, i) => (
                                <div key={i} className={`p-2 border-r border-slate-200 last:border-0 flex flex-col items-center justify-center text-xs ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-slate-100 text-slate-500' : 'text-slate-700'}`}>
                                    <span className="font-bold">{format(d, 'dd')}</span>
                                    <span className="text-[10px] uppercase font-medium">{format(d, 'EEE')}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Matrix Rows (Rooms) */}
                    <div className="divide-y divide-slate-100">
                        {rooms.map(room => {
                            const roomBookings = bookings.filter(b => b.room_id === room.id);

                            return (
                                <div key={room.id} className="flex group hover:bg-slate-50 transition-colors">
                                    {/* Y-Axis: Room Info */}
                                    <div className="w-48 shrink-0 border-r border-slate-200 p-3 bg-white group-hover:bg-slate-50 transition-colors flex flex-col justify-center">
                                        <div className="font-bold text-slate-800">Room {room.number}</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">{room.type}</div>
                                    </div>

                                    {/* X-Axis: 14-Day Timeline Grid */}
                                    <div className="flex-1 relative">
                                        {/* Background Grid Lines */}
                                        <div
                                            className="absolute inset-0 grid pointer-events-none"
                                            style={{ gridTemplateColumns: `repeat(${DAYS_TO_SHOW}, minmax(60px, 1fr))` }}
                                        >
                                            {Array.from({ length: DAYS_TO_SHOW }).map((_, i) => (
                                                <div key={i} className="border-r border-slate-100 h-full last:border-0" />
                                            ))}
                                        </div>

                                        {/* Foreground Bookings */}
                                        <div
                                            className="relative h-full grid py-2 px-[2px] items-center"
                                            style={{ gridTemplateColumns: `repeat(${DAYS_TO_SHOW}, minmax(60px, 1fr))` }}
                                        >
                                            {roomBookings.map(booking => {
                                                const style = getBookingStyle(booking);
                                                if (style.display === 'none') return null;

                                                return (
                                                    <div
                                                        key={booking.id}
                                                        onClick={() => setSelectedBooking(booking)}
                                                        className={`h-8 mx-[2px] rounded border border-black/10 shadow-sm flex items-center px-2 z-10 overflow-hidden text-white transition-all cursor-pointer ${getStatusColor(booking.status)} active:scale-[0.98]`}
                                                        style={style}
                                                        title={`${booking.guest_name} (${booking.status})`}
                                                    >
                                                        <span className="text-xs font-semibold whitespace-nowrap truncate drop-shadow-sm flex items-center gap-1">
                                                            <User className="w-3 h-3 opacity-80 shrink-0" />
                                                            {booking.guest_name}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Booking Details Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedBooking(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="relative h-24 bg-gradient-to-r from-indigo-500 to-teal-500 flex items-center justify-center">
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="mt-12 w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center border-4 border-white">
                                <User className="w-10 h-10 text-slate-400" />
                            </div>
                        </div>

                        <div className="px-6 pt-12 pb-8 text-center">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedBooking.guest_name}</h3>
                            <div className="mt-1 flex items-center justify-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${getStatusColor(selectedBooking.status)}`}>
                                    {selectedBooking.status.replace('_', ' ')}
                                </span>
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-4 text-left">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Phone className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Contact</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">{selectedBooking.guest_phone}</p>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Bed className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Room</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">Room {rooms.find(r => r.id === selectedBooking.room_id)?.number || 'N/A'}</p>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Check In</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">{format(parseISO(selectedBooking.check_in_date), 'dd MMM yyyy')}</p>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Check Out</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">{selectedBooking.check_out_date ? format(parseISO(selectedBooking.check_out_date), 'dd MMM yyyy') : 'N/A'}</p>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setSelectedBooking(null)}
                                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                                >
                                    Dismiss
                                </button>
                                <Link
                                    href={`/folio/${selectedBooking.id}`}
                                    className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                                >
                                    View Folio
                                    <ExternalLink className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </BentoCard>
    );
}
