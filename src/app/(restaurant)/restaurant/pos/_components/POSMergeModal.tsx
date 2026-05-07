'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, CheckCircle2, ArrowRightLeft, Merge, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function POSMergeModal({
    isOpen, onClose, currentTableId, currentOrderId, tables, onSuccess
}: any) {
    const supabase = createClient();
    const [selectedTargetTableId, setSelectedTargetTableId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const currentTable = tables.find((t: any) => t.id === currentTableId);
    const availableTables = tables.filter((t: any) => t.id !== currentTableId);

    const handleMerge = async () => {
        if (!selectedTargetTableId || !currentOrderId) return;
        setIsProcessing(true);
        try {
            const targetTable = tables.find((t: any) => t.id === selectedTargetTableId);

            if (targetTable.status.toLowerCase() === 'occupied') {
                // MERGE: Move items from current order to target table's order
                const { data: targetOrder, error: targetOrderErr } = await supabase
                    .from('restaurant_orders')
                    .select('id')
                    .eq('table_id', selectedTargetTableId)
                    .eq('status', 'pending')
                    .maybeSingle();

                if (targetOrderErr) throw targetOrderErr;
                if (!targetOrder) throw new Error('Target table has no pending order to merge into.');

                // Move items
                const { error: moveErr } = await supabase
                    .from('restaurant_order_items')
                    .update({ order_id: targetOrder.id })
                    .eq('order_id', currentOrderId);

                if (moveErr) throw moveErr;

                // Update target order total (simplified: just trigger a recalculation or handle it here)
                // In a real app, we'd sum all items. For now, we'll just set the old order to cancelled or deleted
                await supabase.from('restaurant_orders').delete().eq('id', currentOrderId);
                await supabase.from('restaurant_tables').update({ status: 'available' }).eq('id', currentTableId);

                toast.success(`Merged Table ${currentTable?.table_number} into Table ${targetTable.table_number}`);
            } else {
                // MOVE: Simply change the table_id on the order
                const { error: moveErr } = await supabase
                    .from('restaurant_orders')
                    .update({ table_id: selectedTargetTableId })
                    .eq('id', currentOrderId);

                if (moveErr) throw moveErr;

                await supabase.from('restaurant_tables').update({ status: 'available' }).eq('id', currentTableId);
                await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('id', selectedTargetTableId);

                toast.success(`Moved order to Table ${targetTable.table_number}`);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Operation failed');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-50 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Table Actions</h2>
                        <p className="text-slate-500 font-bold text-xs mt-1">Move or Merge Table {currentTable?.table_number}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Select Target Table</label>
                        <div className="grid grid-cols-3 gap-3">
                            {availableTables.map((table: any) => (
                                <button
                                    key={table.id}
                                    onClick={() => setSelectedTargetTableId(table.id)}
                                    className={cn(
                                        "p-4 rounded-[20px] border-2 transition-all flex flex-col items-center gap-2",
                                        selectedTargetTableId === table.id
                                            ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                            : "bg-white border-slate-100 text-slate-500 hover:border-slate-300"
                                    )}
                                >
                                    <Utensils className={cn("w-5 h-5", selectedTargetTableId === table.id ? "text-white" : table.status.toLowerCase() === 'occupied' ? "text-amber-500" : "text-slate-300")} />
                                    <span className="text-[10px] font-black uppercase">Table {table.table_number}</span>
                                    <span className={cn("text-[8px] font-bold uppercase tracking-widest", selectedTargetTableId === table.id ? "text-white/60" : table.status.toLowerCase() === 'occupied' ? "text-amber-600" : "text-slate-400")}>
                                        {table.status}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedTargetTableId && (
                        <div className="p-6 bg-slate-50 rounded-[28px] border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-4 text-slate-900">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Table {currentTable?.table_number}</span>
                                </div>
                                <ArrowRightLeft className="w-5 h-5 text-slate-300" />
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        Table {tables.find((t: any) => t.id === selectedTargetTableId)?.table_number}
                                    </span>
                                </div>
                            </div>
                            <p className="mt-4 text-[11px] font-bold text-slate-500 leading-relaxed italic">
                                {tables.find((t: any) => t.id === selectedTargetTableId)?.status.toLowerCase() === 'occupied'
                                    ? "This will combine all items from both tables into a single bill on the target table."
                                    : "This will transfer the entire current bill to the new table."}
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">Cancel</button>
                    <button
                        onClick={handleMerge}
                        disabled={!selectedTargetTableId || isProcessing}
                        className="flex-[2] py-4 bg-indigo-500 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? 'Processing...' : (tables.find((t: any) => t.id === selectedTargetTableId)?.status.toLowerCase() === 'occupied' ? 'Merge Tables' : 'Move Table')}
                        <CheckCircle2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
