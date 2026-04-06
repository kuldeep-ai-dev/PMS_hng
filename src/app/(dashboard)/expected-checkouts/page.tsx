import { BentoCard } from '@/components/ui/BentoCard';
import { ArrowLeft, Calendar, BedDouble, User2, Phone, Mail, Clock } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ExpectedCheckoutsPage() {
    const supabase = await createClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString();

    // Build query to fetch active bookings expected to check out before tomorrow
    let bookingsQuery = supabase
        .from('bookings')
        .select(`
        id,
        check_in_date,
        check_out_date,
        total_bill,
        advance_payment,
        status,
        rooms (
          number,
          type,
          base_rate
        ),
        guests (
          name,
          phone,
          email
        )
      `)
        .lt('check_out_date', tomorrowIso)
        .eq('status', 'Active')
        .order('check_out_date', { ascending: true });

    const { data: checkouts } = await bookingsQuery;
    const validCheckouts = checkouts?.filter(b => b.rooms) || [];

    return (
        <div className="max-w-5xl mx-auto flex flex-col gap-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Expected Checkouts
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Guests scheduled for checkout today — {format(today, 'MMMM dd, yyyy')}
                    </p>
                </div>
                <div className="ml-auto px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl">
                    <span className="text-sm font-bold text-rose-600">
                        {validCheckouts.length} checkout{validCheckouts.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Checkout Cards */}
            {validCheckouts && validCheckouts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {validCheckouts.map((booking: any) => {
                        const checkIn = new Date(booking.check_in_date);
                        const checkOut = new Date(booking.check_out_date);

                        const ciMidnight = new Date(checkIn); ciMidnight.setHours(0, 0, 0, 0);
                        const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
                        let actualNights = Math.max(0, Math.floor((todayMidnight.getTime() - ciMidnight.getTime()) / (1000 * 60 * 60 * 24)));
                        if (actualNights > 0 && new Date().getHours() >= 12) actualNights += 1;

                        const scheduledNights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
                        const totalNights = Math.max(scheduledNights, actualNights, 1);

                        const dynamicCheckOutDate = new Date(checkIn);
                        dynamicCheckOutDate.setDate(dynamicCheckOutDate.getDate() + totalNights);

                        let dynamicBill = Number(booking.total_bill) || 0;
                        if (booking.rooms?.base_rate && totalNights > scheduledNights) {
                            const extraNights = totalNights - scheduledNights;
                            dynamicBill += (extraNights * Number(booking.rooms.base_rate)) * 1.12; // Base + 12% est. GST proxy
                        }

                        return (
                            <BentoCard
                                key={booking.id}
                                className="p-6 hover:shadow-md transition-all hover:-translate-y-0.5"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                                            {booking.guests?.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 text-base">
                                                {booking.guests?.name || 'Unknown Guest'}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Booking ID: {booking.id.slice(0, 8)}...
                                            </p>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Due Today
                                    </span>
                                </div>

                                <div className="space-y-3 text-sm">
                                    {/* Room Number */}
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <BedDouble className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <span>
                                            Room{' '}
                                            <span className="font-semibold text-slate-900">
                                                {booking.rooms?.number || 'N/A'}
                                            </span>
                                            {booking.rooms?.type && (
                                                <span className="ml-2 text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                                    {booking.rooms.type}
                                                </span>
                                            )}
                                        </span>
                                    </div>

                                    {/* Phone */}
                                    {booking.guests?.phone && (
                                        <div className="flex items-center gap-3 text-slate-700">
                                            <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                            <span>{booking.guests.phone}</span>
                                        </div>
                                    )}

                                    {/* Email */}
                                    {booking.guests?.email && (
                                        <div className="flex items-center gap-3 text-slate-700">
                                            <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                            <span className="truncate">{booking.guests.email}</span>
                                        </div>
                                    )}

                                    {/* Dates */}
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <span>
                                            {format(checkIn, 'MMM dd')} →{' '}
                                            <span className="font-semibold text-rose-600">
                                                {format(dynamicCheckOutDate, 'MMM dd, yyyy')}
                                            </span>
                                            {totalNights > scheduledNights && <span className="text-xs font-bold text-rose-500 ml-2">(Auto-Extended)</span>}
                                        </span>
                                    </div>
                                </div>

                                {/* Footer: Balance Info + Action */}
                                <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-500">Total Bill</p>
                                        <p className="font-bold text-slate-900">
                                            ₹{Math.round(dynamicBill).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">Advance Paid</p>
                                        <p className="font-bold text-emerald-600">
                                            ₹{Number(booking.advance_payment || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <Link
                                        href="/front-desk"
                                        className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition-colors shadow-sm"
                                    >
                                        Process Checkout
                                    </Link>
                                </div>
                            </BentoCard>
                        )
                    })}
                </div>
            ) : (
                <BentoCard className="p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-1">
                            No Checkouts Today
                        </h3>
                        <p className="text-sm text-slate-500 max-w-sm">
                            There are no guests scheduled for checkout today. All active
                            bookings have later checkout dates.
                        </p>
                        <Link
                            href="/"
                            className="mt-6 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </BentoCard>
            )}
        </div>
    );
}
