'use client';

import { useEffect, useState } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { BedDouble, User, AlertTriangle, Sparkles, UserPlus, X, Loader2, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/utils/billing';
import { formatISTDate, getISTNow } from '@/utils/date';
import { cn } from '@/lib/utils';
import { getAvailableCleaningStaff, assignCleaningStaff } from '@/app/actions/housekeeping';
import { unblockRoom, getRoomGridData } from '@/app/actions/rooms';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

type RoomStatus = 'Available' | 'Occupied' | 'Dirty' | 'Maintenance' | 'Blocked';

interface Room {
    id: string;
    number: string;
    type: string;
    status: RoomStatus;
    guestName?: string;
    bookingId?: string;
    idPending?: boolean;
    assignedStaffName?: string;
    assignmentId?: string;
    paxCount?: number;
    checkOutDate?: string;
    arrivalDate?: string;
    isUpcoming?: boolean;
    upcomingGuestName?: string;
    companyName?: string;
    blockedReason?: string;
    foodPlan?: string;
    bookingSource?: string;
}

const getStatusColor = (status: RoomStatus) => {
    switch (status) {
        case 'Available': return 'bg-emerald-100/90 border-emerald-400 text-emerald-950 shadow-[0_2px_10px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20';
        case 'Occupied': return 'bg-blue-100/90 border-blue-400 text-blue-950 shadow-[0_2px_10px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20';
        case 'Dirty': return 'bg-orange-100/90 border-orange-400 text-orange-950 shadow-[0_2px_10px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/20';
        case 'Maintenance': return 'bg-red-100/90 border-red-400 text-red-950 shadow-[0_2px_10px_rgba(239,68,68,0.15)] ring-1 ring-red-500/20';
        case 'Blocked': return 'bg-slate-800 border-slate-900 text-white shadow-xl ring-1 ring-slate-950';
    }
};

const getStatusIcon = (status: RoomStatus) => {
    switch (status) {
        case 'Available': return <Sparkles className="w-5 h-5 text-emerald-600 drop-shadow-sm" />;
        case 'Occupied': return <User className="w-5 h-5 text-blue-600 drop-shadow-sm" />;
        case 'Dirty': return <BedDouble className="w-5 h-5 text-orange-600 drop-shadow-sm" />;
        case 'Maintenance': return <AlertTriangle className="w-5 h-5 text-red-600 drop-shadow-sm" />;
        case 'Blocked': return <X className="w-5 h-5 text-slate-300 drop-shadow-sm" />;
    }
};

const getRoomHref = (room: Room) => {
    if (room.status === 'Occupied' && room.bookingId) return `/folio/${room.bookingId}`;
    if (room.status === 'Available') return `/check-in?room=${room.number}`;
    return '';
};

const isClickable = (room: Room) => room.status === 'Available' || (room.status === 'Occupied' && !!room.bookingId);

export function RoomGrid({ initialRooms }: { initialRooms: Room[] }) {
    const router = useRouter();
    const [filter, setFilter] = useState<RoomStatus | 'All'>('All');
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [blocking, setBlocking] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [cleaningStaff, setCleaningStaff] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [rooms, setRooms] = useState<Room[]>(initialRooms);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Synchronize state if props change (e.g. from server refresh)
    useEffect(() => {
        setRooms(initialRooms);
    }, [initialRooms]);

    // Function to fetch latest data and update state
    const refreshData = async () => {
        setIsRefreshing(true);
        try {
            const data: any = await getRoomGridData();
            setRooms(data);
        } catch (error) {
            console.error('[RoomGrid] Failed to refresh data:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Real-time subscription
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel('room_grid_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
                refreshData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cleaning_assignments' }, () => {
                refreshData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
                refreshData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filteredRooms = filter === 'All' ? rooms : rooms.filter(r => r.status === filter);

    const handleDirtyClick = async (room: Room) => {
        setSelectedRoom(room);
        setShowStaffModal(true);
        setLoadingStaff(true);
        try {
            const staff = await getAvailableCleaningStaff();
            setCleaningStaff(staff);
        } catch (e: any) {
            toast.error("Failed to load staff");
        } finally {
            setLoadingStaff(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Front Desk Grid</h1>
                    <p className="text-sm text-slate-500 mt-1">Real-time room status and allocation</p>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                    {['All', 'Available', 'Occupied', 'Dirty', 'Maintenance', 'Blocked'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilter(t as any)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95",
                                filter === t ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-300"
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredRooms.map((room) => (
                    isClickable(room) ? (
                        <Link href={getRoomHref(room)} key={room.id}>
                            <BentoCard interactive className={cn("p-5 flex flex-col aspect-square justify-between transition-colors", getStatusColor(room.status))}>
                                <div className="flex justify-between items-start w-full relative">
                                    <span className="text-3xl font-black opacity-90 tracking-tighter drop-shadow-sm">{room.number}</span>
                                    <div className="flex flex-col items-end gap-1 relative z-10">
                                        <div className="p-2.5 bg-white/80 backdrop-blur-md rounded-xl border border-white/60 shadow-sm transition-transform hover:scale-110">
                                            {getStatusIcon(room.status)}
                                        </div>
                                        {room.idPending && (
                                            <span className="px-2 py-0.5 mt-1 bg-amber-400 text-amber-950 text-[10px] font-black rounded uppercase tracking-wider shadow-sm">ID</span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto flex flex-col gap-1.5 px-0.5">
                                    <div className="flex flex-wrap items-center gap-1">
                                        {room.status === 'Occupied' && room.checkOutDate && (
                                            <div className={cn(
                                                "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight shadow-sm border transition-all",
                                                getISTNow() > new Date(room.checkOutDate) ? "bg-rose-600 text-white border-rose-700 animate-pulse shadow-rose-200" : "bg-white text-blue-950 border-blue-200/50"
                                            )}>
                                                <LogOut className="w-2.5 h-2.5" />
                                                <span>{getISTNow() > new Date(room.checkOutDate) ? "Overstay" : formatISTDate(room.checkOutDate)}</span>
                                            </div>
                                        )}

                                        {room.status === 'Occupied' && (
                                            <>
                                                {room.bookingSource && (
                                                    <div className={cn(
                                                        "px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight shadow-sm border",
                                                        room.bookingSource === 'OTA' ? "bg-indigo-50 text-indigo-700 border-indigo-100 shadow-indigo-50" : "bg-slate-50 text-slate-600 border-slate-200"
                                                    )}>
                                                        {room.bookingSource}
                                                    </div>
                                                )}

                                                {room.foodPlan && (
                                                    <div className={cn(
                                                        "px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight shadow-sm border",
                                                        room.foodPlan === 'EP' ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-orange-50 text-orange-700 border-orange-100 shadow-orange-50"
                                                    )}>
                                                        {room.foodPlan}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1 bg-white text-blue-950 px-1.5 py-0.5 rounded-md text-[9px] font-black shadow-sm border border-blue-100">
                                                    <User className="w-2.5 h-2.5" /> {room.paxCount || 1}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#1a365d]/50 leading-none">{room.status}</p>
                                        <p className="text-[15px] font-bold truncate tracking-tight text-[#1a365d] drop-shadow-sm">{room.guestName || room.type}</p>
                                    </div>
                                </div>
                            </BentoCard>
                        </Link>
                    ) : (
                        <div
                            key={room.id}
                            className={cn("h-full cursor-default", { "cursor-pointer": isClickable(room) })}
                        >
                            <BentoCard
                                interactive={room.status === 'Dirty' || room.status === 'Available' || room.status === 'Blocked'}
                                onClick={() => {
                                    if (room.status === 'Dirty') {
                                        handleDirtyClick(room);
                                    } else if (room.status === 'Available' || room.status === 'Blocked') {
                                        setSelectedRoom(room);
                                        setShowBlockModal(true);
                                    }
                                }}
                                className={cn(
                                    "p-5 flex flex-col aspect-square justify-between transition-colors group relative overflow-hidden",
                                    getStatusColor(room.status),
                                    (room.status !== 'Dirty' && room.status !== 'Available' && room.status !== 'Blocked') && "opacity-50"
                                )}
                            >
                                <div className="flex justify-between items-start w-full transition-transform group-hover:-translate-y-1">
                                    <span className={cn("text-3xl font-black opacity-90 tracking-tighter drop-shadow-sm", room.status === 'Blocked' && 'text-slate-300')}>{room.number}</span>
                                    <div className={cn("p-2.5 backdrop-blur-md rounded-xl border shadow-sm", room.status === 'Blocked' ? 'bg-slate-700/50 border-slate-600' : 'bg-white/80 border-white/60')}>
                                        {getStatusIcon(room.status)}
                                    </div>
                                </div>

                                {room.status === 'Dirty' && (
                                    <div className="absolute inset-0 bg-[#F0924A]/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                        <div className="bg-white/90 px-3 py-1.5 rounded-xl shadow-lg border border-[#F0924A]/10 flex items-center gap-2 scale-90 group-hover:scale-100 transition-transform">
                                            <UserPlus className="w-3.5 h-3.5 text-[#F0924A]" />
                                            <span className="text-[10px] font-black text-[#F0924A] uppercase tracking-wider">Assign Staff</span>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-auto flex flex-col gap-1 px-0.5 transition-transform group-hover:translate-y-1">
                                    <div className="flex flex-col">
                                        <p className={cn(
                                            "text-[9px] font-black uppercase tracking-widest leading-none mb-1",
                                            {
                                                'text-[#F0924A]': room.status === 'Dirty',
                                                'text-[#E33B32]': room.status === 'Maintenance',
                                                'text-slate-400': room.status === 'Blocked' || room.status === 'Available'
                                            }
                                        )}>
                                            {room.status === 'Dirty' ? 'Needs Cleaning' :
                                                room.status === 'Maintenance' ? 'Under Maintenance' :
                                                    room.status === 'Blocked' ? 'Blocked Offline' : 'Ready'}
                                        </p>
                                        <p className={cn(
                                            "text-[15px] font-bold truncate tracking-tight drop-shadow-sm leading-tight",
                                            {
                                                'text-[#1a365d]': room.status !== 'Blocked',
                                                'text-slate-400': room.status === 'Blocked'
                                            }
                                        )}>
                                            {room.status === 'Blocked' ? (room.blockedReason || 'Isolated by Admin') : (room.guestName || room.type)}
                                        </p>
                                        <p className="text-[11px] font-semibold text-slate-500/60 leading-tight mt-0.5">
                                            {room.assignedStaffName ? room.assignedStaffName : 'No Staff'}
                                        </p>
                                    </div>
                                </div>
                            </BentoCard>
                        </div>
                    )
                ))}
            </div>

            {/* Block Modal */}
            {showBlockModal && selectedRoom && (
                <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBlockModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Manage Inventory</h3>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Room {selectedRoom.number} — {selectedRoom.status}</p>
                            </div>
                            <button onClick={() => setShowBlockModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {selectedRoom.status === 'Blocked' ? (
                                <>
                                    <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Status</p>
                                        <p className="text-sm font-bold text-slate-800">This room is completely isolated off the market.</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            setBlocking(true);
                                            try {
                                                await unblockRoom(selectedRoom.id);
                                                // Optimistic update
                                                setRooms(prev => prev.map(r =>
                                                    r.id === selectedRoom.id ? { ...r, status: 'Available' as RoomStatus } : r
                                                ));
                                                setShowBlockModal(false);
                                                router.refresh();
                                            } catch (e: any) {
                                                toast.error(e.message);
                                            } finally {
                                                setBlocking(false);
                                            }
                                        }}
                                        disabled={blocking}
                                        className="w-full p-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {blocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        Restore to Available Inventory
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* Housekeeping Modal */}
            {showStaffModal && selectedRoom && (
                <div className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowStaffModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-bold text-lg">Dispatch Housekeeping</h3>
                                <p className="text-slate-400 text-xs font-semibold mt-0.5">Room {selectedRoom.number} • Needs Cleaning</p>
                            </div>
                            <button onClick={() => setShowStaffModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors bg-slate-800">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 border-b border-slate-50">
                            <p className="text-xs font-black uppercase tracking-widest text-[#F0924A] mb-3">Available Personnel</p>

                            {loadingStaff ? (
                                <div className="py-8 flex justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                                </div>
                            ) : cleaningStaff.length === 0 ? (
                                <div className="py-6 text-center text-slate-500 text-sm font-medium">
                                    No cleaning staff currently available on shift.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                                    {cleaningStaff.map(staff => (
                                        <button
                                            key={staff.id}
                                            disabled={assigningId !== null}
                                            onClick={async () => {
                                                setAssigningId(staff.id);
                                                try {
                                                    await assignCleaningStaff(selectedRoom.id, staff.id);
                                                    // Optimistic update
                                                    setRooms(prev => prev.map(r =>
                                                        r.id === selectedRoom.id ? { ...r, assignedStaffName: staff.name } : r
                                                    ));
                                                    toast.success(`Assigned ${staff.name} to Room ${selectedRoom.number}`);
                                                    setShowStaffModal(false);
                                                    router.refresh();
                                                } catch (e: any) {
                                                    toast.error(e.message);
                                                } finally {
                                                    setAssigningId(null);
                                                }
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                                                "bg-white border-slate-200 hover:border-[#F0924A] hover:shadow-md hover:shadow-[#F0924A]/10 group"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                                                    staff.isBusy ? "bg-slate-200 text-slate-500" : "bg-[#F0924A]/10 text-[#F0924A] group-hover:bg-[#F0924A] group-hover:text-white transition-colors"
                                                )}>
                                                    {staff.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{staff.name}</p>
                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                                        {staff.taskCount > 0 ? `${staff.taskCount} Current Tasks` : 'Available'}
                                                    </p>
                                                </div>
                                            </div>
                                            {assigningId === staff.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-[#F0924A]" />
                                            ) : (
                                                <UserPlus className="w-4 h-4 text-slate-300 group-hover:text-[#F0924A] transition-colors" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
