'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BentoCard } from '@/components/ui/BentoCard';
import { Plus, Trash2, Edit2, Check, X, ImageIcon, Utensils } from 'lucide-react';

export default function MenuManagement() {
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    categoryId: '',
    price: '',
    description: '',
    imageUrl: '',
    isVeg: true,
    isAvailable: true
  });

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [catRes, itemRes] = await Promise.all([
      supabase.from('restaurant_categories').select('*').order('display_order', { ascending: true }),
      supabase.from('restaurant_menu_items').select('*, category:restaurant_categories(name)').order('name', { ascending: true })
    ]);

    setCategories(catRes.data || []);
    setItems(itemRes.data || []);
    setLoading(false);
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const { error } = await supabase.from('restaurant_categories').insert([{ name: newCategoryName.trim() }]);
    if (!error) {
      setNewCategoryName('');
      fetchData();
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure? This will delete all items in this category.')) return;
    await supabase.from('restaurant_categories').delete().eq('id', id);
    fetchData();
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    await supabase.from('restaurant_menu_items').delete().eq('id', id);
    fetchData();
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    await supabase.from('restaurant_menu_items').update({ is_available: !currentStatus }).eq('id', id);
    fetchData();
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingItem(true);

    try {
      if (!newItem.name || !newItem.categoryId || !newItem.price) return;

      const { error } = await supabase.from('restaurant_menu_items').insert([{
        name: newItem.name.trim(),
        category_id: newItem.categoryId,
        description: newItem.description.trim() || null,
        price: parseFloat(newItem.price),
        image_url: newItem.imageUrl.trim() || null,
        is_veg: newItem.isVeg,
        is_available: newItem.isAvailable
      }]);

      if (!error) {
        setShowModal(false);
        setNewItem({
          name: '',
          categoryId: '',
          price: '',
          description: '',
          imageUrl: '',
          isVeg: true,
          isAvailable: true
        });
        fetchData();
      } else {
        console.error("Error saving item:", error);
        alert("Failed to save item.");
      }
    } finally {
      setSavingItem(false);
    }
  };

  if (loading || !mounted) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-100 rounded-lg" />
          <div className="h-4 w-64 bg-slate-50 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 h-[500px] bg-white rounded-2xl border border-slate-100" />
          <div className="lg:col-span-8 h-[600px] bg-white rounded-2xl border border-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto h-full pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Menu Editor</h1>
          <p className="text-slate-500 font-medium">Manage categories and menu items</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Categories Sidebar */}
        <BentoCard className="lg:col-span-4 p-5 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <h2 className="text-lg font-bold text-slate-800 mb-4 tracking-tight">Categories</h2>

          <form onSubmit={addCategory} className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="New category..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <button type="submit" className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 group hover:border-teal-200 transition-colors">
                <span className="font-semibold text-slate-700 text-sm">{cat.name}</span>
                <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {categories.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No categories added yet.</p>}
          </div>
        </BentoCard>

        {/* Menu Items List */}
        <BentoCard className="lg:col-span-8 p-0 overflow-hidden flex flex-col bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Menu Items</h2>
            <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          <div className="flex-1 overflow-auto divide-y divide-slate-100">
            {items.map(item => (
              <div key={item.id} className="p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 truncate">{item.name}</h3>
                    <div className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  </div>
                  <p className="text-xs text-slate-500 truncate mb-1.5">{item.description || 'No description'}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-900">₹{item.price}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">{item.category?.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleAvailability(item.id, item.is_available)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${item.is_available
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                  >
                    {item.is_available ? <><Check className="w-3.5 h-3.5" /> Available</> : <><X className="w-3.5 h-3.5" /> Unavailable</>}
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-3">
                  <Utensils className="w-8 h-8" />
                </div>
                <h3 className="text-slate-900 font-bold mb-1">No items yet</h3>
                <p className="text-slate-500 text-sm max-w-sm">Add categories first, then add menu items to build your digital restaurant menu.</p>
              </div>
            )}
          </div>
        </BentoCard>
      </div>

      {/* Add Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <BentoCard className="w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Add Menu Item</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveItem} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Name</label>
                <input required type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" placeholder="E.g. Margherita Pizza" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                  <select required value={newItem.categoryId} onChange={e => setNewItem({ ...newItem, categoryId: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all appearance-none">
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.price}
                    onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea rows={2} value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none" placeholder="Short description of the dish..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Image URL</label>
                <input type="url" value={newItem.imageUrl} onChange={e => setNewItem({ ...newItem, imageUrl: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" placeholder="https://... (Optional)" />
              </div>

              <div className="flex items-center gap-2 pt-2 pb-4">
                <input type="checkbox" id="isVeg" checked={newItem.isVeg} onChange={e => setNewItem({ ...newItem, isVeg: e.target.checked })} className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500" />
                <label htmlFor="isVeg" className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Vegetarian</label>

                <input type="checkbox" id="isAvailable" checked={newItem.isAvailable} onChange={e => setNewItem({ ...newItem, isAvailable: e.target.checked })} className="w-4 h-4 text-teal-500 rounded border-slate-300 focus:ring-teal-500 ml-6" />
                <label htmlFor="isAvailable" className="text-sm font-medium text-slate-700">Available to Order</label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors w-full">Cancel</button>
                <button type="submit" disabled={savingItem} className="px-6 py-2.5 font-bold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors w-full disabled:opacity-50 flex justify-center items-center gap-2">
                  {savingItem ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </BentoCard>
        </div>
      )}
    </div>
  );
}
