'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, CheckCircle2, Wallet, Banknote, CreditCard, Gift, Bed, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { deductInventoryForOrder } from '../../inventory/actions';

export function POSBillingModal({
    isOpen, onClose, customerMobile, customerName, orderType, selectedRoomId, selectedTableId, currentOrderId, isBillToFolio, cart, subtotal, tax, totalRaw, loyaltySettings, onSuccess
}: any) {
    const supabase = createClient();
    const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'Online' | 'Folio'>(isBillToFolio ? 'Folio' : 'Cash');
    const [wallet, setWallet] = useState<any>(null);
    const [redeemPoints, setRedeemPoints] = useState(0);
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [settledOrder, setSettledOrder] = useState<any>(null);
    const [paidAmount, setPaidAmount] = useState('0');

    const discount = isRedeeming ? redeemPoints * (loyaltySettings?.rupee_value_per_point || 0) : 0;
    const finalTotal = Math.max(0, totalRaw - discount);

    const fetchWallet = async () => {
        if (!customerMobile || customerMobile.length < 10) return;
        const { data } = await supabase.from('restaurant_loyalty_wallets').select('*').eq('mobile_number', customerMobile).maybeSingle();
        if (data) setWallet(data);
    };

    useEffect(() => {
        if (isOpen) {
            fetchWallet();
            if (isBillToFolio) setPaymentMode('Folio');
            else setPaymentMode('Cash');
            setPaidAmount(finalTotal.toFixed(2));
        }
    }, [isOpen, customerMobile, isBillToFolio, finalTotal]);

    const handleSettle = async () => {
        setIsSubmitting(true);
        try {
            const { data: billNo } = await supabase.rpc('get_next_restaurant_bill_no');
            const { data: kotNo } = await supabase.rpc('get_next_restaurant_kot_no');

            let custData: any = { id: null };
            if (customerMobile && customerMobile.length >= 10) {
                const { data, error: custErr } = await supabase.from('restaurant_customers').upsert({
                    mobile_number: customerMobile,
                    name: customerName || 'Walk-in Guest',
                    last_visit_at: new Date().toISOString()
                }, { onConflict: 'mobile_number' }).select('id').single();

                if (custErr) throw custErr;
                custData = data;
            }

            const isPartial = parseFloat(paidAmount) < finalTotal;
            const newPaidTotal = (currentOrderId ? 0 : 0) + parseFloat(paidAmount); // Simplification for new/existing

            let order: any;
            if (currentOrderId) {
                // Update existing pending order
                const { data: existingOrder } = await supabase.from('restaurant_orders').select('paid_amount').eq('id', currentOrderId).single();
                const isFolio = paymentMode === 'Folio';
                const totalPaidSoFar = isFolio ? 0 : ((existingOrder?.paid_amount || 0) + parseFloat(paidAmount || '0'));
                const newBalance = isFolio ? finalTotal : (finalTotal - totalPaidSoFar);

                const { data: updated, error: updErr } = await supabase.from('restaurant_orders').update({
                    customer_id: custData.id,
                    subtotal,
                    tax,
                    total_amount: finalTotal,
                    paid_amount: totalPaidSoFar,
                    balance_amount: newBalance,
                    payment_status: isFolio ? 'charged_to_room' : (newBalance <= 0 ? 'paid' : 'partial'),
                    status: (isFolio || newBalance <= 0) ? 'billed' : 'partial',
                    payment_mode: isFolio ? 'Room Folio' : paymentMode,
                    bill_no: billNo
                }).eq('id', currentOrderId).select().single();

                if (updErr) throw updErr;
                order = updated;
            } else {
                const isFolio = paymentMode === 'Folio';
                const { data: created, error: orderErr } = await supabase.from('restaurant_orders').insert({
                    order_source: orderType === 'room' ? 'pos_room' : orderType === 'table' ? 'pos_table' : 'pos_walkin',
                    room_id: selectedRoomId || null,
                    table_id: selectedTableId || null,
                    booking_id: isFolio ? (selectedRoomId ? (await (async () => {
                        const { data: b } = await supabase.from('bookings').select('id').eq('room_id', selectedRoomId).eq('status', 'Active').single();
                        return b?.id;
                    })()) : null) : null,
                    customer_id: custData.id,
                    customer_name: customerName,
                    customer_mobile: customerMobile,
                    subtotal,
                    tax,
                    total_amount: finalTotal,
                    paid_amount: isFolio ? 0 : parseFloat(paidAmount || '0'),
                    balance_amount: isFolio ? finalTotal : (finalTotal - parseFloat(paidAmount || '0')),
                    payment_status: isFolio ? 'charged_to_room' : (parseFloat(paidAmount || '0') >= finalTotal ? 'paid' : 'partial'),
                    payment_mode: isFolio ? 'Room Folio' : paymentMode,
                    order_time: new Date().toISOString(),
                    bill_no: billNo,
                    kot_no: kotNo,
                    status: (isFolio || parseFloat(paidAmount) >= finalTotal) ? 'billed' : 'partial'
                }).select().single();

                if (orderErr) throw orderErr;
                order = created;

                // Sync items if it's a new order (already saved for existing)
                const orderItems = cart.map((item: any) => ({
                    order_id: order.id,
                    menu_item_id: item.id,
                    quantity: item.quantity,
                    price_at_time: item.price,
                    notes: item.notes
                }));
                await supabase.from('restaurant_order_items').insert(orderItems);
            }

            // Log payment record if not folio
            if (paymentMode !== 'Folio' && parseFloat(paidAmount) > 0) {
                await supabase.from('payments').insert({
                    restaurant_order_id: order.id,
                    amount: parseFloat(paidAmount),
                    method: paymentMode,
                    created_at: new Date().toISOString()
                });
            }

            // If Billed to Folio, add to extra_charges
            if (paymentMode === 'Folio' && order.booking_id) {
                const { error: extraErr } = await supabase.from('extra_charges').insert({
                    booking_id: order.booking_id,
                    description: `Restaurant Order #${billNo}`,
                    amount: finalTotal
                });

                if (!extraErr) {
                    await supabase.rpc('update_booking_total_bill', {
                        p_booking_id: order.booking_id
                    });
                }
            }

            if (selectedTableId && order.status === 'billed') {
                await supabase.from('restaurant_tables').update({ status: 'available' }).eq('id', selectedTableId);
            }

            if (isRedeeming && wallet) {
                await supabase.from('restaurant_loyalty_wallets').update({
                    points_balance: (wallet.points_balance || 0) - redeemPoints
                }).eq('mobile_number', customerMobile);
            }

            // --- AUTO-INVENTORY DEDUCTION ---
            try {
                await deductInventoryForOrder(order.id);
            } catch (invErr) {
                console.error("Inventory deduction failed:", invErr);
                // We don't block settlement if inventory deduction fails, but we log it
            }

            const pointsEarned = Math.floor(finalTotal * (loyaltySettings?.points_per_rupee || 0));
            if (pointsEarned > 0 && customerMobile && customerMobile.length >= 10) {
                // Check if customer exists in restaurant database before loyalty ops
                const { data: customerRecord } = await supabase
                    .from('restaurant_customers')
                    .select('id')
                    .eq('mobile_number', customerMobile)
                    .maybeSingle();

                if (customerRecord) {
                    const { data: existingWallet } = await supabase.from('restaurant_loyalty_wallets').select('*').eq('mobile_number', customerMobile).maybeSingle();
                    if (existingWallet) {
                        await supabase.from('restaurant_loyalty_wallets').update({
                            points_balance: (existingWallet.points_balance || 0) + pointsEarned
                        }).eq('mobile_number', customerMobile);
                    } else {
                        await supabase.from('restaurant_loyalty_wallets').insert({
                            mobile_number: customerMobile,
                            points_balance: pointsEarned
                        });
                    }
                }
            }

            setSettledOrder(order);

            // --- AUTO-WHATSAPP (THANK YOU + BILL) ---
            if (customerMobile && customerMobile.length >= 10) {
                try {
                    const { sendRestaurantOrderWhatsApp } = await import('@/app/actions/whatsapp');
                    // We don't await this to avoid blocking the UI, but we log errors
                    sendRestaurantOrderWhatsApp(order.id).then((res: any) => {
                        if (res.success) console.log("[WhatsApp] Order message sent");
                        else console.warn("[WhatsApp] Failed to send:", res.error || res.message);
                    });
                } catch (waErr) {
                    console.error("WhatsApp trigger failed:", waErr);
                }
            }
        } catch (err: any) {
            toast.error(err.message || 'Settlement failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const printBill = () => {
        if (settledOrder) window.open(`/print-pos-bill/${settledOrder.id}`, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {!settledOrder ? (
                    <>
                        <div className="p-10 border-b border-slate-50 flex justify-between items-start shrink-0">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Final Settlement</h2>
                                <p className="text-slate-500 font-bold mt-1">Review items & select payment mode</p>
                            </div>
                            <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-[20px] transition-all"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-10 space-y-10 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Paying Now</span>
                                    <div className="relative">
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 font-black text-slate-300">₹</span>
                                        <input
                                            type="number"
                                            value={paidAmount}
                                            onChange={(e) => setPaidAmount(e.target.value)}
                                            className="w-full pl-4 bg-transparent outline-none text-2xl font-black text-slate-900 tracking-tighter"
                                        />
                                    </div>
                                </div>
                                <div className="p-6 bg-emerald-50/50 rounded-[32px] border border-emerald-100">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Points Applied</span>
                                    <div className="text-2xl font-black text-emerald-600 mt-1">-₹{discount}</div>
                                </div>
                            </div>

                            {wallet && wallet.points > 0 && (
                                <div className="p-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[40px] text-white shadow-lg shadow-indigo-100">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <Wallet className="w-6 h-6 text-indigo-200" />
                                            <div>
                                                <h4 className="font-bold text-sm">Loyalty Points</h4>
                                                <p className="text-xs text-white/70 font-bold">{(wallet.points_balance || 0)} Points Available</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Redeem</span>
                                            <button
                                                onClick={() => setIsRedeeming(!isRedeeming)}
                                                className={cn("w-14 h-8 rounded-full border-2 transition-all p-1 relative", isRedeeming ? "bg-white border-white" : "border-white/30")}
                                            >
                                                <div className={cn("w-5 h-5 rounded-full transition-all", isRedeeming ? "bg-indigo-600 ml-6" : "bg-white")} />
                                            </button>
                                        </div>
                                    </div>
                                    {isRedeeming && (
                                        <div className="space-y-4 pt-4 border-t border-white/20">
                                            <input
                                                type="range"
                                                min={0}
                                                max={Math.min(wallet.points_balance || 0, Math.floor(totalRaw / (loyaltySettings?.rupee_value_per_point || 1)))}
                                                value={redeemPoints}
                                                onChange={(e) => setRedeemPoints(parseInt(e.target.value))}
                                                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                                            />
                                            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-white/80">
                                                <span>Points: {redeemPoints}</span>
                                                <span>Value: -₹{discount}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 px-2">Payment Mode</h4>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {(isBillToFolio ? (['Folio'] as const) : (['Cash', 'Card', 'Online'] as const)).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setPaymentMode(mode)}
                                            className={cn(
                                                "p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-3 group/btn",
                                                paymentMode === mode ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-100 text-slate-500 hover:border-slate-300 shadow-sm"
                                            )}
                                        >
                                            {mode === 'Cash' && <Banknote className={cn("w-6 h-6", paymentMode === mode ? "text-emerald-400" : "text-slate-400")} />}
                                            {mode === 'Card' && <CreditCard className={cn("w-6 h-6", paymentMode === mode ? "text-blue-400" : "text-slate-400")} />}
                                            {mode === 'Online' && <Gift className={cn("w-6 h-6", paymentMode === mode ? "text-orange-400" : "text-slate-400")} />}
                                            {mode === 'Folio' && <Bed className={cn("w-6 h-6", paymentMode === mode ? "text-teal-400" : "text-slate-400")} />}
                                            <span className="text-[11px] font-black uppercase tracking-widest">{mode === 'Folio' ? 'Room Folio' : mode}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
                            <button onClick={onClose} className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-600 font-black text-sm uppercase tracking-widest rounded-[24px] hover:bg-slate-50 transition-all">Cancel</button>
                            <button
                                onClick={handleSettle}
                                disabled={isSubmitting}
                                className="flex-[2] py-5 bg-teal-500 hover:bg-teal-600 text-white font-black text-lg uppercase tracking-tight rounded-[24px] transition-all active:scale-[0.98] shadow-xl shadow-teal-100 flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? 'Processing...' : 'Settle Bill'} <CheckCircle2 className="w-6 h-6" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="p-16 text-center flex flex-col items-center">
                        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[36px] flex items-center justify-center mb-8 shadow-xl shadow-emerald-50">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Settled!</h2>
                        <p className="text-slate-500 font-bold mb-10 max-w-xs text-lg">Order #{settledOrder.bill_no} has been successfully recorded.</p>

                        <div className="flex flex-col gap-4 w-full">
                            <button
                                onClick={printBill}
                                className="w-full py-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-xl uppercase tracking-widest rounded-[28px] transition-all flex items-center justify-center gap-3 shadow-2xl"
                            >
                                <Printer className="w-7 h-7" /> Print Bill
                            </button>
                            <button
                                onClick={onSuccess}
                                className="w-full py-5 bg-white border-2 border-slate-100 text-slate-400 font-black text-sm uppercase tracking-widest rounded-[24px] hover:bg-slate-50 transition-all mt-2"
                            >
                                Start New Order
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
