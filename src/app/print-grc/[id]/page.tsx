import { createClient } from '@/utils/supabase/server';
import { getSettings } from '@/app/(dashboard)/settings/actions';
import { notFound } from 'next/navigation';
import PrintButton from '@/app/print-bill/[id]/PrintButton';
import { cn } from '@/lib/utils';
import { generateInvoiceNo } from '@/utils/billing';

export default async function PrintGRCPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: bookingId } = await params;
    const supabase = await createClient();
    const settings = await getSettings();

    const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, guests (*), rooms (*), companies (*), payments (*)')
        .eq('id', bookingId)
        .single();

    if (error || !booking) return notFound();

    const guest = booking.guests || {};
    const room = booking.rooms || {};
    const isForeign = guest.is_foreign === true;

    const allPayments = booking.payments || [];
    const totalPayments = allPayments.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);
    const advancePaid = Number(booking.advance_payment || 0);
    const totalPaid = advancePaid + totalPayments;
    const invoiceNumber = booking.invoice_number || generateInvoiceNo(bookingId, booking.check_in_date);
    const bookingRef = booking.id.slice(0, 8).toUpperCase();

    return (
        <div className="min-h-screen bg-white p-0 sm:p-12 print:p-0 font-serif text-slate-950 selection:bg-teal-100 italic-text-slate-500">
            {/* Control Bar */}
            <div className="max-w-[850px] mx-auto mb-10 flex justify-between items-center print:hidden bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/50">
                <div className="flex flex-col font-sans">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-600 mb-1">Official Document</span>
                    <h1 className="text-sm font-bold text-slate-800">Premium GRC Preview</h1>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-tighter">Archived ID: {booking.id.slice(0, 8)}</p>
                </div>
                <PrintButton bookingId={bookingId} documentType="grc" />
            </div>

            {/* GRC Document Container */}
            <div className="max-w-[850px] mx-auto bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] print:border-0 print:shadow-none p-6 flex flex-col relative overflow-hidden">

                {/* Decorative Pattern Background (CSS) */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none grc-pattern" />

                {/* Header Section */}
                <div className="grid grid-cols-3 items-start mb-4 relative z-10">
                    <div className="space-y-1.5 text-[11px] font-sans">
                        <p className="flex items-center gap-2">
                            <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">GR Card No.</span>
                            <span className="border-b border-slate-300 font-bold text-slate-900 min-w-[120px] pb-0.5 tracking-tight">GRC-{bookingId.slice(-8).toUpperCase()}</span>
                        </p>
                        <p className="flex items-center gap-2">
                            <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Bill Ref.</span>
                            <span className="border-b border-slate-300 font-bold text-slate-900 min-w-[120px] pb-0.5 tracking-tight">{bookingRef}</span>
                        </p>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                        <div className="relative mb-2">
                            {settings.logo_url ? (
                                <img src={settings.logo_url} alt="Hotel Logo" className="h-16 w-auto object-contain relative z-10" />
                            ) : (
                                <div className="h-16 w-32 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-[9px] uppercase font-black tracking-widest border border-dashed border-slate-200">No Logo</div>
                            )}
                            <div className="absolute -inset-4 bg-teal-500/5 blur-3xl rounded-full" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tighter text-center uppercase text-slate-900 leading-none mb-1">{settings.hotel_name}</h2>
                        <div className="flex items-center gap-3 w-full justify-center">
                            <span className="h-px flex-1 bg-slate-200" />
                            <p className="text-[9px] font-black text-teal-600 uppercase tracking-[0.4em] whitespace-nowrap">Excellence in Hospitality</p>
                            <span className="h-px flex-1 bg-slate-200" />
                        </div>
                    </div>

                    <div className="text-[10px] font-sans text-right space-y-1.5 leading-tight text-slate-900">
                        <p className="font-black text-slate-900 uppercase tracking-wider text-[9px]">GSTIN: <span className="underline underline-offset-2">{settings.gstin?.toUpperCase() || 'GUEST-B2C'}</span></p>
                        <p className="max-w-[200px] ml-auto font-bold">{settings.address}</p>
                        <div className="flex flex-col items-end pt-1 gap-0.5 font-bold">
                            <p className="underline underline-offset-4">{settings.website || 'www.hotelnewganga.in'}</p>
                            <p>{settings.phone}</p>
                            <p className="text-[9px] font-bold text-slate-500">{settings.booking_email || 'booking@hotelnewganga.in'}</p>
                        </div>
                    </div>
                </div>

                <div className="text-center mb-6 relative">
                    <div className="text-center mb-2 relative z-10 flex items-center justify-center gap-4">
                        <span className="text-4xl font-black opacity-[0.03] tracking-[1em] text-slate-900 uppercase pointer-events-none">REGISTRATION</span>
                    </div>
                    <h1 className="text-xl font-black tracking-[0.25em] uppercase text-slate-900 relative z-10">Guest Registration Card</h1>
                    <div className="h-1 w-12 bg-teal-500 mx-auto mt-2 rounded-full" />
                </div>

                {/* Primary Guest Info Grid */}
                <div className="space-y-2 text-xs font-serif relative z-10">
                    <div className="grid grid-cols-1">
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-500 mb-0.5">Full Name</span>
                            <span className="border-b-2 border-slate-950 flex-1 uppercase font-black text-base tracking-tight pb-0.5">{guest.name}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Contact No</span>
                            <span className="border-b border-slate-200 flex-1 font-bold text-slate-800 pb-0.5">{guest.phone}</span>
                        </p>
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Mobile</span>
                            <span className="border-b border-slate-200 flex-1 font-bold text-slate-800 pb-0.5">{guest.phone}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-1">
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Residential Address</span>
                            <span className="border-b border-slate-200 flex-1 italic text-slate-600 pb-0.5">{guest.address || '__________________________________________________________________________________________'}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">City</span>
                            <span className="border-b border-slate-200 flex-1 uppercase font-bold text-slate-800 pb-0.5">{guest.city || '_________________'}</span>
                        </p>
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Country</span>
                            <span className="border-b border-slate-200 flex-1 uppercase font-bold text-slate-800 pb-0.5">{guest.country || 'India'}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-1">
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Identity Reference</span>
                            <span className="border-b border-slate-200 flex-1 uppercase font-bold text-teal-700 pb-0.5">{guest.passport_number ? 'Passport: ' + guest.passport_number : 'ID Type: Aadhar / Government ID'}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Arrival Date / Time</span>
                            <span className="border-b border-slate-200 flex-1 font-bold text-slate-800 pb-0.5">{new Date(booking.check_in_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </p>
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Departure Date / Time</span>
                            <span className="border-b border-slate-200 flex-1 font-bold text-slate-800 pb-0.5">{new Date(booking.check_out_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Coming From</span>
                            <span className="border-b border-slate-200 flex-1 italic text-slate-600 pb-0.5">{booking.coming_from || '_________________'}</span>
                        </p>
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Next Destination</span>
                            <span className="border-b border-slate-200 flex-1 italic text-slate-600 pb-0.5">{booking.next_destination || '_________________'}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Nationality</span>
                            <span className="border-b border-slate-200 flex-1 uppercase font-bold text-slate-800 pb-0.5">{guest.country || 'Indian'}</span>
                        </p>
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Purpose of Visit</span>
                            <span className="border-b border-slate-200 flex-1 italic text-slate-600 pb-0.5">{booking.purpose_of_visit || 'Leisure'}</span>
                        </p>
                    </div>
                </div>

                {/* Management Terms & Conditions Area */}
                <div className="mt-4 border-2 border-slate-950/20 rounded-lg p-3 relative bg-slate-50/50">
                    <div className="flex justify-between items-center mb-1.5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Management Terms & Conditions</div>
                        <div className="text-[9px] font-bold text-slate-600 italic">Check-in: {settings.check_in_time || '12:00 PM'} | Check-out: {settings.check_out_time || '11:00 AM'}</div>
                    </div>
                    <p className="text-[8px] leading-snug text-slate-700 text-justify font-medium">
                        The Management will not be held responsible for the Loss / Theft of any valuable / Cash. All valuables should be deposited with the Front Office Cashier. Early Check-in or Late Check-out will be subject to availability and charged as per the Hotel policy.
                    </p>
                    <div className="mt-2 text-[10px] font-serif font-bold text-right italic text-slate-400">
                        Guest Signature _________________________
                    </div>
                </div>

                {/* Secondary Info Section */}
                <div className="mt-3 space-y-4 text-xs font-serif">
                    <div className="grid grid-cols-2 gap-4">
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Date of Birth / Age</span>
                            <span className="border-b border-slate-200 flex-1 italic text-slate-800 pb-0.5">
                                {guest.dob ? new Date(guest.dob).toLocaleDateString('en-IN') : '_________________'}
                                {guest.age ? ` (${guest.age} Years)` : ''}
                            </span>
                        </p>
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Email</span>
                            <span className="border-b border-slate-200 flex-1 lowercase text-slate-600 pb-0.5 whitespace-nowrap">{guest.email || '_________________'}</span>
                        </p>
                    </div>
                </div>

                {/* Passport Details Table (Foreigners Only) */}
                {isForeign && (
                    <div className="mt-3 animate-in fade-in duration-500">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-600 mb-1 ml-1">Registration for Foreigners (Form C)</h3>
                        <table className="w-full border-collapse border border-slate-400 text-[10px] font-sans">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="border border-slate-400 p-1 text-left font-black uppercase w-[20%] text-slate-500">Passport Entry</th>
                                    <th className="border border-slate-400 p-1 text-center font-black uppercase w-[25%] text-slate-900 italic">Number</th>
                                    <th className="border border-slate-400 p-1 text-center font-black uppercase w-[25%] text-slate-900">Place of Issue</th>
                                    <th className="border border-slate-400 p-1 text-center font-black uppercase w-[30%] text-slate-900">Date of Issue</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="h-8 bg-white">
                                    <td className="border border-slate-400 bg-slate-50"></td>
                                    <td className="border border-slate-400 text-center font-black text-sm tracking-widest">{guest.passport_number || ''}</td>
                                    <td className="border border-slate-400"></td>
                                    <td className="border border-slate-400"></td>
                                </tr>
                                <tr className="h-6 bg-white">
                                    <td className="border border-slate-400" colSpan={2}></td>
                                    <td className="border border-slate-400 text-center font-bold" colSpan={2}>{booking.nights || '____'} Nights</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Logistics */}
                <div className="mt-2 space-y-2 text-xs font-serif opacity-80">
                    <div className="grid grid-cols-3 gap-6">
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Mode of Transport</span>
                            <span className="border-b border-slate-200 flex-1 italic text-slate-600 pb-0.5">_________</span>
                        </p>
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Vehicle No.</span>
                            <span className="border-b border-slate-200 flex-1 italic text-slate-600 pb-0.5">_________</span>
                        </p>
                        <p className="flex items-end gap-3">
                            <span className="font-sans font-black uppercase tracking-widest text-[9px] text-slate-400 mb-0.5">Driver Name</span>
                            <span className="border-b border-slate-200 flex-1 italic text-slate-600 pb-0.5">_________</span>
                        </p>
                    </div>
                </div>

                {/* Settlement Method */}
                <div className="mt-3 flex flex-wrap gap-x-10 gap-y-3 text-[10px] font-sans font-black items-center py-4 border-y border-slate-100 bg-slate-50/30">
                    <span className="uppercase tracking-widest text-slate-500">Settlement Preference:</span>
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-slate-300 bg-white rounded-md flex items-center justify-center">
                        </div> <span>CASH</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-slate-300 bg-white rounded-md flex items-center justify-center">
                        </div> <span>UPI/ONLINE</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-slate-300 bg-white rounded-md flex items-center justify-center">
                        </div> <span>CARD</span>
                    </div>
                </div>

                {/* Room and Advance Table */}
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                    <table className="w-full border-collapse text-[11px] font-sans">
                        <thead>
                            <tr className="bg-white border-b-2 border-slate-900 text-slate-900">
                                <th className="p-2 text-left font-black uppercase tracking-widest">Allocation</th>
                                <th className="p-2 text-center font-black uppercase tracking-widest">Rate</th>
                                <th className="p-2 text-center font-black uppercase tracking-widest">PAX</th>
                                <th className="p-2 text-center font-black uppercase tracking-widest">Ext.</th>
                                <th className="p-2 text-left font-black uppercase tracking-widest" colSpan={2}>Financial Footprint</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="h-8 text-center text-sm bg-white">
                                <td className="p-2 text-left font-black border-r border-slate-200">
                                    <p className="text-xl">#{room.number}</p>
                                    <p className="text-[9px] uppercase text-slate-400 tracking-tighter">{room.type}</p>
                                </td>
                                <td className="p-2 font-black text-slate-900 border-r border-slate-200">
                                    {settings.currency_symbol || '₹'}{Number(room.base_rate).toLocaleString()}
                                </td>
                                <td className="p-2 font-bold text-slate-700 border-r border-slate-200">{booking.pax_count || 1}</td>
                                <td className="p-2 font-bold text-slate-700 border-r border-slate-200">{booking.extra_beds || '—'}</td>
                                <td className="p-2 text-left bg-slate-50" colSpan={2}>
                                    <div className="space-y-1.5 font-bold text-[10px]">
                                        <p className="flex justify-between"><span>Payment Settled:</span> <span className="text-emerald-700 bg-emerald-50 px-1 rounded">{settings.currency_symbol || '₹'}{totalPaid.toLocaleString()}</span></p>
                                        <p className="flex justify-between text-slate-500"><span>Invoice ID:</span> <span className="font-bold text-slate-900 ml-2 tracking-tight uppercase">{invoiceNumber}</span></p>
                                    </div>
                                </td>
                            </tr>
                            <tr className="bg-white border-t-2 border-slate-900">
                                <td className="p-2 text-left font-black uppercase" colSpan={4}>
                                    <div className="flex items-center gap-4">
                                        <span className="text-slate-400 text-[9px] tracking-widest">Master Invoice No:</span>
                                        <span className="font-black text-lg text-slate-950 tracking-tighter uppercase">{invoiceNumber}</span>
                                    </div>
                                </td>
                                <td className="p-2 text-right font-black uppercase" colSpan={2}>
                                    <div className="flex items-center justify-end gap-2 text-slate-500">
                                        <span>Issued:</span>
                                        <span className="text-slate-900">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer Section - Unified Professional Layout */}
                <footer className="mt-auto pt-8 border-slate-900 px-4 font-sans uppercase relative z-10 grid grid-cols-3 items-end gap-12 overflow-visible">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-full border-b-2 border-slate-300 border-dashed h-8 mb-3"></div>
                        <p className="text-[10px] font-black tracking-[0.2em] text-slate-900 pt-3 w-full">Receptionist Signature</p>
                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase opacity-60">Verification Required</p>
                    </div>

                    <div className="flex flex-col items-center group pb-1">
                        {/* Visual Digital Signature Stamp */}
                        {settings.digital_signature_pfx_base64 && (
                            <div className="print-exact flex items-center gap-2 px-3 py-1.5 border-2 border-green-600 rounded-lg bg-green-50 mb-2 scale-90" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                <div className="text-green-600">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="text-[10px] font-black text-green-800 leading-none mb-0.5">Signature Valid</span>
                                    <span className="text-[6px] font-medium text-green-700 leading-tight uppercase tracking-widest whitespace-nowrap">Digitally signed by administrator<br />Reference: {invoiceNumber}</span>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="h-px w-6 bg-slate-900" />
                            <span className="text-[9px] font-black tracking-[0.3em] text-slate-950 whitespace-nowrap">Geny PMS Pro</span>
                            <div className="h-px w-6 bg-slate-900" />
                        </div>
                        <p className="text-[7px] font-black text-slate-950 tracking-widest uppercase">Secured Enterprise Log</p>
                    </div>

                    <div className="flex flex-col items-center text-center">
                        <div className="w-full h-8 mb-3 flex items-end justify-center">
                            {settings.signature_url ? (
                                <img src={settings.signature_url} alt="Authorized Signature" style={{ height: '35px', width: 'auto', objectFit: 'contain', display: 'block' }} />
                            ) : (
                                <div className="w-full border-b-2 border-slate-300 border-dashed flex-1"></div>
                            )}
                        </div>
                        <p className="text-[10px] font-black tracking-[0.2em] text-slate-900 pt-3 w-full">Manager Signature</p>
                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase opacity-60">Authorized Official Only</p>
                    </div>
                </footer>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-hidden { display: none !important; }
                    @page { margin: 12mm; size: A4; }
                    .grc-paper { border: 0 !important; box-shadow: none !important; }
                }
                .font-serif { font-family: 'Times New Roman', Times, serif; }
                .font-sans { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; }
                .grc-pattern {
                    background-image: radial-gradient(#cbd5e1 0.5px, transparent 0.5px);
                    background-size: 20px 20px;
                }
            ` }} />
        </div>
    );
}
