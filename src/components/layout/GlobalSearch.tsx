'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, BedDouble, Calendar, Loader2, X, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type ResultType = 'guest' | 'room' | 'booking';

interface SearchResult {
    type: ResultType;
    id: string;
    title: string;
    subtitle: string;
    href: string;
    badge?: string;
    badgeColor?: string;
}

async function globalSearch(term: string): Promise<SearchResult[]> {
    const supabase = createClient();
    const results: SearchResult[] = [];

    // Smart term parsing: if user searches "Room 101", we want to match room "101"
    const roomTerm = term.toLowerCase().startsWith('room ') ? term.slice(5).trim() :
        term.toLowerCase().startsWith('r ') ? term.slice(2).trim() : term;

    const [{ data: guests, error: gErr }, { data: rooms, error: rErr }, { data: bookings, error: bErr }] = await Promise.all([
        supabase
            .from('guests')
            .select('id, name, phone, email')
            .or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
            .limit(5),
        // `type` is an ENUM (room_type) so we can only search by `number` (text)
        supabase
            .from('rooms')
            .select('id, number, type, status, base_rate')
            .ilike('number', `%${roomTerm}%`)
            .limit(5),
        // Can't filter on joined columns in PostgREST .or(); fetch active bookings and filter client‑side
        supabase
            .from('bookings')
            .select('id, status, check_in_date, check_out_date, guests(name, phone), rooms(number)')
            .eq('status', 'Active')
            .limit(20),
    ]);

    if (gErr) console.error("Guest Search Error:", gErr.message || gErr);
    if (rErr) console.error("Room Search Error:", rErr.message || rErr);
    if (bErr) console.error("Booking Search Error:", bErr.message || bErr);

    (guests || []).forEach(g => results.push({
        type: 'guest',
        id: g.id,
        title: g.name,
        subtitle: `${g.phone}${g.email ? ' · ' + g.email : ''}`,
        href: `/front-desk`, // Fallback, since there's no dedicated /guests/[id] page yet
        badge: 'Guest',
        badgeColor: 'bg-purple-100 text-purple-700',
    }));

    (rooms || []).forEach(r => results.push({
        type: 'room',
        id: r.id,
        title: `Room ${r.number}`,
        subtitle: `${r.type} · ₹${Number(r.base_rate).toLocaleString()}/night`,
        href: r.status === 'Available' ? `/check-in?room=${r.number}` : `/front-desk`,
        badge: r.status,
        badgeColor: r.status === 'Available'
            ? 'bg-emerald-100 text-emerald-700'
            : r.status === 'Occupied'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700',
    }));

    (bookings || []).forEach((b: any) => {
        const lowerTerm = term.toLowerCase();
        const nameMatch = b.guests?.name?.toLowerCase().includes(lowerTerm);
        const roomMatch = b.rooms?.number?.toLowerCase().includes(lowerTerm);
        if (!nameMatch && !roomMatch) return;
        results.push({
            type: 'booking',
            id: b.id,
            title: b.guests?.name || 'Unknown',
            subtitle: `Room ${b.rooms?.number} · Check-out ${new Date(b.check_out_date).toLocaleDateString('en-IN')}`,
            href: `/folio/${b.id}`,
            badge: 'Active Stay',
            badgeColor: 'bg-teal-100 text-teal-700',
        });
    });

    return results;
}

const iconMap: Record<ResultType, React.ReactNode> = {
    guest: <User className="w-4 h-4" />,
    room: <BedDouble className="w-4 h-4" />,
    booking: <Calendar className="w-4 h-4" />,
};

export function GlobalSearch() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(-1);
    const ref = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Click-outside to close
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Keyboard shortcut: / or Ctrl+K to focus
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
                e.preventDefault();
                (ref.current?.querySelector('input') as HTMLInputElement)?.focus();
            }
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query || query.length < 2) {
            setResults([]);
            setOpen(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            const trimmed = query.trim();
            try {
                const r = await globalSearch(trimmed);
                setResults(r);
                setOpen(r.length > 0);
                setSelected(-1);
            } catch (err) {
                console.error("Global search failed:", err);
            } finally {
                setLoading(false);
            }
        }, 250);
    }, [query]);

    const navigate = (result: SearchResult) => {
        router.push(result.href);
        setQuery('');
        setOpen(false);
        setResults([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, -1)); }
        if (e.key === 'Enter' && selected >= 0) { navigate(results[selected]); }
    };

    return (
        <div ref={ref} className="relative w-full max-w-md hidden md:block">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                {loading && <Loader2 className="absolute right-8 top-2.5 h-4 w-4 text-teal-500 animate-spin" />}
                {query && !loading && (
                    <button onClick={() => { setQuery(''); setOpen(false); }} className="absolute right-3 top-2.5">
                        <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                    </button>
                )}
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search guests, rooms, bookings…  ⌘K"
                    className="block w-full pl-9 pr-8 py-2.5 border-0 rounded-xl bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 hover:bg-slate-100 transition-colors outline-none"
                />
            </div>

            {/* Command Palette Dropdown */}
            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
                        <span className="text-slate-300">↑↓ navigate · Enter select · Esc close</span>
                    </div>

                    {results.map((r, i) => (
                        <button
                            key={r.id + r.type}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => navigate(r)}
                            onMouseEnter={() => setSelected(i)}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0 ${selected === i ? 'bg-teal-50' : 'hover:bg-slate-50'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.type === 'guest' ? 'bg-purple-100 text-purple-600' :
                                r.type === 'room' ? 'bg-blue-100 text-blue-600' :
                                    'bg-teal-100 text-teal-600'
                                }`}>
                                {iconMap[r.type]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 text-sm truncate">{r.title}</p>
                                <p className="text-xs text-slate-500 truncate">{r.subtitle}</p>
                            </div>
                            {r.badge && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${r.badgeColor}`}>
                                    {r.badge}
                                </span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                        </button>
                    ))}

                    <div className="px-4 py-2 text-[10px] text-slate-400 bg-slate-50 border-t border-slate-100">
                        Searching across guests · rooms · active bookings
                    </div>
                </div>
            )}
        </div>
    );
}
