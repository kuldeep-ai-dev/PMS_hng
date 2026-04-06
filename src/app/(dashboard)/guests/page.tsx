import { BentoCard } from '@/components/ui/BentoCard';
import { Download, Search } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

export default async function LeadsPage({ searchParams }: { searchParams: Promise<any> }) {
    const params = await searchParams;
    const search = params.search || '';
    const supabase = await createClient();

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

    const { data: guests, error } = await query.order('created_at', { ascending: false });

    return (
        <div className="flex flex-col gap-6 h-full max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Guest CRM & Leads</h1>
                    <p className="text-sm text-slate-500 mt-1">Automatically captured profiles for marketing & engagement</p>
                </div>
                <button className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm">
                    <Download className="w-4 h-4" /> Export CSV for WhatsApp
                </button>
            </div>

            <BentoCard className="p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
                    <form className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            name="search"
                            type="text"
                            defaultValue={search}
                            placeholder="Search guests..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </form>
                </div>

                <div className="overflow-x-auto">
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
                                const lastBooking = guest.bookings?.[0];
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
