'use client';

import { useState, useEffect } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { Loader2, CalendarRange, User } from 'lucide-react';
import { addDays, format, differenceInDays, startOfDay, parseISO } from 'date-fns';
import { fetchBookingChartData, TapeChartRoom, TapeChartBooking } from './actions-chart';

const DAYS_TO_SHOW = 14;

export function BookingTapeChart() {
    const [rooms, setRooms] = useState<TapeChartRoom[]>([]);
    const [bookings, setBookings] = useState<TapeChartBooking[]>([]);
    const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
    const [loading, setLoading] = useState(true);

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
                                                        className={`h-8 mx-[2px] rounded border border-black/10 shadow-sm flex items-center px-2 z-10 overflow-hidden text-white transition-all cursor-pointer ${getStatusColor(booking.status)}`}
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
        </BentoCard>
    );
}
