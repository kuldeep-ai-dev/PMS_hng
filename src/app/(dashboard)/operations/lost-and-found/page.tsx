'use client';

import React, { useState, useEffect } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import {
    Package,
    Search,
    Plus,
    MapPin,
    Calendar,
    User,
    CheckCircle2,
    Trash2,
    Clock,
    ShieldAlert,
    X,
    Phone,
    Home,
    Loader2
} from 'lucide-react';
import {
    getLostAndFoundItems,
    addLostAndFoundItem,
    updateItemStatus,
    deleteItem,
    markAsFound
} from './actions';
import { toast } from 'sonner';

export default function LostAndFoundPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [isMarkFoundModalOpen, setIsMarkFoundModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isPending, setIsPending] = useState(false);

    // Form states
    const [newItem, setNewItem] = useState({
        item_name: '',
        type: 'Found' as 'Lost' | 'Found',
        description: '',
        location_found: '',
        found_date: new Date().toISOString().split('T')[0],
        finder_name: '',
        reporter_phone: '',
        room_id: null as string | null
    });

    const [markFoundDetails, setMarkFoundDetails] = useState({
        location_found: '',
        found_date: new Date().toISOString().split('T')[0],
        finder_name: ''
    });

    const [claimDetails, setClaimDetails] = useState({
        claimant_name: '',
        claimant_phone: ''
    });

    const loadItems = async () => {
        try {
            setLoading(true);
            const data = await getLostAndFoundItems();
            setItems(data);
        } catch (error) {
            toast.error("Failed to load items");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsPending(true);
            await addLostAndFoundItem(newItem);
            toast.success("Item added successfully");
            setIsAddModalOpen(false);
            setNewItem({
                item_name: '',
                type: 'Found',
                description: '',
                location_found: '',
                found_date: new Date().toISOString().split('T')[0],
                finder_name: '',
                reporter_phone: '',
                room_id: null
            });
            loadItems();
        } catch (error) {
            toast.error("Failed to add item");
        } finally {
            setIsPending(false);
        }
    };

    const handleClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsPending(true);
            await updateItemStatus(selectedItem.id, 'Claimed', claimDetails);
            toast.success("Item marked as claimed");
            setIsClaimModalOpen(false);
            setClaimDetails({ claimant_name: '', claimant_phone: '' });
            loadItems();
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setIsPending(false);
        }
    };

    const handleMarkFound = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsPending(true);
            await markAsFound(selectedItem.id, markFoundDetails);
            toast.success("Item marked as found and moved to repository");
            setIsMarkFoundModalOpen(false);
            setMarkFoundDetails({
                location_found: '',
                found_date: new Date().toISOString().split('T')[0],
                finder_name: ''
            });
            loadItems();
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setIsPending(false);
        }
    };

    const handleDispose = async (id: string) => {
        if (!confirm("Are you sure you want to mark this item as disposed?")) return;
        try {
            await updateItemStatus(id, 'Disposed');
            toast.success("Item marked as disposed");
            loadItems();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Permanently delete this record?")) return;
        try {
            await deleteItem(id);
            toast.success("Record deleted");
            loadItems();
        } catch (error) {
            toast.error("Failed to delete record");
        }
    };

    const filteredItems = items.filter(item => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            item.item_name.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.finder_name?.toLowerCase().includes(query) ||
            item.claimant_name?.toLowerCase().includes(query) ||
            item.id.toLowerCase().includes(query);

        const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: items.length,
        found: items.filter(i => i.status === 'Found' && i.type === 'Found').length,
        lost: items.filter(i => i.status === 'Lost' || i.type === 'Lost').length,
        claimed: items.filter(i => i.status === 'Claimed').length
    };

    return (
        <div className="p-6 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic flex items-center gap-3">
                        <Package className="w-8 h-8 text-teal-600" />
                        Lost & Found <span className="text-teal-600">Terminal</span>
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Geny PMS Pro • Security & Operations 2.0</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200"
                >
                    <Plus className="w-4 h-4" /> Log New Entry
                </button>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <BentoCard className="p-6 bg-gradient-to-br from-white to-slate-50 border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-teal-50 rounded-2xl text-teal-600">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Found</p>
                            <p className="text-2xl font-black text-slate-900">{stats.found}</p>
                        </div>
                    </div>
                </BentoCard>
                <BentoCard className="p-6 bg-gradient-to-br from-white to-slate-50 border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Lost Reports</p>
                            <p className="text-2xl font-black text-slate-900">{stats.lost}</p>
                        </div>
                    </div>
                </BentoCard>
                <BentoCard className="p-6 bg-gradient-to-br from-white to-slate-50 border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolved/Claimed</p>
                            <p className="text-2xl font-black text-slate-900">{stats.claimed}</p>
                        </div>
                    </div>
                </BentoCard>
            </div>

            {/* Filters Bar */}
            <BentoCard className="p-4 bg-slate-50/50 backdrop-blur-sm border-slate-200 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by customer, item name, or Ref ID..."
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-xl">
                    {['all', 'Found', 'Lost', 'Claimed', 'Disposed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === status
                                ? 'bg-slate-900 text-white shadow-md shadow-slate-200'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {status === 'all' ? 'All Items' : status}
                        </button>
                    ))}
                </div>
            </BentoCard>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
                    ))
                ) : filteredItems.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <Package className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="font-black text-slate-500 uppercase tracking-widest text-xs">No matching entries found</p>
                    </div>
                ) : (
                    filteredItems.map((item) => (
                        <BentoCard key={item.id} className="group flex flex-col h-full bg-white hover:border-teal-500/30 transition-all duration-300">
                            <div className="p-6 space-y-4 flex-1">
                                <div className="flex justify-between items-start">
                                    <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${item.status === 'Found' ? 'bg-teal-50 text-teal-600 border border-teal-100' :
                                        item.status === 'Lost' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                            item.status === 'Claimed' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                                'bg-slate-50 text-slate-600 border border-slate-100'
                                        }`}>
                                        {item.type} • {item.status}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400">
                                        Ref: {item.id.slice(0, 8).toUpperCase()}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-teal-600 transition-colors">
                                        {item.item_name}
                                    </h3>
                                    <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed italic">
                                        {item.description || "No description provided."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                                            <MapPin className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase">{item.type === 'Found' ? 'Found at' : 'Lost at'}</p>
                                            <p className="text-[10px] font-bold text-slate-700">{item.location_found || 'Unknown'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                                            <Calendar className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase">{item.type === 'Found' ? 'Found Date' : 'Lost Date'}</p>
                                            <p className="text-[10px] font-bold text-slate-700">{new Date(item.found_date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    {item.rooms?.number && (
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-teal-50 rounded-lg text-teal-600">
                                                <Home className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-teal-600 uppercase">Room Ref</p>
                                                <p className="text-[10px] font-black text-slate-900 italic">#{item.rooms.number}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                                            <User className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase">{item.type === 'Found' ? 'Finder' : 'Reporter'}</p>
                                            <p className="text-[10px] font-bold text-slate-700">{item.finder_name || 'Staff'}</p>
                                            {item.type === 'Lost' && item.reporter_phone && (
                                                <p className="text-[9px] font-bold text-slate-400">{item.reporter_phone}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {item.status === 'Claimed' && (
                                    <div className="mt-4 p-4 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col gap-2">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-purple-600">Claimant Details</p>
                                        <div className="flex items-center gap-2 font-bold text-slate-700 text-[10px]">
                                            <User className="w-3 h-3 text-purple-400" /> {item.claimant_name}
                                        </div>
                                        <div className="flex items-center gap-2 font-bold text-slate-700 text-[10px]">
                                            <Phone className="w-3 h-3 text-purple-400" /> {item.claimant_phone}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                                <div className="flex gap-2 w-full">
                                    {(item.status === 'Found' || item.status === 'Lost') ? (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setIsClaimModalOpen(true);
                                                }}
                                                className="flex-1 bg-white border border-slate-200 text-purple-600 font-black uppercase text-[10px] tracking-widest py-2 rounded-xl hover:bg-purple-50 hover:border-purple-200 transition-all"
                                            >
                                                {item.status === 'Found' ? 'Mark Claimed' : 'Mark Resolved'}
                                            </button>

                                            {item.status === 'Lost' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedItem(item);
                                                        setMarkFoundDetails({
                                                            ...markFoundDetails,
                                                            location_found: item.location_found || '',
                                                            found_date: new Date().toISOString().split('T')[0]
                                                        });
                                                        setIsMarkFoundModalOpen(true);
                                                    }}
                                                    className="flex-1 bg-teal-600 text-white font-black uppercase text-[10px] tracking-widest py-2 rounded-xl hover:bg-teal-700 transition-all border border-teal-600"
                                                >
                                                    Mark Found
                                                </button>
                                            )}

                                            {item.status === 'Found' && (
                                                <button
                                                    onClick={() => handleDispose(item.id)}
                                                    className="flex-1 bg-white border border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-widest py-2 rounded-xl hover:bg-slate-100 transition-all"
                                                >
                                                    Disposed
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="ml-auto p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </BentoCard>
                    ))
                )}
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 scale-100 origin-center">
                        <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                            <div>
                                <h2 className="text-xl font-black uppercase italic tracking-tight">Log {newItem.type} Item</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Ref: NEW_{Date.now().toString().slice(-4)}</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleAdd} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                            {/* Type Toggle */}
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() => setNewItem({ ...newItem, type: 'Found' })}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newItem.type === 'Found' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Found Something
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewItem({ ...newItem, type: 'Lost' })}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newItem.type === 'Lost' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Guest Lost Something
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Item Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
                                        placeholder="e.g. iPhone 15 Pro, Leather Wallet"
                                        value={newItem.item_name}
                                        onChange={e => setNewItem({ ...newItem, item_name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Location {newItem.type === 'Found' ? 'Found' : 'Lost'}</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 font-bold text-sm focus:outline-none transition-all placeholder:text-slate-300"
                                            placeholder={newItem.type === 'Found' ? 'Room 101, Lobby' : 'Where was it lost?'}
                                            value={newItem.location_found}
                                            onChange={e => setNewItem({ ...newItem, location_found: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">{newItem.type === 'Found' ? 'Found Date' : 'Lost Date'}</label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 font-bold text-sm focus:outline-none transition-all"
                                            value={newItem.found_date}
                                            onChange={e => setNewItem({ ...newItem, found_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Description</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 font-bold text-sm focus:outline-none transition-all min-h-[100px]"
                                        placeholder="Color, condition, distinct markings..."
                                        value={newItem.description}
                                        onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">{newItem.type === 'Found' ? 'Staff/Finder Name' : 'Guest/Reporter Name'}</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 font-bold text-sm focus:outline-none transition-all"
                                        placeholder={newItem.type === 'Found' ? 'e.g. Rahul, Housekeeping' : 'Name of guest'}
                                        value={newItem.finder_name}
                                        onChange={e => setNewItem({ ...newItem, finder_name: e.target.value })}
                                    />
                                </div>
                                {newItem.type === 'Lost' && (
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Guest Mobile Number</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 font-bold text-sm focus:outline-none transition-all"
                                            placeholder="e.g. +91 98765 43210"
                                            value={newItem.reporter_phone}
                                            onChange={e => setNewItem({ ...newItem, reporter_phone: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-sm py-5 rounded-[24px] hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4 shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isPending ? 'PROCESSING...' : 'Register Entry'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Claim Modal */}
            {isClaimModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-purple-600 p-8 flex justify-between items-center text-white">
                            <div>
                                <h2 className="text-xl font-black uppercase italic tracking-tight">{selectedItem?.type === 'Found' ? 'Verify Claim' : 'Resolve Report'}</h2>
                                <p className="text-[10px] font-bold text-purple-200 uppercase tracking-widest">Item: {selectedItem?.item_name}</p>
                            </div>
                            <button onClick={() => setIsClaimModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleClaim} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex gap-4">
                                    <ShieldAlert className="w-8 h-8 text-purple-400 shrink-0" />
                                    <p className="text-[10px] font-bold text-purple-600 leading-normal uppercase">
                                        {selectedItem?.type === 'Found'
                                            ? "Ensure ID identity matches before handing over the item. Record the details here for audit purposes."
                                            : "Record final details of the resolution (e.g. returned to guest, found in laundry) for audit purposes."
                                        }
                                    </p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Claimant Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 font-bold text-sm focus:outline-none"
                                        placeholder="Full name of receiver"
                                        value={claimDetails.claimant_name}
                                        onChange={e => setClaimDetails({ ...claimDetails, claimant_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Contact Number</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 font-bold text-sm focus:outline-none"
                                        placeholder="Claimant's Phone"
                                        value={claimDetails.claimant_phone}
                                        onChange={e => setClaimDetails({ ...claimDetails, claimant_phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full bg-purple-600 text-white font-black uppercase tracking-widest text-sm py-5 rounded-[24px] hover:bg-purple-700 shadow-xl shadow-purple-100 transition-all font-sans flex items-center justify-center gap-2"
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isPending ? 'PROCESSING...' : 'Confirm Handover'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Mark Found Modal */}
            {isMarkFoundModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-teal-600 p-8 flex justify-between items-center text-white">
                            <div>
                                <h2 className="text-xl font-black uppercase italic tracking-tight">Mark as Found</h2>
                                <p className="text-[10px] font-bold text-teal-100 uppercase tracking-widest">Converting Lost Report Ref: {selectedItem?.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <button onClick={() => setIsMarkFoundModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleMarkFound} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Where was it found?</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 font-bold text-sm focus:outline-none"
                                        placeholder="e.g. Laundry, Under Sofa in Room 101"
                                        value={markFoundDetails.location_found}
                                        onChange={e => setMarkFoundDetails({ ...markFoundDetails, location_found: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Found Date</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 font-bold text-sm focus:outline-none"
                                        value={markFoundDetails.found_date}
                                        onChange={e => setMarkFoundDetails({ ...markFoundDetails, found_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Who found it? (Staff Name)</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 font-bold text-sm focus:outline-none"
                                        placeholder="Name of the person who found the item"
                                        value={markFoundDetails.finder_name}
                                        onChange={e => setMarkFoundDetails({ ...markFoundDetails, finder_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full bg-teal-600 text-white font-black uppercase tracking-widest text-sm py-5 rounded-[24px] hover:bg-teal-700 shadow-xl shadow-teal-100 transition-all flex items-center justify-center gap-2"
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isPending ? 'PROCESSING...' : 'Move to Found Inventory'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
