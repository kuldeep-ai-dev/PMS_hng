'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ShoppingCart, Plus, Minus, ChevronLeft, Utensils, CheckCircle, Home, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type MenuItem = {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    is_veg: boolean;
    category: { name: string };
};

type CartItem = MenuItem & { quantity: number; notes: string };

type RestaurantInfo = {
    restaurant_name: string;
    logo_url: string;
    tagline: string;
};

type Props = {
    type: 'room' | 'table';
    id: string;
};

export default function PremiumQRMenu({ type, id }: Props) {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [locationName, setLocationName] = useState('');
    const [locationError, setLocationError] = useState<string | null>(null);

    // Branding State
    const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
    const [showSplash, setShowSplash] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        const initData = async () => {
            await Promise.all([fetchMenu(), fetchLocation(), fetchBranding()]);
            // Hold the splash screen for at least 2.5 seconds for a premium feel
            setTimeout(() => {
                setShowSplash(false);
            }, 2500);
        };
        initData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchBranding = async () => {
        const { data } = await supabase
            .from('restaurant_settings')
            .select('*')
            .limit(1)
            .single();

        if (data) {
            setRestaurantInfo(data);
        }
    };

    const fetchLocation = async () => {
        if (type === 'room') {
            const { data, error } = await supabase.from('rooms').select('number').eq('id', id).single();
            if (error) setLocationError(error.message);
            else if (!data) setLocationError('Room not found');
            else setLocationName(data.number);
        } else {
            const { data, error } = await supabase.from('restaurant_tables').select('table_number').eq('id', id).single();
            if (error) setLocationError(error.message);
            else if (!data) setLocationError('Table not found');
            else setLocationName(data.table_number);
        }
    };

    const fetchMenu = async () => {
        const { data } = await supabase
            .from('restaurant_menu_items')
            .select('*, category:restaurant_categories(name)')
            .eq('is_available', true)
            .order('name');

        if (data) {
            setMenuItems(data as any);
            const cats = Array.from(new Set(data.map((item: any) => item.category?.name))).filter(Boolean) as string[];
            setCategories(['All', ...cats]);
        }
        setLoading(false);
    };

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { ...item, quantity: 1, notes: '' }];
        });
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev =>
            prev
                .map(i => i.id === itemId ? { ...i, quantity: i.quantity + delta } : i)
                .filter(i => i.quantity > 0)
        );
    };

    const filteredItems = menuItems.filter(item =>
        selectedCategory === 'All' || item.category?.name === selectedCategory
    );

    const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    const placeOrder = async () => {
        if (cart.length === 0) return;
        setSubmitting(true);

        try {
            const { data: kotNo } = await supabase.rpc('get_next_restaurant_kot_no');

            const { data: order, error: orderError } = await supabase
                .from('restaurant_orders')
                .insert([{
                    room_id: type === 'room' ? id : null,
                    table_id: type === 'table' ? id : null,
                    order_source: type === 'room' ? 'qr_room' : 'qr_table',
                    status: 'pending',
                    total_amount: total,
                    payment_status: 'unpaid',
                    kot_no: kotNo
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            const orderItems = cart.map(item => ({
                order_id: order.id,
                menu_item_id: item.id,
                quantity: item.quantity,
                price_at_time: item.price,
                notes: item.notes || null
            }));

            await supabase.from('restaurant_order_items').insert(orderItems);

            if (type === 'table') {
                await supabase.from('restaurant_tables').update({ status: 'Occupied' }).eq('id', id);
            }

            setOrderPlaced(true);
        } catch (e) {
            alert('Failed to place order. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (locationError) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-10 rounded-[40px] shadow-2xl">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <X className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-2">Location Not Found</h1>
                    <p className="text-slate-400 mb-4">Please scan the QR code again or contact staff.</p>
                    <div className="bg-red-500/10 text-red-400 text-[10px] sm:text-xs p-3 rounded-xl border border-red-500/20 break-all text-left">
                        Error: {locationError}
                    </div>
                </motion.div>
            </div>
        );
    }

    if (showSplash) {
        return (
            <AnimatePresence>
                <motion.div
                    key="splash"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden"
                >
                    {/* Glowing background orchestrations */}
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                        <div className="w-[60vw] h-[60vw] bg-indigo-500/20 blur-[120px] rounded-full mix-blend-screen"></div>
                        <div className="w-[50vw] h-[50vw] bg-purple-500/20 blur-[100px] rounded-full mix-blend-screen -ml-[20vw]"></div>
                    </motion.div>

                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        {restaurantInfo?.logo_url ? (
                            <motion.img
                                initial={{ scale: 0.8, rotate: -5 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.4 }}
                                src={restaurantInfo.logo_url}
                                alt="Restaurant Logo"
                                className="w-32 h-32 md:w-48 md:h-48 object-contain drop-shadow-2xl mb-8"
                            />
                        ) : (
                            <motion.div
                                initial={{ scale: 0.8, rotate: -5 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.4 }}
                                className="w-32 h-32 md:w-48 md:h-48 bg-slate-800/80 backdrop-blur-md rounded-[32px] flex items-center justify-center border border-white/10 shadow-2xl mb-8"
                            >
                                <Utensils className="w-12 h-12 md:w-16 md:h-16 text-white/50" />
                            </motion.div>
                        )}
                        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight text-center mb-3">
                            {restaurantInfo?.restaurant_name || 'Welcome'}
                        </h1>
                        <p className="text-sm md:text-base text-slate-400 font-medium tracking-widest uppercase text-center max-w-[80%]">
                            {restaurantInfo?.tagline || 'Experience Culinary Excellence'}
                        </p>
                    </motion.div>

                    {/* Loader */}
                    <div className="absolute bottom-24 flex flex-col items-center gap-3">
                        <div className="flex gap-2">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                                    className="w-2.5 h-2.5 bg-white/40 rounded-full"
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }

    if (orderPlaced) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[300px] h-[300px] bg-emerald-500/20 blur-[100px] rounded-full"></div>
                </div>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-10 rounded-[40px] shadow-2xl max-w-sm w-full relative z-10"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                        className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30"
                    >
                        <CheckCircle className="w-12 h-12 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Order Placed!</h1>
                    <p className="text-slate-300 mb-8 leading-relaxed">
                        Your {type === 'room' ? 'in-room dining' : 'table'} order for <strong>{type === 'room' ? `Room ${locationName}` : `Table ${locationName}`}</strong> is sent to the kitchen.
                    </p>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setOrderPlaced(false); setCart([]); setShowCart(false); }}
                        className="w-full py-4 bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold rounded-2xl transition-all"
                    >
                        Order More Items
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-32 flex flex-col">
            {/* Premium Header */}
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="sticky top-0 z-20 bg-white/80 backdrop-blur-2xl border-b border-slate-100/50 px-5 py-4 flex items-center gap-4 shadow-sm"
            >
                {restaurantInfo?.logo_url ? (
                    <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm bg-white border border-slate-100 p-1 flex items-center justify-center">
                        <img src={restaurantInfo.logo_url} className="w-full h-full object-contain" alt="Logo" />
                    </div>
                ) : (
                    <div className="w-12 h-12 bg-gradient-to-tr from-slate-900 to-slate-800 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                        {type === 'room' ? <Home className="w-6 h-6 text-white" /> : <Utensils className="w-6 h-6 text-white" />}
                    </div>
                )}
                <div className="flex-1">
                    <h1 className="font-black text-slate-900 text-xl leading-tight tracking-tight">
                        {restaurantInfo?.restaurant_name || 'Restaurant Menu'}
                    </h1>
                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-0.5">
                        {type === 'room' ? `Room ${locationName} Dining` : `Table ${locationName}`}
                    </p>
                </div>
            </motion.div>

            {/* Category Glass Tabs */}
            <div className="sticky top-[73px] z-10 bg-slate-50/80 backdrop-blur-xl px-4 py-3">
                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2 -mb-2">
                    {categories.map((cat, idx) => (
                        <motion.button
                            key={cat}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${selectedCategory === cat
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                                }`}
                        >
                            {cat}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Menu Grid */}
            <div className="flex-1">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <AnimatePresence>
                            {filteredItems.map((item, idx) => {
                                const cartItem = cart.find(i => i.id === item.id);
                                return (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: Math.min(idx * 0.05, 0.2) }}
                                        key={item.id}
                                        className="bg-white rounded-[28px] overflow-hidden shadow-sm border border-slate-100/50 flex items-center p-3 gap-4"
                                    >
                                        <div className="relative shrink-0">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-28 h-28 rounded-[20px] object-cover" />
                                            ) : (
                                                <div className="w-28 h-28 rounded-[20px] bg-slate-50 flex items-center justify-center border border-slate-100">
                                                    <Utensils className="w-8 h-8 text-slate-300" />
                                                </div>
                                            )}
                                            <div className={`absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${item.is_veg ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                                <div className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-between h-28 py-1.5">
                                            <div>
                                                <h3 className="font-extrabold text-slate-900 text-[15px] leading-tight mb-1 pr-2">{item.name}</h3>
                                                <p className="text-[11px] text-slate-400 line-clamp-2 leading-[1.4] font-medium pr-2 max-w-[200px]">{item.description}</p>
                                            </div>

                                            <div className="flex items-center justify-between mt-2">
                                                <p className="font-black text-slate-900 text-[17px] tracking-tight">₹{item.price}</p>

                                                <div className="shrink-0">
                                                    <AnimatePresence mode="popLayout">
                                                        {cartItem ? (
                                                            <motion.div
                                                                initial={{ scale: 0.8, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0.8, opacity: 0 }}
                                                                className="flex items-center gap-2 bg-indigo-50/50 rounded-[14px] p-[3px] border border-indigo-100/50"
                                                            >
                                                                <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-[10px] bg-white shadow-sm hover:bg-slate-50 border border-slate-100 transition-colors">
                                                                    <Minus className="w-3 h-3 text-slate-600" />
                                                                </button>
                                                                <span className="w-4 text-center text-sm font-black text-indigo-900">{cartItem.quantity}</span>
                                                                <motion.button
                                                                    whileTap={{ scale: 0.8 }}
                                                                    onClick={() => addToCart(item)}
                                                                    className="w-7 h-7 flex items-center justify-center rounded-[10px] bg-indigo-600 shadow-sm"
                                                                >
                                                                    <Plus className="w-3 h-3 text-white" />
                                                                </motion.button>
                                                            </motion.div>
                                                        ) : (
                                                            <motion.button
                                                                initial={{ scale: 0.8, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0.8, opacity: 0 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => addToCart(item)}
                                                                className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-[12px] hover:bg-slate-200 transition-colors"
                                                            >
                                                                <Plus className="w-4 h-4 text-slate-900" />
                                                            </motion.button>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {/* Geny POS Footer Branding */}
            {!loading && !showCart && (
                <div className="py-10 flex flex-col items-center justify-center opacity-40 select-none">
                    <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Powered by</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-4 h-4 bg-slate-800 rounded-md flex items-center justify-center">
                            <Utensils className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="font-black text-sm text-slate-800 tracking-tighter">Geny POS</span>
                    </div>
                </div>
            )}

            {/* Floating Magic Action Button (Cart) */}
            <AnimatePresence>
                {totalItems > 0 && !showCart && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-40 pointer-events-none"
                    >
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setShowCart(true)}
                            className="w-full max-w-sm h-16 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-3xl shadow-xl shadow-indigo-500/30 flex items-center justify-between px-6 border-b-2 border-indigo-900/50 pointer-events-auto"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <ShoppingCart className="w-5 h-5 text-indigo-200" />
                                    <motion.span
                                        key={totalItems}
                                        initial={{ scale: 0.5, y: -10 }}
                                        animate={{ scale: 1, y: 0 }}
                                        className="absolute -top-2 -right-3 bg-white text-indigo-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                                    >
                                        {totalItems}
                                    </motion.span>
                                </div>
                                <span className="text-sm tracking-widest uppercase ml-2 text-white/90">View Order</span>
                            </div>
                            <span className="text-white font-black text-lg tracking-tight">₹{subtotal.toFixed(0)}</span>
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Glassmorphic Cart Drawer */}
            <AnimatePresence>
                {showCart && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCart(false)}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-slate-50 max-h-[85vh] rounded-t-[40px] shadow-2xl overflow-hidden"
                        >
                            {/* Drawer Handle */}
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2"></div>

                            <div className="flex items-center justify-between px-6 py-4">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Order</h2>
                                <button onClick={() => setShowCart(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
                                {cart.map((item, idx) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={item.id}
                                        className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100/60"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.is_veg ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                    <h4 className="font-bold text-slate-900 text-[15px] leading-tight pr-2">{item.name}</h4>
                                                </div>
                                                <p className="text-indigo-600 font-bold text-sm">₹{(item.price * item.quantity).toFixed(0)}</p>
                                            </div>

                                            <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-1 border border-slate-100">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-slate-600">
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="w-5 text-center text-[15px] font-black text-slate-900">{item.quantity}</span>
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => addToCart(item)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </motion.button>
                                            </div>
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Any special requests? (e.g. less spicy)..."
                                            value={item.notes}
                                            onChange={e => setCart(prev => prev.map(i => i.id === item.id ? { ...i, notes: e.target.value } : i))}
                                            className="mt-3 w-full text-[13px] bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-400 focus:bg-white font-medium placeholder:text-slate-400 transition-all"
                                        />
                                    </motion.div>
                                ))}
                            </div>

                            <div className="p-6 bg-white border-t border-slate-100/50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] space-y-5 rounded-t-[32px]">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-slate-500 font-bold text-[12px] uppercase tracking-widest">
                                        <span>Items Subtotal</span><span>₹{subtotal.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400 font-bold text-[12px] uppercase tracking-widest">
                                        <span>Taxes & Charges (5%)</span><span>₹{tax.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between items-end pt-3 text-slate-900 border-t border-dashed border-slate-200">
                                        <span className="font-bold text-sm uppercase tracking-widest text-slate-400">Total Bill</span>
                                        <span className="text-3xl font-black tracking-tighter text-indigo-600">₹{total.toFixed(0)}</span>
                                    </div>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={placeOrder}
                                    disabled={submitting}
                                    className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white font-black text-lg rounded-[24px] shadow-xl shadow-slate-900/20 transition-all disabled:opacity-50 overflow-hidden relative"
                                >
                                    <AnimatePresence mode="wait">
                                        {submitting ? (
                                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-3">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Sending to Kitchen...</span>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2">
                                                <span>Place Order</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
