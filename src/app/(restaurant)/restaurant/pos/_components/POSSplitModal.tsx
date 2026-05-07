'use client';

import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle2, Split } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SplitItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

export function POSSplitModal({ isOpen, onClose, originalOrder, originalItems, onSplitComplete }: any) {
    const [sourceItems, setSourceItems] = useState<SplitItem[]>(originalItems.map((i: any) => ({
        id: i.id || i.menu_item_id,
        name: i.name || i.restaurant_menu_items?.name || 'Unknown',
        price: i.price || i.price_at_time,
        quantity: i.quantity
    })));
    const [targetItems, setTargetItems] = useState<SplitItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const moveItem = (item: SplitItem, fromSource: boolean) => {
        if (fromSource) {
            setSourceItems(prev => {
                const existing = prev.find(i => i.id === item.id);
                if (existing && existing.quantity > 1) {
                    return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i);
                }
                return prev.filter(i => i.id !== item.id);
            });
            setTargetItems(prev => {
                const existing = prev.find(i => i.id === item.id);
                if (existing) {
                    return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
                }
                return [...prev, { ...item, quantity: 1 }];
            });
        } else {
            setTargetItems(prev => {
                const existing = prev.find(i => i.id === item.id);
                if (existing && existing.quantity > 1) {
                    return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i);
                }
                return prev.filter(i => i.id !== item.id);
            });
            setSourceItems(prev => {
                const existing = prev.find(i => i.id === item.id);
                if (existing) {
                    return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
                }
                return [...prev, { ...item, quantity: 1 }];
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-slate-50 w-full max-w-5xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col h-[80vh] animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-white bg-white flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Split className="w-7 h-7 text-teal-500" />
                            Split by Item
                        </h2>
                        <p className="text-slate-500 font-bold text-xs mt-1">Move specific items to a new bill</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-[20px] transition-all"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 flex overflow-hidden p-8 gap-8">
                    {/* Source Bill */}
                    <div className="flex-1 flex flex-col bg-white rounded-[32px] border border-slate-200 overflow-hidden">
                        <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Order</span>
                            <span className="text-xs font-black text-slate-900">₹{sourceItems.reduce((acc, i) => acc + (i.price * i.quantity), 0)}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {sourceItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all group">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-900">{item.name}</span>
                                        <span className="text-xs text-slate-500 font-medium">₹{item.price} x {item.quantity}</span>
                                    </div>
                                    <button
                                        onClick={() => moveItem(item, true)}
                                        className="p-2 bg-white text-slate-400 hover:text-teal-600 rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Middle divider with icon */}
                    <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center text-slate-300 shadow-sm">
                            <Split className="w-6 h-6" />
                        </div>
                    </div>

                    {/* New Bill */}
                    <div className="flex-1 flex flex-col bg-teal-50/30 rounded-[32px] border-2 border-dashed border-teal-200/50 overflow-hidden">
                        <div className="p-5 bg-teal-500/5 border-b border-teal-100 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-teal-600">New Bill</span>
                            <span className="text-xs font-black text-teal-700">₹{targetItems.reduce((acc, i) => acc + (i.price * i.quantity), 0)}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {targetItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 opacity-50">
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center">
                                        <ChevronRight className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Select items to move</span>
                                </div>
                            ) : (
                                targetItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-teal-100 shadow-sm group">
                                        <button
                                            onClick={() => moveItem(item, false)}
                                            className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <div className="flex flex-col text-right">
                                            <span className="text-sm font-bold text-slate-900">{item.name}</span>
                                            <span className="text-xs text-teal-600 font-bold">₹{item.price} x {item.quantity}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-white border-t border-slate-100 flex gap-4 shrink-0">
                    <button onClick={onClose} className="flex-1 py-5 bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-slate-100 transition-all">Cancel</button>
                    <button
                        onClick={() => onSplitComplete(sourceItems, targetItems)}
                        disabled={targetItems.length === 0 || isSubmitting}
                        className="flex-[2] py-5 bg-teal-500 hover:bg-teal-600 text-white font-black text-lg uppercase tracking-tight rounded-[24px] transition-all disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-3 shadow-xl shadow-teal-100"
                    >
                        {isSubmitting ? 'Processing...' : 'Generate New Bill'} <CheckCircle2 className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
