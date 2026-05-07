'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    User, Calendar, IndianRupee, Clock, Plus, LogOut, Loader2,
    UtensilsCrossed, AlertCircle, CheckCircle2, Printer, FileSearch,
    AlertTriangle, ArrowRightLeft, X, Building2, CreditCard, Wallet,
    Banknote, Info, ChevronRight, Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatISTDate, formatISTTime } from '@/utils/date';
import {
    getBookingFolio, getRestaurantCharges, extendStay, performCheckout,
    updateGuestIdUrl, logPayment, transferRoom, getRoomTransfers, updateRefundPolicy,
    getExtraCharges, addExtraCharge, deleteExtraCharge, updateStayConfiguration,
    transferFolioBalance, getActiveBookings
} from '../actions-folio';
import { getAvailableRooms } from '../../check-in/actions-client';
import { getSettings } from '../../settings/actions';
import { generateInvoiceNo } from '@/utils/billing';
import IdDropzone from '@/components/pms/IdDropzone';
import { toast } from 'sonner';

export default function FolioPage() {
    const params = useParams();
    const router = useRouter();
    const bookingId = params.id as string;

    const [booking, setBooking] = useState<any>(null);
    const [restaurantOrders, setRestaurantOrders] = useState<any[]>([]);
    const [extraCharges, setExtraCharges] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>({
        hotel_name: '', address: '', cgst_rate: 6, sgst_rate: 6, currency: 'INR',
        extra_bed_rate: 500, extra_pax_rate: 800, free_pax_limit: 2, meal_plan_rates: {}
    });
    const [loading, setLoading] = useState(true);
    const [extending, setExtending] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
    const [updatingRefund, setUpdatingRefund] = useState(false);
    const [extraNights, setExtraNights] = useState(1);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);
    const [logAmount, setLogAmount] = useState(0);
    const [logMethod, setLogMethod] = useState<'Cash' | 'Card' | 'Online' | 'Company'>('Cash');
    const [logging, setLogging] = useState(false);
    const [billToCompany, setBillToCompany] = useState(false);

    // Room Transfer state
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
    const [transferTarget, setTransferTarget] = useState<any>(null);
    const [transferReason, setTransferReason] = useState('');
    const [transferring, setTransferring] = useState(false);
    const [roomTransfers, setRoomTransfers] = useState<any[]>([]);

    // Extra Charges state
    const [showExtraChargeModal, setShowExtraChargeModal] = useState(false);
    const [extraChargeDesc, setExtraChargeDesc] = useState('');
    const [extraChargeAmount, setExtraChargeAmount] = useState<number>(0);
    const [addingCharge, setAddingCharge] = useState(false);

    // Dynamic Edit State
    const [showEditStayModal, setShowEditStayModal] = useState(false);
    const [editData, setEditData] = useState({ pax_count: 2, extra_beds: 0, food_plan: 'EP' });
    const [updatingStay, setUpdatingStay] = useState(false);
    const [showBillTransferModal, setShowBillTransferModal] = useState(false);
    const [activeBookings, setActiveBookings] = useState<any[]>([]);
    const [selectedDestBooking, setSelectedDestBooking] = useState<any>(null);
    const [transferringBill, setTransferringBill] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const [folioRes, ordersRes, extrasRes, sRes, transfersRes] = await Promise.all([
                    getBookingFolio(bookingId),
                    getRestaurantCharges(bookingId),
                    getExtraCharges(bookingId),
                    getSettings(),
                    getRoomTransfers(bookingId)
                ]) as [any, any, any, any, any];

                if (folioRes.success) {
                    const folio = folioRes.data;
                    setBooking(folio);
                    setEditData({
                        pax_count: folio.pax_count || 2,
                        extra_beds: folio.extra_beds || 0,
                        food_plan: folio.food_plan || 'EP'
                    });
                } else {
                    toast.error(`Error loading folio: ${folioRes.error}`);
                }

                if (ordersRes.success) setRestaurantOrders(ordersRes.data);
                else toast.error(`Error loading orders: ${ordersRes.error}`);

                if (extrasRes.success) setExtraCharges(extrasRes.data);
                // extrasRes might not have success/error pattern yet if it returns data directly, 
                // but let's check actions-folio.ts again. Actually I standardized it.

                if (transfersRes.success) setRoomTransfers(transfersRes.data);

                // Settings doesn't use the pattern yet as it's from another file, but let's assume it works
                setSettings({
                    hotel_name: sRes.hotel_name || 'Hotel New Ganga',
                    address: sRes.address || '',
                    cgst_rate: sRes.cgst_rate || 6,
                    sgst_rate: sRes.sgst_rate || 6,
                    currency: sRes.currency || 'INR',
                    extra_bed_rate: sRes.extra_bed_rate || 500,
                    extra_pax_rate: sRes.extra_pax_rate || 800,
                    free_pax_limit: sRes.free_pax_limit || 2,
                    meal_plan_rates: sRes.meal_plan_rates || {}
                });
            } catch (err: any) {
                console.error('Failed to load folio:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [bookingId]);

    // Recalculate billing values when booking or orders update
    const [billingData, setBillingData] = useState<{
        totalNights: number,
        roomCharges: number,
        restaurantTotal: number,
        subtotal: number,
        cgst: number,
        sgst: number,
        grandTotal: number,
        totalPaid: number,
        balanceDue: number,
        extraBedCharges: number,
        extraChargesTotal: number,
        actualNights: number,
        scheduledNights: number,
        provisionalBreakdown: {
            room: number,
            meals: number,
            extraPax: number,
            extraBeds: number,
            nights: number
        }
    } | null>(null);

    useEffect(() => {
        if (booking && !loading) {
            const room = booking.rooms;
            const checkIn = new Date(booking.check_in_date);
            const checkOut = new Date(booking.check_out_date);
            const now = new Date();

            // 12 PM Checkout Logic
            const ciMidnight = new Date(checkIn); ciMidnight.setHours(0, 0, 0, 0);
            const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
            let actualNights = Math.max(0, Math.floor((todayMidnight.getTime() - ciMidnight.getTime()) / (1000 * 60 * 60 * 24)));
            if (actualNights > 0 && new Date().getHours() >= 12) actualNights += 1;

            const scheduledNights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

            // Respect Refund Toggle
            const totalNights = booking.allow_early_checkout_refund
                ? Math.max(1, actualNights)
                : Math.max(scheduledNights, actualNights, 1);

            // 1. NIGHT AUDIT POSTED CHARGES
            const auditItems = extraCharges.filter(c =>
                c.description.includes('Room Charge') ||
                c.description.includes('Meal Plan Charge') ||
                c.description.includes('Extra Pax Charge') ||
                c.description.includes('Extra Bed Charge')
            );
            const postedAuditTotal = auditItems.reduce((sum, c) => sum + Number(c.amount), 0);

            const auditedDates = new Set(auditItems
                .filter(c => c.description.includes('Room Charge'))
                .map(c => c.description.split(' - ')[1])
            );
            const nightsAudited = auditedDates.size;

            // 2. PROVISIONAL CHARGES (Future/Pending)
            const remainingNights = Math.max(0, totalNights - nightsAudited);
            const provRoomCharge = remainingNights * (Number(room?.base_rate) || 0);
            const extraPaxCount = Math.max(0, (booking.pax_count || 0) - (settings.free_pax_limit || 2));
            const provExtraPaxCharge = remainingNights * extraPaxCount * (settings.extra_pax_rate || 0);
            const provExtraBedCharge = remainingNights * (Number(booking.extra_beds) || 0) * (settings.extra_bed_rate || 0);
            const mealPlanRate = settings.meal_plan_rates[booking.food_plan] || 0;
            const provMealCharge = remainingNights * mealPlanRate * (booking.pax_count || 1);
            const provisionalTotal = provRoomCharge + provExtraPaxCharge + provExtraBedCharge + provMealCharge;

            // 3. OTHER CHARGES
            const manualCharges = extraCharges.filter(c => !auditItems.includes(c));
            const extraChargesTotal = manualCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
            const restaurantTotal = restaurantOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

            // 4. FINALIZE — GST applies only to room charges, NOT restaurant F&B
            const roomSubtotal = postedAuditTotal + provisionalTotal + extraChargesTotal;
            const cgst = Math.round(roomSubtotal * settings.cgst_rate / 100);
            const sgst = Math.round(roomSubtotal * settings.sgst_rate / 100);
            const subtotal = roomSubtotal + restaurantTotal;
            const grandTotal = subtotal + cgst + sgst;

            const advancePaid = Number(booking.advance_payment) || 0;
            const otherPayments = booking.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
            const totalPaid = advancePaid + otherPayments;
            const balanceDue = grandTotal - totalPaid;

            setBillingData({
                totalNights,
                roomCharges: postedAuditTotal + provisionalTotal,
                restaurantTotal,
                subtotal,
                cgst, sgst, grandTotal, totalPaid, balanceDue,
                extraBedCharges: 0,
                extraChargesTotal,
                actualNights, scheduledNights,
                provisionalBreakdown: {
                    room: provRoomCharge,
                    meals: provMealCharge,
                    extraPax: provExtraPaxCharge,
                    extraBeds: provExtraBedCharge,
                    nights: remainingNights
                }
            });

            if (balanceDue > 1) setLogAmount(balanceDue);
        }
    }, [booking, restaurantOrders, extraCharges, settings, loading, roomTransfers]);

    const handleUpdateStay = async () => {
        setUpdatingStay(true);
        try {
            const res = await updateStayConfiguration(bookingId, editData) as any;
            if (!res.success) throw new Error(res.error);

            const updated = await getBookingFolio(bookingId);
            if (updated.success) setBooking(updated.data);

            setShowEditStayModal(false);
            toast.success('Stay configuration updated!');
        } catch (err: any) {
            toast.error('Failed to update stay: ' + err.message);
        } finally {
            setUpdatingStay(false);
        }
    };

    const handleToggleRefund = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.checked;
        setUpdatingRefund(true);
        try {
            const res = await updateRefundPolicy(bookingId, newValue) as any;
            if (!res.success) throw new Error(res.error);

            setBooking((prev: any) => ({ ...prev, allow_early_checkout_refund: newValue }));
            toast.success(newValue ? 'Refund allowed (Actual Stay billing)' : 'Refund disabled (Full Stay billing)');
        } catch (err: any) {
            toast.error('Failed to update refund policy: ' + err.message);
        } finally {
            setUpdatingRefund(false);
        }
    };

    const handleExtendStay = async () => {
        setExtending(true);
        try {
            await extendStay(bookingId, extraNights);
            const updated = await getBookingFolio(bookingId);
            setBooking(updated);
            toast.success(`Stay extended by ${extraNights} night(s)!`);
        } catch (err: any) {
            toast.error(`Failed to extend: ${err.message}`);
        } finally {
            setExtending(false);
        }
    };

    const handleOpenTransfer = async () => {
        setShowTransferModal(true);
        try {
            const rooms = await getAvailableRooms();
            setAvailableRooms(rooms);
        } catch (err: any) {
            toast.error('Failed to load available rooms');
        }
    };

    const handleTransferRoom = async () => {
        if (!transferTarget) return;
        setTransferring(true);
        try {
            const res = await transferRoom(bookingId, booking.rooms.id, transferTarget.id, transferReason) as any;
            if (!res.success) throw new Error(res.error);

            toast.success(`Guest transferred to Room ${transferTarget.number}!`);
            setShowTransferModal(false);
            setTransferTarget(null);
            setTransferReason('');

            const [folioRes, transfersRes] = await Promise.all([
                getBookingFolio(bookingId),
                getRoomTransfers(bookingId)
            ]) as [any, any];

            if (folioRes.success) setBooking(folioRes.data);
            if (transfersRes.success) setRoomTransfers(transfersRes.data);

        } catch (err: any) {
            toast.error(`Transfer failed: ${err.message}`);
        } finally {
            setTransferring(false);
        }
    };

    const handleAddExtraCharge = async () => {
        if (!extraChargeDesc || extraChargeAmount <= 0) return;
        setAddingCharge(true);
        try {
            const res = await addExtraCharge(bookingId, extraChargeDesc, extraChargeAmount) as any;
            if (!res.success) throw new Error(res.error);

            const extrasRes = await getExtraCharges(bookingId) as any;
            if (extrasRes.success) setExtraCharges(extrasRes.data);

            setExtraChargeDesc('');
            setExtraChargeAmount(0);
            setShowExtraChargeModal(false);
            toast.success('Extra charge added to folio');
        } catch (err: any) {
            toast.error(`Failed to add charge: ${err.message}`);
        } finally {
            setAddingCharge(false);
        }
    };

    const handleLogPayment = async () => {
        if (logAmount <= 0) return;
        const printWindow = window.open('about:blank', '_blank');
        setLogging(true);
        try {
            if (printWindow) printWindow.document.write('<html><body><h3>Preparing invoice...</h3></body></html>');
            const res = await logPayment(bookingId, logAmount, logMethod);
            if (!res.success) throw new Error(res.error);

            const updated = await getBookingFolio(bookingId);
            if (updated.success) setBooking(updated.data);
            setLogAmount(0);
            toast.success('Payment logged successfully!');
            setLogging(false); // Release parent UI state BEFORE triggering blocking print dialogs
            if (printWindow) printWindow.location.href = `/print-bill/${bookingId}?type=final`;
        } catch (err: any) {
            setLogging(false);
            if (printWindow) printWindow.close();
            toast.error(`Failed to log: ${err.message}`);
        }
    };

    const handleCheckout = async () => {
        if (billingData && billingData.balanceDue > 1) {
            toast.error('Outstanding balance must be cleared before checkout.');
            return;
        }
        setCheckingOut(true);
        try {
            const res = await performCheckout(bookingId, booking.rooms.id, billToCompany) as any;
            if (!res.success) throw new Error(res.error);
            toast.success('Checkout successful');
            window.open(`/print-bill/${bookingId}?type=final`, '_blank');

            // Send checkout mail + WhatsApp notification and surface WhatsApp status
            const { sendCheckoutMail } = await import('@/app/actions/mail');
            toast.promise(
                sendCheckoutMail(bookingId).then((res) => {
                    // Show WhatsApp status after mail resolves
                    setTimeout(() => {
                        if (res.whatsappSent) {
                            toast.success('📱 WhatsApp checkout message sent!', { duration: 4000 });
                        } else {
                            toast.error(`📵 WhatsApp not sent: ${res.whatsappError || 'Message not delivered'}`, { duration: 5000 });
                        }
                    }, 800);
                    return res;
                }),
                { loading: 'Sending checkout email & WhatsApp...', success: 'Checkout email sent!', error: (err) => `Email failed: ${err.message}` }
            );

            router.push('/front-desk');
        } catch (err: any) {
            toast.error('Checkout failed: ' + err.message);
        } finally {
            setCheckingOut(false);
        }
    };

    const handleOpenBillTransfer = async () => {
        try {
            const res = await getActiveBookings(bookingId);
            if (!res.success) throw new Error(res.error);
            setActiveBookings(res.data || []);
            setShowBillTransferModal(true);
        } catch (err: any) {
            toast.error('Failed to load active bookings: ' + err.message);
        }
    };

    const handleTransferBill = async () => {
        if (!selectedDestBooking || !billingData) return;

        const confirmResult = confirm(`Are you sure you want to transfer ${sym}${billingData.balanceDue.toLocaleString()} to Room ${selectedDestBooking.rooms.number}? This room will then have a zero balance.`);
        if (!confirmResult) return;

        setTransferringBill(true);
        try {
            const res = await transferFolioBalance(
                bookingId,
                booking.rooms.number,
                selectedDestBooking.id,
                selectedDestBooking.rooms.number,
                billingData.balanceDue
            );
            if (!res.success) throw new Error(res.error);

            toast.success(`Bill successfully transferred to Room ${selectedDestBooking.rooms.number}`);
            setShowBillTransferModal(false);

            // Reload folio data
            const [folioRes, ordersRes, extrasRes, transfersRes] = await Promise.all([
                getBookingFolio(bookingId),
                getRestaurantCharges(bookingId),
                getExtraCharges(bookingId),
                getRoomTransfers(bookingId)
            ]) as [any, any, any, any];

            if (folioRes.success) setBooking(folioRes.data);
            if (ordersRes.success) setRestaurantOrders(ordersRes.data);
            if (extrasRes.success) setExtraCharges(extrasRes.data);
            if (transfersRes.success) setRoomTransfers(transfersRes.data);

        } catch (err: any) {
            toast.error('Transfer failed: ' + err.message);
        } finally {
            setTransferringBill(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
                    <p className="text-slate-500 font-medium">Synchronizing Folio...</p>
                </div>
            </div>
        );
    }

    if (!booking || !billingData) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-6 max-w-md text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-xl">
                    <div className="p-4 bg-red-50 rounded-full">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Folio Sync Error</h2>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">
                            We couldn't retrieve the stay details for this booking. Please ensure the database migrations are up to date and the booking ID is valid.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/front-desk')}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md"
                    >
                        Back to Front Desk
                    </button>
                </div>
            </div>
        );
    }

    const sym = settings.currency === 'INR' ? '₹' : '$';
    const invoiceNumber = booking.invoice_number || generateInvoiceNo(booking.id, booking.check_in_date);

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Modular Industrial Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur-md bg-white/80">
                <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3">
                                <span className="bg-slate-950 text-white font-black px-3 py-1 rounded text-lg tracking-tighter uppercase italic">{booking.rooms?.number}</span>
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{booking.guests?.name}</h1>
                                <span className={cn(
                                    "text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-widest",
                                    booking.status === 'Checked_In' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                                )}>
                                    {booking.status.replace(/_/g, ' ')}
                                </span>
                            </div>
                            <div className="text-[11px] font-bold text-slate-400 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <div className="flex items-center gap-1 bg-slate-100/50 px-1.5 py-0.5 rounded border border-slate-200/50">
                                    <Hash className="w-3 h-3" /> <span>{invoiceNumber}</span>
                                </div>

                                <button
                                    onClick={() => setShowEditStayModal(true)}
                                    className="flex items-center gap-1.5 hover:text-blue-600 transition-colors group bg-blue-50/30 px-2 py-0.5 rounded border border-blue-100/50"
                                >
                                    <User className="w-3 h-3 text-blue-400" /> {booking.pax_count} Pax
                                    <span className="text-slate-300 mx-0.5">/</span>
                                    <UtensilsCrossed className="w-3 h-3 text-blue-400" /> {booking.food_plan}
                                    <Plus className="w-2.5 h-2.5 ml-0.5 bg-blue-500 text-white rounded-full p-0.5" />
                                </button>

                                {Number(booking.extra_beds) > 0 && (
                                    <div className="flex items-center gap-1 bg-indigo-50/30 px-1.5 py-0.5 rounded border border-indigo-100/50 text-indigo-600">
                                        <Plus className="w-3 h-3" /> {booking.extra_beds} Bed(s)
                                    </div>
                                )}

                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span className="flex items-center gap-1">
                                        {new Date(booking.check_in_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                                        <ArrowRightLeft className="w-2.5 h-2.5 mx-1 text-slate-300" />
                                        <span className={cn(
                                            new Date() > new Date(booking.check_out_date) && booking.status === 'Active' ? "text-amber-600 font-black" : ""
                                        )}>
                                            {new Date() > new Date(booking.check_out_date) && booking.status === 'Active'
                                                ? new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
                                                : new Date(booking.check_out_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
                                            }
                                        </span>
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 bg-slate-900 text-white px-2 py-0.5 rounded shadow-sm">
                                    <Clock className="w-3 h-3" /> {billingData.totalNights} Night(s)
                                </div>

                                {new Date() > new Date(booking.check_out_date) && booking.status === 'Active' && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-black uppercase rounded shadow-sm animate-pulse">Overstay</span>
                                        <span className="text-[10px] font-bold text-slate-400 italic">(Sch: {formatISTDate(booking.check_out_date)})</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleOpenBillTransfer}
                            className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm"
                        >
                            <ArrowRightLeft className="w-4 h-4" /> Transfer Bill
                        </button>
                        <button
                            onClick={() => window.open(`/print-bill/${bookingId}?type=provisional`, '_blank')}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:border-slate-300 transition-all flex items-center gap-2 shadow-sm"
                        >
                            <Printer className="w-4 h-4" /> Draft Bill
                        </button>
                        <button
                            onClick={() => router.push('/front-desk')}
                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all shadow-md"
                        >
                            Return to Grid
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Main Content: Ledger (Left 8 Cols) */}
                <div className="lg:col-span-8 flex flex-col gap-6">

                    {/* Professional Ledger Section */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-slate-500" /> Folio Ledger
                            </h2>
                            <div className="text-[11px] font-bold text-slate-400 uppercase">Values in {settings.currency}</div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200">
                                        <th className="px-6 py-3">Description</th>
                                        <th className="px-6 py-3 text-right">Units</th>
                                        <th className="px-6 py-3 text-right">Rate</th>
                                        <th className="px-6 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {/* 1. Posted Audit Charges (Itemized) */}
                                    {extraCharges.filter(c =>
                                        c.description.includes('Room Charge') ||
                                        c.description.includes('Meal Plan Charge') ||
                                        c.description.includes('Extra Pax Charge') ||
                                        c.description.includes('Extra Bed Charge')
                                    ).map((c, i) => (
                                        <tr key={c.id || i} className="text-sm border-l-2 border-slate-900 bg-slate-50/30">
                                            <td className="px-6 py-4 font-bold text-slate-800">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="w-3 h-3 text-slate-400" />
                                                    {c.description}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium">1</td>
                                            <td className="px-6 py-4 text-right">{sym}{Number(c.amount).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900">{sym}{Number(c.amount).toLocaleString()}</td>
                                        </tr>
                                    ))}

                                    {/* 2. Room Transfers History (Legacy support for old transfers logic if still needed) */}
                                    {roomTransfers.length > 0 && extraCharges.filter(c => c.description.includes('Room Charge')).length === 0 && (
                                        roomTransfers.map((t, i) => (
                                            <tr key={t.id || i} className="text-sm text-slate-500 italic">
                                                <td className="px-6 py-4">Transfer segment: Room {t.from_room_number}</td>
                                                <td className="px-6 py-4 text-right font-medium">{t.nights_in_old_room}n</td>
                                                <td className="px-6 py-4 text-right">{sym}{Number(t.from_rate).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right">{sym}{(Number(t.from_rate) * Number(t.nights_in_old_room)).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}

                                    {/* 3. Provisional Future Charges (Itemized) */}
                                    {billingData.provisionalBreakdown.nights > 0 && (
                                        <>
                                            <tr className="text-sm bg-blue-50/20 border-l-2 border-blue-500/50 group">
                                                <td className="px-6 py-4 font-bold text-blue-900 italic flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-blue-400 group-hover:rotate-12 transition-transform" />
                                                    Future Stay (Estimated)
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-blue-900">{billingData.provisionalBreakdown.nights}n</td>
                                                <td className="px-6 py-4 text-right">—</td>
                                                <td className="px-6 py-4 text-right">—</td>
                                            </tr>

                                            {/* Sub-rows for the breakdown */}
                                            {billingData.provisionalBreakdown.room > 0 && (
                                                <tr className="text-[11px] bg-blue-50/10 border-l-2 border-blue-200">
                                                    <td className="px-10 py-2 text-slate-500 font-bold uppercase italic">└ Room Rent Estimate</td>
                                                    <td className="px-6 py-2 text-right">—</td>
                                                    <td className="px-6 py-2 text-right text-slate-400 italic">{sym}{(Number(booking.rooms?.base_rate) || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-2 text-right font-black text-slate-600">{sym} {billingData.provisionalBreakdown.room.toLocaleString()}</td>
                                                </tr>
                                            )}

                                            {billingData.provisionalBreakdown.meals > 0 && (
                                                <tr className="text-[11px] bg-blue-50/10 border-l-2 border-blue-200">
                                                    <td className="px-10 py-2 text-slate-500 font-bold uppercase italic">└ Meal Plan ({booking.food_plan}) Estimate</td>
                                                    <td className="px-6 py-2 text-right">—</td>
                                                    <td className="px-6 py-2 text-right text-slate-400 italic">Per Pax Rate Applied</td>
                                                    <td className="px-6 py-2 text-right font-black text-slate-600">{sym} {billingData.provisionalBreakdown.meals.toLocaleString()}</td>
                                                </tr>
                                            )}

                                            {billingData.provisionalBreakdown.extraPax > 0 && (
                                                <tr className="text-[11px] bg-blue-50/10 border-l-2 border-blue-200">
                                                    <td className="px-10 py-2 text-slate-500 font-bold uppercase italic">└ Extra Pax ({Math.max(0, (booking.pax_count || 0) - (settings.free_pax_limit || 2))}) Estimate</td>
                                                    <td className="px-6 py-2 text-right">—</td>
                                                    <td className="px-6 py-2 text-right text-slate-400 italic">{sym}{settings.extra_pax_rate.toLocaleString()}</td>
                                                    <td className="px-6 py-2 text-right font-black text-slate-600">{sym} {billingData.provisionalBreakdown.extraPax.toLocaleString()}</td>
                                                </tr>
                                            )}

                                            {billingData.provisionalBreakdown.extraBeds > 0 && (
                                                <tr className="text-[11px] bg-blue-50/10 border-l-2 border-blue-200">
                                                    <td className="px-10 py-2 text-slate-500 font-bold uppercase italic">└ Extra Bed ({booking.extra_beds}) Estimate</td>
                                                    <td className="px-6 py-2 text-right">—</td>
                                                    <td className="px-6 py-2 text-right text-slate-400 italic">{sym}{settings.extra_bed_rate.toLocaleString()}</td>
                                                    <td className="px-6 py-2 text-right font-black text-slate-600">{sym} {billingData.provisionalBreakdown.extraBeds.toLocaleString()}</td>
                                                </tr>
                                            )}
                                        </>
                                    )}

                                    {billingData.extraBedCharges > 0 && (
                                        <tr className="text-sm text-indigo-600 bg-indigo-50/20">
                                            <td className="px-6 py-3 font-medium">Extra Bed Charges ({booking.extra_beds} beds)</td>
                                            <td className="px-6 py-3 text-right">{billingData.totalNights}n</td>
                                            <td className="px-6 py-3 text-right">{sym}{settings.extra_bed_rate.toLocaleString()}</td>
                                            <td className="px-6 py-3 text-right font-bold">{sym}{billingData.extraBedCharges.toLocaleString()}</td>
                                        </tr>
                                    )}

                                    {/* Miscellaneous Extra Charges */}
                                    {extraCharges.length > 0 && (
                                        <tr className="bg-amber-50/20 border-t border-amber-100/50">
                                            <td className="px-6 py-5" colSpan={4}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2 text-xs font-black text-amber-600 uppercase tracking-widest">
                                                        <Plus className="w-3 h-3" /> Miscellaneous Charges (Laundry, etc.)
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {extraCharges.map((charge) => (
                                                        <div key={charge.id} className="flex justify-between items-center text-sm ml-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>
                                                                <span className="text-slate-600 font-medium">{charge.description}</span>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (confirm('Delete this charge?')) {
                                                                            const res = await deleteExtraCharge(charge.id, bookingId);
                                                                            if (res.success) {
                                                                                setExtraCharges((prev: any) => prev.filter((c: any) => c.id !== charge.id));
                                                                                toast.success('Charge deleted');
                                                                            } else {
                                                                                toast.error(`Failed to delete charge: ${res.error}`);
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-colors"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            <span className="font-bold text-slate-700">{sym}{Number(charge.amount).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {/* Restaurant Orders */}
                                    {restaurantOrders.length > 0 && (
                                        <tr className="bg-slate-50/30">
                                            <td className="px-6 py-5" colSpan={4}>
                                                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                                                    <UtensilsCrossed className="w-3 h-3" /> Food & Beverage
                                                </div>
                                                <div className="space-y-2">
                                                    {restaurantOrders.map((order, idx) => (
                                                        <div key={order.id} className="flex justify-between items-center text-sm ml-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                                <span className="text-slate-600 font-medium">Order #{order.id.slice(-4).toUpperCase()} — {new Date(order.order_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                            </div>
                                                            <span className="font-bold text-slate-700">{sym}{Number(order.total_amount).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {/* Tax Summary Row */}
                                    <tr className="bg-slate-50/50">
                                        <td className="px-6 py-4" colSpan={2}></td>
                                        <td className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase italic">Taxes (GST)</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-600">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex justify-between gap-10"><span>CGST ({settings.cgst_rate}%)</span> <span>{sym}{billingData.cgst.toLocaleString()}</span></div>
                                                <div className="flex justify-between gap-10"><span>SGST ({settings.sgst_rate}%)</span> <span>{sym}{billingData.sgst.toLocaleString()}</span></div>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Totals Section */}
                                    <tr className="bg-slate-900 text-white">
                                        <td className="px-6 py-6" colSpan={2}></td>
                                        <td className="px-6 py-6 text-right font-black uppercase tracking-tighter text-sm opacity-60">Total Recievable</td>
                                        <td className="px-6 py-6 text-right font-black text-2xl tracking-tighter">{sym}{billingData.grandTotal.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Payment History Section */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-emerald-50/10">
                            <h2 className="text-sm font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-emerald-600" /> Payment Reconciliation
                            </h2>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-black text-slate-400 uppercase">Credits Received</span>
                                        <span className="text-xl font-black text-emerald-700">{sym}{billingData.totalPaid.toLocaleString()}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {/* Advance Payment */}
                                        <div className="flex justify-between items-center bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-white rounded-lg shadow-sm"><Wallet className="w-4 h-4 text-emerald-600" /></div>
                                                <div>
                                                    <p className="text-xs font-bold text-emerald-800 uppercase">Pre-Paid Advance</p>
                                                    <p className="text-[10px] text-emerald-600/80 font-bold uppercase tracking-tighter">{booking.advance_payment_mode} Receipt</p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-emerald-700">{sym}{Number(booking.advance_payment).toLocaleString()}</span>
                                        </div>

                                        {/* Additional Payments Ledger */}
                                        {booking.payments?.map((p: any) => (
                                            <div key={p.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200 transition-colors group-hover:border-emerald-200"><CreditCard className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" /></div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-700 uppercase">Payment Received</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{p.method} Settlement</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-slate-800">{sym}{Number(p.amount).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col">
                                    <div className={cn(
                                        "flex-1 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-4 transition-all",
                                        billingData.balanceDue > 1 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
                                    )}>
                                        <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-2", billingData.balanceDue > 1 ? "text-red-500" : "text-emerald-600")}>
                                            {billingData.balanceDue > 1 ? "Outstanding Balance" : "Account Status"}
                                        </p>
                                        <span className={cn("text-4xl font-black tracking-tighter", billingData.balanceDue > 1 ? "text-red-600" : "text-emerald-700")}>
                                            {sym}{Math.abs(billingData.balanceDue).toLocaleString()}
                                        </span>
                                        <div className={cn(
                                            "mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            billingData.balanceDue > 1 ? "bg-red-600 text-white shadow-lg shadow-red-200" : "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                                        )}>
                                            {billingData.balanceDue > 1 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                            {billingData.balanceDue > 1 ? "PAYMENT PENDING" : "FULLY SETTLED"}
                                        </div>
                                    </div>

                                    {/* Action row to settle */}
                                    {billingData.balanceDue > 1 && (
                                        <div className="mt-4 animate-in slide-in-from-top-2">
                                            <div className="flex gap-2 mb-3">
                                                <div className="relative flex-1">
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black">{sym}</div>
                                                    <input
                                                        type="number"
                                                        value={logAmount === 0 ? '' : logAmount}
                                                        onChange={(e) => setLogAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                                                        onFocus={(e) => e.target.select()}
                                                        placeholder="0"
                                                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                                    />
                                                </div>
                                                <select
                                                    value={logMethod}
                                                    onChange={(e) => setLogMethod(e.target.value as any)}
                                                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                                >
                                                    <option value="Cash">Cash</option>
                                                    <option value="Card">Card</option>
                                                    <option value="Online">UPI/Online</option>
                                                    {booking.company_id && <option value="Company">Corporate</option>}
                                                </select>
                                            </div>
                                            <button
                                                onClick={handleLogPayment}
                                                disabled={logging || logAmount <= 0}
                                                className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                                                Collect Payment
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Profile & Controls (Right 4 Cols) */}
                <aside className="lg:col-span-4 flex flex-col gap-6">

                    {/* Guest Profile Minimal Section */}
                    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -z-0 opacity-50"></div>
                        <div className="relative z-10">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                                <User className="w-4 h-4" /> Guest Information
                            </h2>
                            <div className="space-y-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Guest Email</span>
                                    <span className="text-sm font-bold text-slate-700 truncate">{booking.guests?.email || 'N/A'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Contact Phone</span>
                                    <span className="text-sm font-bold text-slate-700">{booking.guests?.phone}</span>
                                </div>
                                {booking.companies && (
                                    <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                                        <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em] italic">Corporate Profile</p>
                                        <p className="text-sm font-black tracking-tight">{booking.companies.name}</p>
                                        <div className="flex justify-between items-center opacity-70">
                                            <span className="text-[9px] font-bold uppercase tracking-widest">Business Bill</span>
                                            <Building2 className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-100">
                                {booking.guests?.id_image_url ? (
                                    <button onClick={() => window.open(booking.guests.id_image_url, '_blank')} className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm"><FileSearch className="w-4 h-4 text-slate-400" /></div>
                                            <span className="text-xs font-bold text-slate-600">Identification View</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-all" />
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-700">
                                            <AlertTriangle className="w-4 h-4" /> ID Verification Required
                                        </div>
                                        <IdDropzone
                                            guestPhone={booking.guests?.phone || ''}
                                            onUploadComplete={async (url) => {
                                                await updateGuestIdUrl(booking.guests.id, url);
                                                setBooking((prev: any) => ({ ...prev, guests: { ...prev.guests, id_image_url: url } })); router.refresh();
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Operational Actions Section */}
                    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 overflow-hidden">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5" /> Room Operations
                        </h2>

                        <div className="space-y-4">
                            {/* Extend Stay Action */}
                            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Adjust/Extend Duration</label>
                                <div className="flex gap-2">
                                    <select
                                        value={extraNights}
                                        onChange={(e) => setExtraNights(Number(e.target.value))}
                                        className="w-20 p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none shadow-sm"
                                    >
                                        {[1, 2, 3, 4, 5, 7, 10, 14].map(n => <option key={n} value={n}>{n}n</option>)}
                                    </select>
                                    <button
                                        onClick={handleExtendStay}
                                        disabled={extending}
                                        className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        {extending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                                        Extend Stay
                                    </button>
                                </div>
                            </div>

                            {/* Transfer Room Action */}
                            <button
                                onClick={handleOpenTransfer}
                                className="w-full flex items-center justify-between p-4 bg-white border-2 border-dashed border-slate-200 text-slate-600 rounded-2xl hover:border-slate-400 hover:bg-slate-50 transition-all font-bold text-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <ArrowRightLeft className="w-5 h-5 text-slate-400" />
                                    Switch Guest Room
                                </div>
                                <ChevronRight className="w-4 h-4" />
                            </button>

                            {/* Extra Charges Action */}
                            <button
                                onClick={() => setShowExtraChargeModal(true)}
                                className="w-full py-4 bg-amber-50 border-2 border-dashed border-amber-200 text-amber-700 rounded-2xl hover:border-amber-400 hover:bg-amber-100/50 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Log Extra Charge (Laundry/Misc)
                            </button>

                            <button
                                onClick={() => window.open(`/print-grc/${bookingId}`, '_blank')}
                                className="w-full py-4 bg-slate-50 border-2 border-dashed border-slate-200 text-slate-600 rounded-2xl hover:border-slate-400 hover:bg-slate-100/50 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4" /> View / Print GRC Card
                            </button>

                            {/* Divider with Label */}
                            <div className="pt-8 pb-2 relative flex items-center">
                                <div className="flex-grow border-t border-slate-100"></div>
                                <span className="flex-shrink mx-4 text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Terminal Check-out</span>
                                <div className="flex-grow border-t border-slate-100"></div>
                            </div>

                            {/* Refund Toggle Policy */}
                            <div className="p-4 rounded-2xl border-2 border-slate-950/5 bg-slate-50/50">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">Early Checkout Refund</span>
                                        <span className="text-[9px] font-bold text-slate-400 leading-none mt-1">Recalculate bill for actual stay</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={booking.allow_early_checkout_refund || false}
                                            onChange={handleToggleRefund}
                                            disabled={updatingRefund}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-950"></div>
                                    </div>
                                </label>
                            </div>

                            {/* Final Check-out Button */}
                            {!showCheckoutConfirm ? (
                                <button
                                    onClick={() => setShowCheckoutConfirm(true)}
                                    disabled={billingData.balanceDue > 1}
                                    className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black text-lg tracking-tighter hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:bg-slate-400 disabled:shadow-none flex items-center justify-center gap-2 group italic uppercase"
                                >
                                    <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    {billingData.balanceDue > 1 ? "Settle to Checkout" : "Begin Checkout"}
                                </button>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 p-5 bg-slate-950 text-white rounded-2xl shadow-xl">
                                    <div className="space-y-3 pb-2 border-b border-white/10">
                                        <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 italic">
                                            <AlertCircle className="w-4 h-4 text-amber-500" /> Final Checkout
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                                            Account is fully settled. Room will be marked for housekeeping.
                                        </p>
                                    </div>

                                    <label className="flex items-center gap-3 p-2 group cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={paymentConfirmed}
                                            onChange={(e) => setPaymentConfirmed(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-offset-slate-950"
                                        />
                                        <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors uppercase italic tracking-tight">Financial verification complete</span>
                                    </label>

                                    {booking.company_id && (
                                        <label className="flex items-center gap-3 p-2 bg-white/5 rounded-xl group cursor-pointer border border-white/5">
                                            <input
                                                type="checkbox"
                                                checked={billToCompany}
                                                onChange={(e) => setBillToCompany(e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500"
                                            />
                                            <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors uppercase italic tracking-tight">Sync to company portal</span>
                                        </label>
                                    )}

                                    <div className="flex gap-2 pt-2">
                                        <button onClick={() => setShowCheckoutConfirm(false)} className="px-4 py-3 bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all flex-1">Abort</button>
                                        <button
                                            onClick={handleCheckout}
                                            disabled={!paymentConfirmed || checkingOut}
                                            className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex-1 shadow-lg shadow-emerald-900 disabled:opacity-30 flex items-center justify-center gap-2"
                                        >
                                            {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            CONFIRM
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </aside>
            </main>

            {/* Room Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowTransferModal(false)}>
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl p-8 space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3">
                                <ArrowRightLeft className="w-6 h-6 text-slate-400" /> Transfer Inventory
                            </h2>
                            <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>

                        <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                <span>Current Occupancy</span>
                                <span>Rate: {sym}{Number(booking.rooms?.base_rate).toLocaleString()}</span>
                            </div>
                            <div className="text-lg font-black text-slate-800">Room {booking.rooms?.number} — <span className="uppercase italic">{booking.rooms?.type}</span></div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest italic ml-1">Destination Unit</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {availableRooms.filter(r => r.id !== booking.rooms?.id).map((r: any) => (
                                    <button
                                        key={r.id}
                                        onClick={() => setTransferTarget(r)}
                                        className={cn(
                                            "border-2 rounded-2xl p-4 flex flex-col items-center gap-1 transition-all",
                                            transferTarget?.id === r.id
                                                ? "border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-200 scale-[1.02]"
                                                : "border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                                        )}
                                    >
                                        <span className="text-xl font-black">{r.number}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-tighter opacity-80">{r.type}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest italic ml-1">Audit Reason</label>
                            <input
                                type="text"
                                value={transferReason}
                                onChange={e => setTransferReason(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-950 transition-all text-sm font-bold"
                                placeholder="e.g. Maintenance, Guest dissatisfaction, Upgrade..."
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setShowTransferModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:text-slate-900 transition-colors">Dismiss</button>
                            <button
                                onClick={handleTransferRoom}
                                disabled={!transferTarget || transferring}
                                className="flex-2 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-20 flex items-center justify-center gap-3 transition-all px-12"
                            >
                                {transferring ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <CheckCircle2 className="w-4 h-4" />}
                                Complete Transfer
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Extra Charge Modal */}
            {showExtraChargeModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Add Miscellaneous Charge</h2>
                            <button onClick={() => setShowExtraChargeModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Charge Description</label>
                                <input
                                    type="text"
                                    value={extraChargeDesc}
                                    onChange={e => setExtraChargeDesc(e.target.value)}
                                    placeholder="e.g. Laundry, Damage, Extra Towels"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none font-bold text-slate-800"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount ({sym})</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                                    <input
                                        type="number"
                                        value={extraChargeAmount === 0 ? '' : extraChargeAmount}
                                        onChange={(e) => setExtraChargeAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                                        onFocus={(e) => e.target.select()}
                                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none font-bold text-slate-800 text-lg"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAddExtraCharge}
                                disabled={addingCharge || !extraChargeDesc || extraChargeAmount <= 0}
                                className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {addingCharge ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                Add to Folio
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Stay Configuration Modal */}
            {showEditStayModal && (
                <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowEditStayModal(false)}>
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3">
                                <Clock className="w-6 h-6 text-blue-500" /> Configure Stay Services
                            </h2>
                            <button onClick={() => setShowEditStayModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pax Count</label>
                                <input
                                    type="number"
                                    value={editData.pax_count}
                                    onChange={e => setEditData({ ...editData, pax_count: Number(e.target.value) })}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Extra Beds</label>
                                <input
                                    type="number"
                                    value={editData.extra_beds}
                                    onChange={e => setEditData({ ...editData, extra_beds: Number(e.target.value) })}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meal Plan</label>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.keys(settings.meal_plan_rates || {}).map(plan => (
                                    <button
                                        key={plan}
                                        onClick={() => setEditData({ ...editData, food_plan: plan })}
                                        className={cn(
                                            "p-3 rounded-xl border-2 font-black text-xs uppercase transition-all",
                                            editData.food_plan === plan
                                                ? "bg-slate-950 text-white border-slate-950 shadow-lg"
                                                : "bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-200"
                                        )}
                                    >
                                        {plan}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
                            <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" /> Billing Impact
                            </h4>
                            <p className="text-[10px] font-bold text-amber-900/60 leading-relaxed italic">
                                Changes will apply to all FUTURE Night Audits. Past dated charges in the folio remain unchanged as per previous configurations.
                            </p>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setShowEditStayModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:text-slate-900 transition-colors">Discard</button>
                            <button
                                onClick={handleUpdateStay}
                                disabled={updatingStay}
                                className="flex-2 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-20 flex items-center justify-center gap-3 transition-all px-12"
                            >
                                {updatingStay ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <CheckCircle2 className="w-4 h-4" />}
                                Update Stay
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bill Transfer Modal */}
            {showBillTransferModal && (
                <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowBillTransferModal(false)}>
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3">
                                <ArrowRightLeft className="w-6 h-6 text-indigo-500" /> Transfer Bill to Room
                            </h2>
                            <button onClick={() => setShowBillTransferModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>

                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Amount to Transfer</span>
                                <div className="text-2xl font-black text-indigo-900">{sym}{billingData?.balanceDue.toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Source</span>
                                <div className="text-lg font-bold text-indigo-900 italic">Room {booking.rooms.number}</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Destination Room</label>
                            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {activeBookings.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 italic text-sm">No other active rooms found.</div>
                                ) : (
                                    activeBookings.map(b => (
                                        <button
                                            key={b.id}
                                            onClick={() => setSelectedDestBooking(b)}
                                            className={cn(
                                                "w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group",
                                                selectedDestBooking?.id === b.id
                                                    ? "bg-slate-950 border-slate-950 text-white shadow-xl scale-[1.02]"
                                                    : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors",
                                                    selectedDestBooking?.id === b.id ? "bg-white/20 text-white" : "bg-white text-slate-950"
                                                )}>
                                                    {b.rooms.number}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-sm leading-tight">{b.guests.name}</div>
                                                    <div className={cn("text-[10px] uppercase font-black tracking-widest opacity-60", selectedDestBooking?.id === b.id ? "text-white" : "text-slate-400")}>{b.rooms.type}</div>
                                                </div>
                                            </div>
                                            <ChevronRight className={cn("w-4 h-4 transition-transform", selectedDestBooking?.id === b.id ? "translate-x-1" : "opacity-0")} />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setShowBillTransferModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:text-slate-900 transition-colors">Cancel</button>
                            <button
                                onClick={handleTransferBill}
                                disabled={transferringBill || !selectedDestBooking}
                                className="flex-2 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-20 flex items-center justify-center gap-3 transition-all px-12 shadow-xl shadow-slate-200"
                            >
                                {transferringBill ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <ArrowRightLeft className="w-4 h-4" />}
                                Confirm Transfer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
