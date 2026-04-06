import { createClient } from '@/utils/supabase/server';
import { BentoCard } from '@/components/ui/BentoCard';
import {
    User,
    Phone,
    Mail,
    Calendar,
    Plane,
    Clock,
    CreditCard,
    ArrowLeft,
    IdCard,
    ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function GuestProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch guest details
    const { data: guest, error: guestError } = await supabase
        .from('guests')
        .select('*')
        .eq('id', id)
        .single();

    if (guestError || !guest) {
        notFound();
    }

    // Fetch stay history
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
            *,
            rooms (number, type)
        `)
        .eq('guest_id', id)
        .order('check_in_date', { ascending: false });

    return (
        <div className="flex flex-col gap-6 h-full max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/guests"
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                        title="Back to Guest List"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{guest.name}</h1>
                        <p className="text-sm text-slate-500 mt-1">Profile & historical stay records</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Guest Info & ID */}
                <div className="lg:col-span-1 space-y-6">
                    <BentoCard className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-teal-100 rounded-lg text-teal-600">
                                <User className="w-5 h-5" />
                            </div>
                            <h2 className="font-bold text-slate-800">Basic Information</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</span>
                                <div className="flex items-center gap-2 text-slate-900 font-medium">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    {guest.phone}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                                <div className="flex items-center gap-2 text-slate-900 font-medium overflow-hidden text-ellipsis">
                                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                                    {guest.email || 'Not Provided'}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address</span>
                                <div className="text-slate-900 font-medium text-sm">
                                    {guest.address || 'No address on file'}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Member Since</span>
                                <div className="flex items-center gap-2 text-slate-900 font-medium">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    {new Date(guest.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </BentoCard>

                    <BentoCard className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                <IdCard className="w-5 h-5" />
                            </div>
                            <h2 className="font-bold text-slate-800">Verification ID</h2>
                        </div>

                        {guest.id_image_url ? (
                            <div className="space-y-3">
                                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative group">
                                    <img
                                        src={guest.id_image_url}
                                        alt={`${guest.name}'s Identification`}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    <a
                                        href={guest.id_image_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" /> View Full Image
                                    </a>
                                </div>
                                <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">Encrypted Storage Signature Active</p>
                            </div>
                        ) : (
                            <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-center p-4">
                                <IdCard className="w-8 h-8 text-slate-300" />
                                <span className="text-sm font-medium text-slate-400">No identity document uploaded</span>
                            </div>
                        )}
                    </BentoCard>
                </div>

                {/* Right Column: Stay History */}
                <div className="lg:col-span-2">
                    <BentoCard className="p-0 overflow-hidden min-h-[500px]">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <h2 className="font-bold text-slate-800">Stay History</h2>
                            </div>
                            <span className="text-xs font-bold text-slate-400 border border-slate-200 px-3 py-1 rounded-full uppercase tracking-widest">
                                {bookings?.length || 0} Total Bookings
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Room</th>
                                        <th className="px-6 py-4">Dates</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Bill Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {bookings?.map((booking) => (
                                        <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">Room {booking.rooms?.number || '??'}</div>
                                                <div className="text-[10px] uppercase font-bold text-slate-400">{booking.rooms?.type}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-700 font-medium">
                                                    {new Date(booking.check_in_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} -
                                                    {booking.check_out_date ? new Date(booking.check_out_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium italic">
                                                    Visit Purpose: {booking.purpose_of_visit}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${booking.status === 'Active'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : booking.status === 'Checked_Out'
                                                            ? 'bg-blue-50 text-blue-700'
                                                            : 'bg-red-50 text-red-700'
                                                    }`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900">
                                                ₹{Number(booking.total_bill).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!bookings || bookings.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Calendar className="w-10 h-10 text-slate-200" />
                                                    <p className="text-slate-400 font-medium italic">No historical bookings found for this guest</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </BentoCard>
                </div>
            </div>
        </div>
    );
}
