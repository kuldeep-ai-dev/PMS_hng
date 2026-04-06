'use client';

import dynamic from 'next/dynamic';

const PremiumQRMenu = dynamic(() => import('./PremiumQRMenu'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-slate-800 border-t-white rounded-full animate-spin"></div>
        </div>
    )
});

export default function QRMenuWrapper({ type, id }: { type: 'room' | 'table'; id: string }) {
    return <PremiumQRMenu type={type} id={id} />;
}
