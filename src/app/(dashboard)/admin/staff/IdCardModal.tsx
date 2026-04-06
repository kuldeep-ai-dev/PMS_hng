'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import Barcode from 'react-barcode';

export default function IdCardModal({
    staff,
    settings,
    trigger
}: {
    staff: any;
    settings: any;
    trigger: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // Convert UUID to a deterministic 10 digit number for the barcode
    const generateNumericId = (uuid: string) => {
        if (!uuid) return '0000000000';
        let hash = 0;
        for (let i = 0; i < uuid.length; i++) {
            const char = uuid.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString().padStart(10, '0').slice(0, 10);
    };

    const staffIdNumber = generateNumericId(staff.id);
    const joinDate = staff.created_at ? format(new Date(staff.created_at), 'MM/dd/yyyy') : 'N/A';

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 300);
    };

    return (
        <>
            <div onClick={() => setIsOpen(true)} className="cursor-pointer hover:opacity-80 transition-opacity w-fit inline-block">
                {trigger}
            </div>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm w-screen h-screen mt-0 print:bg-white print:p-0"
                    style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}
                >

                    {/* Only show modal controls when NOT printing */}
                    <div className="absolute top-6 right-6 flex gap-3 print:hidden">
                        <button
                            onClick={handlePrint}
                            disabled={isPrinting}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-colors font-medium"
                        >
                            {isPrinting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                            Print ID Cards
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* ID Card Container - A4 Paper layout for print, centered for screen */}
                    <div className="flex flex-col md:flex-row gap-8 items-center justify-center print:flex-row print:gap-4 print:items-start">

                        {/* FRONT OF CARD */}
                        <div className="relative w-[300px] h-[480px] bg-[#fdfbf7] rounded-xl shadow-2xl overflow-hidden print:shadow-none print:border print:border-slate-200">

                            {/* Top Red Header Curve */}
                            <div className="absolute top-0 left-0 right-0 h-[140px] bg-[#8B0000]" style={{ borderBottomLeftRadius: '50% 20%', borderBottomRightRadius: '10% 20%' }}>
                                <div className="flex items-center justify-center gap-2 pt-6 px-4">
                                    {settings.logo_url ? (
                                        <img src={settings.logo_url} alt="Logo" className="w-8 h-8 object-contain brightness-0 invert" />
                                    ) : (
                                        <div className="w-8 h-8 flex flex-col justify-center items-center gap-0.5 border-2 border-white rounded p-1">
                                            <div className="w-full h-1 bg-white" />
                                            <div className="w-full h-2 bg-white" />
                                        </div>
                                    )}
                                    <div className="text-white">
                                        <h3 className="font-bold text-sm leading-tight tracking-tight">{settings.hotel_name || 'My Hotel'}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Profile Circular Image */}
                            <div className="absolute top-[80px] left-1/2 -translate-x-1/2 z-10 w-36 h-36 rounded-full border-[5px] border-white bg-white overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] object-cover">
                                <img
                                    src={staff.photo_url || "https://api.dicebear.com/7.x/initials/svg?seed=" + staff.name}
                                    alt={staff.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Name and Designation */}
                            <div className="absolute top-[230px] w-full text-center px-4 pt-4">
                                <h1 className="text-2xl font-black text-[#8B0000] uppercase tracking-wider">{staff.name}</h1>
                                <p className="text-xs font-bold tracking-[0.2em] text-slate-500 mt-1 uppercase">{staff.role?.replace(/_/g, ' ')}</p>
                            </div>

                            {/* Barcode Footer Section */}
                            <div className="absolute bottom-[50px] w-full flex flex-col items-center">
                                <div className="scale-75 origin-top opacity-90">
                                    <Barcode value={staffIdNumber} height={40} width={2} fontSize={14} displayValue={false} margin={0} background="transparent" />
                                </div>
                                <p className="text-xs font-mono text-slate-800 tracking-widest font-bold">ID {staffIdNumber}</p>
                            </div>

                            {/* Bottom Red Waves */}
                            <div className="absolute bottom-[-10px] left-[-10%] right-[-10%] h-[40px] bg-[#cc0000]" style={{ borderTopLeftRadius: '50% 100%', borderTopRightRadius: '50% 100%' }} />
                            <div className="absolute bottom-[-20px] left-[-10%] right-[-10%] h-[40px] bg-[#8B0000]" style={{ borderTopLeftRadius: '40% 100%', borderTopRightRadius: '60% 100%' }} />
                        </div>

                        {/* BACK OF CARD */}
                        <div className="relative w-[300px] h-[480px] bg-[#fdfbf7] rounded-xl shadow-2xl overflow-hidden print:shadow-none print:border print:border-slate-200">

                            {/* Top Red Waves */}
                            <div className="absolute top-[-10px] left-[-10%] right-[-10%] h-[60px] bg-[#8B0000]" style={{ borderBottomLeftRadius: '50% 100%', borderBottomRightRadius: '50% 100%' }} />
                            <div className="absolute top-[20px] left-[-10%] right-[-10%] h-[30px] bg-[#cc0000]" style={{ borderBottomLeftRadius: '60% 100%', borderBottomRightRadius: '40% 100%' }} />

                            {/* Hotel Logo/Name Stacked */}
                            <div className="mt-20 flex flex-col items-center justify-center gap-2 px-4">
                                {settings.logo_url ? (
                                    <img src={settings.logo_url} alt="Logo" className="w-12 h-12 object-contain" />
                                ) : (
                                    <div className="w-10 h-10 flex flex-col justify-center items-center gap-0.5 border-2 border-[#8B0000] rounded p-1">
                                        <div className="w-full h-1 bg-[#8B0000]" />
                                        <div className="w-full h-2 bg-[#8B0000]" />
                                    </div>
                                )}
                                <div className="text-slate-900 text-center">
                                    <h3 className="font-black text-lg leading-tight tracking-tight">{settings.hotel_name || 'My Hotel'}</h3>
                                </div>
                            </div>

                            {/* Contact Details List */}
                            <div className="px-10 mt-10 space-y-5">
                                <div className="flex items-start gap-4">
                                    <div className="mt-0.5 w-6 h-6 flex items-center justify-center bg-[#cc0000] rounded-full text-white shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 leading-none mb-1">Phone</p>
                                        <p className="text-[10px] text-slate-600 font-medium">{staff.phone || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="mt-0.5 w-6 h-6 flex items-center justify-center bg-[#cc0000] rounded-full text-white shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" /><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 leading-none mb-1">Email</p>
                                        <p className="text-[10px] text-slate-600 font-medium">{staff.email || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="mt-0.5 w-6 h-6 flex items-center justify-center bg-[#cc0000] rounded-full text-white shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 leading-none mb-1">Address</p>
                                        <p className="text-[10px] text-slate-600 font-medium leading-tight">{staff.address || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Joining Date Block */}
                            <div className="mt-12 text-center text-xs ml-10 flex flex-col items-start gap-1">
                                <p className="font-bold text-slate-800"><span className="inline-block w-12 text-left">Join</span> : {joinDate}</p>
                            </div>

                            {/* Bottom Red Waves */}
                            <div className="absolute bottom-[-10px] left-[-10%] right-[-10%] h-[60px] bg-[#8B0000]" style={{ borderTopLeftRadius: '50% 100%', borderTopRightRadius: '50% 100%' }} />
                            <div className="absolute bottom-[-30px] left-[-10%] right-[-10%] h-[50px] bg-[#cc0000]" style={{ borderTopLeftRadius: '60% 100%', borderTopRightRadius: '40% 100%' }} />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
