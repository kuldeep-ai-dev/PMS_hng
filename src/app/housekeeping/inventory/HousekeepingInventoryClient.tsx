'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package,
    ChevronRight,
    ChevronLeft,
    Check,
    MapPin,
    Hash,
    User,
    Search,
    CheckCircle2,
    Lock,
    X,
    ShoppingCart,
    History,
    LayoutGrid,
    PlusCircle,
    AlertCircle
} from 'lucide-react';
import { recordUsage, verifyStaffPassword, adjustStock } from '@/app/actions/inventory';
import { toast } from 'sonner';

interface Item {
    id: string;
    name: string;
    unit: string;
    current_stock?: number;
    min_threshold?: number;
    category?: { name: string };
}

interface Staff {
    id: string;
    name: string;
    role: string;
}

interface Room {
    id: string;
    number: string;
}

interface Props {
    items: Item[];
    staff: Staff[];
    rooms: Room[];
    ledger?: any[];
}

interface CartItem {
    item: Item;
    quantity: number;
}

type MainTab = 'usage' | 'stock' | 'ledger';

export default function HousekeepingInventoryClient({ items, staff, rooms, ledger = [] }: Props) {
    const [mainTab, setMainTab] = useState<MainTab>('usage');
    const [step, setStep] = useState(1);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [password, setPassword] = useState('');
    const [verifying, setVerifying] = useState(false);

    // Multi-item usage
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

    // UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleStaffSelect = (s: Staff) => {
        setSelectedStaff(s);
        setStep(1.5);
    };

    const handleVerifyPassword = async () => {
        if (!selectedStaff || !password) return;
        setVerifying(true);
        try {
            await verifyStaffPassword(selectedStaff.id, password);
            setStep(2);
            setPassword('');
        } catch (error: any) {
            toast.error(error.message || 'Verification failed');
            setPassword('');
        } finally {
            setVerifying(false);
        }
    };

    const addToCart = (item: Item, qty: number) => {
        setCart(prev => {
            const existing = prev.find(i => i.item.id === item.id);
            if (existing) {
                return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + qty } : i);
            }
            return [...prev, { item, quantity: qty }];
        });
        toast.success(`Added ${qty} ${item.unit} of ${item.name}`);
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(i => i.item.id !== id));
    };

    const handleSubmitUsage = async () => {
        if (!selectedStaff || cart.length === 0 || !selectedRoom) {
            toast.error('Please complete all steps');
            return;
        }

        setLoading(true);
        try {
            const promises = cart.map(cartItem =>
                recordUsage({
                    itemId: cartItem.item.id,
                    quantity: cartItem.quantity,
                    roomId: selectedRoom.id,
                    staffId: selectedStaff.id
                })
            );
            await Promise.all(promises);
            setIsSuccess(true);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const resetFlow = () => {
        setIsSuccess(false);
        setStep(2);
        setCart([]);
        setSelectedRoom(null);
        setSearchTerm('');
    };

    // ── Authentication Check ──────────────────────────────────────
    if (!selectedStaff || step < 2) {
        return (
            <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center p-6">
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div key="staff" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm space-y-8">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-blue-600 shadow-xl shadow-blue-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 transform rotate-3">
                                    <Package className="w-10 h-10 text-white" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900">Inventory Portal</h1>
                                <p className="text-slate-400 font-medium mt-2">Select your profile to begin</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {staff.map((s) => (
                                    <button key={s.id} onClick={() => handleStaffSelect(s)}
                                        className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all hover:bg-blue-600 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-200">
                                        <div className="text-left flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white/20 group-hover:text-white">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="font-black text-lg group-hover:text-white leading-none">{s.name}</div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 group-hover:text-blue-100">Housekeeping</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-white" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="auth" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm space-y-8 text-center">
                            <div className="w-20 h-20 bg-amber-500 shadow-xl shadow-amber-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <Lock className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 leading-tight">Identity Check</h2>
                                <p className="text-slate-400 font-medium mt-2">Enter your pin for {selectedStaff?.name}</p>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl space-y-6">
                                <input
                                    type="password"
                                    placeholder="••••••"
                                    autoFocus
                                    className="w-full text-center text-4xl tracking-[0.5em] py-5 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-amber-500/10 outline-none font-black"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                                />
                                <button
                                    onClick={handleVerifyPassword}
                                    disabled={verifying || !password}
                                    className="w-full py-5 bg-amber-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-amber-100 disabled:opacity-40 transition-all active:scale-[0.98] active:shadow-inner"
                                >
                                    {verifying ? 'VERIFYING...' : 'UNLOCK'}
                                </button>
                                <button onClick={() => setStep(1)} className="text-sm text-slate-400 font-bold uppercase tracking-widest hover:text-slate-900 transition-colors">Go Back</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFDFF] p-6">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white p-10 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] text-center max-w-sm w-full border border-slate-100"
                >
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner shadow-emerald-200">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Done!</h2>
                    <p className="text-slate-500 mb-10 font-medium">Stock usage recorded for Room {selectedRoom?.number}. Inventory levels updated.</p>
                    <button
                        onClick={resetFlow}
                        className="w-full py-5 bg-slate-900 text-white font-black text-lg rounded-3xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
                    >
                        Report More
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans text-slate-900 pb-28">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-xl px-6 py-5 sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                        <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest leading-none">
                            {mainTab === 'usage' ? 'Usage Reporting' : mainTab === 'stock' ? 'Live Balance' : 'Activity Log'}
                        </h1>
                        <p className="text-[10px] font-black text-blue-600 mt-1 uppercase tracking-tighter">
                            {selectedStaff.name.split(' ')[0]}
                            {selectedRoom && mainTab === 'usage' && <span> • ROOM {selectedRoom.number}</span>}
                        </p>
                    </div>
                </div>

                {mainTab === 'usage' && step > 2 && (
                    <button onClick={() => setStep(prev => prev - 1)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all">
                        <ChevronLeft className="w-5 h-5 text-slate-400" />
                    </button>
                )}
            </header>

            <main className="p-6 max-w-lg mx-auto">
                <AnimatePresence mode="wait">
                    {/* USAGE TAB */}
                    {mainTab === 'usage' && (
                        <motion.div key="usage_flow" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                            {/* Step 2: Room Selection */}
                            {step === 2 && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-black tracking-tight mb-2">Where are we?</h2>
                                    <div className="grid grid-cols-3 gap-3">
                                        {rooms.map((r) => (
                                            <button key={r.id} onClick={() => { setSelectedRoom(r); setStep(3); }}
                                                className={`aspect-square rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all active:scale-90 ${selectedRoom?.id === r.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-white border-white shadow-sm'}`}>
                                                <span className="text-2xl font-black">{r.number}</span>
                                                <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">Room</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Item Selection */}
                            {step === 3 && (
                                <div className="space-y-6">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input type="text" placeholder="Search item to use..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-11 pr-4 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-4 focus:ring-blue-500/5 outline-none text-sm font-bold" />
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {filteredItems.map((i) => {
                                            const inCart = cart.find(c => c.item.id === i.id)?.quantity || 0;
                                            return (
                                                <div key={i.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group">
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">{i.category?.name || 'STOCK'}</div>
                                                        <div className="font-black text-slate-800 truncate">{i.name}</div>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase">
                                                                {i.current_stock ?? 0} {i.unit} left
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {inCart > 0 && <span className="text-lg font-black text-blue-600">x{inCart}</span>}
                                                        <button onClick={() => addToCart(i, 1)} className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 active:scale-90 transition-all font-black text-xl">
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* STOCK TAB */}
                    {mainTab === 'stock' && (
                        <motion.div key="stock_view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <h2 className="text-2xl font-black tracking-tight">Inventory Watch</h2>
                            <div className="grid grid-cols-1 gap-4">
                                {items.map(i => {
                                    const isLow = i.current_stock !== undefined && i.min_threshold !== undefined && i.current_stock <= i.min_threshold;
                                    return (
                                        <div key={i.id} className={cn("p-6 rounded-[2rem] border bg-white flex justify-between items-center", isLow ? "border-rose-200 shadow-rose-50" : "border-slate-100")}>
                                            <div>
                                                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{i.category?.name || 'Inventory'}</div>
                                                <h4 className="font-black text-slate-800">{i.name}</h4>
                                                <div className="mt-2">
                                                    <span className={cn("text-2xl font-black", isLow ? "text-rose-500" : "text-slate-900")}>{i.current_stock ?? '0'}</span>
                                                    <span className="text-xs font-bold text-slate-400 ml-1 uppercase">{i.unit}</span>
                                                </div>
                                            </div>
                                            {isLow && (
                                                <div className="flex flex-col items-end gap-1">
                                                    <AlertCircle className="w-6 h-6 text-rose-500 animate-pulse" />
                                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Needs Order</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* LEDGER TAB */}
                    {mainTab === 'ledger' && (
                        <motion.div key="ledger_view" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <h2 className="text-2xl font-black tracking-tight text-center">Movement History</h2>
                            <div className="space-y-3">
                                {ledger.filter(l => l.user_id === selectedStaff.id).length === 0 ? (
                                    <div className="text-center py-20 text-slate-300 italic">No activity recorded by you today.</div>
                                ) : (
                                    ledger.filter(l => l.user_id === selectedStaff.id).map((l, i) => (
                                        <div key={i} className="p-5 rounded-[2rem] bg-white border border-slate-50 shadow-sm flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-black text-slate-800">{l.item_name}</p>
                                                <p className="text-[10px] font-bold text-slate-400">Room {l.room_number || 'Stock Adj'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn("text-lg font-black", l.quantity < 0 ? "text-rose-500" : "text-emerald-500")}>
                                                    {l.quantity > 0 ? '+' : ''}{l.quantity}
                                                </p>
                                                <p className="text-[10px] font-medium text-slate-300">
                                                    {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Bottom Navigation & Actions */}
            <nav className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-2xl border-t border-slate-50 z-50 rounded-t-[3rem] shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.05)]">
                <div className="max-w-md mx-auto flex flex-col gap-6">
                    {/* Usage flow action button */}
                    {mainTab === 'usage' && step === 3 && cart.length > 0 && (
                        <motion.button
                            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                            disabled={loading}
                            onClick={handleSubmitUsage}
                            className="w-full py-5 bg-slate-900 text-white font-black rounded-[2rem] shadow-2xl shadow-slate-300 flex items-center justify-center gap-3 active:scale-95 transition-all"
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Check className="w-6 h-6" />}
                            <span>CONFIRM {cart.length} ITEMS</span>
                        </motion.button>
                    )}

                    {/* Tab Bar */}
                    <div className="flex justify-around items-center px-2">
                        <button onClick={() => setMainTab('usage')} className={cn("flex flex-col items-center gap-1.5 transition-all", mainTab === 'usage' ? "text-blue-600 scale-110" : "text-slate-300 hover:text-slate-500")}>
                            <div className={cn("p-2 rounded-2xl", mainTab === 'usage' ? "bg-blue-50" : "transparent")}>
                                <PlusCircle className="w-6 h-6" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter">Usage</span>
                        </button>
                        <button onClick={() => setMainTab('stock')} className={cn("flex flex-col items-center gap-1.5 transition-all", mainTab === 'stock' ? "text-blue-600 scale-110" : "text-slate-300 hover:text-slate-500")}>
                            <div className={cn("p-2 rounded-2xl", mainTab === 'stock' ? "bg-blue-50" : "transparent")}>
                                <LayoutGrid className="w-6 h-6" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter">Stock</span>
                        </button>
                        <button onClick={() => setMainTab('ledger')} className={cn("flex flex-col items-center gap-1.5 transition-all", mainTab === 'ledger' ? "text-blue-600 scale-110" : "text-slate-300 hover:text-slate-500")}>
                            <div className={cn("p-2 rounded-2xl", mainTab === 'ledger' ? "bg-blue-50" : "transparent")}>
                                <History className="w-6 h-6" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter">History</span>
                        </button>
                        <button onClick={() => window.location.reload()} className="flex flex-col items-center gap-1.5 text-slate-300 hover:text-rose-400 transition-all">
                            <div className="p-2 rounded-2xl">
                                <X className="w-6 h-6" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter">Logout</span>
                        </button>
                    </div>
                </div>
            </nav>
        </div>
    );
}
