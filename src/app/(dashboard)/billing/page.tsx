'use client';

import { useState, useEffect } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { ShoppingCart, Send, Search, Plus, Minus, Loader2 } from 'lucide-react';
import { getActiveFolios, postRestaurantOrder } from './actions-client';
import { getSettings } from '../settings/actions';

const MENU_ITEMS = [
    { id: 1, category: 'Food', name: 'Club Sandwich', price: 450 },
    { id: 2, category: 'Food', name: 'Paneer Tikka', price: 380 },
    { id: 3, category: 'Beverage', name: 'Cold Coffee', price: 200 },
    { id: 4, category: 'Beverage', name: 'Fresh Lime Soda', price: 150 },
    { id: 5, category: 'Food', name: 'Chicken Biryani', price: 550 },
];

type MenuItem = { id: number; category: string; name: string; price: number; qty?: number };

export default function POSPage() {
    const [cart, setCart] = useState<MenuItem[]>([]);
    const [activeFolios, setActiveFolios] = useState<any[]>([]);
    const [selectedBookingId, setSelectedBookingId] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currencySymbol, setCurrencySymbol] = useState('₹');

    useEffect(() => {
        getActiveFolios().then(setActiveFolios);
        getSettings().then(s => setCurrencySymbol(s.currency === 'INR' ? '₹' : '$'));
    }, []);

    const addToCart = (item: MenuItem) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.id === item.id ? { ...c, qty: (c.qty || 0) + 1 } : c));
        } else {
            setCart([...cart, { ...item, qty: 1 }]);
        }
    };

    const updateQty = (id: number, delta: number) => {
        setCart(cart.map(c => {
            if (c.id === id) return { ...c, qty: Math.max(0, (c.qty || 0) + delta) };
            return c;
        }).filter(c => (c.qty || 0) > 0));
    };

    const handleChargeToRoom = async () => {
        if (!selectedBookingId) {
            alert('Please select a room first');
            return;
        }
        setLoading(true);
        try {
            await postRestaurantOrder({
                booking_id: selectedBookingId,
                items: cart,
                total_amount: total
            });
            setCart([]);
            setSelectedBookingId('');
            alert('Order posted to room folio successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to post order.');
        } finally {
            setLoading(false);
        }
    };

    const filteredMenu = MENU_ITEMS.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const subtotal = cart.reduce((acc, curr) => acc + (curr.price * (curr.qty || 0)), 0);
    const gst = subtotal * 0.05; // 5% GST for restaurant
    const total = subtotal + gst;

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full md:h-[calc(100vh-8rem)]">

            {/* Menu / Items Panel */}
            <BentoCard className="flex-[2] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Restaurant POS</h2>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search menu..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredMenu.map(item => (
                            <div onClick={() => addToCart(item)} key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between aspect-[4/3]">
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.category}</span>
                                    <h3 className="font-bold text-slate-800 leading-tight mt-1">{item.name}</h3>
                                </div>
                                <div className="text-lg font-bold text-teal-600 mt-2">{currencySymbol}{item.price}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </BentoCard>

            {/* Cart / Billing Panel */}
            <BentoCard className="flex-[1] flex flex-col min-w-[320px]">
                <div className="p-4 bg-slate-900 text-white rounded-t-[24px]">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-teal-400" />
                        <h2 className="font-semibold text-lg">Current Order</h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
                            <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
                            <p className="text-sm">Order is empty</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex-1">
                                    <h4 className="font-medium text-sm text-slate-800">{item.name}</h4>
                                    <div className="text-xs text-slate-500">{currencySymbol}{item.price} x {item.qty}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-slate-100 flex rounded-lg">
                                        <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-slate-200 rounded-l-lg transition-colors"><Minus className="w-3 h-3" /></button>
                                        <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                                        <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-slate-200 rounded-r-lg transition-colors"><Plus className="w-3 h-3" /></button>
                                    </div>
                                    <div className="font-semibold text-sm w-12 text-right">{currencySymbol}{item.price * (item.qty || 0)}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Subtotal</span><span>{currencySymbol}{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>GST (5%)</span><span>{currencySymbol}{gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
                        <span>Total</span><span>{currencySymbol}{total.toFixed(2)}</span>
                    </div>

                    <div className="pt-4 space-y-3">
                        <div className="relative">
                            <select
                                value={selectedBookingId}
                                onChange={e => setSelectedBookingId(e.target.value)}
                                className="w-full p-3 bg-white border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-center appearance-none"
                            >
                                <option value="">Select Room / Guest</option>
                                {activeFolios.map(folio => (
                                    <option key={folio.id} value={folio.id}>
                                        Room {folio.rooms?.number} - {folio.guests?.name}
                                    </option>
                                ))}
                            </select>
                            <span className="absolute top-[-10px] left-1/2 -translate-x-1/2 bg-white px-2 text-[10px] font-bold text-teal-600 uppercase tracking-widest">Active Folios</span>
                        </div>

                        <button
                            onClick={handleChargeToRoom}
                            disabled={cart.length === 0 || !selectedBookingId || loading}
                            className="w-full py-4 text-white bg-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-teal-400" />}
                            Charge to Room Folio
                        </button>
                        <button disabled={cart.length === 0 || loading} className="w-full py-3 text-slate-600 bg-white border border-slate-200 rounded-xl font-semibold flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm">
                            Direct Cash Receipt
                        </button>
                    </div>
                </div>
            </BentoCard>
        </div>
    );
}
