'use client';

import { useState, useEffect } from 'react';
import { BedDouble, Plus, Pencil, Trash2, X, Loader2, Check, Settings2, IndianRupee, Save } from 'lucide-react';
import { fetchRooms, addRoom, updateRoomRate, deleteRoom } from '@/app/(dashboard)/rooms/actions-rooms';
import { getSettings, updateSettings } from '@/app/(dashboard)/settings/actions';

export default function MasterSuitePage() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [roomTypes, setRoomTypes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // New Category State
    const [newCategory, setNewCategory] = useState('');

    // Room Editing State
    const [editingRateId, setEditingRateId] = useState<string | null>(null);
    const [editRateValue, setEditRateValue] = useState('');

    // New Room State
    const [newRoom, setNewRoom] = useState({ number: '', type: '', base_rate: '' });

    const loadData = async () => {
        try {
            const [roomsData, settingsData] = await Promise.all([
                fetchRooms(),
                getSettings()
            ]);
            setRooms(roomsData);
            setSettings(settingsData);
            if (settingsData?.room_types) {
                setRoomTypes(settingsData.room_types);
                setNewRoom(prev => ({ ...prev, type: prev.type || settingsData.room_types[0] }));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // --- Category Management ---
    const handleAddCategory = async () => {
        if (!newCategory.trim() || roomTypes.includes(newCategory.trim())) return;
        setActionLoading('category');
        try {
            const updatedTypes = [...roomTypes, newCategory.trim()];
            await updateSettings({ ...settings, room_types: updatedTypes });
            setRoomTypes(updatedTypes);
            setNewCategory('');
            if (!newRoom.type) setNewRoom(prev => ({ ...prev, type: updatedTypes[0] }));
        } catch (err: any) {
            alert(`Failed to add category: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveCategory = async (type: string) => {
        const inUse = rooms.some(r => r.type === type);
        if (inUse) {
            alert(`Cannot remove '${type}' because rooms are currently assigned to this category.`);
            return;
        }
        if (!confirm(`Remove category '${type}'?`)) return;

        setActionLoading('category');
        try {
            const updatedTypes = roomTypes.filter(t => t !== type);
            await updateSettings({ ...settings, room_types: updatedTypes });
            setRoomTypes(updatedTypes);
        } catch (err: any) {
            alert(`Failed to remove category: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpdateTariffs = async () => {
        setActionLoading('tariffs');
        try {
            await updateSettings(settings);
        } catch (err: any) {
            alert(`Failed to update tariffs: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    // --- Room Management ---
    const handleAddRoom = async () => {
        if (!newRoom.number || !newRoom.base_rate || !newRoom.type) return;
        setActionLoading('addRoom');
        try {
            await addRoom({ number: newRoom.number, type: newRoom.type, base_rate: Number(newRoom.base_rate) });
            setNewRoom({ number: '', type: roomTypes[0] || 'Standard', base_rate: '' });
            await loadData();
        } catch (err: any) {
            alert(`Failed to add room: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpdateRate = async (roomId: string) => {
        if (!editRateValue) return;
        setActionLoading(roomId);
        try {
            await updateRoomRate(roomId, Number(editRateValue));
            setEditingRateId(null);
            await loadData();
        } catch (err: any) {
            alert(`Failed to update rate: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteRoom = async (roomId: string, roomNumber: string, status: string) => {
        if (status === 'Occupied') {
            alert('Cannot delete an occupied room.');
            return;
        }
        if (!confirm(`Delete Room ${roomNumber}? This cannot be undone.`)) return;
        setActionLoading(roomId);
        try {
            await deleteRoom(roomId);
            await loadData();
        } catch (err: any) {
            alert(`Failed to delete room: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-pulse">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-slate-100 rounded-lg" />
                    <div className="h-4 w-96 bg-slate-50 rounded" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="h-[400px] bg-white rounded-xl border border-slate-100" />
                    <div className="lg:col-span-2 h-[400px] bg-white rounded-xl border border-slate-100" />
                    <div className="lg:col-span-3 h-[300px] bg-white rounded-xl border border-slate-100" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Master Suite</h1>
                <p className="text-sm text-slate-500 mt-1">High-level control center for Room Categories, Inventory, and Global Rates.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ROOM CATEGORIES PANEL */}
                <div className="lg:col-span-1 border border-slate-200 bg-white rounded-xl shadow-sm p-6 flex flex-col h-full">
                    <div className="flex flex-col mb-5 pb-5 border-b border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                            <Settings2 className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-lg font-bold text-slate-800">Room Categories</h2>
                        </div>
                        <p className="text-xs text-slate-500">Manage available room types.</p>
                    </div>

                    <div className="flex items-center gap-2 mb-6">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                            placeholder="New category (e.g. Villa)"
                            className="flex-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button
                            onClick={handleAddCategory}
                            disabled={!newCategory.trim() || actionLoading === 'category'}
                            className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {actionLoading === 'category' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto">
                        {roomTypes.map(type => (
                            <div key={type} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg group">
                                <span className="font-medium text-sm text-slate-700">{type}</span>
                                <button
                                    onClick={() => handleRemoveCategory(type)}
                                    disabled={actionLoading === 'category'}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Delete Category"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {roomTypes.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No categories defined.</p>
                        )}
                    </div>
                </div>

                {/* MASTER ROOM LISTING */}
                <div className="lg:col-span-2 border border-slate-200 bg-white rounded-xl shadow-sm p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-5 pb-5 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <BedDouble className="w-5 h-5 text-teal-600" />
                                <h2 className="text-lg font-bold text-slate-800">Master Room Inventory</h2>
                            </div>
                            <p className="text-xs text-slate-500">Add inventory and manage base rates overriding.</p>
                        </div>
                    </div>

                    {/* Quick Add Room Form */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap md:flex-nowrap items-end gap-3">
                        <div className="flex-1 min-w-[120px]">
                            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase">Room No.</label>
                            <input type="text" value={newRoom.number} onChange={e => setNewRoom({ ...newRoom, number: e.target.value })} placeholder="101" className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                        </div>
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase">Category</label>
                            <select value={newRoom.type} onChange={e => setNewRoom({ ...newRoom, type: e.target.value })} className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none appearance-none">
                                {roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[120px]">
                            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase">Base Rate (₹)</label>
                            <input
                                type="number"
                                value={newRoom.base_rate}
                                onChange={e => setNewRoom({ ...newRoom, base_rate: e.target.value })}
                                onFocus={(e) => e.target.select()}
                                placeholder="3500"
                                className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                        </div>
                        <button
                            onClick={handleAddRoom}
                            disabled={!newRoom.number || !newRoom.base_rate || actionLoading === 'addRoom'}
                            className="px-5 py-2.5 bg-teal-600 text-white font-semibold text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors shrink-0 flex items-center gap-2"
                        >
                            {actionLoading === 'addRoom' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
                        </button>
                    </div>

                    {/* Rooms Table */}
                    <div className="overflow-x-auto flex-1 border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                <tr>
                                    <th className="font-semibold py-3 px-4 border-b border-slate-200">Room</th>
                                    <th className="font-semibold py-3 px-4 border-b border-slate-200">Category</th>
                                    <th className="font-semibold py-3 px-4 border-b border-slate-200">Base Rate</th>
                                    <th className="font-semibold py-3 px-4 border-b border-slate-200 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rooms.map(room => (
                                    <tr key={room.id} className="hover:bg-slate-50/50 group transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-900">{room.number}</td>
                                        <td className="py-3 px-4 text-slate-600"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-semibold">{room.type}</span></td>
                                        <td className="py-3 px-4">
                                            {editingRateId === room.id ? (
                                                <div className="flex items-center gap-1 max-w-[140px]">
                                                    <span className="text-slate-400 font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        value={editRateValue}
                                                        onChange={e => setEditRateValue(e.target.value)}
                                                        onFocus={(e) => e.target.select()}
                                                        className="w-20 p-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                                                        autoFocus
                                                        onKeyDown={e => { if (e.key === 'Enter') handleUpdateRate(room.id); if (e.key === 'Escape') setEditingRateId(null); }}
                                                    />
                                                    <button onClick={() => handleUpdateRate(room.id)} disabled={actionLoading === room.id} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setEditingRateId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group/rate">
                                                    <span className="font-bold text-slate-800">₹{Number(room.base_rate).toLocaleString()}</span>
                                                    <button onClick={() => { setEditingRateId(room.id); setEditRateValue(String(room.base_rate)); }} className="p-1 text-slate-300 hover:text-indigo-600 opacity-0 group-hover/rate:opacity-100 transition-all rounded">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => handleDeleteRoom(room.id, room.number, room.status)}
                                                disabled={actionLoading === room.id || room.status === 'Occupied'}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0 focus:opacity-100"
                                                title="Delete Room"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {rooms.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-slate-400">No rooms configured.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* GLOBAL PRICING & TARIFF ENGINE */}
                <div className="lg:col-span-3 border border-slate-200 bg-white rounded-xl shadow-sm p-6 flex flex-col mt-2">
                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <IndianRupee className="w-5 h-5 text-amber-600" />
                                <h2 className="text-lg font-bold text-slate-800">Global Tariff Engine</h2>
                            </div>
                            <p className="text-sm text-slate-500">Configure global caps and overriding costs for capacity handling and dining plans.</p>
                        </div>
                        <button
                            onClick={handleUpdateTariffs}
                            disabled={actionLoading === 'tariffs'}
                            className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {actionLoading === 'tariffs' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Tariffs
                        </button>
                    </div>

                    {settings && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Capacity Controls */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">Extra Capacity & Bed Policy</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Free Pax Threshold</p>
                                            <p className="text-xs text-slate-500">Occupants allowed before triggering extra pax cost.</p>
                                        </div>
                                        <input
                                            type="number"
                                            value={settings.free_pax_limit || 2}
                                            onChange={e => setSettings({ ...settings, free_pax_limit: Number(e.target.value) })}
                                            className="w-20 p-2 text-center bg-slate-100 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Extra Pax Rate (₹)</p>
                                            <p className="text-xs text-slate-500">Auto-billed per pax per night exceeding threshold.</p>
                                        </div>
                                        <input
                                            type="number"
                                            value={settings.extra_pax_rate || 0}
                                            onChange={e => setSettings({ ...settings, extra_pax_rate: Number(e.target.value) })}
                                            className="w-24 p-2 text-right bg-slate-100 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold text-amber-700"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Extra Bed Rate (₹)</p>
                                            <p className="text-xs text-slate-500">Auto-billed per auxiliary bed per night.</p>
                                        </div>
                                        <input
                                            type="number"
                                            value={settings.extra_bed_rate || 0}
                                            onChange={e => setSettings({ ...settings, extra_bed_rate: Number(e.target.value) })}
                                            className="w-24 p-2 text-right bg-slate-100 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold text-amber-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Dining Plans */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">Meal Plan Add-On Rates (Per Pax / Night)</h3>
                                <div className="space-y-3">
                                    {['EP', 'CP', 'MAP', 'AP', 'AI'].map(plan => (
                                        <div key={plan} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl h-14">
                                            <p className="text-sm font-black text-slate-800 border-l-4 border-amber-500 pl-3 uppercase tracking-wider">{plan}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400 font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    value={settings.meal_plan_rates?.[plan] || 0}
                                                    onChange={e => setSettings({
                                                        ...settings,
                                                        meal_plan_rates: {
                                                            ...settings.meal_plan_rates,
                                                            [plan]: Number(e.target.value)
                                                        }
                                                    })}
                                                    disabled={plan === 'EP'}
                                                    className="w-24 p-2 text-right bg-slate-100 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold text-emerald-700 disabled:opacity-50 disabled:bg-slate-200"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
