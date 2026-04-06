'use client';

import { useState, useEffect, use } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { Building2, Mail, Phone, MapPin, ArrowLeft, Loader2, Calendar, User, Hash, CheckCircle2, AlertCircle, IndianRupee, Send, ArrowRight, X, Printer } from 'lucide-react';
import { getCompanyById, getCompanyBookings, updateCompany, markAsSettled } from '../actions';
import { sendCheckoutMail } from '@/app/actions/mail';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CompanyProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [company, setCompany] = useState<any>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'settled'>('pending');

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [cData, bData] = await Promise.all([
                getCompanyById(id),
                getCompanyBookings(id)
            ]);
            setCompany(cData);
            setBookings(bData);
        } catch (error) {
            toast.error('Failed to load company data');
        } finally {
            setLoading(false);
        }
    };

    const handleResendMail = async (bookingId: string) => {
        const confirmed = window.confirm("Confirm for sending mail");
        if (!confirmed) return;

        try {
            toast.info('Generating and sending corporate invoice...');
            const res = await sendCheckoutMail(bookingId);
            if (res.success) {
                toast.success('Invoice successfully dispatched');
            } else {
                toast.error('Failed to send mail: ' + res.message);
            }
        } catch (error) {
            toast.error('Error initiating dispatch');
        }
    };

    const handleMarkSettled = async (bookingId: string) => {
        // Open the window immediately to avoid popup blockers (during user interaction)
        const printWindow = window.open('about:blank', '_blank');

        try {
            toast.info('Settling invoice in ledger...');
            if (printWindow) {
                printWindow.document.write('<html><body style="display:flex;align-items:center;justify-center;height:100vh;font-family:sans-serif;color:#666;"><h3>Preparing settled invoice...</h3></body></html>');
            }

            await markAsSettled(bookingId);
            toast.success('Booking marked as settled & thank you mail sent!');

            if (printWindow) {
                printWindow.location.href = `/print-bill/${bookingId}`;
            }

            loadData(); // Refresh list
        } catch (error) {
            if (printWindow) printWindow.close();
            toast.error('Failed to update settlement status');
        }
    };

    if (loading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
                <p className="text-slate-500 font-medium">Loading corporate profile...</p>
            </div>
        );
    }

    if (!company) return <div>Company not found</div>;

    const settledBookings = bookings.filter(b => b.is_settled);
    const pendingBookings = bookings.filter(b =>
        !b.is_settled &&
        (b.status === 'Checked_Out' || b.status === 'Active')
    );

    const totalRevenue = settledBookings.reduce((sum, b) => sum + (Number(b.total_bill) || 0), 0);
    const pendingAmount = pendingBookings.reduce((sum, b) => sum + (Number(b.total_bill) || 0), 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/companies" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{company.name}</h1>
                    <div className="flex items-center gap-4 mt-2 text-slate-500">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
                            <Building2 className="w-4 h-4 text-teal-600" /> Corporate Account
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        <span className="text-sm font-medium">{company.gstin || 'GSTIN: NOT REGISTERED'}</span>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Stats */}
                <BentoCard className="p-6 bg-gradient-to-br from-teal-500 to-teal-700 text-white border-none shadow-lg">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-80">Lifetime Revenue</p>
                    <h2 className="text-4xl font-black mt-2 tracking-tighter flex items-baseline gap-1">
                        <span className="text-xl">₹</span>{totalRevenue.toLocaleString('en-IN')}
                    </h2>
                    <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                        <div className="text-[10px] uppercase font-bold opacity-70">Total Contracts</div>
                        <div className="text-sm font-bold">{bookings.length} Bookings</div>
                    </div>
                </BentoCard>

                <BentoCard className="p-6 bg-white border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Dues</p>
                    <h2 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight flex items-baseline gap-1">
                        <span className="text-lg text-slate-400">₹</span>{pendingAmount.toLocaleString('en-IN')}
                    </h2>
                    <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full w-fit">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Awaiting Settlement
                    </div>
                </BentoCard>

                <BentoCard className="p-6 bg-white border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Liaison Profile</p>
                            <User className="w-4 h-4 text-slate-300" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-800">{company.contact_person || 'N/A'}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{company.notes || 'Strategic Partner'}</div>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-4 pt-4 border-t border-slate-50">
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                            <p className="text-sm font-medium text-slate-700">{company.phone || 'N/A'}</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                            <p className="text-sm font-medium text-slate-700 mb-0.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{company.email || 'N/A'}</p>
                        </div>
                    </div>
                </BentoCard>
            </div>

            {/* Billing History Tabs */}
            <BentoCard className="p-0 border-slate-100 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/30">
                    <div className="flex px-4">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'pending' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Active & Pending ({pendingBookings.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('settled')}
                            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'settled' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Settlement History ({settledBookings.length})
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {(activeTab === 'pending' ? pendingBookings : settledBookings).length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-slate-200" />
                            </div>
                            <p className="text-slate-500 font-medium">No {activeTab} invoices found for this company.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                                    <th className="px-6 py-4">Guest / Folio</th>
                                    <th className="px-6 py-4">Stay period</th>
                                    <th className="px-6 py-4">Billed Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(activeTab === 'pending' ? pendingBookings : settledBookings).map((booking) => (
                                    <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-slate-900 uppercase tracking-tight">{booking.guests?.name}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                                                <Hash className="w-3 h-3" />
                                                Folio: {booking.id.slice(0, 8).toUpperCase()} - Room {booking.rooms?.number}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm font-medium text-slate-600">
                                                {new Date(booking.check_in_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                {' - '}
                                                {new Date(booking.check_out_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">
                                                {booking.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1">
                                                <IndianRupee className="w-3 h-3" /> {Number(booking.total_bill).toLocaleString()}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1 font-medium">Full Tax Invoice</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {booking.is_settled ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                                                    <CheckCircle2 className="w-3 h-3" /> Settled
                                                </span>
                                            ) : booking.status === 'Active' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                                                    <Loader2 className="w-3 h-3 animate-spin" /> In-House
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                                                    <AlertCircle className="w-3 h-3" /> Awaiting Payment
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!booking.is_settled && (
                                                    <button
                                                        onClick={() => handleMarkSettled(booking.id)}
                                                        className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm"
                                                    >
                                                        Mark Settled
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleResendMail(booking.id)}
                                                    className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                                    title="Resend Invoice Email"
                                                >
                                                    <Send className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => window.open(`/print-bill/${booking.id}`, '_blank')}
                                                    className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                                    title="Show Bill"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                                <Link
                                                    href={`/folio/${booking.id}`}
                                                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                                                    title="View Full Folio"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </BentoCard>
        </div>
    );
}
