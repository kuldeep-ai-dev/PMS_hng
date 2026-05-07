'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, ArrowRight, Save, Receipt, Split } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function SharedSplitModal({
    isOpen, onClose, originalOrder, originalItems, onSplitComplete
}: any) {
    const supabase = createClient();
    const [splitItems, setSplitItems] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const moveItem = (item: any, amount: number) => {
        setSplitItems(prev => {
            const existing = prev.find(i => i.menu_item_id === item.menu_item_id);
            if (existing) {
                const newQty = existing.quantity + amount;
                if (newQty <= 0) return prev.filter(i => i.menu_item_id !== item.menu_item_id);
                if (newQty > item.maxQty) return prev;
                return prev.map(i => i.menu_item_id === item.menu_item_id ? { ...i, quantity: newQty } : i);
            }
            if (amount <= 0) return prev;
            return [...prev, { ...item, quantity: amount, maxQty: item.quantity }];
        });
    };

    const handleSplit = async () => {
        if (splitItems.length === 0) return;
        setIsProcessing(true);
        try {
            const { data: newOrder, error: orderErr } = await supabase
                .from('restaurant_orders')
                .insert([{
                    ...originalOrder,
                    id: undefined,
                    bill_no: undefined,
                    kot_no: undefined,
                    created_at: undefined,
                    total_amount: 0,
                    status: 'pending',
                    payment_status: 'unpaid'
                }])
                .select()
                .single();

            if (orderErr) throw orderErr;

            for (const item of splitItems) {
                // Remove from original
                if (item.quantity === item.maxQty) {
                    await supabase.from('restaurant_order_items').delete().eq('order_id', originalOrder.id).eq('menu_item_id', item.menu_item_id);
                } else {
                    await supabase.from('restaurant_order_items').update({ quantity: item.maxQty - item.quantity }).eq('order_id', originalOrder.id).eq('menu_item_id', item.menu_item_id);
                }

                // Add to new
                await supabase.from('restaurant_order_items').insert([{
                    order_id: newOrder.id,
                    menu_item_id: item.menu_item_id,
                    quantity: item.quantity,
                    price_at_time: item.price_at_time,
                    notes: item.notes
                }]);
            }

            toast.success('Bill split successfully');
            onSplitComplete();
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Split failed');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-50 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Split Bill</h2>
                        <p className="text-slate-500 font-bold text-xs mt-1">Move items to a new bill</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Left Pane: Original Order */}
                    <div className="flex-1 p-8 border-r border-slate-50 overflow-y-auto">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Original Items</h3>
                        <div className="space-y-3">
                            {originalItems.map((item: any) => {
                                const moved = splitItems.find(i => i.menu_item_id === (item.id || item.menu_item_id))?.quantity || 0;
                                const remaining = (item.quantity) - moved;
                                return (
                                    <div key={item.id || item.menu_item_id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm text-slate-800">{item.name || item.item?.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{remaining} Remaining</p>
                                        </div>
                                        {remaining > 0 && (
                                            <button
                                                onClick={() => moveItem({ ...item, menu_item_id: item.id || item.menu_item_id, name: item.name || item.item?.name }, 1)}
                                                className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm border border-slate-100 hover:bg-indigo-600 hover:text-white transition-all"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Pane: New Split Order */}
                    <div className="flex-1 p-8 bg-slate-50/30 overflow-y-auto">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-6">New Target Bill</h3>
                        <div className="space-y-3">
                            {splitItems.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[32px]">
                                    <Split className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Move pieces here</p>
                                </div>
                            ) : (
                                splitItems.map((item) => (
                                    <div key={item.menu_item_id} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between animate-in slide-in-from-right-4 duration-200">
                                        <div>
                                            <p className="font-bold text-sm text-slate-800">{item.name}</p>
                                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{item.quantity} Piece(s)</p>
                                        </div>
                                        <button
                                            onClick={() => moveItem(item, -1)}
                                            className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-[20px] hover:bg-slate-50 transition-all">Cancel</button>
                    <button
                        onClick={handleSplit}
                        disabled={splitItems.length === 0 || isProcessing}
                        className="flex-[2] py-4 bg-indigo-500 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-[20px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? 'Processing...' : 'Generate New Bill'} <Save className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
