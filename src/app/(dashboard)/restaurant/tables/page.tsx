'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BentoCard } from '@/components/ui/BentoCard';
import { cn } from '@/lib/utils';
import { Plus, Trash2, QrCode, Printer, Check, X, Users, Edit3, Home } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';

type Table = {
  id: string;
  table_number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
};

type Room = {
  id: string;
  number: string;
  type: string;
  status: string;
};

export default function TableManagement() {
  const [activeTab, setActiveTab] = useState<'tables' | 'rooms'>('tables');
  const [tables, setTables] = useState<Table[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTable, setNewTable] = useState({ table_number: '', capacity: 2 });
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [qrTableId, setQrTableId] = useState<string | null>(null);
  const [qrRoomId, setQrRoomId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    if (activeTab === 'tables') fetchTables();
    if (activeTab === 'rooms') fetchRooms();
  }, [activeTab]);

  const fetchTables = async () => {
    setLoading(true);
    // Order by length first, then alphabetical to ensure natural numeric sorting (1, 2, 10, 11)
    const { data } = await supabase.from('restaurant_tables')
      .select('*')
      .order('table_number', { ascending: true });

    if (data) {
      const sortedData = [...(data as Table[])].sort((a, b) => {
        return a.table_number.localeCompare(b.table_number, undefined, { numeric: true, sensitivity: 'base' });
      });
      setTables(sortedData);
    }
    setLoading(false);
  };

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('rooms').select('id, number, type, status').order('number');
    if (error) {
      console.error('Error fetching rooms:', error);
    }
    if (data) setRooms(data as Room[]);
    setLoading(false);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (editingTable) {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({
          table_number: newTable.table_number.trim(),
          capacity: newTable.capacity,
        })
        .eq('id', editingTable.id);

      if (!error) {
        toast.success("Table updated successfully!");
        setEditingTable(null);
        setNewTable({ table_number: '', capacity: 2 });
        setShowModal(false);
        fetchTables();
      } else {
        if (error.code === '23505') {
          toast.error(`Table number "${newTable.table_number}" is already in use.`);
        } else {
          toast.error("Update failed: " + error.message);
        }
      }
    } else {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .insert([{
          table_number: newTable.table_number.trim(),
          capacity: newTable.capacity,
          status: 'available'
        }])
        .select()
        .single();

      if (!error && data) {
        const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const qrUrl = `${appUrl}/qr-order/table/${data.id}`;
        await supabase.from('restaurant_tables').update({ qr_code_url: qrUrl }).eq('id', data.id);
        toast.success("New table created!");
        setNewTable({ table_number: '', capacity: 2 });
        setShowModal(false);
        fetchTables();
      } else if (error) {
        if (error.code === '23505') {
          toast.error(`Table number "${newTable.table_number}" is already in use.`);
        } else {
          toast.error("Creation failed: " + error.message);
        }
      }
    }
    setSaving(false);
  };

  const handleEditClick = (table: Table) => {
    setEditingTable(table);
    setNewTable({ table_number: table.table_number, capacity: table.capacity });
    setShowModal(true);
  };

  const deleteTable = async (id: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return;
    const { error } = await supabase.from('restaurant_tables').delete().eq('id', id);
    if (!error) {
      toast.success("Table deleted");
      fetchTables();
    } else {
      toast.error("Delete failed: " + error.message);
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'available' ? 'cleaning' : 'available';
    const { error } = await supabase.from('restaurant_tables').update({ status: next }).eq('id', id);
    if (!error) {
      toast.success(`Status updated to ${next}`);
      fetchTables();
    } else {
      toast.error("Status update failed: " + error.message);
    }
  };

  const printQR = () => {
    window.print();
  };

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const activeQRTable = tables.find(t => t.id === qrTableId);
  const activeQRRoom = rooms.find(r => r.id === qrRoomId);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto h-full pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">QR Management</h1>
          <p className="text-slate-500 font-medium tracking-wide">Generate order QRs for Tables and Hotel Rooms.</p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('tables')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === 'tables' ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Restaurant Tables
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === 'rooms' ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Hotel Rooms
          </button>
        </div>
      </div>

      {activeTab === 'tables' ? (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-teal-500 text-white font-bold rounded-xl hover:bg-teal-600 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Add Table
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {tables.map(table => (
              <BentoCard key={table.id} className="p-5 flex flex-col bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-all rounded-2xl">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl">
                    {table.table_number}
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full capitalize ${table.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                    table.status === 'occupied' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                    {table.status === 'cleaning' ? 'Maintenance' : table.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium mb-6">
                  <Users className="w-4 h-4 text-slate-400" />
                  Capacity: {table.capacity} pax
                </div>

                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setQrTableId(table.id)}
                    className="flex-1 py-2 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-600 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-200 hover:border-teal-200"
                  >
                    <QrCode className="w-4 h-4" /> View QR
                  </button>
                  <button
                    onClick={() => toggleStatus(table.id, table.status)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent"
                  >
                    {table.status === 'available' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleEditClick(table)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent"
                    title="Edit Table"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTable(table.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent"
                    title="Delete Table"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </BentoCard>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {rooms.map(room => (
            <BentoCard key={room.id} className="p-5 flex flex-col bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-all rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center font-black text-xl">
                  {room.number}
                </div>
                <Home className="w-5 h-5 text-slate-300" />
              </div>

              <div className="mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{room.type}</p>
                <div className={`text-sm font-bold mt-1 ${room.status === 'Available' ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                  {room.status}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100">
                <button
                  onClick={() => setQrRoomId(room.id)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" /> Generate Room QR
                </button>
              </div>
            </BentoCard>
          ))}
        </div>
      )}

      {/* Add Table Modal (unchanged) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <BentoCard className="w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                {editingTable ? 'Edit Table' : 'Add New Table'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTable(null);
                  setNewTable({ table_number: '', capacity: 2 });
                }}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Table identifier (Number/Name)</label>
                <input required type="text" value={newTable.table_number} onChange={e => setNewTable({ ...newTable, table_number: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-bold" placeholder="E.g. 12 or T-4" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Seating Capacity</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="20"
                  value={newTable.capacity === 0 ? '' : newTable.capacity}
                  onChange={e => setNewTable({ ...newTable, capacity: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTable(null);
                    setNewTable({ table_number: '', capacity: 2 });
                  }}
                  className="flex-1 py-2.5 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 font-bold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : editingTable ? 'Update Table' : 'Create Table'}
                </button>
              </div>
            </form>
          </BentoCard>
        </div>
      )}

      {/* Table QR Print Modal */}
      {qrTableId && activeQRTable && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm print:bg-white print:p-0">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center relative print:shadow-none print:w-full print:max-w-none print:h-screen print:justify-center">
            <button onClick={() => setQrTableId(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors print:hidden">
              <X className="w-6 h-6" />
            </button>
            <div className="text-center mb-8">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Table {activeQRTable.table_number}</h3>
              <p className="text-slate-500 font-medium tracking-wide">Scan to Order Food & Drinks</p>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border-2 border-slate-100 mb-8">
              <QRCode
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/qr-order/table/${activeQRTable.id}`}
                size={230}
                level="H"
              />
            </div>
            <button onClick={printQR} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 print:hidden shadow-xl shadow-slate-900/20">
              <Printer className="w-5 h-5" /> Print QR Tag
            </button>
            <div className="hidden print:block text-center mt-12 text-slate-400 font-medium">Powered by PMS Restaurant System</div>
          </div>
        </div>
      )}

      {/* Room QR Print Modal */}
      {qrRoomId && activeQRRoom && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm print:bg-white print:p-0">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center relative print:shadow-none print:w-full print:max-w-none print:h-screen print:justify-center">
            <button onClick={() => setQrRoomId(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors print:hidden">
              <X className="w-6 h-6" />
            </button>
            <div className="text-center mb-8">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Room {activeQRRoom.number}</h3>
              <p className="text-slate-500 font-medium tracking-wide uppercase text-xs mt-1">In-Room Dining Service</p>
              <p className="text-slate-400 font-semibold mt-3">Scan to order from your room</p>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border-2 border-slate-100 mb-8">
              <QRCode
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/qr-order/room/${activeQRRoom.id}`}
                size={230}
                level="H"
              />
            </div>
            <button onClick={printQR} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 print:hidden shadow-xl shadow-teal-600/20">
              <Printer className="w-5 h-5" /> Print Room QR
            </button>
            <div className="hidden print:block text-center mt-12 text-slate-400 font-medium italic">Standard charges apply. Enjoy your meal!</div>
          </div>
        </div>
      )}

    </div>
  );
}
