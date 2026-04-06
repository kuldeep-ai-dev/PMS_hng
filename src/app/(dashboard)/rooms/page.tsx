'use client';

import { useState, useEffect } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { BedDouble, Sparkles, User, AlertTriangle, Plus, Pencil, Wrench, Trash2, X, Loader2, Check, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchRooms, addRoom, updateRoomRate, toggleMaintenance, deleteRoom, markRoomCleaned } from './actions-rooms';
import { blockRoom, unblockRoom } from '@/app/actions/rooms';

export default function RoomsPage() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [roomTypes, setRoomTypes] = useState<string[]>(['Standard', 'Deluxe', 'Suite']);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingRateId, setEditingRateId] = useState<string | null>(null);
    const [editRateValue, setEditRateValue] = useState('');
    const [newRoom, setNewRoom] = useState({ number: '', type: 'Standard', base_rate: '' });
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>('');

    // Blocking State
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [blockRoomId, setBlockRoomId] = useState<string | null>(null);
    const [blockReason, setBlockReason] = useState('');

    const loadData = async () => {
        try {
            const supabase = (await import('@/utils/supabase/client')).createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                setUserRole(profile?.role || '');
            }

            const [roomsData, settingsData] = await Promise.all([
                fetchRooms(),
                import('@/app/(dashboard)/settings/actions').then(m => m.getSettings())
            ]);
            setRooms(roomsData);
            if (settingsData?.room_types) {
                setRoomTypes(settingsData.room_types);
                // Set default type to first available if current default isn't in list
                if (!settingsData.room_types.includes(newRoom.type)) {
                    setNewRoom(prev => ({ ...prev, type: settingsData.room_types[0] }));
                }
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleAddRoom = async () => {
        if (!newRoom.number || !newRoom.base_rate) return;
        setActionLoading('add');
        try {
            await addRoom({ number: newRoom.number, type: newRoom.type, base_rate: Number(newRoom.base_rate) });
            setNewRoom({ number: '', type: roomTypes[0] || 'Standard', base_rate: '' });
            setShowAddModal(false);
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

    const handleToggleMaintenance = async (roomId: string, currentStatus: string) => {
        if (currentStatus === 'Occupied') {
            alert('Cannot toggle maintenance on an occupied room.');
            return;
        }
        setActionLoading(roomId);
        try {
            await toggleMaintenance(roomId, currentStatus);
            await loadData();
        } catch (err: any) {
            alert(`Failed to toggle maintenance: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleMarkCleaned = async (roomId: string) => {
        setActionLoading(roomId);
        try {
            await markRoomCleaned(roomId);
            await loadData();
        } catch (err: any) {
            alert(`Failed to mark room as cleaned: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteRoom = async (roomId: string, roomNumber: string, status: string) => {
        if (status === 'Occupied') {
            alert('Cannot delete an occupied room. Check out the guest first.');
            return;
        }
        if (!confirm(`Are you sure you want to delete Room ${roomNumber}? This cannot be undone.`)) return;
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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Available': return <Sparkles className="w-5 h-5 text-emerald-600" />;
            case 'Occupied': return <User className="w-5 h-5 text-blue-600" />;
            case 'Dirty': return <BedDouble className="w-5 h-5 text-amber-600" />;
            case 'Maintenance': return <AlertTriangle className="w-5 h-5 text-red-600" />;
            default: return <BedDouble className="w-5 h-5 text-slate-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            Available: 'bg-emerald-50 text-emerald-600',
            Occupied: 'bg-blue-50 text-blue-600',
            Dirty: 'bg-amber-50 text-amber-600',
            Maintenance: 'bg-red-50 text-red-600',
            Blocked: 'bg-slate-800 text-white shadow-sm',
        };
        return colors[status] || 'bg-slate-50 text-slate-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 h-full max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Room Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Configure room types, rates, and amenities</p>
                </div>
                {userRole === 'admin' && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add New Room
                    </button>
                )}
            </div>

            {/* Add Room Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">Add New Room</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Room Number *</label>
                                <input type="text" value={newRoom.number} onChange={e => setNewRoom({ ...newRoom, number: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. 101" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Room Type *</label>
                                <select value={newRoom.type} onChange={e => setNewRoom({ ...newRoom, type: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none appearance-none">
                                    {roomTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Base Rate (₹/night) *</label>
                                <input
                                    type="number"
                                    value={newRoom.base_rate}
                                    onChange={e => setNewRoom({ ...newRoom, base_rate: e.target.value })}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                                    placeholder="e.g. 2500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-slate-600 bg-white border border-slate-200 rounded-xl font-medium hover:bg-slate-50">Cancel</button>
                            <button
                                onClick={handleAddRoom}
                                disabled={!newRoom.number || !newRoom.base_rate || actionLoading === 'add'}
                                className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Add Room
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Room Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map((room) => (
                    <BentoCard key={room.id} className="p-6 relative group">
                        {/* Delete Button (top-right, hidden for occupied rooms) */}
                        {room.status !== 'Occupied' && userRole === 'admin' && (
                            <button
                                onClick={() => handleDeleteRoom(room.id, room.number, room.status)}
                                disabled={actionLoading === room.id}
                                className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Room"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}

                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">Room {room.number}</h3>
                                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{room.type}</p>
                            </div>
                            <div className={cn("p-3 rounded-xl", room.status === 'Available' ? 'bg-emerald-50' : room.status === 'Occupied' ? 'bg-blue-50' : room.status === 'Maintenance' ? 'bg-red-50' : 'bg-slate-50')}>
                                {getStatusIcon(room.status)}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Base Rate - Inline Edit */}
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500 font-medium">Base Rate</span>
                                {editingRateId === room.id && userRole === 'admin' ? (
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm font-bold text-slate-400">₹</span>
                                        <input
                                            type="number"
                                            value={editRateValue}
                                            onChange={e => setEditRateValue(e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            className="w-24 p-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-right focus:ring-2 focus:ring-teal-500 outline-none"
                                            autoFocus
                                            onKeyDown={e => { if (e.key === 'Enter') handleUpdateRate(room.id); if (e.key === 'Escape') setEditingRateId(null); }}
                                        />
                                        <button onClick={() => handleUpdateRate(room.id)} disabled={actionLoading === room.id} className="p-1 text-teal-600 hover:bg-teal-50 rounded">
                                            {actionLoading === room.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        </button>
                                        <button onClick={() => setEditingRateId(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                ) : (
                                    <span className="text-lg font-bold text-slate-900">₹{Number(room.base_rate).toLocaleString()}</span>
                                )}
                            </div>

                            {/* Status */}
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500 font-medium">Status</span>
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", getStatusBadge(room.status))}>
                                    {room.status}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 flex flex-wrap gap-2">
                            {userRole === 'admin' && (
                                <button
                                    onClick={() => { setEditingRateId(room.id); setEditRateValue(String(room.base_rate)); }}
                                    className="flex-1 min-w-[30%] py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Pencil className="w-3 h-3" /> Edit Rate
                                </button>
                            )}
                            <button
                                onClick={() => handleToggleMaintenance(room.id, room.status)}
                                disabled={room.status === 'Occupied' || room.status === 'Blocked' || actionLoading === room.id}
                                className={cn(
                                    "flex-1 min-w-[30%] py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50",
                                    room.status === 'Maintenance'
                                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                        : "bg-red-50 text-red-700 hover:bg-red-100"
                                )}
                            >
                                <Wrench className="w-3 h-3" />
                                {room.status === 'Maintenance' ? 'Make Avail' : 'Mainten'}
                            </button>

                            {/* Block Toggle */}
                            <button
                                onClick={async () => {
                                    if (room.status === 'Blocked') {
                                        setActionLoading(room.id);
                                        try {
                                            await unblockRoom(room.id);
                                            await loadData();
                                        } catch (e: any) {
                                            alert(e.message);
                                        } finally {
                                            setActionLoading(null);
                                        }
                                    } else {
                                        setBlockRoomId(room.id);
                                        setShowBlockModal(true);
                                    }
                                }}
                                disabled={room.status === 'Occupied' || actionLoading === room.id}
                                className={cn(
                                    "flex-1 min-w-[30%] py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50",
                                    room.status === 'Blocked'
                                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                        : "bg-slate-900 text-white hover:bg-slate-800"
                                )}
                            >
                                {room.status === 'Blocked' ? (
                                    <><Unlock className="w-3 h-3" /> Unlock</>
                                ) : (
                                    <><Lock className="w-3 h-3" /> Block</>
                                )}
                            </button>

                            {room.status === 'Dirty' && (
                                <button
                                    onClick={() => handleMarkCleaned(room.id)}
                                    disabled={actionLoading === room.id}
                                    className="w-full py-2 mt-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    Mark Cleaned
                                </button>
                            )}
                        </div>
                    </BentoCard>
                ))}

                {rooms.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        <BedDouble className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="font-medium">No rooms configured yet</p>
                        <p className="text-sm mt-1">Click "Add New Room" to get started</p>
                    </div>
                )}
            </div>

            {/* Block Modal */}
            {showBlockModal && (
                <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBlockModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">Lock Room Offline</h2>
                            <button onClick={() => setShowBlockModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-slate-600">This will explicitly hide the room from frontend operations and exclude it from all Daily Audit inventory calculations.</p>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Reason for Blocking</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Broken AC / Police Investigation"
                                    value={blockReason}
                                    onChange={e => setBlockReason(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-slate-900 outline-none transition"
                                />
                            </div>
                            <button
                                onClick={async () => {
                                    if (!blockReason.trim() || !blockRoomId) return alert('Enter a valid reason');
                                    setActionLoading(blockRoomId);
                                    try {
                                        await blockRoom(blockRoomId, blockReason);
                                        setShowBlockModal(false);
                                        setBlockReason('');
                                        await loadData();
                                    } catch (e: any) {
                                        alert(e.message);
                                    } finally {
                                        setActionLoading(null);
                                    }
                                }}
                                disabled={actionLoading !== null || !blockReason.trim()}
                                className="w-full p-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                Confirm Lockdown
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
