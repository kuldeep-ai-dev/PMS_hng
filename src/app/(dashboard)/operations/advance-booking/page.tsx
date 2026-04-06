'use client';

import { useState, useRef, useEffect } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { Search, CheckCircle2, ChevronRight, Loader2, IndianRupee, X, Users, BedDouble, Calendar, CalendarDays, UserPlus } from 'lucide-react';
import IdDropzone from '@/components/pms/IdDropzone';
import { cn, calculateAge } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { searchGuests } from '../../check-in/actions-client';
import { submitAdvanceBooking, getAdvanceAvailableRooms, processCancellation, getAdvanceBookings } from './actions';
import { getSettings } from '../../settings/actions';
import { getCompanies } from '../../companies/actions';
import { toast } from 'sonner';

export default function AdvanceBookingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchSelected, setSearchSelected] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [settings, setSettings] = useState({
        cgst_rate: 6,
        sgst_rate: 6,
        currency: 'INR',
        free_pax_limit: 2,
        extra_bed_rate: 1000,
        extra_pax_rate: 800,
        meal_plan_rates: { EP: 0, CP: 500, MAP: 1000, AP: 1500, AI: 2500 } as Record<string, number>
    });

    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '', preferences: '',
        purpose_of_visit: 'Leisure',
        room_id: '', room_number: '', room_base_rate: 0,
        advance_payment: 0, advance_payment_mode: 'Cash',
        gst_type: 'B2C', gstin: '',
        check_in_date: new Date(new Date().getTime() + 86400000).toISOString().split('T')[0], // Default: Tomorrow
        check_out_date: new Date(new Date().getTime() + 172800000).toISOString().split('T')[0], // Tomorrow + 1
        id_document_url: '',
        guest_type: 'Standard',
        pin_code: '', city: '', state: '', country: 'India',
        is_foreign: false, passport_number: '',
        extra_beds: 0, discount_amount: 0, food_plan: 'EP', pax_count: 1,
        accompanying_guests: [] as any[],
        company_id: '',
        guest_id: '',
        coming_from: '',
        next_destination: '',
        booking_source: 'Walk-In',
        ota_booking_id: '',
        dob: '',
        age: 0
    });

    const [view, setView] = useState<'create' | 'list'>('create');
    const [bookings, setBookings] = useState<any[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedCancelBooking, setSelectedCancelBooking] = useState<any>(null);
    const [cancelDetails, setCancelDetails] = useState({ refund: 0, reason: '' });

    useEffect(() => {
        getSettings().then(s => setSettings({
            cgst_rate: s.cgst_rate || 6,
            sgst_rate: s.sgst_rate || 6,
            currency: s.currency || 'INR',
            free_pax_limit: s.free_pax_limit !== undefined ? s.free_pax_limit : 2,
            extra_bed_rate: s.extra_bed_rate || 0,
            extra_pax_rate: s.extra_pax_rate || 0,
            meal_plan_rates: s.meal_plan_rates || { EP: 0, CP: 500, MAP: 1000, AP: 1500, AI: 2500 }
        }));
        getCompanies().then(setCompanies);
        fetchBookings();
    }, []);

    useEffect(() => {
        if (formData.check_in_date && formData.check_out_date) {
            setLoadingRooms(true);
            getAdvanceAvailableRooms(formData.check_in_date, formData.check_out_date)
                .then(rooms => {
                    setAvailableRooms(rooms);
                    // Clear selected room if not available for these dates
                    if (formData.room_id && !rooms.find(r => r.id === formData.room_id)) {
                        setFormData(prev => ({ ...prev, room_id: '', room_number: '', room_base_rate: 0 }));
                    }
                })
                .finally(() => setLoadingRooms(false));
        }
    }, [formData.check_in_date, formData.check_out_date]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!searchTerm || searchTerm.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchGuests(searchTerm);
                setSearchResults(results);
                setShowDropdown(results.length > 0);
            } catch { /* ignore */ } finally {
                setIsSearching(false);
            }
        }, 280);
    }, [searchTerm]);

    const fetchBookings = async () => {
        setLoadingBookings(true);
        try {
            const data = await getAdvanceBookings();
            setBookings(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingBookings(false);
        }
    };

    const handleCancelClick = (booking: any) => {
        setSelectedCancelBooking(booking);
        setCancelDetails({ refund: booking.advance_payment || 0, reason: '' });
        setShowCancelModal(true);
    };

    const confirmCancel = async () => {
        if (!selectedCancelBooking) return;
        setLoading(true);
        try {
            await processCancellation(selectedCancelBooking.id, cancelDetails.refund, cancelDetails.reason);
            toast.success('Reservation cancelled and refund logged if applicable.');
            fetchBookings();
            setShowCancelModal(false);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const selectGuest = (guest: any) => {
        setFormData(prev => ({
            ...prev,
            name: guest.name || '', phone: guest.phone || '', email: guest.email || '',
            address: guest.address || '', preferences: guest.preferences || '',
            id_document_url: guest.id_image_url || '', guest_type: guest.guest_type || 'Standard',
            pin_code: guest.pin_code || '', city: guest.city || '', state: guest.state || '',
            country: guest.country || 'India', is_foreign: guest.is_foreign || false,
            passport_number: guest.passport_number || '',
            guest_id: guest.id,
            dob: guest.dob || '',
            age: guest.age || 0
        }));
        setSearchTerm(guest.name);
        setShowDropdown(false);
        setSearchSelected(true);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await submitAdvanceBooking(formData);
            toast.success('Advance Booking Created Successfully!');
            fetchBookings();
            setView('list');
            setStep(1);
            setFormData({
                ...formData,
                name: '', phone: '', email: '', guest_id: '',
                room_id: '', room_number: '', advance_payment: 0
            });
        } catch (error: any) {
            toast.error(`Failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const currencySymbol = settings.currency === 'INR' ? '₹' : '$';

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-teal-600" /> Advance Booking
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Reserve a room for a future date without checking in</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setView('create')}
                        className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", view === 'create' ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                    >
                        New Booking
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", view === 'list' ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                    >
                        All Reservations ({bookings.length})
                    </button>
                </div>
            </div>

            {view === 'create' ? (
                <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
                    {/* Step 1: Guest & Dates */}
                    <BentoCard className={cn("p-6", step === 1 ? 'ring-2 ring-teal-500' : 'opacity-70')}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-teal-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</span>
                            <h2 className="text-lg font-semibold">Guest & Stay Period</h2>
                        </div>

                        {step === 1 && (
                            <div className="space-y-6">
                                <div ref={searchRef} className="relative">
                                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSearchTerm(val);
                                            setSearchSelected(false);
                                            // Proactive filling
                                            if (val.length > 0) {
                                                const isPhone = /^\+?[\d\s-]+$/.test(val);
                                                if (isPhone) {
                                                    setFormData(prev => ({ ...prev, phone: val, name: '' }));
                                                } else {
                                                    setFormData(prev => ({ ...prev, name: val, phone: '' }));
                                                }
                                            } else {
                                                setFormData(prev => ({ ...prev, name: '', phone: '' }));
                                            }
                                        }}
                                        placeholder="Search by name or mobile..."
                                        className="w-full pl-9 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                    {showDropdown && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl">
                                            {searchResults.map(g => (
                                                <button key={g.id} onClick={() => selectGuest(g)} className="w-full text-left px-4 py-3 hover:bg-teal-50 border-b last:border-0 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">{g.name[0]}</div>
                                                    <div>
                                                        <p className="font-semibold text-sm">{g.name}</p>
                                                        <p className="text-xs text-slate-500">{g.phone}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Arrival Date</label>
                                        <input
                                            type="date"
                                            value={formData.check_in_date}
                                            min={new Date().toISOString().split('T')[0]}
                                            onChange={e => {
                                                const newIn = e.target.value;
                                                const inDate = new Date(newIn);
                                                const outDate = new Date(formData.check_out_date);

                                                let newOut = formData.check_out_date;
                                                if (outDate <= inDate) {
                                                    const nextDay = new Date(inDate);
                                                    nextDay.setDate(nextDay.getDate() + 1);
                                                    newOut = nextDay.toISOString().split('T')[0];
                                                }

                                                setFormData({ ...formData, check_in_date: newIn, check_out_date: newOut });
                                            }}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Departure Date</label>
                                        <input
                                            type="date"
                                            value={formData.check_out_date}
                                            min={new Date(new Date(formData.check_in_date).getTime() + 86400000).toISOString().split('T')[0]}
                                            onChange={e => setFormData({ ...formData, check_out_date: e.target.value })}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Guest Name *</label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 bg-white border border-slate-200 rounded-xl" placeholder="Full Name" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Mobile *</label>
                                        <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-3 bg-white border border-slate-200 rounded-xl" placeholder="Phone Number" />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button onClick={() => setStep(2)} disabled={!formData.name || !formData.phone} className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
                                        Next: Room Selection <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </BentoCard>

                    <BentoCard className={cn("p-6", step === 2 ? 'ring-2 ring-teal-500' : 'opacity-70')}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold", step >= 2 ? 'bg-teal-600 text-white' : 'bg-slate-200')}>2</span>
                            <h2 className="text-lg font-semibold">Room Selection</h2>
                        </div>

                        {step === 2 && (
                            <div className="space-y-6">
                                {loadingRooms ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                        <p className="font-bold text-sm tracking-widest uppercase">Checking Availability...</p>
                                    </div>
                                ) : availableRooms.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                                        <p className="font-bold">No rooms available for the selected dates.</p>
                                        <button onClick={() => setStep(1)} className="text-teal-600 font-bold underline mt-2">Change Dates</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {availableRooms.map(room => (
                                            <div
                                                key={room.id}
                                                onClick={() => setFormData({ ...formData, room_id: room.id, room_number: room.number, room_base_rate: room.base_rate })}
                                                className={cn(
                                                    "border-2 rounded-xl p-4 cursor-pointer transition-all text-center",
                                                    formData.room_id === room.id ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-teal-300"
                                                )}
                                            >
                                                <p className="text-lg font-black">{room.number}</p>
                                                <p className="text-[10px] uppercase font-bold text-slate-500">{room.type}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-between">
                                    <button onClick={() => setStep(1)} className="text-slate-500 font-medium px-4 py-2">Back</button>
                                    <button onClick={() => setStep(3)} disabled={!formData.room_id} className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
                                        Next: Finalize <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </BentoCard>

                    <BentoCard className={cn("p-6", step === 3 ? 'ring-2 ring-teal-500' : 'opacity-70')}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold", step >= 3 ? 'bg-teal-600 text-white' : 'bg-slate-200')}>3</span>
                            <h2 className="text-lg font-semibold">Finalize Booking</h2>
                        </div>

                        {step === 3 && (
                            <div className="space-y-6">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Guest</span>
                                        <span className="font-bold">{formData.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Room</span>
                                        <span className="font-bold">{formData.room_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Stay</span>
                                        <span className="font-bold">{formData.check_in_date} to {formData.check_out_date}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Booking Source</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, booking_source: 'Walk-In', ota_booking_id: '' })}
                                                className={cn(
                                                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                                                    formData.booking_source === 'Walk-In' ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                                )}
                                            >
                                                Walk-In
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, booking_source: 'OTA' })}
                                                className={cn(
                                                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                                                    formData.booking_source === 'OTA' ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                                )}
                                            >
                                                OTA
                                            </button>
                                        </div>
                                    </div>

                                    {formData.booking_source === 'OTA' && (
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium">OTA Booking ID</label>
                                            <input
                                                type="text"
                                                value={formData.ota_booking_id}
                                                onChange={e => setFormData({ ...formData, ota_booking_id: e.target.value })}
                                                className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                                                placeholder="Enter ID"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Advance Payment ({currencySymbol})</label>
                                    <input
                                        type="number"
                                        value={formData.advance_payment || ''}
                                        onChange={e => setFormData({ ...formData, advance_payment: Number(e.target.value) })}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="flex justify-between pt-4">
                                    <button onClick={() => setStep(2)} className="text-slate-500 font-medium px-4 py-2">Back</button>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="px-10 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Confirm Reservation
                                    </button>
                                </div>
                            </div>
                        )}
                    </BentoCard>
                </div>
            ) : (
                <BentoCard className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Guest</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Room</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Dates</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Advance</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingBookings ? (
                                    <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Loading reservations...</td></tr>
                                ) : bookings.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No active advance bookings found.</td></tr>
                                ) : bookings.map(b => (
                                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-900">{b.guests?.name}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{b.guests?.phone}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg font-black tracking-tighter text-sm border border-teal-100">
                                                {b.rooms?.number}
                                            </span>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">{b.rooms?.type}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{new Date(b.check_in_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                                    <span className="text-[10px] uppercase font-black text-slate-400">Arrival</span>
                                                </div>
                                                <ChevronRight className="w-3 h-3 text-slate-300" />
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{new Date(b.check_out_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                                    <span className="text-[10px] uppercase font-black text-slate-400">Departure</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="font-black text-slate-900">{currencySymbol}{Number(b.advance_payment).toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">{b.advance_payment_mode}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    disabled={new Date(b.check_in_date).toISOString().split('T')[0] !== new Date().toISOString().split('T')[0]}
                                                    onClick={() => router.push(`/check-in?bookingId=${b.id}`)}
                                                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-black/10 disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <UserPlus className="w-3 h-3" /> Check-In
                                                </button>
                                                <button
                                                    onClick={() => handleCancelClick(b)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </BentoCard>
            )}

            {/* Cancellation Modal */}
            {showCancelModal && selectedCancelBooking && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <BentoCard className="w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Cancel Reservation</h3>
                                <p className="text-sm text-slate-500">{selectedCancelBooking.guests?.name} — Room {selectedCancelBooking.rooms?.number}</p>
                            </div>
                            <button onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600">Advance Paid</span>
                                <span className="text-lg font-black text-slate-900">{currencySymbol}{Number(selectedCancelBooking.advance_payment).toLocaleString()}</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Refund Amount ({currencySymbol})</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCancelDetails({ ...cancelDetails, refund: selectedCancelBooking.advance_payment })}
                                        className={cn("flex-1 py-2 text-xs font-bold border rounded-lg transition-all", cancelDetails.refund === selectedCancelBooking.advance_payment ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-200 hover:border-teal-300")}
                                    >
                                        Full Refund
                                    </button>
                                    <button
                                        onClick={() => setCancelDetails({ ...cancelDetails, refund: 0 })}
                                        className={cn("flex-1 py-2 text-xs font-bold border rounded-lg transition-all", cancelDetails.refund === 0 ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-600 border-slate-200 hover:border-red-300")}
                                    >
                                        No Refund
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={cancelDetails.refund}
                                    onChange={(e) => setCancelDetails({ ...cancelDetails, refund: Number(e.target.value) })}
                                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Enter refund amount"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Reason for Cancellation</label>
                                <textarea
                                    value={cancelDetails.reason}
                                    onChange={(e) => setCancelDetails({ ...cancelDetails, reason: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 h-20 resize-none"
                                    placeholder="Optional reason..."
                                />
                            </div>

                            <button
                                onClick={confirmCancel}
                                disabled={loading}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                Confirm Cancellation
                            </button>
                        </div>
                    </BentoCard>
                </div>
            )}
        </div>
    );
}
