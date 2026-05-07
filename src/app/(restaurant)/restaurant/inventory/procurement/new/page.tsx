'use client';

import { useState, useEffect } from 'react';
import {
    ShoppingCart,
    Plus,
    Search,
    ArrowLeft,
    Trash2,
    Save,
    ChevronRight,
    Building2,
    Package,
    Calculator,
    CheckCircle2,
    Calendar,
    FileText,
    Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getInventoryItems,
    getInventoryVendors,
    createPurchaseOrder
} from '../../actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CreatePOPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState('');
    const [poItems, setPoItems] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [itemList, vendorList] = await Promise.all([
                getInventoryItems(),
                getInventoryVendors()
            ]);
            setItems(itemList);
            setVendors(vendorList);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const addItemToPO = (item: any) => {
        if (poItems.find(i => i.inventory_item_id === item.id)) {
            return toast.error('Item already in PO');
        }
        setPoItems([...poItems, {
            inventory_item_id: item.id,
            name: item.name,
            unit: item.unit,
            quantity: 1,
            unit_price: 0
        }]);
    };

    const removeItemFromPO = (id: string) => {
        setPoItems(poItems.filter(i => i.inventory_item_id !== id));
    };

    const updateItem = (id: string, field: string, val: number) => {
        setPoItems(poItems.map(i =>
            i.inventory_item_id === id ? { ...i, [field]: val } : i
        ));
    };

    const handleCreatePO = async () => {
        if (!selectedVendorId) return toast.error('Please select a vendor');
        if (poItems.length === 0) return toast.error('Add at least one item');

        setIsSaving(true);
        try {
            await createPurchaseOrder({
                vendor_id: selectedVendorId,
                items: poItems.map(({ inventory_item_id, quantity, unit_price }) => ({
                    inventory_item_id,
                    quantity,
                    unit_price
                }))
            });
            toast.success('Purchase Order raised successfully');
            router.push('/restaurant/inventory/procurement');
        } catch (error) {
            toast.error('Failed to create PO');
        } finally {
            setIsSaving(false);
        }
    };

    const totalAmount = poItems.reduce((acc, i) => acc + (i.quantity * i.unit_price), 0);

    const filteredInventory = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading || !mounted) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/restaurant/inventory/procurement" className="p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 leading-tight">Create Purchase Order</h1>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mt-1">Direct Procurement Request</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-3xl font-black text-indigo-600 tracking-tighter">₹{totalAmount.toLocaleString()}</div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Commitment</p>
                    </div>
                    <button
                        onClick={handleCreatePO}
                        disabled={isSaving}
                        className="bg-orange-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                        {isSaving ? 'PROCESSING...' : 'RAISE PURCHASE ORDER'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: vendor & Item Selection */}
                <div className="lg:col-span-5 space-y-6">
                    {/* vendor Selection */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-orange-500" />
                            Select Vendor
                        </h3>
                        <select
                            value={selectedVendorId}
                            onChange={(e) => setSelectedVendorId(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/10 cursor-pointer"
                        >
                            <option value="">-- Choose Supplier --</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Item Picker */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col h-[500px]">
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type="text"
                                    placeholder="Search inventory items..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-orange-500/30"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredInventory.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => addItemToPO(item)}
                                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-orange-50 transition-all rounded-2xl group border border-transparent hover:border-orange-100"
                                >
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-sm font-black text-slate-900 leading-tight">{item.name}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.unit} • Stock: {item.current_stock}</span>
                                    </div>
                                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-orange-600" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: PO Builder */}
                <div className="lg:col-span-7">
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <FileText className="w-4 h-4 text-orange-500" />
                                Order Line Items
                            </h3>
                            <div className="flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-slate-300" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{poItems.length} Products</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-4">
                            {poItems.length > 0 ? (
                                poItems.map((item) => (
                                    <div key={item.inventory_item_id} className="p-6 bg-white border border-slate-100 rounded-[2rem] group hover:border-orange-200 transition-all shadow-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                                <span className="text-sm font-black text-slate-900">{item.name}</span>
                                            </div>
                                            <button
                                                onClick={() => removeItemFromPO(item.inventory_item_id)}
                                                className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity ({item.unit})</label>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(item.inventory_item_id, 'quantity', parseFloat(e.target.value))}
                                                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/10"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Price (₹)</label>
                                                <input
                                                    type="number"
                                                    value={item.unit_price}
                                                    onChange={e => updateItem(item.inventory_item_id, 'unit_price', parseFloat(e.target.value))}
                                                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl text-sm font-black text-indigo-600 outline-none focus:ring-2 focus:ring-orange-500/10"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-50 text-right">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Subtotal:</span>
                                            <span className="text-sm font-black text-slate-900 tracking-tight">₹{(item.quantity * item.unit_price).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-40">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                        <ShoppingCart className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-relaxed">Add items from the list to start building your purchase order.</p>
                                </div>
                            )}
                        </div>

                        {poItems.length > 0 && (
                            <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Purchase Value</span>
                                </div>
                                <div className="text-2xl font-black tracking-tighter">
                                    ₹{totalAmount.toLocaleString()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
