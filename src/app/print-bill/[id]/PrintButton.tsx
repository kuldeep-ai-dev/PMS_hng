'use client';

import { useEffect, useState } from 'react';
import { Printer, ChevronLeft, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrintButton({
    bookingId,
    isProvisional = false,
    view = 'unified',
    documentType = 'invoice'
}: {
    bookingId?: string,
    isProvisional?: boolean,
    view?: 'unified' | 'room' | 'food',
    documentType?: 'invoice' | 'grc'
}) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Slight delay to ensure fonts and styles are fully loaded before print dialog opens
        const timer = setTimeout(() => {
            window.print();
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    if (!mounted) return null;

    return (
        <div className="flex gap-2">
            <button
                onClick={() => {
                    if (window.history.length > 1) {
                        router.back();
                    } else {
                        window.close();
                    }
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium flex items-center gap-2"
            >
                <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold flex items-center gap-2 shadow-md"
            >
                <Printer className="w-4 h-4" /> Native Print
            </button>
            <button
                onClick={() => {
                    const endpoint = documentType === 'grc' ? '/api/download-grc' : '/api/download-invoice';
                    window.open(`${endpoint}?id=${bookingId}&type=${isProvisional ? 'provisional' : 'final'}&view=${view}`, '_blank');
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold flex items-center gap-2 shadow-md"
            >
                <ShieldCheck className="w-4 h-4" /> Download e-Signed PDF
            </button>
        </div>
    );
}
