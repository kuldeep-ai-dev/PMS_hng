'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { Search, CheckCircle2, ChevronRight, Loader2, IndianRupee, X, Users, BedDouble, Calendar } from 'lucide-react';
import IdDropzone from '@/components/pms/IdDropzone';
import { cn, calculateAge } from '@/lib/utils';
import SignatureCanvas from 'react-signature-canvas';
import { useSearchParams, useRouter } from 'next/navigation';
import { searchGuests, getAvailableRooms, submitCheckIn, getBookingById, checkRoomConflict } from './actions-client';
import { formatISTDate } from '@/utils/date';
import { sendBookingConfirmation } from '@/app/actions/mail';
import { toast } from 'sonner';
import { getSettings } from '../settings/actions';
import { getCompanies } from '../companies/actions';
import { AlertCircle } from 'lucide-react';

const EARLY_CHECKIN_SURCHARGE_PERCENT = 30;

function CheckInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialRoom = searchParams.get('room');
    const bookingId = searchParams.get('bookingId');

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchSelected, setSearchSelected] = useState(false);
    const [conflict, setConflict] = useState<any>(null);
    const [isForceBooking, setIsForceBooking] = useState(false);
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
        purpose_of_visit: 'Leisure', opted_in: true,
        room_id: '', room_number: initialRoom || '', room_base_rate: 0,
        advance_payment: 0, advance_payment_mode: 'Cash',
        gst_type: 'B2C', gstin: '',
        check_in_date: new Date().toISOString().split('T')[0],
        check_out_date: new Date(new Date().getTime() + 86400000).toISOString().split('T')[0],
        early_check_in: false, total_bill: 0, id_document_url: '',
        guest_type: 'Standard',
        pin_code: '', city: '', state: '', country: 'India',
        is_foreign: false, passport_number: '', guide_name: '', guide_phone: '',
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

    const [hasExistingId, setHasExistingId] = useState(false);
    const [isB2b, setIsB2b] = useState(false);
    const sigPad = useRef<SignatureCanvas | null>(null);

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

        const prefill = searchParams.get('prefill');
        if (prefill === 'true') {
            setFormData(prev => ({
                ...prev,
                name: searchParams.get('name') || prev.name,
                phone: searchParams.get('phone') || prev.phone,
                email: searchParams.get('email') || prev.email,
            }));
            setSearchTerm(searchParams.get('name') || '');
        }

        getAvailableRooms().then(rooms => {
            setAvailableRooms(rooms);
            if (initialRoom) {
                const match = rooms.find((r: any) => r.number === initialRoom);
                if (match) setFormData(prev => ({ ...prev, room_id: match.id, room_number: match.number, room_base_rate: match.base_rate }));
            }
        });

        getCompanies().then(setCompanies);

        if (bookingId) {
            getBookingById(bookingId).then(b => {
                const g = b.guests;
                setFormData(prev => ({
                    ...prev,
                    name: g?.name || '',
                    phone: g?.phone || '',
                    email: g?.email || '',
                    address: g?.address || '',
                    pin_code: g?.pin_code || '',
                    city: g?.city || '',
                    state: g?.state || '',
                    country: g?.country || 'India',
                    guest_id: g?.id || '',
                    room_id: b.room_id,
                    room_number: b.rooms?.number || prev.room_number,
                    room_base_rate: b.rooms?.base_rate || 0,
                    advance_payment: b.advance_payment || 0,
                    advance_payment_mode: b.advance_payment_mode || 'Cash',
                    food_plan: b.food_plan || 'EP',
                    pax_count: b.pax_count || 1,
                    extra_beds: b.extra_beds || 0,
                    discount_amount: b.discount_amount || 0,
                    accompanying_guests: b.accompanying_guests || [],
                    company_id: b.company_id || '',
                    guest_type: g?.guest_type || 'Standard',
                    booking_source: b.booking_source || 'Walk-In',
                    ota_booking_id: b.ota_booking_id || '',
                    id_document_url: g?.id_image_url || '',
                    coming_from: b.coming_from || '',
                    next_destination: b.next_destination || ''
                }));
                if (g?.id_image_url) setHasExistingId(true);
                if (g?.name) setSearchTerm(g.name);
            });
        }
    }, [initialRoom, bookingId]);

    useEffect(() => {
        if (formData.room_id && formData.check_in_date && formData.check_out_date) {
            checkRoomConflict(formData.room_id, formData.check_in_date, formData.check_out_date, bookingId || undefined)
                .then(setConflict)
                .catch(console.error);
        } else {
            setConflict(null);
        }
    }, [formData.room_id, formData.check_in_date, formData.check_out_date, bookingId]);

    // PERSISTENCE: Context-Aware Loading from LocalStorage
    useEffect(() => {
        const savedData = localStorage.getItem('pms_checkin_form');
        const savedStep = localStorage.getItem('pms_checkin_step');

        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);

                // If we have an intentional context from URL (booking or specific room)
                // we should only restore if it matches that context.
                let shouldRestore = true;

                if (bookingId) {
                    // If we have a booking ID in URL, always allow the fetch effect to handle it.
                    // But if the saved data is for a different booking, don't restore it first.
                    if (parsed.booking_id && parsed.booking_id !== bookingId) shouldRestore = false;
                } else if (initialRoom) {
                    // For grid clicks (room only), only restore if it was already for this room
                    // AND it wasn't a pre-filled booking from before.
                    if (parsed.room_number !== initialRoom || !!parsed.booking_id) shouldRestore = false;
                }

                if (shouldRestore) {
                    setFormData(prev => ({ ...prev, ...parsed }));
                    if (parsed.name) setSearchTerm(parsed.name);
                    if (savedStep) setStep(Number(savedStep));
                } else {
                    // New context detected via URL, clear the stale session data
                    localStorage.removeItem('pms_checkin_form');
                    localStorage.removeItem('pms_checkin_step');
                }
            } catch (e) {
                console.error('Failed to parse saved check-in data', e);
                localStorage.removeItem('pms_checkin_form');
            }
        }
    }, [initialRoom, bookingId]);

    // PERSISTENCE: Save to LocalStorage on change
    useEffect(() => {
        // Debounce saving to avoid excessive writes
        const timeout = setTimeout(() => {
            localStorage.setItem('pms_checkin_form', JSON.stringify(formData));
            localStorage.setItem('pms_checkin_step', step.toString());
        }, 500);
        return () => clearTimeout(timeout);
    }, [formData, step]);

    useEffect(() => {
        if (formData.pin_code?.length === 6 && formData.country === 'India') {
            fetch(`https://api.postalpincode.in/pincode/${formData.pin_code}`)
                .then(res => res.json())
                .then(data => {
                    if (data[0]?.Status === 'Success') {
                        const postOffice = data[0].PostOffice[0];
                        setFormData(prev => ({
                            ...prev,
                            city: postOffice.District,
                            state: postOffice.State
                        }));
                    }
                })
                .catch(console.error);
        }
    }, [formData.pin_code, formData.country]);

    useEffect(() => {
        const requiredGuests = Math.max(0, formData.pax_count - 1);
        if (formData.accompanying_guests.length !== requiredGuests) {
            const newArray = [...formData.accompanying_guests];
            while (newArray.length < requiredGuests) newArray.push({ name: '', address: '', age: '', gender: 'Male' });
            while (newArray.length > requiredGuests) newArray.pop();
            setFormData(prev => ({ ...prev, accompanying_guests: newArray }));
        }
    }, [formData.pax_count]);

    const roomRate = formData.room_base_rate || 0;
    const d1 = new Date(formData.check_in_date);
    const d2 = new Date(formData.check_out_date);
    const nights = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));

    const roomCharges = roomRate * nights;

    const extraPaxCount = Math.max(0, formData.pax_count - settings.free_pax_limit);
    const extraPaxCharge = extraPaxCount * settings.extra_pax_rate * nights;

    const extraBedCharge = formData.extra_beds * settings.extra_bed_rate * nights;

    const mealPlanRatePerPerson = settings.meal_plan_rates[formData.food_plan] || 0;
    const mealPlanCharge = mealPlanRatePerPerson * formData.pax_count * nights;

    const earlyCheckInCharge = formData.early_check_in ? Math.round(roomRate * EARLY_CHECKIN_SURCHARGE_PERCENT / 100) : 0;
    const discount = Number(formData.discount_amount) || 0;

    const subtotal = Math.max(0, roomCharges + extraPaxCharge + extraBedCharge + mealPlanCharge + earlyCheckInCharge - discount);
    const cgstAmount = Math.round(subtotal * settings.cgst_rate / 100);
    const sgstAmount = Math.round(subtotal * settings.sgst_rate / 100);
    const grandTotal = subtotal + cgstAmount + sgstAmount;
    const balanceDue = grandTotal - (formData.advance_payment || 0);
    const currencySymbol = settings.currency === 'INR' ? '₹' : '$';

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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

    const selectGuest = (guest: any) => {
        setFormData(prev => ({
            ...prev,
            name: guest.name || '', phone: guest.phone || '', email: guest.email || '',
            address: guest.address || '', preferences: guest.preferences || '',
            id_document_url: guest.id_image_url || '', guest_type: guest.guest_type || 'Standard',
            pin_code: guest.pin_code || '', city: guest.city || '', state: guest.state || '',
            country: guest.country || 'India', is_foreign: guest.is_foreign || false,
            passport_number: guest.passport_number || '', guide_name: guest.guide_name || '', guide_phone: guest.guide_phone || '',
            guest_id: guest.id,
            coming_from: '',
            next_destination: '',
            dob: guest.dob || '',
            age: guest.age || 0
        }));
        setHasExistingId(!!guest.id_image_url);
        setSearchTerm(guest.name);
        setShowDropdown(false);
        setSearchSelected(true);
    };

    useEffect(() => {
        if (step === 2 && availableRooms.length === 0) getAvailableRooms().then(setAvailableRooms);
    }, [step, availableRooms.length]);

    const handleRoomSelect = (room: any) => {
        setFormData(prev => ({ ...prev, room_id: room.id, room_number: room.number, room_base_rate: Number(room.base_rate) || 0 }));
    };

    const updateAccompanyingGuest = (index: number, field: string, value: string | number) => {
        const newArray = [...formData.accompanying_guests];
        newArray[index] = { ...newArray[index], [field]: value };
        setFormData({ ...formData, accompanying_guests: newArray });
    };

    const onConfirm = async () => {
        if (conflict && !isForceBooking) {
            toast.error('Please resolve the room booking conflict or check the "Still make the booking" option.');
            return;
        }
        if (formData.is_foreign && !formData.passport_number) {
            alert('Passport Number is mandatory for foreign guests.');
            return;
        }
        setLoading(true);
        try {
            const booking = await submitCheckIn({ ...formData, gst_type: isB2b ? 'B2B' : 'B2C', total_bill: grandTotal }, bookingId || undefined);
            window.open(`/print-bill/${booking.id}?type=provisional`, '_blank');
            toast.promise(sendBookingConfirmation(booking.id).then((res) => {
                if (!res.success) throw new Error(res.message || 'Unknown error');
                return res;
            }), { loading: 'Sending confirmation email...', success: 'Confirmation email sent successfully!', error: (err) => `Failed to send email: ${err.message}` });

            // Clear persistence on success
            localStorage.removeItem('pms_checkin_form');
            localStorage.removeItem('pms_checkin_step');

            router.push('/front-desk');
        } catch (error: any) {
            alert(`Check-in failed: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Check-In / Folio</h1>
                    <p className="text-sm text-slate-500 mt-1">Register guest, allocate room, and capture payment</p>
                </div>
            </div>

            {/* STEP 1: Find / Register Guest */}
            <BentoCard className={cn("p-6 transition-all duration-300", step === 1 ? 'ring-2 ring-teal-500 shadow-md' : 'opacity-70')}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className={cn("flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold", step >= 1 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500')}>1</span>
                        <h2 className="text-lg font-semibold">Guest Details</h2>
                    </div>
                    {step > 1 && <button onClick={() => setStep(1)} className="text-sm font-medium text-teal-600 hover:text-teal-700">Edit</button>}
                </div>

                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-top-2">
                        {/* Live Smart Search */}
                        <div ref={searchRef} className="relative">
                            <div className="relative">
                                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                {isSearching && <Loader2 className="absolute right-3.5 top-3.5 h-4 w-4 text-teal-500 animate-spin" />}
                                {searchSelected && !isSearching && (
                                    <button onClick={() => { setSearchTerm(''); setSearchSelected(false); setHasExistingId(false); setFormData(prev => ({ ...prev, name: '', phone: '', email: '', address: '', pin_code: '', city: '', state: '', id_document_url: '', guest_id: '' })); }} className="absolute right-3 top-3 p-0.5 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors">
                                        <X className="h-3.5 w-3.5 text-slate-600" />
                                    </button>
                                )}
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
                                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                    placeholder="Search returning guest by name or mobile..."
                                    className="w-full pl-9 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                />
                            </div>

                            {showDropdown && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                                    {searchResults.map((guest) => (
                                        <button key={guest.id} onMouseDown={(e) => e.preventDefault()} onClick={() => selectGuest(guest)} className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors border-b border-slate-100 last:border-0 flex items-center gap-3 group">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">{guest.name?.charAt(0).toUpperCase()}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-teal-700">{guest.name}</p>
                                                <p className="text-xs text-slate-500">{guest.phone}{guest.email ? ` · ${guest.email}` : ''}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Stay Dates */}
                        <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-teal-800">Check-In Date (Time Auto-Locked)</label>
                                <input type="date" value={formData.check_in_date} disabled className="w-full p-2.5 bg-slate-100 border border-teal-200 rounded-lg text-sm outline-none font-bold text-slate-500 cursor-not-allowed" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-teal-800">Check-Out Date</label>
                                <input type="date" value={formData.check_out_date} onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })} className="w-full p-2.5 bg-white border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-800" />
                            </div>
                        </div>

                        {/* Guest Profile Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1 px-1">Guest Type</label>
                                <select
                                    value={formData.guest_type}
                                    onChange={e => setFormData({ ...formData, guest_type: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium"
                                >
                                    <option value="Standard">Standard</option>
                                    <option value="VIP">VIP</option>
                                    <option value="VVIP">VVIP</option>
                                    <option value="Corporate">Corporate</option>
                                </select>
                            </div>

                            {formData.guest_type === 'Corporate' && (
                                <div className="animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1 px-1">Select Company *</label>
                                    <select
                                        required
                                        value={formData.company_id}
                                        onChange={e => {
                                            const cid = e.target.value;
                                            const company = companies.find(c => c.id === cid);
                                            setFormData(prev => ({
                                                ...prev,
                                                company_id: cid,
                                                gstin: company?.gstin || prev.gstin,
                                                // Also pre-fill city/state if the guest one is empty and company has it
                                                city: prev.city || company?.city || '',
                                                state: prev.state || company?.state || '',
                                                address: prev.address || company?.address || ''
                                            }));
                                            if (cid) {
                                                setIsB2b(true);
                                            }
                                        }}
                                        className="w-full p-2.5 bg-teal-50 border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm font-bold text-teal-900"
                                    >
                                        <option value="">-- Choose Company --</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {conflict && (
                                <div className="md:col-span-3 animate-in zoom-in-95 duration-300">
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-3">
                                        <div className="flex items-start gap-3 text-red-700">
                                            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">Booking Conflict Detected!</p>
                                                <p className="text-xs mt-1 leading-relaxed">
                                                    This room is already reserved for <span className="font-bold">{conflict.guests?.name}</span> from <span className="font-bold">{formatISTDate(conflict.check_in_date)}</span> to <span className="font-bold">{formatISTDate(conflict.check_out_date)}</span>.
                                                </p>
                                            </div>
                                        </div>

                                        <label className="flex items-center gap-3 p-3 bg-white/50 border border-red-100 rounded-xl cursor-pointer hover:bg-white/80 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={isForceBooking}
                                                onChange={e => setIsForceBooking(e.target.checked)}
                                                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                                            />
                                            <span className="text-xs font-bold text-red-900 uppercase tracking-wide">Still make the booking (I understand the overlap)</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700">Full Name *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value, guest_id: '' })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. Jane Smith" />
                            </div>
                            <div className="space-y-1 md:col-span-1">
                                <label className="text-sm font-medium text-slate-700">Mobile *</label>
                                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" placeholder="+91..." />
                            </div>
                            <div className="space-y-1 md:col-span-1">
                                <label className="text-sm font-medium text-slate-700">Email Address</label>
                                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" placeholder="For digital folio" />
                            </div>
                            <div className="space-y-1 md:col-span-1">
                                <label className="text-sm font-medium text-slate-700">Purpose</label>
                                <select value={formData.purpose_of_visit} onChange={(e) => setFormData({ ...formData, purpose_of_visit: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none">
                                    <option value="Business">Business</option><option value="Leisure">Leisure</option><option value="Transit">Transit</option>
                                </select>
                            </div>
                            <div className="space-y-1 md:col-span-1">
                                <label className="text-sm font-medium text-slate-700">Booking Source</label>
                                <select value={formData.booking_source} onChange={(e) => setFormData({ ...formData, booking_source: e.target.value, ota_booking_id: e.target.value === 'Walk-In' ? '' : formData.ota_booking_id })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-teal-800 text-sm">
                                    <option value="Walk-In">Walk-In</option><option value="OTA">OTA (Online)</option>
                                </select>
                            </div>
                            {formData.booking_source === 'OTA' && (
                                <div className="space-y-1 md:col-span-1 animate-in slide-in-from-top-2">
                                    <label className="text-sm font-medium text-slate-700">OTA Booking ID</label>
                                    <input type="text" value={formData.ota_booking_id} onChange={(e) => setFormData({ ...formData, ota_booking_id: e.target.value })} className="w-full p-3 bg-white border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-teal-900 shadow-sm text-sm" placeholder="e.g. OY12345" />
                                </div>
                            )}
                            <div className="space-y-1 md:col-span-1">
                                <label className="text-sm font-medium text-slate-700">Coming From</label>
                                <input type="text" value={formData.coming_from} onChange={(e) => setFormData({ ...formData, coming_from: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. Delhi" />
                            </div>
                            <div className="space-y-1 md:col-span-1">
                                <label className="text-sm font-medium text-slate-700">Next Destination</label>
                                <input type="text" value={formData.next_destination} onChange={(e) => setFormData({ ...formData, next_destination: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. Rishikesh" />
                            </div>
                        </div>

                        {/* Address Block */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                            <h3 className="text-sm font-bold text-slate-800">Address Details</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1 md:col-span-1">
                                    <label className="text-xs font-medium text-slate-600">Pin Code / Zip</label>
                                    <input type="text" value={formData.pin_code} onChange={e => setFormData({ ...formData, pin_code: e.target.value })} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400" placeholder="e.g. 400001" />
                                </div>
                                <div className="space-y-1 md:col-span-1">
                                    <label className="text-xs font-medium text-slate-600">City</label>
                                    <input type="text" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400" />
                                </div>
                                <div className="space-y-1 md:col-span-1">
                                    <label className="text-xs font-medium text-slate-600">State</label>
                                    <input type="text" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400" />
                                </div>
                                <div className="space-y-1 md:col-span-1">
                                    <label className="text-xs font-medium text-slate-600">Country</label>
                                    <input type="text" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400" />
                                </div>
                                <div className="space-y-1 md:col-span-4">
                                    <label className="text-xs font-medium text-slate-600">Street / Local Address</label>
                                    <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400 h-16 resize-none" placeholder="Full street details..."></textarea>
                                </div>
                            </div>
                        </div>

                        {/* Foreign Guest Toggle */}
                        <div className="p-4 rounded-xl border border-slate-200 space-y-3 bg-white">
                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="is_foreign" checked={formData.is_foreign} onChange={(e) => setFormData({ ...formData, is_foreign: e.target.checked })} className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500" />
                                <label htmlFor="is_foreign" className="font-semibold text-slate-800 cursor-pointer">International / Foreign Guest</label>
                            </div>

                            {formData.is_foreign && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-red-700">Passport Number *</label>
                                        <input type="text" value={formData.passport_number} onChange={e => setFormData({ ...formData, passport_number: e.target.value })} className="w-full p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-400 font-bold" placeholder="Mandatory" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-600">Guide Name (Optional)</label>
                                        <input type="text" value={formData.guide_name} onChange={e => setFormData({ ...formData, guide_name: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-600">Guide Phone</label>
                                        <input type="tel" value={formData.guide_phone} onChange={e => setFormData({ ...formData, guide_phone: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ID Document & Marketing */}
                        <div className="space-y-4">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                ID Document Capture
                                {formData.id_document_url && !hasExistingId && <span className="text-xs text-emerald-600 font-normal border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Uploaded successfully</span>}
                            </label>

                            {hasExistingId ? (
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0"><CheckCircle2 className="w-5 h-5" /></div>
                                        <div>
                                            <p className="font-semibold text-emerald-800 text-sm">ID Document on File</p>
                                            <p className="text-xs text-emerald-600 mt-0.5">We already have valid ID details from a previous stay.</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setHasExistingId(false); setFormData({ ...formData, id_document_url: '' }) }} className="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2">Upload New ID</button>
                                </div>
                            ) : (
                                <IdDropzone guestPhone={formData.phone} onUploadComplete={(url, dob) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        id_document_url: url,
                                        dob: dob || prev.dob,
                                        age: dob ? calculateAge(dob) : prev.age
                                    }));
                                }} />
                            )}
                        </div>

                        {/* Aadhaar / Personal Info Extra */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-teal-600" /> Date of Birth (Verified)
                                </label>
                                <input
                                    type="date"
                                    value={formData.dob}
                                    onChange={e => setFormData({ ...formData, dob: e.target.value, age: calculateAge(e.target.value) })}
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Calculated Age</label>
                                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-lg font-black text-teal-900 text-lg text-center shadow-inner">
                                    {formData.age || '—'}
                                </div>
                            </div>
                        </div>


                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!formData.name || !formData.phone || (!formData.id_document_url && !hasExistingId) || (formData.is_foreign && !formData.passport_number)}
                                className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                Proceed to Room & Stay Setup <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </BentoCard>

            {/* STEP 2: Smart Room Allocation & Enhancements */}
            <BentoCard className={cn("p-6 transition-all duration-300", step === 2 ? 'ring-2 ring-teal-500 shadow-md' : step < 2 ? 'opacity-50 pointer-events-none' : 'opacity-70')}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className={cn("flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold", step >= 2 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500')}>2</span>
                        <h2 className="text-lg font-semibold">Room & Stay Setup</h2>
                    </div>
                    {step > 2 && <button onClick={() => setStep(2)} className="text-sm font-medium text-teal-600 hover:text-teal-700">Edit</button>}
                </div>

                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-top-2">
                        {/* Redesigned Clean Single-Column Core Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                            {/* Base Setup Panel */}
                            <div className="lg:col-span-5 space-y-4">
                                <div className="p-4 bg-slate-900 text-white rounded-xl shadow-md flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg">{formData.name || 'New Guest'}</h3>
                                        <p className="text-xs text-teal-300 font-semibold">{formData.guest_type} • {nights} Night{nights > 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="h-10 w-10 bg-teal-500/20 rounded-full flex items-center justify-center">
                                        <Users className="w-5 h-5 text-teal-300" />
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase">Food Plan</label>
                                            <select value={formData.food_plan} onChange={e => setFormData({ ...formData, food_plan: e.target.value })} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-teal-500 outline-none">
                                                <option value="EP">EP (Room Only)</option>
                                                <option value="CP">CP (Breakfast)</option>
                                                <option value="MAP">MAP (Half Board)</option>
                                                <option value="AP">AP (Full Board)</option>
                                                <option value="AI">AI (All Inclusive)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase">Total PAX</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="10"
                                                value={formData.pax_count === 0 ? '' : formData.pax_count}
                                                onChange={e => setFormData({ ...formData, pax_count: e.target.value === '' ? 0 : Number(e.target.value) })}
                                                onFocus={(e) => e.target.select()}
                                                placeholder="1"
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase">Extra Beds</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.extra_beds === 0 ? '' : formData.extra_beds}
                                                onChange={e => setFormData({ ...formData, extra_beds: e.target.value === '' ? 0 : Number(e.target.value) })}
                                                onFocus={(e) => e.target.select()}
                                                placeholder="0"
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase">Discount ({currencySymbol})</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.discount_amount === 0 ? '' : formData.discount_amount}
                                                onChange={e => setFormData({ ...formData, discount_amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                                                onFocus={(e) => e.target.select()}
                                                placeholder="0.00"
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none text-red-600 font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 mt-2">
                                        <input type="checkbox" id="early_check_in_badge" checked={formData.early_check_in} onChange={(e) => setFormData({ ...formData, early_check_in: e.target.checked })} className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer" />
                                        <label htmlFor="early_check_in_badge" className="text-sm font-semibold text-slate-700 cursor-pointer">Early Check-in (+{EARLY_CHECKIN_SURCHARGE_PERCENT}%)</label>
                                    </div>
                                </div>
                            </div>

                            {/* Variable Room & Guest Panel */}
                            <div className="lg:col-span-7 space-y-4">
                                {/* Only show the interactive Room Grid if initialRoom is NOT passed */}
                                {!initialRoom ? (
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><BedDouble className="w-4 h-4" /> Room Selection</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {availableRooms.map(room => (
                                                <div key={room.id} onClick={() => handleRoomSelect(room)} className={cn("border-2 border-dashed rounded-xl p-3 flex flex-col justify-center items-center gap-1 transition-all cursor-pointer", formData.room_id === room.id ? "border-teal-500 bg-teal-50 text-teal-600 shadow-sm" : "border-slate-300 bg-white text-slate-500 hover:border-teal-400")}>
                                                    <span className="text-xl font-bold">{room.number}</span>
                                                    <span className="text-[10px] font-semibold uppercase">{room.type}</span>
                                                    <span className="text-xs font-bold mt-0.5 text-slate-700">{currencySymbol}{Number(room.base_rate).toLocaleString()}</span>
                                                </div>
                                            ))}
                                            {availableRooms.length === 0 && <div className="col-span-full py-4 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white">No rooms available.</div>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold shadow-sm">
                                                {formData.room_number}
                                            </div>
                                            <div>
                                                <p className="font-bold text-teal-900 text-sm">Room Successfully Locked</p>
                                                <p className="text-xs font-medium text-teal-700">From Front-Desk Grid Selection</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold bg-white px-3 py-1 rounded-full text-teal-800 border border-teal-200 shadow-sm">
                                            {currencySymbol}{formData.room_base_rate.toLocaleString()} / night
                                        </span>
                                    </div>
                                )}

                                {/* Dynamic Accompanying Guests */}
                                {formData.accompanying_guests.length > 0 && (
                                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-4 animate-in fade-in">
                                        <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2"><Users className="w-4 h-4" /> Accompanying Guests ({formData.accompanying_guests.length})</h3>
                                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                            {formData.accompanying_guests.map((g, idx) => (
                                                <div key={idx} className="p-3 bg-white border border-indigo-200 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 relative">
                                                    <div className="md:col-span-4 space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Name</label>
                                                        <input type="text" value={g.name} onChange={e => updateAccompanyingGuest(idx, 'name', e.target.value)} className="w-full p-2 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-400 bg-slate-50" placeholder={`Guest ${idx + 2}`} />
                                                    </div>
                                                    <div className="md:col-span-2 space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Age</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={g.age === 0 ? '' : g.age}
                                                            onChange={e => updateAccompanyingGuest(idx, 'age', e.target.value === '' ? 0 : Number(e.target.value))}
                                                            onFocus={(e) => e.target.select()}
                                                            placeholder="0"
                                                            className="w-full p-2 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-400 bg-slate-50"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-3 space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Gender</label>
                                                        <select value={g.gender} onChange={e => updateAccompanyingGuest(idx, 'gender', e.target.value)} className="w-full p-2 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-400 bg-slate-50">
                                                            <option>Male</option><option>Female</option><option>Other</option>
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-3 space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Add / ID</label>
                                                        <input type="text" value={g.address} onChange={e => updateAccompanyingGuest(idx, 'address', e.target.value)} className="w-full p-2 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-400 bg-slate-50" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
                            <button onClick={() => setStep(3)} disabled={!formData.room_id} className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                                Proceed to Payment <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </BentoCard>

            {/* STEP 3: Payment, Price Breakdown & Signature */}
            <BentoCard className={cn("p-6 transition-all duration-300", step === 3 ? 'ring-2 ring-teal-500 shadow-md' : step < 3 ? 'opacity-50 pointer-events-none' : 'opacity-70')}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className={cn("flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold", step >= 3 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500')}>3</span>
                        <h2 className="text-lg font-semibold">Payment & Billing</h2>
                    </div>
                </div>

                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-5">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-teal-600" /> Price Breakdown</h3>

                                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="p-4 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Room {formData.room_number} ({currencySymbol}{roomRate.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''})</span>
                                            <span className="font-medium text-slate-800">{currencySymbol}{roomCharges.toLocaleString()}</span>
                                        </div>
                                        {extraPaxCharge > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Extra Pax ({extraPaxCount} pax × {currencySymbol}{settings.extra_pax_rate} × {nights} nt)</span>
                                                <span className="font-medium text-slate-800">{currencySymbol}{extraPaxCharge.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {extraBedCharge > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Extra Bed ({formData.extra_beds} bed × {currencySymbol}{settings.extra_bed_rate} × {nights} nt)</span>
                                                <span className="font-medium text-slate-800">{currencySymbol}{extraBedCharge.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {mealPlanCharge > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Dining Plan: {formData.food_plan} ({formData.pax_count} pax × {currencySymbol}{mealPlanRatePerPerson} × {nights} nt)</span>
                                                <span className="font-medium text-slate-800">{currencySymbol}{mealPlanCharge.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {formData.early_check_in && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-amber-600">Early Check-in Surcharge</span>
                                                <span className="font-medium text-amber-700">+{currencySymbol}{earlyCheckInCharge.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {discount > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-emerald-600 font-bold">Special Discount Applied</span>
                                                <span className="font-bold text-emerald-700">-{currencySymbol}{discount.toLocaleString()}</span>
                                            </div>
                                        )}

                                        <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-semibold">
                                            <span className="text-slate-700">Subtotal</span>
                                            <span className="text-slate-800">{currencySymbol}{subtotal.toLocaleString()}</span>
                                        </div>

                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">CGST ({settings.cgst_rate}%)</span>
                                            <span className="text-slate-600">{currencySymbol}{cgstAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">SGST ({settings.sgst_rate}%)</span>
                                            <span className="text-slate-600">{currencySymbol}{sgstAmount.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                                        <span className="font-bold text-lg">Grand Total</span>
                                        <span className="font-bold text-2xl text-teal-400">{currencySymbol}{grandTotal.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <h3 className="font-semibold text-slate-800">Advance Deposit</h3>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">Amount Received ({currencySymbol})</label>
                                        <input
                                            type="number"
                                            value={formData.advance_payment === 0 ? '' : formData.advance_payment}
                                            onChange={(e) => setFormData({ ...formData, advance_payment: e.target.value === '' ? 0 : Number(e.target.value) })}
                                            onFocus={(e) => e.target.select()}
                                            placeholder="0.00"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">Payment Mode</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['Cash', 'Card', 'Online'].map(m => (
                                                <button key={m} onClick={() => setFormData({ ...formData, advance_payment_mode: m })} className={cn("p-2 border rounded-lg text-sm transition-colors", formData.advance_payment_mode === m ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>{m}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={cn("p-3 rounded-xl flex justify-between items-center", balanceDue > 0 ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200")}>
                                        <span className={cn("text-sm font-semibold", balanceDue > 0 ? "text-red-700" : "text-green-700")}>
                                            {balanceDue > 0 ? 'Balance Due' : 'Fully Paid'}
                                        </span>
                                        <span className={cn("font-bold text-lg", balanceDue > 0 ? "text-red-600" : "text-green-600")}>
                                            {currencySymbol}{Math.abs(balanceDue).toLocaleString()}
                                            {balanceDue < 0 && ' (Overpaid)'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-slate-800">GST Billing Type</h3>
                                        <div className="flex bg-slate-100 p-1 rounded-lg">
                                            <button
                                                disabled={formData.guest_type === 'Corporate'}
                                                onClick={() => setIsB2b(false)}
                                                className={cn(
                                                    "px-3 py-1 text-sm font-medium rounded-md transition-all",
                                                    !isB2b ? 'bg-white shadow' : 'text-slate-500 hover:text-slate-900',
                                                    formData.guest_type === 'Corporate' && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                B2C Regular
                                            </button>
                                            <button
                                                onClick={() => setIsB2b(true)}
                                                className={cn(
                                                    "px-3 py-1 text-sm font-medium rounded-md transition-all",
                                                    isB2b ? 'bg-white shadow' : 'text-slate-500 hover:text-slate-900'
                                                )}
                                            >
                                                B2B Corporate
                                            </button>
                                        </div>
                                    </div>
                                    {isB2b && (
                                        <div className="space-y-1 animate-in slide-in-from-top-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">GSTIN</label>
                                            <input
                                                type="text"
                                                value={formData.gstin}
                                                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none uppercase font-mono font-bold"
                                                placeholder="Enter GSTIN"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    <h3 className="font-semibold text-slate-800">Guest Digital Signature</h3>
                                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm relative">
                                        <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{ className: 'w-full h-[200px] cursor-crosshair touch-none' }} />
                                        <button onClick={() => sigPad.current?.clear()} className="absolute top-2 right-2 text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600 hover:bg-slate-200">Clear</button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 text-center">I agree to the Hotel Terms of Stay & Cancellation Policy.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-slate-100 mt-6 gap-3">
                            <button onClick={() => router.back()} className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                            <button onClick={onConfirm} disabled={loading} className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/30 flex items-center gap-2 text-lg disabled:opacity-50">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                Confirm Check-in ({currencySymbol}{grandTotal.toLocaleString()})
                            </button>
                        </div>
                    </div>
                )}
            </BentoCard>
        </div>
    );
}

export default function CheckInPage() {
    return (
        <Suspense fallback={<div className="flex h-[400px] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>}>
            <CheckInForm />
        </Suspense>
    );
}
