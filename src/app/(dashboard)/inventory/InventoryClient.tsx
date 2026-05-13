'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Package, History, AlertTriangle, Plus,
  Minus, Search, ArrowUpRight, ArrowDownLeft,
  Settings2, X, ChevronDown, PackagePlus, RefreshCw
} from 'lucide-react';
import {
  adjustStock,
  updateItemThreshold,
  addInventoryItem,
  addInventoryCategory,
} from '@/app/actions/inventory';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_threshold: number;
  category_id: string | null;
  category: { name: string } | null;
}

interface Category { id: string; name: string; }

interface InventoryClientProps {
  initialItems: InventoryItem[];
  categories: Category[];
  ledger: any[];
  rooms: any[];
}

type Modal = 'none' | 'adjust' | 'add_item' | 'threshold';

export default function InventoryClient({ initialItems, categories: initialCats, ledger }: InventoryClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── UI state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'stock' | 'ledger'>('stock');
  const [modal, setModal] = useState<Modal>('none');
  const [searchTerm, setSearchTerm] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [categories, setCategories] = useState<Category[]>(initialCats);

  // ── Adjust-stock state ────────────────────────────────────
  const [targetItem, setTargetItem] = useState<InventoryItem | null>(null);
  const [adjQty, setAdjQty] = useState(0);
  const [adjReason, setAdjReason] = useState('');

  // ── Threshold state ───────────────────────────────────────
  const [threshVal, setThreshVal] = useState(0);

  // ── Add-item state ────────────────────────────────────────
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newCatId, setNewCatId] = useState('');
  const [newStock, setNewStock] = useState(0);
  const [newThresh, setNewThresh] = useState(5);
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  // ── Helpers ───────────────────────────────────────────────
  const closeModal = () => { setModal('none'); setTargetItem(null); setAdjQty(0); setAdjReason(''); };

  const openAdjust = (item: InventoryItem) => {
    setTargetItem(item);
    setAdjQty(0);
    setAdjReason('');
    setModal('adjust');
  };

  const openThreshold = (item: InventoryItem) => {
    setTargetItem(item);
    setThreshVal(item.min_threshold);
    setModal('threshold');
  };

  const refresh = () => startTransition(() => router.refresh());

  // ── Actions ───────────────────────────────────────────────
  const handleAdjust = async (type: 'ADD' | 'REMOVE') => {
    if (!targetItem || adjQty <= 0) return toast.error('Enter a valid quantity');
    try {
      await adjustStock({
        itemId: targetItem.id,
        quantity: adjQty,
        type,
        reason: adjReason || (type === 'ADD' ? 'Restocking' : 'Manual Removal'),
      });
      toast.success(`Stock ${type === 'ADD' ? 'added' : 'removed'} for "${targetItem.name}"`);
      closeModal();
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleThreshold = async () => {
    if (!targetItem) return;
    try {
      await updateItemThreshold(targetItem.id, threshVal);
      toast.success('Alert threshold updated');
      closeModal();
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddItem = async () => {
    if (!newName.trim()) return toast.error('Item name is required');
    if (!newUnit.trim()) return toast.error('Unit is required');
    try {
      let catId = newCatId || null;

      // create new category on-the-fly if requested
      if (showNewCat && newCatName.trim()) {
        const created = await addInventoryCategory(newCatName.trim());
        setCategories(prev => [...prev, created]);
        catId = created.id;
      }

      await addInventoryItem({
        name: newName.trim(),
        unit: newUnit.trim(),
        categoryId: catId,
        initialStock: newStock,
        minThreshold: newThresh,
      });

      toast.success(`"${newName}" added to inventory`);
      setNewName(''); setNewUnit('pcs'); setNewCatId(''); setNewStock(0); setNewThresh(5);
      setNewCatName(''); setShowNewCat(false);
      setModal('none');
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  // ── Filtered items ────────────────────────────────────────
  const filtered = initialItems.filter(item => {
    const nameMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const catMatch = catFilter === 'all' || item.category_id === catFilter;
    return nameMatch && catMatch;
  });

  const lowStock = initialItems.filter(i => i.current_stock <= i.min_threshold);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Low-stock banner ── */}
      <AnimatePresence>
        {lowStock.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm"
          >
            <div className="mt-0.5 p-1.5 bg-red-100 rounded-full shrink-0 animate-pulse">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-800 text-sm">Low Stock Alert — {lowStock.length} item(s)</p>
              <p className="text-red-700 text-xs mt-0.5">{lowStock.map(i => i.name).join(' · ')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header row: tabs + action buttons ── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Inventory Control</h2>
          <p className="text-sm font-medium text-slate-400">Manage stock levels, tracking, and warehouse catalog</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit">
            {(['stock', 'ledger'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm transition-all font-black uppercase tracking-tighter ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {tab === 'stock' ? <Package className="h-4 w-4" /> : <History className="h-4 w-4" />}
                {tab === 'stock' ? 'Stock Management' : 'Transaction Ledger'}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setModal('add_item')}
              className="flex items-center gap-2.5 px-6 py-2.5 bg-slate-900 text-white text-sm font-black uppercase tracking-tighter rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" /> Add Item
            </button>
            <button
              onClick={refresh}
              disabled={isPending}
              className="flex items-center justify-center w-12 h-12 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl hover:bg-slate-100 transition-all border border-slate-100"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── STOCK TAB ── */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Search items…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="relative">
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white cursor-pointer">
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-20 text-gray-400">
                <Package className="h-14 w-14 mx-auto mb-4 opacity-20" />
                <p className="font-semibold">No items found</p>
                <p className="text-sm mt-1">Try a different search, or add a new item above.</p>
              </div>
            )}
            {filtered.map(item => {
              const isLow = item.current_stock <= item.min_threshold;
              return (
                <motion.div key={item.id} layout
                  className={`bg-white rounded-2xl border p-5 flex flex-col gap-3 transition-shadow ${isLow ? 'border-red-200 shadow-red-50 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md'}`}>

                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-1 truncate max-w-full">
                        {item.category?.name || 'Uncategorized'}
                      </span>
                      <h4 className="font-bold text-gray-900 text-sm leading-tight">{item.name}</h4>
                    </div>
                    <button onClick={() => openThreshold(item)}
                      className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-all ml-2" title="Set low-stock threshold">
                      <Settings2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Stock level */}
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-4xl font-black text-gray-900 leading-none">
                        {item.current_stock}
                        <span className="text-xs font-medium text-gray-400 ml-1">{item.unit}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">Alert at ≤ {item.min_threshold}</div>
                    </div>
                    {isLow && (
                      <span className="flex items-center gap-1 text-red-500 text-[11px] font-bold uppercase animate-pulse">
                        <AlertTriangle className="h-3 w-3" /> Low
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                    <button onClick={() => { openAdjust(item); }}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 transition-all active:scale-95">
                      <Plus className="h-3.5 w-3.5" /> Add Stock
                    </button>
                    <button onClick={() => { setTargetItem(item); setAdjQty(0); setAdjReason(''); setModal('adjust'); }}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-100 transition-all active:scale-95">
                      <Minus className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LEDGER TAB ── */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  <th className="px-5 py-4">Date & Time</th>
                  <th className="px-5 py-4">Item</th>
                  <th className="px-5 py-4">Qty</th>
                  <th className="px-5 py-4">Staff</th>
                  <th className="px-5 py-4">Reason / Room</th>
                  <th className="px-5 py-4">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ledger.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-14 text-gray-400 italic">No transactions yet.</td></tr>
                )}
                {ledger.map((e, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{new Date(e.created_at).toLocaleDateString('en-IN')}</div>
                      <div className="text-xs text-gray-400">{new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-800">{e.item_name}</td>
                    <td className="px-5 py-3">
                      <span className={`flex items-center gap-1 font-bold ${e.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {e.quantity > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                        {Math.abs(e.quantity)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{e.user_name || 'System'}</td>
                    <td className="px-5 py-3">
                      <span className="italic text-gray-500">"{e.reason}"</span>
                      {e.room_number && <span className="ml-2 text-xs text-blue-600 font-semibold">Room {e.room_number}</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${e.source === 'USAGE' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                        {e.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          MODAL: Adjust Stock
      ══════════════════════════════ */}
      <AnimatePresence>
        {modal === 'adjust' && targetItem && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Decorative background element */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                <button
                  onClick={closeModal}
                  className="absolute top-6 right-6 p-2 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all duration-300"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 bg-blue-50 px-3 py-1 rounded-full px-3 py-1 rounded-full">
                    Inventory Update
                  </span>
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">{targetItem.name}</h3>

                {/* Current level display */}
                <div className="flex items-center justify-between bg-slate-50/80 backdrop-blur-sm rounded-[2rem] p-6 mb-8 border border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Current Balance</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-slate-900">{targetItem.current_stock}</span>
                      <span className="text-sm text-slate-400 font-bold uppercase">{targetItem.unit}</span>
                    </div>
                  </div>
                  {targetItem.current_stock <= targetItem.min_threshold && (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 text-red-500 text-xs font-black bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                        <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                        LOW STOCK
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Below thresh. {targetItem.min_threshold}</span>
                    </div>
                  )}
                </div>

                {/* Quantity Selector */}
                <div className="mb-8">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4 text-center">Change Quantity</label>
                  <div className="flex items-center justify-center gap-8 px-4">
                    <button
                      onClick={() => setAdjQty(q => Math.max(0, q - 1))}
                      className="w-14 h-14 flex items-center justify-center bg-slate-100 rounded-2xl hover:bg-slate-200 active:scale-90 transition-all duration-200 group"
                    >
                      <Minus className="h-6 w-6 text-slate-500 group-hover:text-slate-900 transition-colors" />
                    </button>

                    <div className="flex flex-col items-center">
                      <input
                        type="number"
                        min={0}
                        autoFocus
                        className="w-24 text-center text-6xl font-black text-blue-600 outline-none bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none transition-all"
                        value={adjQty}
                        onChange={e => setAdjQty(Math.max(0, Number(e.target.value)))}
                      />
                      <div className="w-12 h-1 bg-blue-100 rounded-full mt-1" />
                    </div>

                    <button
                      onClick={() => setAdjQty(q => q + 1)}
                      className="w-14 h-14 flex items-center justify-center bg-slate-100 rounded-2xl hover:bg-slate-200 active:scale-90 transition-all duration-200 group"
                    >
                      <Plus className="h-6 w-6 text-slate-500 group-hover:text-slate-900 transition-colors" />
                    </button>
                  </div>
                </div>

                {/* Reason Textarea */}
                <div className="mb-10">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Adjustment Reason</label>
                  <textarea
                    rows={2}
                    placeholder="Provide a reason (e.g., Damaged, Restock, Return...)"
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none text-sm transition-all duration-300 resize-none font-medium placeholder:text-slate-300"
                    value={adjReason}
                    onChange={e => setAdjReason(e.target.value)}
                  />
                </div>

                {/* Confirm Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    disabled={adjQty === 0}
                    onClick={() => handleAdjust('ADD')}
                    className="group relative flex flex-col items-center justify-center py-4 rounded-[1.5rem] bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all duration-300 active:scale-95 disabled:opacity-30 disabled:grayscale overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ArrowUpRight className="h-6 w-6 mb-1" />
                    <span className="text-sm">Add Stock</span>
                  </button>

                  <button
                    disabled={adjQty === 0}
                    onClick={() => handleAdjust('REMOVE')}
                    className="group relative flex flex-col items-center justify-center py-4 rounded-[1.5rem] bg-red-500 hover:bg-red-600 text-white font-bold transition-all duration-300 active:scale-95 disabled:opacity-30 disabled:grayscale overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ArrowDownLeft className="h-6 w-6 mb-1" />
                    <span className="text-sm">Remove</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>


      {/* ══════════════════════════════
          MODAL: Add New Item
      ══════════════════════════════ */}
      <AnimatePresence>
        {modal === 'add_item' && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
              onClick={() => setModal('none')}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

                <button
                  onClick={() => setModal('none')}
                  className="absolute top-6 right-6 p-2 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all duration-300"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    Catalog Addition
                  </span>
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Register New Item</h3>

                <div className="space-y-6">
                  {/* Item name */}
                  <FormField label="Full Name of Item">
                    <input
                      type="text"
                      placeholder="e.g., Luxury Hand Soap, Silk Bedding..."
                      className="w-full px-6 py-4 rounded-[1.25rem] bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none text-sm transition-all duration-300 font-medium"
                      value={newName} onChange={e => setNewName(e.target.value)}
                    />
                  </FormField>

                  {/* Unit */}
                  <FormField label="Standard Unit">
                    <div className="flex gap-2 flex-wrap">
                      {['pcs', 'kg', 'litre', 'box', 'roll', 'bottle', 'pack', 'set'].map(u => (
                        <button
                          key={u}
                          onClick={() => setNewUnit(u)}
                          className={`px-4 py-2 rounded-xl text-[11px] font-bold border transition-all duration-300 ${newUnit === u ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100' : 'bg-white text-slate-500 border-slate-100 hover:border-emerald-200 hover:text-emerald-600'}`}
                        >
                          {u.toUpperCase()}
                        </button>
                      ))}
                      <input
                        type="text"
                        placeholder="CUSTOM..."
                        className="px-4 py-2 rounded-xl text-[11px] font-bold border border-dashed border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/5 outline-none w-24 text-center transition-all bg-transparent"
                        value={['pcs', 'kg', 'litre', 'box', 'roll', 'bottle', 'pack', 'set'].includes(newUnit) ? '' : newUnit}
                        onChange={e => setNewUnit(e.target.value)}
                      />
                    </div>
                  </FormField>

                  {/* Category */}
                  <FormField label="Department / Category">
                    {!showNewCat ? (
                      <div className="flex gap-2">
                        <div className="relative flex-1 group">
                          <select
                            value={newCatId}
                            onChange={e => setNewCatId(e.target.value)}
                            className="w-full appearance-none px-6 py-4 rounded-[1.25rem] bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none text-sm transition-all duration-300 font-medium bg-white cursor-pointer"
                          >
                            <option value="">UNCATEGORIZED</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        </div>
                        <button
                          onClick={() => setShowNewCat(true)}
                          className="shrink-0 aspect-square w-[54px] flex items-center justify-center rounded-[1.25rem] bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all"
                          title="Create New Category"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 animate-in slide-in-from-left-4 duration-300">
                        <input
                          type="text"
                          placeholder="Name of new category..."
                          className="flex-1 px-6 py-4 rounded-[1.25rem] bg-emerald-50 border border-emerald-200 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none text-sm transition-all duration-300 font-medium"
                          value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus
                        />
                        <button
                          onClick={() => setShowNewCat(false)}
                          className="shrink-0 px-5 py-4 rounded-[1.25rem] bg-slate-100 text-slate-500 text-xs font-bold hover:bg-slate-200 transition-all"
                        >
                          CANCEL
                        </button>
                      </div>
                    )}
                  </FormField>

                  {/* Opening stock */}
                  <div className="grid grid-cols-2 gap-6">
                    <FormField label="Initial Balance">
                      <div className="relative">
                        <Package className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                        <input
                          type="number"
                          min={0}
                          className="w-full pl-12 pr-6 py-4 rounded-[1.25rem] bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none text-sm transition-all duration-300 font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                          value={newStock} onChange={e => setNewStock(Math.max(0, Number(e.target.value)))}
                        />
                      </div>
                    </FormField>
                    <FormField label="Warning Thresh.">
                      <div className="relative">
                        <AlertTriangle className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                        <input
                          type="number"
                          min={0}
                          className="w-full pl-12 pr-6 py-4 rounded-[1.25rem] bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none text-sm transition-all duration-300 font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                          value={newThresh} onChange={e => setNewThresh(Math.max(0, Number(e.target.value)))}
                        />
                      </div>
                    </FormField>
                  </div>
                </div>

                <div className="flex gap-4 mt-10">
                  <button
                    onClick={() => setModal('none')}
                    className="flex-1 py-4 rounded-[1.5rem] bg-slate-50 text-slate-500 font-bold hover:bg-slate-100 transition-all"
                  >
                    DISCARD
                  </button>
                  <button
                    onClick={handleAddItem}
                    className="group relative flex-[2] py-4 rounded-[1.5rem] bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <PackagePlus className="h-5 w-5" />
                    <span>CREATE ITEM</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════
          MODAL: Low-Stock Threshold
      ══════════════════════════════ */}
      <AnimatePresence>
        {modal === 'threshold' && targetItem && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)]"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-amber-500" />

                <button
                  onClick={closeModal}
                  className="absolute top-6 right-6 p-2 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all duration-300"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                    Alert Settings
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">{targetItem.name}</h3>
                <p className="text-xs text-slate-400 mb-8 font-medium italic">Adjust the threshold for low-stock notifications.</p>

                <div className="flex items-center justify-center gap-6 mb-10">
                  <button
                    onClick={() => setThreshVal(v => Math.max(0, v - 1))}
                    className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-xl hover:bg-slate-100 active:scale-90 transition-all"
                  >
                    <Minus className="h-5 w-5 text-slate-500" />
                  </button>

                  <div className="flex flex-col items-center">
                    <input
                      type="number"
                      min={0}
                      className="w-20 text-center text-5xl font-black text-orange-500 outline-none bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      value={threshVal}
                      onChange={e => setThreshVal(Math.max(0, Number(e.target.value)))}
                    />
                    <div className="w-8 h-1 bg-orange-100 rounded-full mt-1" />
                  </div>

                  <button
                    onClick={() => setThreshVal(v => v + 1)}
                    className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-xl hover:bg-slate-100 active:scale-90 transition-all"
                  >
                    <Plus className="h-5 w-5 text-slate-500" />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-500 font-bold hover:bg-slate-100 transition-all"
                  >
                    BACK
                  </button>
                  <button
                    onClick={handleThreshold}
                    className="flex-1 py-4 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all active:scale-95"
                  >
                    SAVE
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────
function Portal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{label}</label>
      {children}
    </div>
  );
}
