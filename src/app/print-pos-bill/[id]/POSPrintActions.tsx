'use client';

import { Printer, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function POSPrintActions() {
    const router = useRouter();

    return (
        <div className="w-[80mm] mb-4 flex justify-end gap-2 print:hidden relative z-50">
            <button
                onClick={() => {
                    if (window.history.length > 1) {
                        router.back();
                    } else {
                        window.close();
                    }
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold text-xs shadow-md hover:bg-slate-300 transition-all flex items-center gap-2"
            >
                <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs shadow-lg hover:bg-black transition-all flex items-center gap-2"
            >
                <Printer className="w-4 h-4" /> Print Thermal Bill
            </button>
        </div>
    );
}
