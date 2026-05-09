'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, CheckCircle2, Wallet, Banknote, CreditCard, Smartphone, User, Bed, Printer, Info, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrencySync } from '@/lib/currency';
import { deductInventoryForOrder } from '../inventory/actions';
import { sendRestaurantOrderWhatsApp } from '@/app/actions/whatsapp';

export function SharedBillingModal({
    isOpen, onClose, customerMobile: initialMobile, customerName: initialName, orderType, selectedRoomId, selectedTableId, currentOrderId, isBillToFolio, cart, subtotal, tax, totalRaw: initialTotalRaw, loyaltySettings, onSuccess, selectedWaiterId
}: any) {
    const supabase = createClient();
    const [customerMobile, setCustomerMobile] = useState(initialMobile || '');
    const [customerName, setCustomerName] = useState(initialName || '');
    const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'Online' | 'Folio'>(isBillToFolio ? 'Folio' : 'Cash');
    const [wallet, setWallet] = useState<any>(null);
    const [redeemPoints, setRedeemPoints] = useState(0);
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [settledOrder, setSettledOrder] = useState<any>(null);

    // Dynamic total calculation
    const discount = isRedeeming ? redeemPoints * (loyaltySettings?.rupee_value_per_point || 0) : 0;
    const finalTotal = Math.max(0, initialTotalRaw - discount);

    const fetchWallet = async () => {
        if (!customerMobile || customerMobile.length < 10) return;
        const { data } = await supabase.from('restaurant_loyalty_wallets').select('*').eq('mobile_number', customerMobile).maybeSingle();
        if (data) setWallet(data);
    };

    useEffect(() => {
        if (isOpen) {
            fetchWallet();
        }
    }, [isOpen, customerMobile]);

    useEffect(() => {
        if (isOpen) {
            if (isBillToFolio) setPaymentMode('Folio');
            else setPaymentMode('Cash');
        }
    }, [isOpen]);

    const handleSettle = async () => {
        setIsSubmitting(true);
        try {
            const { data: billNo } = await supabase.rpc('get_next_restaurant_bill_no');
            const { data: kotNo } = await supabase.rpc('get_next_restaurant_kot_no');

            let custData: any = { id: null };
            // Only exclude room guests (as per requirement to not save them in restaurant DB)
            // Table and Walk-in guests should be saved to the customer database for marketing
            if (orderType !== 'room' && customerMobile && customerMobile.length >= 10) {
                const { data, error: custErr } = await supabase.from('restaurant_customers').upsert({
                    mobile_number: customerMobile,
                    name: customerName || 'Walk-in Guest',
                    last_visit_at: new Date().toISOString()
                }, { onConflict: 'mobile_number' }).select('id').single();

                if (custErr) throw custErr;
                custData = data;
            }

            let order: any;
            if (currentOrderId) {
                const { data: updated, error: updErr } = await supabase.from('restaurant_orders').update({
                    customer_id: custData.id,
                    subtotal,
                    tax,
                    total_amount: finalTotal,
                    paid_amount: finalTotal,
                    balance_amount: 0,
                    payment_status: 'paid',
                    status: 'billed',
                    payment_mode: paymentMode,
                    bill_no: billNo,
                    customer_name: customerName,
                    customer_mobile: customerMobile,
                    loyalty_discount_amount: discount,
                    loyalty_points_redeemed: redeemPoints,
                    waiter_id: selectedWaiterId || null
                }).eq('id', currentOrderId).select().single();

                if (updErr) throw updErr;
                order = updated;
            } else {
                const { data: created, error: orderErr } = await supabase.from('restaurant_orders').insert({
                    order_source: orderType === 'room' ? 'pos_room' : orderType === 'table' ? 'pos_table' : 'pos_walkin',
                    room_id: selectedRoomId || null,
                    table_id: selectedTableId || null,
                    customer_id: custData.id,
                    customer_name: customerName,
                    customer_mobile: customerMobile,
                    subtotal,
                    tax,
                    total_amount: finalTotal,
                    paid_amount: finalTotal,
                    balance_amount: 0,
                    payment_status: 'paid',
                    payment_mode: paymentMode,
                    order_time: new Date().toISOString(),
                    bill_no: billNo,
                    kot_no: kotNo,
                    status: 'billed',
                    loyalty_discount_amount: discount,
                    loyalty_points_redeemed: redeemPoints,
                    waiter_id: selectedWaiterId || null
                }).select().single();

                if (orderErr) throw orderErr;
                order = created;

                if (cart && cart.length > 0) {
                    const orderItems = cart.map((item: any) => ({
                        order_id: order.id,
                        menu_item_id: item.id || item.menu_item_id,
                        quantity: item.quantity,
                        price_at_time: item.price || item.price_at_time,
                        notes: item.notes
                    }));
                    await supabase.from('restaurant_order_items').insert(orderItems);
                }
            }

            await supabase.from('payments').insert({
                restaurant_order_id: order.id,
                amount: finalTotal,
                payment_mode: paymentMode,
                payment_date: new Date().toISOString(),
                notes: `Restaurant Payment - Bill #${billNo}`
            });

            if (selectedTableId) {
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
            }

            const pointsEarned = Math.floor(finalTotal * (loyaltySettings?.points_per_rupee || 0));
            if (pointsEarned > 0) {
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

            setSettledOrder(order);

            // --- AUTO-WHATSAPP (THANK YOU + BILL) ---
            if (customerMobile && customerMobile.trim().length >= 10) {
                try {
                    console.log("[POS] Triggering WhatsApp for order:", order.id, "to:", customerMobile);
                    sendRestaurantOrderWhatsApp(order.id).then((res: any) => {
                        if (res.success) {
                            console.log("[WhatsApp] Order message sent successfully");
                            toast.success("WhatsApp bill sent!");
                        } else {
                            console.warn("[WhatsApp] Failed to send:", res.error || res.message);
                            toast.error(`WhatsApp Error: ${res.error || res.message}`);
                        }
                    }).catch(err => {
                        console.error("[WhatsApp] Promise rejected:", err);
                    });
                } catch (waErr) {
                    console.error("WhatsApp trigger call failed:", waErr);
                }
            } else {
                console.log("[POS] Skipping WhatsApp - mobile too short or missing:", customerMobile);
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={onClose}></div>
            <div className="relative bg-white w-full max-w-4xl h-full max-h-[850px] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {!settledOrder ? (
                    <>
                        {/* Header */}
                        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Checkout</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wider">{orderType}</span>
                                    <span className="text-slate-300 text-xs">•</span>
                                    <span className="text-slate-500 text-xs font-bold">{customerName || 'Walk-in Guest'}</span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                            {/* Left: Item Breakdown */}
                            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50 custom-scrollbar border-r border-slate-100">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Order Summary</h3>
                                <div className="space-y-4">
                                    {cart.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-xs font-black text-slate-400 shadow-sm">
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-800">{item.name}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">₹{item.price} per unit</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-slate-900">{formatCurrencySync(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-12 pt-8 border-t border-slate-200/60 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-slate-400">Subtotal</span>
                                        <span className="font-black text-slate-600">{formatCurrencySync(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-slate-400">Taxes (GST 5%)</span>
                                        <span className="font-black text-slate-600">{formatCurrencySync(tax)}</span>
                                    </div>
                                    {isRedeeming && discount > 0 && (
                                        <div className="flex justify-between text-sm text-emerald-600 animate-in fade-in slide-in-from-right-2 duration-300">
                                            <span className="font-bold">Loyalty Redemption</span>
                                            <span className="font-black">-{formatCurrencySync(discount)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Payment & Loyalty */}
                            <div className="w-full lg:w-[400px] flex flex-col h-full overflow-hidden bg-white">
                                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                                    {/* Customer Info Section (added for verification) */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 px-1">Customer Verification</h4>
                                        <div className="space-y-2">
                                            <div className="relative group">
                                                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    placeholder="WhatsApp Mobile"
                                                    value={customerMobile}
                                                    onChange={(e) => setCustomerMobile(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-teal-500 transition-all text-[11px] font-bold text-slate-900 placeholder:text-slate-400"
                                                />
                                            </div>
                                            <div className="relative group">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    placeholder="Guest Name"
                                                    value={customerName}
                                                    onChange={(e) => setCustomerName(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-teal-500 transition-all text-[11px] font-bold text-slate-900 placeholder:text-slate-400"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Loyalty Section */}
                                    <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="w-4 h-4 text-slate-400" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Redeem Points</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isRedeeming}
                                                onChange={(e) => setIsRedeeming(e.target.checked)}
                                                className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                            />
                                        </div>

                                        {isRedeeming && (
                                            <div className="mt-4 pt-4 border-t border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="flex justify-between items-end mb-4">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Balance</p>
                                                        <p className="text-lg font-black text-slate-900 tracking-tight">{wallet?.points_balance || 0} pts</p>
                                                    </div>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={Math.min(wallet?.points_balance || 0, Math.floor(initialTotalRaw / (loyaltySettings?.rupee_value_per_point || 1)))}
                                                    value={redeemPoints}
                                                    onChange={(e) => setRedeemPoints(parseInt(e.target.value))}
                                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                                />
                                                <div className="flex justify-between mt-2 text-[10px] font-bold">
                                                    <span className="text-slate-400">{redeemPoints} pts</span>
                                                    <span className="text-teal-600">Value: -₹{discount}</span>
                                                </div>
                                            </div>
                                        )}
                                        {!isRedeeming && (
                                            <p className="text-[10px] font-bold text-slate-400 mt-1">Available: {wallet?.points_balance || 0} pts</p>
                                        )}
                                    </div>

                                    {/* Payment Mode */}
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">Payment Mode</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {(isBillToFolio ? (['Folio'] as const) : (['Cash', 'Card', 'Online'] as const)).map(mode => (
                                                <button
                                                    key={mode}
                                                    onClick={() => setPaymentMode(mode)}
                                                    className={cn(
                                                        "flex items-center justify-between p-4 rounded-2xl border-2 transition-all group",
                                                        paymentMode === mode ? "bg-teal-50 border-teal-500 text-teal-900" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                            paymentMode === mode ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                                                        )}>
                                                            {mode === 'Cash' && <Banknote className="w-5 h-5" />}
                                                            {mode === 'Card' && <CreditCard className="w-5 h-5" />}
                                                            {mode === 'Online' && <Smartphone className="w-5 h-5" />}
                                                            {mode === 'Folio' && <Bed className="w-5 h-5" />}
                                                        </div>
                                                        <span className="font-black text-xs uppercase tracking-widest">{mode === 'Folio' ? 'Room Folio' : mode}</span>
                                                    </div>
                                                    {paymentMode === mode && <CheckCircle2 className="w-5 h-5 text-teal-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Fixed Footer Action Panel */}
                                <div className="p-8 bg-slate-900 text-white shrink-0">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Total Payable</p>
                                            <div className="text-3xl font-black tracking-tighter tabular-nums">{formatCurrencySync(finalTotal)}</div>
                                        </div>
                                        {discount > 0 && (
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-400/60">Saved</p>
                                                <p className="text-sm font-black text-teal-400 tracking-tight">₹{discount}</p>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleSettle}
                                        disabled={isSubmitting}
                                        className="w-full py-5 bg-teal-500 hover:bg-teal-400 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-teal-500/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Processing...' : 'Complete Settlement'}
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="p-20 text-center flex flex-col items-center justify-center flex-1">
                        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[36px] flex items-center justify-center mb-8 shadow-xl shadow-emerald-50/50 animate-in zoom-in-50 duration-500">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Settlement Complete</h2>
                        <p className="text-slate-500 font-bold mb-12 max-w-xs text-lg">Transaction #{settledOrder.bill_no} recorded successfully.</p>

                        <div className="flex flex-col gap-4 w-full max-w-sm">
                            <button
                                onClick={printBill}
                                className="w-full py-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-xl uppercase tracking-widest rounded-[28px] transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98]"
                            >
                                <Printer className="w-7 h-7 text-teal-400" /> Print Bill
                            </button>
                            <button
                                onClick={onSuccess}
                                className="w-full py-5 bg-white border-2 border-slate-100 text-slate-400 font-black text-sm uppercase tracking-widest rounded-[24px] hover:bg-slate-50 transition-all mt-2"
                            >
                                Close & New Order
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
