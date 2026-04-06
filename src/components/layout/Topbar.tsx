'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Grid3X3, X, BedDouble, Users, UtensilsCrossed, Settings, BarChart2, ClipboardList, LogOut, ChevronRight, AlertTriangle, CheckCircle2, CalendarCheck } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import Link from 'next/link';
import { getNotifications, type Notification } from '@/app/actions/notifications';

const MODULES = [
    { label: 'Front Desk', href: '/front-desk', icon: BedDouble, color: 'bg-teal-500' },
    { label: 'Guests', href: '/guests', icon: Users, color: 'bg-blue-500' },
    { label: 'Restaurant', href: '/restaurant', icon: UtensilsCrossed, color: 'bg-orange-500' },
    { label: 'Rooms', href: '/rooms', icon: ClipboardList, color: 'bg-purple-500' },
    { label: 'Admin', href: '/admin', icon: BarChart2, color: 'bg-rose-500' },
    { label: 'Settings', href: '/settings', icon: Settings, color: 'bg-slate-500' },
];

function NotificationIcon({ type }: { type: Notification['type'] }) {
    if (type === 'pending_payment') return <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />;
    if (type === 'checkout_due') return <LogOut className="w-4 h-4 text-amber-500 flex-shrink-0" />;
    return <CalendarCheck className="w-4 h-4 text-teal-500 flex-shrink-0" />;
}

export function Topbar() {
    const [showNotifications, setShowNotifications] = useState(false);
    const [showLauncher, setShowLauncher] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    const notifRef = useRef<HTMLDivElement>(null);
    const launcherRef = useRef<HTMLDivElement>(null);

    // Load notifications when panel opens
    useEffect(() => {
        if (showNotifications) {
            setLoading(true);
            getNotifications().then(n => { setNotifications(n); setLoading(false); });
        }
    }, [showNotifications]);

    // Close dropdowns on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
            if (launcherRef.current && !launcherRef.current.contains(e.target as Node)) setShowLauncher(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="w-full flex items-center justify-between p-3 px-5 mb-6 bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-sm relative z-50">
            <div className="flex-1 flex items-center">
                <div className="w-10 md:hidden" />
                <GlobalSearch />
            </div>

            <div className="flex items-center gap-2">
                {/* Notifications Bell */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => { setShowNotifications(v => !v); setShowLauncher(false); }}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors relative"
                    >
                        <Bell className="h-5 w-5" />
                        {/* badge stays red/shown always to indicate live data */}
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <Bell className="w-4 h-4" /> Notifications
                                </h3>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today</span>
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                                {loading ? (
                                    <div className="p-6 text-center text-slate-400 text-sm">Loading...</div>
                                ) : notifications.length === 0 ? (
                                    <div className="p-6 text-center">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-slate-600">All clear for today!</p>
                                        <p className="text-xs text-slate-400 mt-1">No pending actions.</p>
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <Link
                                            key={n.id}
                                            href={`/folio/${n.bookingId}`}
                                            onClick={() => setShowNotifications(false)}
                                            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                        >
                                            <div className="mt-0.5"><NotificationIcon type={n.type} /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                                                <p className="text-xs text-slate-500 truncate">{n.description}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* App Launcher Grid */}
                <div className="relative" ref={launcherRef}>
                    <button
                        onClick={() => { setShowLauncher(v => !v); setShowNotifications(false); }}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        <Grid3X3 className="h-5 w-5" />
                    </button>

                    {showLauncher && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-slate-800 text-sm">Quick Access</h3>
                                <button onClick={() => setShowLauncher(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {MODULES.map(m => (
                                    <Link
                                        key={m.href}
                                        href={m.href}
                                        onClick={() => setShowLauncher(false)}
                                        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className={`w-10 h-10 ${m.color} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                                            <m.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 text-center leading-tight">{m.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
