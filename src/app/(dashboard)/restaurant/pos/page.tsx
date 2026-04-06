'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, Plus, Minus, Trash2, CheckCircle2, Bed, Hash, User, Utensils, Split } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrencySync } from '@/lib/currency';
import { SharedBillingModal as POSBillingModal } from '../_components/SharedBillingModal';
import { SharedSplitModal as POSSplitModal } from '../_components/SharedSplitModal';
import { SharedMergeModal as POSMergeModal } from '../_components/SharedMergeModal';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string | null;
  is_veg: boolean;
  description: string | null;
}

interface CartItem extends MenuItem {
  quantity: number;
  notes: string;
}

export default function POSTerminal() {
  const supabase = createClient();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'walkin' | 'room' | 'table'>('walkin');
  const [rooms, setRooms] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [billToRoom, setBillToRoom] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isKOTSaving, setIsKOTSaving] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [loyaltySettings, setLoyaltySettings] = useState<any>(null);
  const [waiters, setWaiters] = useState<any[]>([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('');

  const fetchTables = async () => {
    const { data } = await supabase.from('restaurant_tables').select('*').order('table_number');
    if (data) setTables(data);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const results = await Promise.all([
          supabase.from('restaurant_menu_items').select('*').eq('is_available', true),
          supabase.from('restaurant_categories').select('*').order('display_order'),
          supabase.from('rooms').select('*, bookings(*)').eq('status', 'Occupied'),
          supabase.from('restaurant_tables').select('*').order('table_number'),
          supabase.from('restaurant_loyalty_settings').select('*').limit(1).maybeSingle(),
          supabase.from('profiles').select('id, name').eq('role', 'restaurant_staff')
        ]);

        const [menuRes, categoriesRes, roomsRes, tablesRes, settingsRes, waitersRes] = results;

        if (menuRes.data && categoriesRes.data) {
          const categoriesMap = new Map(categoriesRes.data.map((c: any) => [c.id, c.name]));
          const formattedMenu = menuRes.data.map((item: any) => ({
            ...item,
            category: categoriesMap.get(item.category_id) || 'Other'
          }));

          setMenu(formattedMenu);
          const cats = Array.from(new Set(formattedMenu.map((item: any) => item.category)));
          setCategories(['All', ...cats]);
        }

        if (roomsRes.data) setRooms(roomsRes.data);
        if (tablesRes.data) setTables(tablesRes.data);
        if (settingsRes.data) setLoyaltySettings(settingsRes.data);
        if (waitersRes.data) setWaiters(waitersRes.data);
      } catch (error) {
        console.error('POS Loading Error:', error);
        toast.error('Failed to load menu data');
      }
    };
    loadData();
  }, []);

  const filteredMenu = menu.filter(item => {
    const matchesCat = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Fetch pending order for selected table
  useEffect(() => {
    const fetchTableOrder = async () => {
      if (orderType !== 'table' || !selectedTableId) {
        if (orderType === 'walkin') {
          setCart([]);
          setCurrentOrderId(null);
          setCustomerMobile('');
          setCustomerName('');
        }
        return;
      }

      try {
        const { data: orders, error } = await supabase
          .from('restaurant_orders')
          .select(`
            *,
            restaurant_order_items (
              *,
              restaurant_menu_items (*)
            )
          `)
          .eq('table_id', selectedTableId)
          .in('status', ['pending', 'preparing', 'ready', 'served', 'partial'])
          .order('order_time', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (orders && orders.length > 0) {
          const order = orders[0];
          setCurrentOrderId(order.id);
          setCustomerMobile(order.customer_mobile || '');
          setCustomerName(order.customer_name || '');

          const loadedCart = order.restaurant_order_items.map((item: any) => ({
            id: item.menu_item_id,
            name: item.restaurant_menu_items?.name || 'Unknown',
            price: item.price_at_time,
            quantity: item.quantity,
            is_veg: item.restaurant_menu_items?.is_veg,
            notes: item.notes || ''
          }));
          setCart(loadedCart);
          toast.info(`Loaded existing order for Table`);
        } else {
          setCurrentOrderId(null);
          setCart([]);
        }
      } catch (err) {
        console.error('Error fetching table order:', err);
      }
    };

    fetchTableOrder();
  }, [selectedTableId, orderType]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1, notes: '' }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const updateNotes = (id: string, notes: string) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, notes } : item));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    if (orderType === 'room' && !selectedRoomId) return toast.error('Please select a room');
    if (orderType === 'table' && !selectedTableId) return toast.error('Please select a table');
    if (!customerMobile || customerMobile.length < 10) return toast.error('Please enter a 10-digit mobile number');
    setIsBillingModalOpen(true);
  };

  const handleSettlementSuccess = () => {
    setCart([]);
    setCustomerMobile('');
    setCustomerName('');
    setSelectedRoomId('');
    setSelectedTableId('');
    setCurrentOrderId(null);
    setIsBillingModalOpen(false);
  };

  const handleSaveKOT = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    if (orderType === 'table' && !selectedTableId) return toast.error('Please select a table');

    setIsKOTSaving(true);
    try {
      let orderId = currentOrderId;

      if (!orderId) {
        const { data: kotNo } = await supabase.rpc('get_next_restaurant_kot_no');
        const { data: newOrder, error: orderErr } = await supabase.from('restaurant_orders').insert({
          order_source: orderType === 'table' ? 'pos_table' : 'pos_walkin',
          table_id: selectedTableId || null,
          customer_name: customerName,
          customer_mobile: customerMobile,
          status: 'pending',
          payment_status: 'pending',
          kot_no: kotNo,
          order_time: new Date().toISOString()
        }).select().single();

        if (orderErr) throw orderErr;
        orderId = newOrder.id;
        setCurrentOrderId(orderId);

        if (selectedTableId) {
          await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('id', selectedTableId);
        }
      }

      // Overwrite items (standard POS KOT update behavior)
      await supabase.from('restaurant_order_items').delete().eq('order_id', orderId);

      const orderItems = cart.map(item => ({
        order_id: orderId,
        menu_item_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price,
        notes: item.notes
      }));

      const { error: itemsErr } = await supabase.from('restaurant_order_items').insert(orderItems);
      if (itemsErr) throw itemsErr;

      toast.success(currentOrderId ? 'KOT Updated' : 'KOT Generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save KOT');
    } finally {
      setIsKOTSaving(false);
    }
  };

  const handleSplitComplete = async (sourceItems: any[], targetItems: any[]) => {
    if (!currentOrderId) return;
    setIsKOTSaving(true);
    try {
      // 1. Update Original Order (Remove target items)
      await supabase.from('restaurant_order_items').delete().eq('order_id', currentOrderId);
      const sourcePayload = sourceItems.map(item => ({
        order_id: currentOrderId,
        menu_item_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price
      }));
      await supabase.from('restaurant_order_items').insert(sourcePayload);

      // Calculate and update original order total
      const subA = sourceItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const taxA = subA * 0.05;
      await supabase.from('restaurant_orders').update({
        subtotal: subA,
        tax: taxA,
        total_amount: subA + taxA,
        balance_amount: subA + taxA // Assuming no prior partial payment for split items
      }).eq('id', currentOrderId);

      // 2. Create New Order (Split part)
      const { data: billNo } = await supabase.rpc('get_next_restaurant_bill_no');
      const { data: kotNo } = await supabase.rpc('get_next_restaurant_kot_no');

      const subB = targetItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const taxB = subB * 0.05;

      const { data: newOrder, error: newOrderErr } = await supabase.from('restaurant_orders').insert({
        order_source: 'pos_table_split',
        table_id: selectedTableId,
        customer_name: customerName,
        customer_mobile: customerMobile,
        status: 'pending',
        payment_status: 'pending',
        subtotal: subB,
        tax: taxB,
        total_amount: subB + taxB,
        balance_amount: subB + taxB,
        kot_no: kotNo,
        bill_no: billNo,
        order_time: new Date().toISOString()
      }).select().single();

      if (newOrderErr) throw newOrderErr;

      const targetPayload = targetItems.map(item => ({
        order_id: newOrder.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price
      }));
      await supabase.from('restaurant_order_items').insert(targetPayload);

      toast.success('Bill Split Successfully');
      setIsSplitModalOpen(false);
      setCart(sourceItems); // Update current cart to reflect split
    } catch (err: any) {
      toast.error(err.message || 'Split failed');
    } finally {
      setIsKOTSaving(false);
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05; // 5% GST
  const totalRaw = subtotal + tax;

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 p-4 overflow-hidden bg-slate-50/30">
      {/* Menu Area */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden min-w-0">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
          <div className="relative w-full md:w-96 shadow-sm rounded-2xl overflow-hidden">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all font-medium"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all",
                  activeCategory === cat ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 shadow-sm"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {filteredMenu.map(item => (
              <div key={item.id} className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col h-full">
                <div className="aspect-[4/3] overflow-hidden bg-slate-50 relative shrink-0">
                  <img src={item.image_url || '/placeholder-food.jpg'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className={`absolute top-4 right-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${item.is_veg ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">{item.category}</span>
                  <h3 className="font-black text-slate-800 text-lg line-clamp-1 mb-4 flex-1">{item.name}</h3>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="text-xl font-black text-slate-900 tracking-tight">₹{item.price}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="w-11 h-11 bg-teal-50 text-teal-600 hover:bg-teal-500 hover:text-white rounded-[18px] flex items-center justify-center transition-all active:scale-95 shadow-sm"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Workspace */}
      <div className="w-[380px] bg-white rounded-[32px] border border-slate-100 flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.04)] shrink-0 overflow-hidden">
        <div className="p-6 bg-slate-900 text-white shrink-0">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <Utensils className="text-teal-400 w-4 h-4" />
              </div>
              <h2 className="text-lg font-black tracking-tight">Order Details</h2>
            </div>
            <button onClick={() => setCart([])} className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40 hover:text-white transition-colors">Reset</button>
          </div>

          <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl mb-5 border border-white/5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => { setOrderType('walkin'); setBillToRoom(false); }}
              className={cn("flex-1 px-2 py-2 rounded-[10px] text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-all whitespace-nowrap", orderType === 'walkin' ? "bg-white text-slate-900 shadow-lg" : "text-white/50 hover:text-white/80")}
            >
              <User className="w-3 h-3" /> Walk-in
            </button>
            <button
              onClick={() => setOrderType('room')}
              className={cn("flex-1 px-2 py-2 rounded-[10px] text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-all whitespace-nowrap", orderType === 'room' ? "bg-white text-slate-900 shadow-lg" : "text-white/50 hover:text-white/80")}
            >
              <Bed className="w-3 h-3" /> Room
            </button>
            <button
              onClick={() => { setOrderType('table'); setBillToRoom(false); }}
              className={cn("flex-1 px-2 py-2 rounded-[10px] text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-all whitespace-nowrap", orderType === 'table' ? "bg-white text-slate-900 shadow-lg" : "text-white/50 hover:text-white/80")}
            >
              <Utensils className="w-3 h-3" /> Table
            </button>
          </div>

          <div className="space-y-3">
            {orderType === 'room' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="relative">
                  <Bed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/10 rounded-xl outline-none focus:bg-white focus:text-slate-900 transition-all text-xs font-bold appearance-none cursor-pointer"
                  >
                    <option value="" className="text-slate-900">Select Room</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id} className="text-slate-900">Room {room.number} - {room.bookings?.[0]?.guests?.name || 'Unknown'}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2.5 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <input type="checkbox" checked={billToRoom} onChange={(e) => setBillToRoom(e.target.checked)} className="w-3.5 h-3.5 rounded-lg border-white/20 bg-transparent text-teal-500 focus:ring-offset-slate-900" />
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Add to guest folio</span>
                </label>
              </div>
            )}
            {orderType === 'table' && (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="relative">
                  <Utensils className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/10 rounded-xl outline-none focus:bg-white focus:text-slate-900 transition-all text-xs font-bold appearance-none cursor-pointer"
                  >
                    <option value="" className="text-slate-900">Select Table</option>
                    {tables.map(table => (
                      <option key={table.id} value={table.id} className="text-slate-900">Table {table.table_number}{table.status === 'Occupied' ? ' (Occupied)' : ''}</option>
                    ))}
                  </select>
                </div>
                {selectedTableId && (
                  <button
                    onClick={() => setIsMergeModalOpen(true)}
                    className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-200 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    Merge / Move Table <Split className="w-3 h-3 rotate-180" />
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Mobile"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/10 rounded-xl outline-none focus:bg-white focus:text-slate-900 transition-all text-xs font-bold placeholder:text-white/20"
                />
              </div>
              <div className="relative flex-1">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/10 rounded-xl outline-none focus:bg-white focus:text-slate-900 transition-all text-xs font-bold placeholder:text-white/20"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col gap-6 min-h-0 custom-scrollbar">
          {/* Waiter Selection Section */}
          <div className="space-y-3 shrink-0">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Service & Staff</h3>
            <div className="p-4 bg-white rounded-3xl border border-slate-100 flex items-center gap-3 group hover:border-teal-200 transition-all shadow-sm shadow-slate-200/50">
              <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-500 transition-colors">
                <User className="w-5 h-5 transition-transform group-hover:scale-110" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Assigned Waiter</p>
                <select
                  value={selectedWaiterId}
                  onChange={(e) => setSelectedWaiterId(e.target.value)}
                  className="w-full bg-transparent border-none text-[11px] font-black text-slate-900 outline-none uppercase tracking-wider cursor-pointer appearance-none"
                >
                  <option value="">Select Staff...</option>
                  {waiters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {cart.length > 0 && (
              <div className="flex items-center justify-between px-2 shrink-0">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Order Items</h4>
                <div className="flex gap-4">
                  {currentOrderId && (
                    <button
                      onClick={() => setIsSplitModalOpen(true)}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      <Split className="w-3.5 h-3.5" /> Split Bill
                    </button>
                  )}
                  <button onClick={() => setCart([])} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-rose-500 transition-colors">Clear</button>
                </div>
              </div>
            )}
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 opacity-50">
                <Utensils className="w-16 h-16 mb-4 opacity-10" />
                <p className="font-black uppercase tracking-widest text-[10px]">Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4 shrink-0 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-start">
                    <div className="pr-10">
                      <h4 className="font-black text-slate-800 text-sm leading-tight flex items-center gap-2">
                        {item.name}
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.is_veg ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      </h4>
                      <p className="text-slate-400 font-bold text-[11px] mt-1 tracking-wider">₹{item.price}</p>
                    </div>
                    <button onClick={() => updateQuantity(item.id, -item.quantity)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Special instructions..."
                    value={item.notes}
                    onChange={(e) => updateNotes(item.id, e.target.value)}
                    className="text-[10px] px-3 py-2 bg-slate-50 rounded-xl border border-transparent focus:border-slate-200 focus:bg-white focus:outline-none transition-all italic font-medium placeholder:text-slate-300"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-slate-100 rounded-2xl p-1 gap-1">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-xl transition-all text-slate-600"><Minus className="w-4 h-4" /></button>
                      <span className="w-10 text-center text-xs font-black text-slate-900">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-xl transition-all text-slate-600"><Plus className="w-4 h-4" /></button>
                    </div>
                    <span className="font-black text-slate-900 tracking-tighter">₹{item.price * item.quantity}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-8 bg-white border-t border-slate-100 shrink-0">
            <div className="bg-slate-50/80 backdrop-blur-sm rounded-3xl p-5 border border-slate-100 mb-6 space-y-3 shadow-sm shadow-slate-100/50">
              <div className="flex justify-between text-[10px] font-black text-slate-400/80 uppercase tracking-[0.15em]">
                <span>Subtotal</span>
                <span className="text-slate-600 tracking-normal font-bold text-xs">{formatCurrencySync(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-black text-slate-400/80 uppercase tracking-[0.15em]">
                <span>Tax (GST 5%)</span>
                <span className="text-slate-600 tracking-normal font-bold text-xs">{formatCurrencySync(tax)}</span>
              </div>
              <div className="h-px bg-slate-200/50 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-black text-slate-900 uppercase tracking-[0.05em]">Total Payable</span>
                <span className="text-3xl font-black text-slate-900 tracking-tight tabular-nums drop-shadow-sm">{formatCurrencySync(totalRaw)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSaveKOT}
                disabled={cart.length === 0 || isKOTSaving}
                className="group flex-1 h-[60px] bg-slate-800 hover:bg-slate-900 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-[11px] uppercase tracking-[0.1em] rounded-2xl transition-all shadow-xl shadow-slate-200/50 flex items-center justify-center gap-3 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span>{isKOTSaving ? 'Saving...' : 'Send to Kitchen'}</span>
                <Utensils className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="group flex-[1.6] h-[60px] bg-teal-500 hover:bg-teal-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-[11px] uppercase tracking-[0.1em] rounded-2xl transition-all hover:shadow-2xl hover:shadow-teal-200/40 active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span>Settle Bill</span>
                <CheckCircle2 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isBillingModalOpen && (
        <POSBillingModal
          isOpen={isBillingModalOpen}
          onClose={() => setIsBillingModalOpen(false)}
          customerMobile={customerMobile}
          customerName={customerName || (orderType === 'room' ? rooms.find(r => r.id === selectedRoomId)?.bookings?.[0]?.guests?.name : '')}
          orderType={orderType}
          selectedRoomId={selectedRoomId}
          selectedTableId={selectedTableId}
          isBillToFolio={orderType === 'room' && billToRoom}
          cart={cart}
          subtotal={subtotal}
          tax={tax}
          totalRaw={totalRaw}
          loyaltySettings={loyaltySettings}
          selectedWaiterId={selectedWaiterId}
          onSuccess={handleSettlementSuccess}
        />
      )}

      {isSplitModalOpen && (
        <POSSplitModal
          isOpen={isSplitModalOpen}
          onClose={() => setIsSplitModalOpen(false)}
          originalOrder={currentOrderId}
          originalItems={cart}
          onSplitComplete={handleSplitComplete}
        />
      )}
      <POSMergeModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        currentTableId={selectedTableId}
        currentOrderId={currentOrderId}
        tables={tables}
        onSuccess={() => {
          fetchTables();
          setSelectedTableId('');
          setCart([]);
          setCurrentOrderId(null);
          toast.success('Table updated successfully');
        }}
      />
    </div>
  );
}
