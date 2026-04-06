'use client';

import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    UtensilsCrossed,
    ClipboardCheck,
    Users,
    AlertTriangle,
    TrendingDown,
    ArrowUpRight,
    Search,
    ChevronRight,
    Beaker,
    Truck,
    ArrowRight,
    ChefHat,
    History,
    CheckCircle2,
    Scale
} from 'lucide-react';
import Link from 'next/link';
import { getInventoryItems, getPurchaseOrders, getStockAudits } from './actions';
import { cn } from '@/lib/utils';

export default function InventoryDashboard() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [pos, setPos] = useState<any[]>([]);
    const [audits, setAudits] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [itemList, poList, auditList] = await Promise.all([
                getInventoryItems(),
                getPurchaseOrders(),
                getStockAudits()
            ]);
            setItems(itemList);
            setPos(poList);
            setAudits(auditList);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const lowStockItems = items.filter(item => item.current_stock <= item.min_threshold);
    const activePOs = pos.filter(po => po.status === 'sent');

    const menuActions = [
        { title: 'Inventory Master', desc: 'Raw Materials & Stock', icon: Package, color: 'bg-indigo-600', href: '/restaurant/inventory/items' },
        { title: 'Recipe Book', desc: 'Map Menus to Stock', icon: UtensilsCrossed, color: 'bg-emerald-600', href: '/restaurant/inventory/recipes' },
        { title: 'Procurement', desc: 'POs & Deliveries', icon: ShoppingCart, color: 'bg-orange-600', href: '/restaurant/inventory/procurement' },
        { title: 'Wastage & Audit', desc: 'Stock Reconciliation', icon: ClipboardCheck, color: 'bg-rose-600', href: '/restaurant/inventory/audit' },
        { title: 'Suppliers', desc: 'Vendor Directory', icon: Users, color: 'bg-slate-900', href: '/restaurant/inventory/vendors' },
    ];

    if (loading || !mounted) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">Central Kitchen</h1>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Inventory & Stock Management Module</p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total SKU</p>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{items.length}</h2>
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" />
                            Live Stock Items
                        </span>
                    </div>
                    <Package className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-50 group-hover:scale-110 transition-transform duration-500" />
                </div>

                <div className="bg-rose-600 p-8 rounded-[2.5rem] shadow-xl shadow-rose-100 relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-rose-100 uppercase tracking-widest mb-2">Stock Alerts</p>
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-1">{lowStockItems.length}</h2>
                        <span className="text-[10px] font-bold text-rose-200 flex items-center gap-1 uppercase tracking-tight">
                            <AlertTriangle className="w-3 h-3" />
                            Below Safety Limit
                        </span>
                    </div>
                    <AlertTriangle className="absolute -right-4 -top-4 w-32 h-32 text-rose-500/20 group-hover:rotate-12 transition-transform duration-500" />
                </div>

                <div className="bg-orange-600 p-8 rounded-[2.5rem] shadow-xl shadow-orange-100 relative overflow-hidden group text-white">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-orange-100 uppercase tracking-widest mb-2">Active POs</p>
                        <h2 className="text-4xl font-black tracking-tighter mb-1">{activePOs.length}</h2>
                        <span className="text-[10px] font-bold text-orange-200 uppercase tracking-tight">Orders in Transit</span>
                    </div>
                    <Truck className="absolute -right-4 -bottom-4 w-32 h-32 text-orange-500/20" />
                </div>

                <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Month's Audits</p>
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-1">{audits.length}</h2>
                        <Link href="/restaurant/inventory/audit" className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            View Reconciliation
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <ClipboardCheck className="absolute -right-4 top-4 w-32 h-32 text-white/5" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Alerts & Updates */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Low Stock Watchlist */}
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                                    <TrendingDown className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Stock Watchlist</h3>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Immediate Replenishment Required</p>
                                </div>
                            </div>
                            <Link href="/restaurant/inventory/items" className="p-3 hover:bg-slate-50 rounded-2xl transition-all">
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            </Link>
                        </div>

                        <div className="p-4 bg-slate-50/50">
                            {lowStockItems.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {lowStockItems.slice(0, 4).map(item => (
                                        <div key={item.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-all">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-900 group-hover:text-rose-600 transition-colors uppercase tracking-tight">{item.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">Threshold: {item.min_threshold} {item.unit}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-black text-rose-600 tracking-tighter">{item.current_stock}</div>
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{item.unit}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                                    <p className="text-xs font-black uppercase tracking-widest">All Stock Levels Optimal</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Procurement & Activity Feed */}
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                                    <History className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Recent Activity</h3>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Wastage & Audit Trail</p>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-50 overflow-y-auto max-h-[400px]">
                            {audits.slice(0, 10).map(audit => (
                                <div key={audit.id} className="p-6 hover:bg-indigo-50/30 transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center",
                                            audit.actual_stock < audit.opening_stock ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                                        )}>
                                            <Scale className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 leading-tight">{audit.item?.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                                Reconciled to {audit.actual_stock} {audit.item?.unit}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            "text-sm font-black tracking-tighter",
                                            audit.actual_stock < audit.opening_stock ? "text-rose-600" : "text-emerald-600"
                                        )}>
                                            {audit.actual_stock - audit.opening_stock > 0 ? '+' : ''}{audit.actual_stock - audit.opening_stock}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-300">Diff Units</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: navigation Actions */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <ChefHat className="w-4 h-4" />
                            Inventory Workflows
                        </h3>
                        <div className="space-y-3 relative z-10">
                            {menuActions.map((action, idx) => (
                                <Link
                                    key={idx}
                                    href={action.href}
                                    className="flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-[2rem] transition-all group border border-white/5 hover:border-white/20"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={cn("w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", action.color)}>
                                            <action.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black tracking-tight">{action.title}</h4>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{action.desc}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="bg-indigo-600 p-8 rounded-[3rem] shadow-xl shadow-indigo-100 text-white group overflow-hidden relative">
                        <div className="relative z-10 mb-20 text-indigo-100 flex items-center gap-2">
                            <Beaker className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Recipe Optimization</span>
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black tracking-tight mb-4 leading-tight">Link Menu Items to Stock</h3>
                            <Link href="/restaurant/inventory/recipes" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-2xl font-black text-xs hover:bg-indigo-50 transition-colors shadow-xl">
                                OPEN RECIPE BUILDER
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <UtensilsCrossed className="absolute -right-4 -bottom-4 w-40 h-40 text-white/10 group-hover:scale-110 transition-transform duration-700" />
                    </div>
                </div>
            </div>
        </div>
    );
}
