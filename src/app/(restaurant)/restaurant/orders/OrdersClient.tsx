'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { updateOrderStatus } from './actions';
import { BentoCard } from '@/components/ui/BentoCard';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, ChefHat, AlertCircle, Volume2, VolumeX, Ghost, Receipt, Ban, Info, User, Printer, Split, Wallet } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { SharedBillingModal as BillingModal } from '../_components/SharedBillingModal';
import { SharedSplitModal } from '../_components/SharedSplitModal';
import { SharedMergeModal } from '../_components/SharedMergeModal';

type Order = {
    id: string;
    status: 'pending' | 'preparing' | 'ready' | 'served' | 'billed' | 'cancelled' | 'partial';
    total_amount: number;
    payment_status: string;
    payment_mode: string;
    order_source: string;
    order_time: string;
    bill_no: number;
    kot_no: number;
    customer_name: string;
    customer_mobile: string;
    table_id: string | null;
    room_id: string | null;
    table: { table_number: string } | null;
    room: { number: string } | null;
    guest: { name: string } | null;
    items: Array<{
        menu_item_id: string;
        quantity: number;
        notes: string;
        price_at_time: number;
        item: { name: string; is_veg: boolean };
    }>;
};

export default function OrdersClient({ initialData }: { initialData: any }) {
    const [orders, setOrders] = useState<Order[]>(initialData.orders || []);
    const [loading, setLoading] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(initialData.userRole);

    // Modals state
    const [selectedOrderForBilling, setSelectedOrderForBilling] = useState<Order | null>(null);
    const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

    const supabase = createClient();

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('restaurant_orders')
            .select(`
        *,
        table:restaurant_tables(table_number),
        room:rooms(number),
        guest:guests(name),
        items:restaurant_order_items(
          menu_item_id,
          quantity, 
          notes, 
          price_at_time,
          item:restaurant_menu_items(name, is_veg)
        )
      `)
            .in('status', ['pending', 'preparing', 'ready', 'served', 'partial'])
            .not('order_source', 'in', '("pos_walkin","pos_room")')
            .order('order_time', { ascending: false });

        if (data) setOrders(data as any);
    };

    useEffect(() => {
        const saved = localStorage.getItem('geny_pms_order_alerts');
        if (saved === 'true') setIsAudioEnabled(true);

        const channel = supabase
            .channel('restaurant-orders-board')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_orders' }, (payload) => {
                fetchOrders();
                if (payload.eventType === 'INSERT') {
                    if (isAudioEnabled && (window as any).playRestaurantAlert) {
                        (window as any).playRestaurantAlert();
                    }
                    toast.info('New Order Received!');
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAudioEnabled, supabase]);

    useEffect(() => {
        localStorage.setItem('geny_pms_order_alerts', isAudioEnabled.toString());
    }, [isAudioEnabled]);

    const handleStatusUpdate = async (orderId: string, currentStatus: string) => {
        try {
            const res = await updateOrderStatus(orderId, currentStatus);
            if (!res.success) throw new Error(res.error);
            toast.success(`Moved to ${res.nextStatus}`);
            fetchOrders();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleCancel = async (orderId: string) => {
        if (!confirm('Cancel this order?')) return;
        await supabase.from('restaurant_orders').update({ status: 'cancelled' }).eq('id', orderId);
        fetchOrders();
        toast.error('Order Cancelled');
    };

    const handlePrintKOT = (order: Order) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
      <html>
        <head>
          <title>KOT - ${order.kot_no}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Inter', system-ui, -apple-system, sans-serif; 
              width: 80mm; 
              margin: 0; 
              padding: 5mm; 
              background: #fff;
              color: #000;
              -webkit-print-color-adjust: exact;
            }
            .header { text-align: center; margin-bottom: 5mm; }
            .kot-badge { 
              background: #000; 
              color: #fff; 
              padding: 2mm 4mm; 
              display: inline-block; 
              font-weight: 900; 
              font-size: 24px;
              border-radius: 4px;
              margin-bottom: 2mm;
            }
            .time { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #666; }
            
            .info-grid { 
              display: grid; 
              grid-template-cols: 1fr 1fr; 
              gap: 2mm; 
              margin-bottom: 4mm; 
              padding: 3mm 0;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
            }
            .info-item { font-size: 11px; }
            .info-label { font-weight: 800; color: #666; text-transform: uppercase; font-size: 8px; display: block; margin-bottom: 0.5mm; }
            .info-value { font-weight: 900; font-size: 13px; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
            th { 
              text-align: left; 
              font-size: 9px; 
              font-weight: 800; 
              text-transform: uppercase; 
              padding-bottom: 2mm;
              border-bottom: 1px solid #000;
            }
            td { padding: 2.5mm 0; font-size: 12px; vertical-align: top; border-bottom: 0.5px solid #eee; }
            .qty { font-weight: 900; font-size: 14px; text-align: right; width: 15%; padding-right: 2mm; }
            .item-name { font-weight: 800; text-transform: uppercase; }
            .notes { font-style: italic; font-size: 10px; color: #444; margin-top: 1mm; font-weight: 500; }

            .footer { 
              text-align: center; 
              padding-top: 4mm; 
              border-top: 1px dashed #000;
            }
            .total-items { font-weight: 900; font-size: 12px; text-transform: uppercase; }
            .branding { font-size: 8px; font-weight: 800; text-transform: uppercase; color: #aaa; margin-top: 4mm; letter-spacing: 1px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 2mm;">${initialData.hotelSettings?.hotel_name || 'Hotel New Ganga'}</div>
            <div class="kot-badge">KOT #${order.kot_no}</div>
            <div class="time">${new Date(order.order_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Section</span>
              <span class="info-value">${order.order_source.replace('pos_', '').toUpperCase()}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Location</span>
              <span class="info-value">${order.room?.number ? `ROOM ${order.room.number}` : order.table?.table_number ? `TABLE ${order.table.table_number}` : 'WALK-IN'}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 85%;">Item Description</th>
                <th style="text-align: right;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>
                    <div class="item-name">${item.item.name}</div>
                    ${item.notes ? `<div class="notes">> ${item.notes}</div>` : ''}
                  </td>
                  <td class="qty">${item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div class="total-items">Total Quantity: ${order.items.reduce((acc, i) => acc + i.quantity, 0)}</div>
            <div class="branding">Generated by Geny PMS Pro</div>
          </div>
        </body>
      </html>
    `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const getStatusConfig = (status: Order['status']) => {
        switch (status) {
            case 'pending': return { label: 'New', color: 'bg-red-500 text-white', icon: AlertCircle };
            case 'preparing': return { label: 'Processing', color: 'bg-amber-500 text-white', icon: ChefHat };
            case 'ready': return { label: 'Ready', color: 'bg-blue-500 text-white', icon: Info };
            case 'served': return { label: 'Served', color: 'bg-emerald-500 text-white', icon: CheckCircle2 };
            case 'partial': return { label: 'Partial', color: 'bg-indigo-500 text-white', icon: Wallet };
            default: return { label: status, color: 'bg-slate-500 text-white', icon: Ghost };
        }
    };

    return (
        <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto h-full pb-20 px-4 md:px-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-[32px] font-black text-slate-900 leading-tight tracking-tight">Order Control System</h1>
                    <p className="text-slate-500 font-medium mt-1">Real-time lifecycle management for restaurant & room service.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="hidden md:flex items-center gap-6 pr-6 border-r border-slate-200 mr-3">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Cases</p>
                            <p className="text-xl font-black text-slate-800">{orders.length}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unpaid</p>
                            <p className="text-xl font-black text-red-600">{orders.filter(o => o.payment_status !== 'paid').length}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                        className={cn(
                            "flex items-center gap-3 px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95",
                            isAudioEnabled
                                ? "bg-emerald-500 text-white shadow-emerald-200"
                                : "bg-slate-100 text-slate-500 grayscale opacity-70"
                        )}
                    >
                        {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        Alerts {isAudioEnabled ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {orders.length === 0 ? (
                    <div className="col-span-full h-[400px] flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <Ghost className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-bold">No Active Orders</p>
                        <p className="text-sm font-medium opacity-60">Ready for next arrival...</p>
                    </div>
                ) : (
                    orders.map(order => {
                        const config = getStatusConfig(order.status);
                        return (
                            <BentoCard key={order.id} className="relative group overflow-hidden bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 p-0 flex flex-col min-h-[420px] rounded-3xl">
                                <div className={cn("h-2 w-full", config.color)} />
                                <div className="p-6 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{order.order_source.replace('_', ' ')}</span>
                                                <div className={cn("w-1.5 h-1.5 rounded-full", order.payment_status === 'paid' ? 'bg-emerald-500' : 'bg-red-500')} />
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">
                                                {order.room?.number ? `ROOM ${order.room.number}` : order.table?.table_number ? `TABLE ${order.table.table_number}` : 'TAKEAWAY'}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                <Clock className="w-3 h-3" />
                                                {formatDistanceToNow(new Date(order.order_time))} ago
                                            </div>
                                        </div>
                                        <div className={cn("p-3 rounded-2xl shadow-sm", config.color)}>
                                            <config.icon className="w-6 h-6" />
                                        </div>
                                    </div>

                                    {(order.customer_name || order.customer_mobile) && (
                                        <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="p-2 bg-white rounded-xl shadow-xs">
                                                <User className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-black text-slate-800 truncate">{order.customer_name || 'Walk-in'}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{order.customer_mobile || 'No Mobile'}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 space-y-3 mb-6 bg-slate-50/30 -mx-6 px-6 py-4 border-y border-slate-100/60">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Order Items</p>
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-start gap-4">
                                                <div className="flex gap-3 min-w-0">
                                                    <span className="text-sm font-black text-teal-600 shrink-0">{item.quantity}x</span>
                                                    <span className="text-sm font-bold text-slate-700 truncate">{item.item?.name}</span>
                                                </div>
                                                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", item.item?.is_veg ? 'bg-emerald-500' : 'bg-red-500')} />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between items-center mb-6 px-1">
                                        <div className="flex flex-col">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">KOT NO</p>
                                            <p className="text-xs font-bold text-slate-600">#{order.kot_no || '---'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</p>
                                            <p className="text-lg font-black text-slate-900 tracking-tight">₹{order.total_amount}</p>
                                        </div>
                                    </div>

                                    <div className="mt-auto space-y-3 pt-6 border-t border-slate-100/60">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrderForBilling(order);
                                                    setIsSplitModalOpen(true);
                                                }}
                                                className="flex-1 h-[38px] flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all duration-200"
                                            >
                                                <Split className="w-3.5 h-3.5" />
                                                Split
                                            </button>

                                            {order.table && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedOrderForBilling(order);
                                                        setIsMergeModalOpen(true);
                                                    }}
                                                    className="flex-1 h-[38px] flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all duration-200"
                                                >
                                                    <Split className="w-3.5 h-3.5 rotate-180" />
                                                    Merge
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex gap-2 items-center">
                                            <div className="flex gap-1.5 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                                                <button
                                                    onClick={() => handleCancel(order.id)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all active:scale-90"
                                                    title="Cancel Order"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => handlePrintKOT(order)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-100 transition-all active:scale-90"
                                                    title="Print KOT"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {(order.status === 'served' || order.status === 'partial') ? (
                                                <button
                                                    onClick={() => {
                                                        setSelectedOrderForBilling(order);
                                                        setIsBillingModalOpen(true);
                                                    }}
                                                    className="flex-1 h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-slate-900 border border-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
                                                >
                                                    <Receipt className="w-4 h-4 text-emerald-400" />
                                                    Billing
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleStatusUpdate(order.id, order.status)}
                                                    className={cn(
                                                        "flex-1 h-[48px] flex items-center justify-center gap-2 rounded-2xl border font-black text-xs uppercase tracking-widest text-white transition-all shadow-lg active:scale-[0.98]",
                                                        order.status === 'pending' ? 'bg-teal-500 border-teal-400 shadow-teal-100' :
                                                            order.status === 'preparing' ? 'bg-orange-500 border-orange-400 shadow-orange-100' :
                                                                'bg-blue-500 border-blue-400 shadow-blue-100'
                                                    )}
                                                >
                                                    {order.status === 'pending' ? 'Accept Order' : 'Mark Served'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </BentoCard>
                        );
                    })
                )}
            </div>

            {selectedOrderForBilling && (
                <BillingModal
                    isOpen={isBillingModalOpen}
                    onClose={() => {
                        setIsBillingModalOpen(false);
                        setSelectedOrderForBilling(null);
                    }}
                    customerMobile={selectedOrderForBilling.customer_mobile}
                    customerName={selectedOrderForBilling.customer_name}
                    orderType={selectedOrderForBilling.order_source.includes('room') ? 'room' : 'table'}
                    selectedRoomId={selectedOrderForBilling.room_id}
                    selectedTableId={selectedOrderForBilling.table_id}
                    currentOrderId={selectedOrderForBilling.id}
                    isBillToFolio={selectedOrderForBilling.payment_mode === 'Folio'}
                    cart={selectedOrderForBilling.items.map((i: any) => ({
                        ...i,
                        name: i.item.name,
                        price: i.price_at_time
                    }))}
                    subtotal={selectedOrderForBilling.items.reduce((s: number, i: any) => s + (i.quantity * i.price_at_time), 0)}
                    tax={selectedOrderForBilling.items.reduce((s: number, i: any) => s + (i.quantity * i.price_at_time), 0) * 0.05}
                    totalRaw={selectedOrderForBilling.total_amount}
                    loyaltySettings={initialData.loyaltySettings}
                    onSuccess={() => {
                        setIsBillingModalOpen(false);
                        setSelectedOrderForBilling(null);
                        fetchOrders();
                    }}
                />
            )}

            {isSplitModalOpen && selectedOrderForBilling && (
                <SharedSplitModal
                    isOpen={isSplitModalOpen}
                    onClose={() => {
                        setIsSplitModalOpen(false);
                        setSelectedOrderForBilling(null);
                    }}
                    originalOrder={selectedOrderForBilling}
                    originalItems={selectedOrderForBilling.items.map((i: any) => ({
                        ...i,
                        name: i.item.name,
                        price: i.price_at_time
                    }))}
                    onSplitComplete={() => {
                        fetchOrders();
                        toast.success('Bill split successfully');
                    }}
                />
            )}

            {isMergeModalOpen && selectedOrderForBilling && (
                <SharedMergeModal
                    isOpen={isMergeModalOpen}
                    onClose={() => {
                        setIsMergeModalOpen(false);
                        setSelectedOrderForBilling(null);
                    }}
                    currentTableId={selectedOrderForBilling.table_id}
                    currentOrderId={selectedOrderForBilling.id}
                    tables={initialData.tables}
                    onSuccess={() => {
                        fetchOrders();
                        toast.success('Tables merged successfully');
                    }}
                />
            )}
        </div>
    );
}
