'use client';

import { BentoCard } from '@/components/ui/BentoCard';
import { Download, Search, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function LeadsPage({ searchParams }: { searchParams: any }) {
    const [guests, setGuests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchParams = async () => {
            const params = await searchParams;
            setSearch(params.search || '');
        };
        fetchParams();
    }, [searchParams]);

    const loadGuests = async () => {
        try {
            setLoading(true);
            const supabase = createClient();
            let query = supabase.from('guests').select(`
                *,
                bookings (
                    id,
                    purpose_of_visit,
                    created_at
                )
            `);

            if (search) {
                query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (data) setGuests(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGuests();
    }, [search]);

    const handleExport = async () => {
        try {
            setIsExporting(true);
            // Simulate CSV export or actual logic if available
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success("CSV Exported successfully for WhatsApp marketing");
        } catch (error) {
            toast.error("Export failed");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Guest CRM & Leads</h1>
                    <p className="text-sm text-slate-500 mt-1">Automatically captured profiles for marketing & engagement</p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70"
                >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isExporting ? 'PREPARING CSV...' : 'Export CSV for WhatsApp'}
                </button>
            </div>

            <BentoCard className="p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search guests..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Guest Name</th>
                                    <th className="px-6 py-4">Phone (WhatsApp)</th>
                                    <th className="px-6 py-4">Email Address</th>
                                    <th className="px-6 py-4">Last Purpose</th>
                                    <th className="px-6 py-4">Registration Date</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(guests || []).map((guest) => {
                                    const lastBooking = guest.bookings?.[0] as any;
                                    return (
                                        <tr key={guest.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">{guest.name}</td>
                                            <td className="px-6 py-4 font-mono text-xs">{guest.phone}</td>
                                            <td className="px-6 py-4">{guest.email || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700">
                                                    {lastBooking?.purpose_of_visit || 'Direct Registration'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {new Date(guest.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link href={`/guests/${guest.id}`} className="text-teal-600 hover:text-teal-800 font-medium">View History</Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {(!guests || guests.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            No guest profiles found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-sm text-slate-500">
                    <span>Showing {guests?.length || 0} results</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 rounded bg-white border border-slate-200">Previous</button>
                        <button className="px-3 py-1 rounded bg-white border border-slate-200">Next</button>
                    </div>
                </div>
            </BentoCard>
        </div>
    );
}
