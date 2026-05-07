'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, UserPlus, Download, Trash2, Filter, Mail, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { BentoCard } from '@/components/ui/BentoCard';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function GuestCRM() {
    const supabase = createClient();
    const [guests, setGuests] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadGuests();
    }, []);

    async function loadGuests() {
        setLoading(true);
        const { data, error } = await supabase
            .from('guests')
            .select('*')
            .order('name');
        
        if (error) toast.error(error.message);
        else setGuests(data || []);
        setLoading(false);
    }

    const filteredGuests = useMemo(() => {
        return guests.filter(g => 
            g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.phone?.includes(searchQuery)
        );
    }, [guests, searchQuery]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredGuests.map(g => g.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleDeleteSelected = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} guest records?`)) return;
        
        const { error } = await supabase
            .from('guests')
            .delete()
            .in('id', Array.from(selectedIds));

        if (error) toast.error(error.message);
        else {
            toast.success('Guests deleted');
            setSelectedIds(new Set());
            loadGuests();
        }
    };

    const handleCsvExport = () => {
        const dataToExport = selectedIds.size > 0 
            ? guests.filter(g => selectedIds.has(g.id))
            : filteredGuests;

        const headers = ['Name', 'Email', 'Phone', 'State/City', 'Notes'];
        const csvContent = [
            headers.join(','),
            ...dataToExport.map(g => [
                `"${g.name || ''}"`,
                `"${g.email || ''}"`,
                `"${g.phone || ''}"`,
                `"${g.state || ''}"`,
                `"${(g.notes || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Guest_Export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            const rows = content.split('\n').filter(row => row.trim());
            
            if (rows.length < 2) {
                toast.error('CSV file is empty or invalid');
                setImporting(false);
                return;
            }

            // Enhanced CSV Parser for quoted strings and commas within values
            const parseCSVLine = (line: string) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') inQuotes = !inQuotes;
                    else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else current += char;
                }
                result.push(current.trim());
                return result;
            };

            const headers = parseCSVLine(rows[0].toLowerCase());
            const mapping = {
                name: headers.indexOf('name'),
                phone: headers.indexOf('phone'),
                email: headers.indexOf('email'),
                state: Math.max(headers.indexOf('state'), headers.indexOf('city'), headers.indexOf('address'))
            };

            const guestsToInsert = rows.slice(1).map(row => {
                const values = parseCSVLine(row);
                return {
                    name: values[mapping.name] || 'Unknown Guest',
                    phone: values[mapping.phone] || '',
                    email: values[mapping.email] || '',
                    state: values[mapping.state] || '',
                };
            }).filter(g => g.name !== 'Unknown Guest' || g.phone);

            if (guestsToInsert.length === 0) {
                toast.error('No valid guest data found in CSV');
                setImporting(false);
                return;
            }

            const { error } = await supabase.from('guests').upsert(guestsToInsert, { onConflict: 'phone' });

            if (error) toast.error('Import error: ' + error.message);
            else {
                toast.success(`Successfully imported ${guestsToInsert.length} guests`);
                loadGuests();
            }
            setImporting(false);
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Guest CRM</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Manage Loyalty & Guest History</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="cursor-pointer bg-white border-2 border-slate-200 hover:border-blue-400 p-2.5 rounded-2xl transition-all shadow-sm flex items-center gap-2 group">
                        <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={importing} />
                        {importing ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> : <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />}
                        <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600">Import CSV</span>
                    </label>
                    <button onClick={handleCsvExport} className="bg-white border-2 border-slate-200 hover:border-slate-300 p-2.5 rounded-2xl transition-all shadow-sm flex items-center gap-2 group">
                        <Download className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                        <span className="text-sm font-bold text-slate-600">Export</span>
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 group">
                        <UserPlus className="w-5 h-5 transition-transform group-hover:scale-110" />
                        <span className="text-sm font-bold">New Guest</span>
                    </button>
                </div>
            </div>

            <BentoCard className="p-0 overflow-hidden border-2">
                <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by name, email or phone..." 
                            className="w-full pl-10 pr-4 py-2 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-400 outline-none transition-all font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                            <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{selectedIds.size} Selected</span>
                            <button onClick={handleDeleteSelected} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b text-[11px] font-black uppercase tracking-widest text-slate-500">
                                <th className="p-4 w-10">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                                        onChange={handleSelectAll}
                                        checked={selectedIds.size === filteredGuests.length && filteredGuests.length > 0}
                                    />
                                </th>
                                <th className="p-4">Guest Information</th>
                                <th className="p-4">Contact</th>
                                <th className="p-4">Region</th>
                                <th className="p-4">Loyalty Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="p-8 bg-slate-50/30"></td>
                                    </tr>
                                ))
                            ) : filteredGuests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Search className="w-8 h-8 opacity-20" />
                                            <p className="font-bold uppercase tracking-wider text-xs">No guests found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredGuests.map((guest) => (
                                    <tr key={guest.id} className={cn("group hover:bg-slate-50/50 transition-colors", selectedIds.has(guest.id) && "bg-blue-50/30")}>
                                        <td className="p-4">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedIds.has(guest.id)}
                                                onChange={() => toggleSelect(guest.id)}
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm border border-slate-200">
                                                    {guest.name?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 leading-none mb-1">{guest.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ID: {guest.id.split('-')[0]}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-slate-600 font-medium text-sm">
                                                    <Mail className="w-3 h-3 opacity-40" />
                                                    {guest.email || 'N/A'}
                                                </div>
                                                <div className="text-slate-400 text-xs font-bold">{guest.phone}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold text-[10px] uppercase border border-slate-200">
                                                {guest.state || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                <span className="text-xs font-black text-emerald-700">Verified</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="p-2 hover:bg-white hover:border-slate-200 border-2 border-transparent rounded-xl transition-all">
                                                <FileText className="w-4 h-4 text-slate-400" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t bg-slate-50/30 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span>Showing {filteredGuests.length} guests</span>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50">Previous</button>
                        <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50">Next</button>
                    </div>
                </div>
            </BentoCard>
        </div>
    );
}
