'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home, Users, CalendarDays, Receipt, Settings, BedDouble,
    ShieldAlert, Globe, History, Timer, UtensilsCrossed,
    ChevronDown, LayoutDashboard, Building2, Monitor,
    UserPlus, FileCheck, FileText, PackageSearch, LayoutGrid,
    Utensils, Layout, UserCheck, Brush, BarChart3, MessageCircle,
    TrendingUp, Coins, Users2, PieChart, LineChart, Zap, CalendarPlus, ShieldCheck, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleSandboxMode } from '@/app/actions/sandbox';
import { toast } from 'sonner';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Home, Users, CalendarDays, Receipt, Settings, BedDouble,
    ShieldAlert, Globe, History, Timer, UtensilsCrossed,
    LayoutDashboard, Building2, Monitor, UserPlus, FileCheck,
    FileText, PackageSearch, LayoutGrid, Utensils, Layout,
    UserCheck, Brush, BarChart3, MessageCircle, TrendingUp,
    Coins, Users2, PieChart, LineChart, Zap, ShieldCheck, HelpCircle
};

type NavItem = {
    label: string;
    iconName: string;
    href?: string;
    items?: { label: string; href: string; iconName: string; newTab?: boolean }[];
};

interface SidebarNavProps {
    role: string;
    isSandboxMode?: boolean;
    onNavigate?: () => void;
}

export function SidebarNav({ role, isSandboxMode, onNavigate }: SidebarNavProps) {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const toggleGroup = (label: string) => {
        setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const isAdmin = role === 'admin' || role === 'owner' || role === 'manager';

    let navGroups: NavItem[] = [
        { label: 'Dashboard', iconName: 'LayoutDashboard', href: '/' },
        {
            label: 'Operations',
            iconName: 'CalendarDays',
            items: [
                { label: 'Room Grid', href: '/front-desk', iconName: 'Monitor' },
                { label: 'Check-In', href: '/check-in', iconName: 'UserPlus' },
                { label: 'Advance Booking', href: '/operations/advance-booking', iconName: 'CalendarPlus' },
                { label: 'Guests', href: '/guests', iconName: 'Users' },
                { label: 'Corporate', href: '/companies', iconName: 'Building2' },
                { label: 'Money Receipts', href: '/operations/money-receipts', iconName: 'Receipt' },
                { label: 'Bill Verification', href: '/operations/verify-bill', iconName: 'FileCheck' },
                { label: 'GRC', href: '/operations/grc', iconName: 'FileText' },
                { label: 'Lost & Found', href: '/operations/lost-and-found', iconName: 'PackageSearch' },
                { label: 'User Guide', href: '/help', iconName: 'HelpCircle' },
            ]
        },
        {
            label: 'Property',
            iconName: 'BedDouble',
            items: [
                { label: role === 'front_desk' ? 'Manage Rooms' : 'Rooms Grid', href: '/rooms', iconName: 'LayoutGrid' },
                { label: 'Restaurant POS', href: '/restaurant/pos', iconName: 'Utensils', newTab: true },
                { label: 'Website Bookings', href: '/website-bookings', iconName: 'Globe' },
                { label: 'Restaurant Guide', href: '/help', iconName: 'HelpCircle' },
            ]
        },
        ...(isAdmin ? [{
            label: 'Admin Hub',
            iconName: 'ShieldAlert',
            items: [
                { label: 'Master Suite', href: '/admin/master-suite', iconName: 'Layout' },
                { label: 'Restaurant Master', href: '/admin/restaurant-master', iconName: 'UtensilsCrossed' },
                { label: 'Admin Panel', href: '/admin', iconName: 'Settings' },
                { label: 'Marketing Hub', href: '/admin/marketing', iconName: 'Zap' },
                { label: 'WhatsApp Hub', href: '/admin/whatsapp', iconName: 'MessageCircle' },
                { label: 'Software License', href: '/admin/license', iconName: 'ShieldCheck' },
                { label: 'Housekeeping Monitor', href: '/admin/housekeeping', iconName: 'Brush' },
                { label: 'Admin Help Guide', href: '/help', iconName: 'HelpCircle' },
            ]
        }] : []),
        ...(isAdmin ? [{
            label: 'Analytics',
            iconName: 'BarChart3',
            items: [
                { label: 'WA Insights', href: '/admin/analytics/whatsapp', iconName: 'MessageCircle' },
                { label: 'Finance', href: '/admin/analytics/finance', iconName: 'Coins' },
                { label: 'Trends', href: '/admin/analytics/trends', iconName: 'TrendingUp' },
                { label: 'Staff Performance', href: '/admin/analytics/staff', iconName: 'Users2' },
                { label: 'Business Growth', href: '/admin/analytics/growth', iconName: 'Zap' },
                { label: 'Rest. Revenue', href: '/admin/analytics/restaurant/revenue', iconName: 'Utensils' },
                { label: 'Rest. Preferences', href: '/admin/analytics/restaurant/preferences', iconName: 'PieChart' },
            ]
        }] : []),
        ...(isAdmin ? [{ label: 'Settings', iconName: 'Settings', href: '/settings' }] : []),
        ...(isAdmin ? [{ label: 'Staff Management', iconName: 'UserCheck', href: '/admin/staff' }] : []),
        { label: 'User Guide', iconName: 'HelpCircle', href: '/help' },
    ];

    if (role === 'manager') {
        navGroups = [
            { label: 'Manager Dashboard', iconName: 'LayoutDashboard', href: '/' },
            {
                label: 'Operations',
                iconName: 'CalendarDays',
                items: [
                    { label: 'Room Grid', href: '/front-desk', iconName: 'Monitor' },
                    { label: 'Check-In', href: '/check-in', iconName: 'UserPlus' },
                    { label: 'Advance Booking', href: '/operations/advance-booking', iconName: 'CalendarPlus' },
                    { label: 'Guests', href: '/guests', iconName: 'Users' },
                    { label: 'Corporate', href: '/companies', iconName: 'Building2' },
                    { label: 'Money Receipts', href: '/operations/money-receipts', iconName: 'Receipt' },
                    { label: 'Bill Verification', href: '/operations/verify-bill', iconName: 'FileCheck' },
                    { label: 'GRC', href: '/operations/grc', iconName: 'FileText' },
                    { label: 'Lost & Found', href: '/operations/lost-and-found', iconName: 'PackageSearch' },
                ]
            },
            {
                label: 'Property',
                iconName: 'BedDouble',
                items: [
                    { label: 'Rooms Grid', href: '/rooms', iconName: 'LayoutGrid' },
                    { label: 'Restaurant POS', href: '/restaurant/pos', iconName: 'Utensils', newTab: true },
                    { label: 'Website Bookings', href: '/website-bookings', iconName: 'Globe' },
                ]
            },
            {
                label: 'Analytics Group',
                iconName: 'BarChart3',
                items: [
                    { label: 'WA Insights', href: '/admin/analytics/whatsapp', iconName: 'MessageCircle' },
                    { label: 'Finance', href: '/admin/analytics/finance', iconName: 'Coins' },
                    { label: 'Trends', href: '/admin/analytics/trends', iconName: 'TrendingUp' },
                    { label: 'Staff Performance', href: '/admin/analytics/staff', iconName: 'Users2' },
                    { label: 'Business Growth', href: '/admin/analytics/growth', iconName: 'Zap' },
                ]
            },
            { label: 'House Keeping Monitor', iconName: 'Brush', href: '/admin/housekeeping' },
            { label: 'User Guide', iconName: 'HelpCircle', href: '/help' },
        ];
    }

    if (role === 'master') {
        navGroups = [
            { label: 'Master Control', iconName: 'Zap', href: '/master-control' },
            { label: 'Database Master', iconName: 'History', href: '/master-control/database' },
            { label: 'License Authority', iconName: 'ShieldCheck', href: '/master-control/license' },
            { label: 'System Logs', iconName: 'History', href: '/master-control/logs' },
            { label: 'Master Guide', iconName: 'HelpCircle', href: '/help' },
        ];
    }

    if (role === 'cleaning_staff') {
        navGroups = [
            { label: 'Dashboard / Tasks', iconName: 'Home', href: '/' },
            ...(isAdmin ? [{ label: 'Profile Settings', iconName: 'Settings', href: '/settings' }] : []),
        ];
    }

    const [isPending, startTransition] = useTransition();

    const handleSandboxToggle = () => {
        const next = !isSandboxMode;
        if (next && !confirm('Enable Sandbox Mode? Real data will be hidden and all new entries will be marked for eventual deletion.')) return;

        startTransition(async () => {
            try {
                await toggleSandboxMode(next);
                toast.success(`Sandbox Mode ${next ? 'Enabled' : 'Disabled'}`);
                window.location.reload();
            } catch (err: any) {
                toast.error(err.message);
            }
        });
    };

    const isActive = (href: string) => {
        if (href === '/' && pathname !== '/') return false;
        return pathname === href || pathname?.startsWith(href + '/');
    };

    // ────────────────────────────────────────────────────────
    // FLATTENING LOGIC FOR FRONT DESK
    // ────────────────────────────────────────────────────────
    const isFrontDesk = role === 'front_desk';

    return (
        <nav className="flex-1 flex flex-col justify-start gap-1 overflow-y-auto px-4 py-4 custom-scrollbar">
            {role === 'master' && (
                <div className="mb-4">
                    <button
                        onClick={handleSandboxToggle}
                        disabled={isPending}
                        className={cn(
                            "w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all group",
                            isSandboxMode
                                ? "bg-orange-50 border-orange-200 text-orange-700 shadow-lg shadow-orange-100"
                                : "bg-slate-50 border-slate-100 text-slate-500 hover:border-blue-200"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-xl", isSandboxMode ? "bg-orange-500 text-white" : "bg-white text-slate-400 group-hover:text-blue-500 shadow-sm")}>
                                <Zap className={cn("w-4 h-4", isPending && "animate-spin")} />
                            </div>
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[11px] font-black uppercase tracking-tighter">Sandbox Mode</span>
                                <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-0.5">{isSandboxMode ? 'Active' : 'Disabled'}</span>
                            </div>
                        </div>
                        <div className={cn("w-8 h-4 rounded-full relative transition-colors", isSandboxMode ? "bg-orange-500" : "bg-slate-300")}>
                            <div className={cn("absolute top-1 w-2 h-2 rounded-full bg-white transition-all", isSandboxMode ? "right-1" : "left-1")} />
                        </div>
                    </button>
                    {isSandboxMode && (
                        <p className="px-2 mt-2 text-[8px] font-black text-orange-600 uppercase tracking-widest animate-pulse">
                            Test Data Layer Active
                        </p>
                    )}
                </div>
            )}
            {navGroups.map((group) => {
                const Icon = iconMap[group.iconName] || Home;
                const isGroupActive = group.items?.some(item => isActive(item.href)) || (group.href && isActive(group.href));

                if (group.href) {
                    return (
                        <Link
                            key={group.label}
                            href={group.href}
                            onClick={onNavigate}
                            className={cn(
                                "shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group",
                                isGroupActive
                                    ? "bg-teal-500 text-white font-bold shadow-lg shadow-teal-100"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold"
                            )}
                        >
                            <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isGroupActive ? "text-white" : "text-slate-400")} />
                            <span className="text-[13px] tracking-tight">{group.label}</span>
                        </Link>
                    );
                }

                // If Front Desk, flatten the Operations and Property groups
                if (isFrontDesk && (group.label === 'Operations' || group.label === 'Property')) {
                    return (
                        <div key={group.label} className="flex flex-col gap-1 mb-2">
                            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-70">
                                {group.label}
                            </div>
                            {group.items?.map(sub => {
                                const SubIcon = iconMap[sub.iconName] || LayoutDashboard;
                                const isSubActive = isActive(sub.href);

                                if (sub.newTab) {
                                    return (
                                        <a
                                            key={sub.label + sub.href}
                                            href={sub.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={onNavigate}
                                            className={cn(
                                                "shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group",
                                                isSubActive
                                                    ? "bg-teal-500 text-white font-bold shadow-lg shadow-teal-100"
                                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold"
                                            )}
                                        >
                                            <SubIcon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isSubActive ? "text-white" : "text-slate-400")} />
                                            <span className="text-[13px] tracking-tight">{sub.label}</span>
                                        </a>
                                    );
                                }

                                return (
                                    <Link
                                        key={sub.label + sub.href}
                                        href={sub.href}
                                        onClick={onNavigate}
                                        className={cn(
                                            "shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group",
                                            isSubActive
                                                ? "bg-teal-500 text-white font-bold shadow-lg shadow-teal-100"
                                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold"
                                        )}
                                    >
                                        <SubIcon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isSubActive ? "text-white" : "text-slate-400")} />
                                        <span className="text-[13px] tracking-tight">{sub.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    );
                }

                const isOpen = openGroups[group.label];

                return (
                    <div key={group.label} className="shrink-0 flex flex-col gap-1">
                        <button
                            onClick={() => toggleGroup(group.label)}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group",
                                isGroupActive && !isOpen ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    isGroupActive && !isOpen ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
                                )}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-[13px] tracking-tight">{group.label}</span>
                            </div>
                            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-300", isOpen ? "rotate-180" : "")} />
                        </button>

                        <div
                            className={cn(
                                "overflow-hidden transition-all duration-500 ease-in-out relative",
                                isOpen ? "max-h-[600px] opacity-100 mt-1" : "max-h-0 opacity-0"
                            )}
                        >

                            <div className="pl-8 pr-1 pb-2 flex flex-col gap-1">
                                {group.items?.map(sub => {
                                    const SubIcon = iconMap[sub.iconName] || LayoutDashboard;
                                    const isSubActive = isActive(sub.href);

                                    return sub.newTab ? (
                                        <a
                                            key={sub.label + sub.href}
                                            href={sub.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={onNavigate}
                                            className={cn(
                                                "relative flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group/sub",
                                                isSubActive
                                                    ? "bg-teal-50 text-teal-700 font-bold"
                                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                                            )}
                                        >
                                            <SubIcon className={cn(
                                                "w-4 h-4 transition-all duration-300",
                                                isSubActive ? "text-teal-600 scale-110" : "text-slate-400 group-hover/sub:text-slate-600 group-hover/sub:scale-105"
                                            )} />
                                            <span className="truncate">{sub.label}</span>
                                        </a>
                                    ) : (
                                        <Link
                                            key={sub.label + sub.href}
                                            href={sub.href}
                                            onClick={onNavigate}
                                            className={cn(
                                                "relative flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group/sub",
                                                isSubActive
                                                    ? "bg-teal-50 text-teal-700 font-bold"
                                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                                            )}
                                        >
                                            <SubIcon className={cn(
                                                "w-4 h-4 transition-all duration-300",
                                                isSubActive ? "text-teal-600 scale-110" : "text-slate-400 group-hover/sub:text-slate-600 group-hover/sub:scale-105"
                                            )} />
                                            <span className="truncate">{sub.label}</span>
                                            {isSubActive && (
                                                <div className="absolute right-2 w-1 h-4 bg-teal-500 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </nav>
    );
}
