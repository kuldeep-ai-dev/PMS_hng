'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getMoneyReceiptsData } from '@/app/(dashboard)/operations/money-receipts/actions';
import { generateInvoiceNo, formatCurrency } from '@/utils/billing';
import { formatISTDate, formatISTTime } from '@/utils/date';
import { cn } from '@/lib/utils';

function PrintReceiptsContent() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [receipts, setReceipts] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getMoneyReceiptsData();
                const searchTerm = searchParams.get('search') || '';
                const filterMethod = searchParams.get('method') || 'All';
                const filterSource = searchParams.get('source') || 'All';

                // Normalize and filter
                const all = [
                    ...data.roomPayments.map((p: any) => ({
                        id: p.id,
                        date: p.created_at,
                        regnNo: generateInvoiceNo(p.id, p.created_at),
                        guestName: p.bookings?.guests?.name || 'Unknown',
                        roomNo: p.bookings?.rooms?.number || 'N/A',
                        source: 'Room Booking',
                        amount: p.amount,
                        method: p.method,
                        status: p.bookings?.is_settled
                            ? 'Settled'
                            : p.bookings?.status === 'Checked_Out'
                                ? (p.bookings?.bill_to_company ? 'Unsettled' : 'Paid')
                                : p.bookings?.status === 'Checked_In'
                                    ? 'In-House'
                                    : 'Advance'
                    })),
                    ...data.posPayments.map((p: any) => ({
                        id: p.id,
                        date: p.order_time,
                        regnNo: generateInvoiceNo(p.id, p.order_time),
                        guestName: p.guests?.name || 'Walk-in',
                        roomNo: p.rooms?.number || 'N/A',
                        source: 'Restaurant POS',
                        amount: p.total_amount_with_tax,
                        method: p.payment_method,
                        status: 'Paid'
                    }))
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                const filtered = all.filter(r => {
                    const matchesSearch =
                        r.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.regnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.roomNo.toString().includes(searchTerm);
                    const matchesMethod = filterMethod === 'All' || r.method === filterMethod;
                    const matchesSource = filterSource === 'All' || r.source === filterSource;
                    return matchesSearch && matchesMethod && matchesSource;
                });

                setReceipts(filtered);
                setLoading(false);

                // Auto-trigger print dialog after a short delay for rendering
                setTimeout(() => {
                    window.print();
                }, 1000);
            } catch (error) {
                console.error(error);
            }
        };
        load();
    }, [searchParams]);

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Generating Professional Audit Report...</div>;

    // Chunk receipts into groups    // Pagination
    const RECORDS_PER_PAGE = 15;
    const pages = [];
    for (let i = 0; i < receipts.length; i += RECORDS_PER_PAGE) {
        pages.push(receipts.slice(i, i + RECORDS_PER_PAGE));
    }

    if (receipts.length === 0) return <div className="p-20 text-center text-slate-400 font-bold">No records found for audit.</div>;

    return (
        <div className="bg-white min-h-screen p-0 m-0 font-sans text-slate-900 overflow-hidden">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: A4 landscape; margin: 0; }
                    .page-break { page-break-after: always; }
                    body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
                }
                .a4-page {
                    width: 297mm;
                    height: 210mm;
                    padding: 8mm 12mm;
                    margin: 0 auto;
                    box-sizing: border-box;
                    position: relative;
                    background: white;
                    display: flex;
                    flex-direction: column;
                }
                table { border-collapse: collapse; width: 100%; border: 1px solid #000; table-layout: fixed; }
                th, td { border: 1px solid #000; padding: 4px 6px; font-size: 8pt; line-height: 1.05; word-wrap: break-word; }
                th { background-color: #f1f5f9 !important; font-weight: 800; text-transform: uppercase; font-size: 7pt; }
            `}} />

            {pages.map((pageReceipts, pageIdx) => (
                <div key={pageIdx} className={cn("a4-page", pageIdx < pages.length - 1 ? "page-break" : "")}>
                    {/* Page Header */}
                    <header className="flex flex-col items-center mb-3 pb-2 border-b border-slate-900">
                        <h1 className="text-lg font-black uppercase tracking-[0.2em] leading-none">Money Receipt Audit Report</h1>
                        <p className="text-[10px] font-bold text-slate-500 mt-1 italic text-center">
                            Hotel New Ganga • Unit of MediaGeny Tech Solutions • Central Revenue Audit
                        </p>
                        <div className="flex justify-between w-full mt-2 text-[8.5px] font-bold uppercase text-slate-400">
                            <span>Export Date: {formatISTDate(new Date())} {formatISTTime(new Date())}</span>
                            <span>Audit Page {pageIdx + 1} of {pages.length}</span>
                        </div>
                    </header>

                    {/* Table Area */}
                    <main className="flex-1 overflow-hidden">
                        <table>
                            <thead>
                                <tr>
                                    <th className="w-[15%] text-left">Regn No</th>
                                    <th className="w-[9%] text-left">Date</th>
                                    <th className="w-[24%] text-left">Guest / Entity Name</th>
                                    <th className="w-[8%] text-center">Room</th>
                                    <th className="w-[10%] text-center">Method</th>
                                    <th className="w-[18%] text-right">Amount (INR)</th>
                                    <th className="w-[12%] text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageReceipts.map((r) => (
                                    <tr key={r.id}>
                                        <td className="font-bold text-[7.5pt]">{r.regnNo}</td>
                                        <td className="text-[7.5pt]">{formatISTDate(r.date)}</td>
                                        <td className="font-semibold truncate max-w-0" title={r.guestName}>{r.guestName}</td>
                                        <td className="text-center font-bold">{r.roomNo === 'N/A' ? '-' : r.roomNo}</td>
                                        <td className="text-[7pt] font-black uppercase text-center">{r.method}</td>
                                        <td className="text-right font-black">{formatCurrency(r.amount)}</td>
                                        <td className="text-center">
                                            <span className="text-[6.5pt] font-black uppercase border border-slate-300 px-1.5 py-0.5 rounded leading-none inline-block">
                                                {r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </main>

                    {/* Page Footer - Positioned relative to A4 height */}
                    <footer className="mt-3 pt-3 border-t border-slate-200">
                        <div className="flex justify-between items-end">
                            <div className="space-y-2">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">System Certification</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded bg-teal-600 flex items-center justify-center text-white text-[8px] font-black italic">G</div>
                                        <span className="text-xs font-black text-slate-800 tracking-tight leading-none">Geny PMS Pro</span>
                                    </div>
                                </div>
                                <p className="text-[7.5px] text-slate-400 font-bold uppercase leading-tight">
                                    Computer Generated Audit Report • Non-Manual Verification Allowed<br />
                                    © {new Date().getFullYear()} MediaGeny Tech Solutions. All rights reserved.
                                </p>
                            </div>

                            <div className="text-right space-y-3 pb-1">
                                <div className="inline-block border-b border-slate-300 w-40 h-5"></div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center leading-none">Authorized Signatory</p>
                            </div>
                        </div>

                        <div className="mt-2 text-center">
                            <p className="text-[8.5px] font-black text-teal-800 uppercase tracking-[0.4em] opacity-30 leading-none">
                                Powered by Geny PMS Pro unit of MediaGeny
                            </p>
                        </div>
                    </footer>
                </div>
            ))}
        </div>
    );
}

export default function PrintReceiptsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center font-bold">Loading Print View...</div>}>
            <PrintReceiptsContent />
        </Suspense>
    );
}
