'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import { Search, Plus, Minus, Trash2, CheckCircle2, Bed, Hash, User, Utensils, Split, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrencySync } from '@/lib/currency';

const POSBillingModal = dynamic(() => import('../_components/SharedBillingModal').then(mod => mod.SharedBillingModal), { ssr: false });
const POSSplitModal = dynamic(() => import('../_components/SharedSplitModal').then(mod => mod.SharedSplitModal), { ssr: false });
const POSMergeModal = dynamic(() => import('../_components/SharedMergeModal').then(mod => mod.SharedMergeModal), { ssr: false });

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
  const [isKOTSaving, setIsKOTSaving] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [loyaltySettings, setLoyaltySettings] = useState<any>(null);
  const [waiters, setWaiters] = useState<any[]>([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('');
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTables = async () => {
    const { data } = await supabase.from('restaurant_tables').select('*').order('table_number');
    if (data) setTables(data);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const results = await Promise.all([
          supabase.from('restaurant_menu_items').select('*').eq('is_available', true),
          supabase.from('restaurant_categories').select('*').order('display_order'),
          supabase.from('rooms').select('*, bookings(*, guests(name))').eq('status', 'Occupied'),
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
      } finally {
        setLoading(false);
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

  useEffect(() => {
    if (orderType === 'room' && selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId);
      if (room && room.bookings?.[0]?.guests) {
        setCustomerName(room.bookings[0].guests.name);
        setCustomerMobile(room.bookings[0].guests.phone || '');
      }
    }
  }, [selectedRoomId, orderType, rooms]);

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

    // Redundant inputs are hidden and optional
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
          order_source: orderType === 'table' ? 'pos_table' : orderType === 'room' ? 'pos_room' : 'pos_walkin',
          table_id: selectedTableId || null,
          room_id: orderType === 'room' ? selectedRoomId : null,
          booking_id: orderType === 'room' ? rooms.find(r => r.id === selectedRoomId)?.bookings?.[0]?.id : null,
          guest_id: orderType === 'room' ? rooms.find(r => r.id === selectedRoomId)?.bookings?.[0]?.guest_id : null,
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

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] gap-6 p-4 overflow-hidden bg-slate-50/30 animate-pulse">
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="flex justify-between items-center shrink-0">
            <div className="h-12 w-96 bg-white rounded-2xl border border-slate-100" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-10 w-24 bg-white rounded-xl border border-slate-100" />)}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-64 bg-white rounded-[32px] border border-slate-100" />
            ))}
          </div>
        </div>
        <div className="w-[380px] bg-white rounded-[32px] border border-slate-100 shadow-sm" />
      </div>
    );
  }

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
      <div className="w-[380px] bg-white rounded-[32px] border border-slate-100 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.06)] shrink-0 overflow-hidden">
        {/* Dark Header */}
        <div className="p-6 pb-7 bg-[#0f172a] text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 blur-[80px] -mr-16 -mt-16" />

          <div className="flex items-center justify-between mb-5 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-500/20 rounded-[10px] flex items-center justify-center border border-white/10">
                <Utensils className="text-teal-400 w-4 h-4" />
              </div>
              <h2 className="text-lg font-black tracking-tighter">Order Details</h2>
            </div>
            <button
              onClick={() => {
                setCart([]);
                setCustomerMobile('');
                setCustomerName('');
                setSelectedRoomId('');
                setSelectedTableId('');
                setSelectedWaiterId('');
              }}
              className="text-[9px] uppercase font-black tracking-[0.2em] text-white/40 hover:text-white transition-colors"
            >
              Reset
            </button>
          </div>

          <div className="flex gap-1 p-1 bg-white/5 rounded-[16px] mb-5 border border-white/10 relative z-10">
            <button
              onClick={() => { setOrderType('walkin'); setBillToRoom(false); }}
              className={cn(
                "flex-1 py-2 rounded-[10px] text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all text-nowrap",
                orderType === 'walkin' ? "bg-white text-slate-900 shadow-xl" : "text-white/40 hover:text-white/80"
              )}
            >
              <User className="w-3 h-3" /> Walk-in
            </button>
            <button
              onClick={() => setOrderType('room')}
              className={cn(
                "flex-1 py-2 rounded-[10px] text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all text-nowrap",
                orderType === 'room' ? "bg-white text-slate-900 shadow-xl" : "text-white/40 hover:text-white/80"
              )}
            >
              <Bed className="w-3 h-3" /> Room
            </button>
            <button
              onClick={() => { setOrderType('table'); setBillToRoom(false); }}
              className={cn(
                "flex-1 py-2 rounded-[10px] text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all text-nowrap",
                orderType === 'table' ? "bg-white text-slate-900 shadow-xl" : "text-white/40 hover:text-white/80"
              )}
            >
              <Utensils className="w-3 h-3" /> Table
            </button>
          </div>

          {orderType === 'walkin' && (
            <div className="grid grid-cols-2 gap-2 relative z-10">
              <div className="relative group">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 group-focus-within:text-teal-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Mobile"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full pl-9 pr-2 py-2.5 bg-white/5 border border-white/10 rounded-[12px] outline-none focus:bg-white/10 focus:border-white/20 transition-all text-[11px] font-bold text-white placeholder:text-white/20"
                />
              </div>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 group-focus-within:text-teal-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-9 pr-2 py-2.5 bg-white/5 border border-white/10 rounded-[12px] outline-none focus:bg-white/10 focus:border-white/20 transition-all text-[11px] font-bold text-white placeholder:text-white/20"
                />
              </div>
            </div>
          )}

          {orderType !== 'walkin' && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-3 relative z-10">
              {orderType === 'room' ? (
                <div className="relative">
                  <Bed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-400" />
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 bg-white border-none rounded-[12px] outline-none shadow-lg text-slate-900 text-[11px] font-black appearance-none cursor-pointer"
                  >
                    <option value="">Select Occupied Room</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>Room {room.number} - {room.bookings?.[0]?.guests?.name || 'Unknown'}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              ) : (
                <div className="relative">
                  <Utensils className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-400" />
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 bg-white border-none rounded-[12px] outline-none shadow-lg text-slate-900 text-[11px] font-black appearance-none cursor-pointer"
                  >
                    <option value="">Select Table Number</option>
                    {tables.map(table => (
                      <option key={table.id} value={table.id}>Table {table.table_number}{table.status === 'occupied' ? ' (Occupied)' : ''}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart View Area - Main Container */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-100/50">

          {/* Scrollable Cart Items */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar min-h-0">
            {cart.length > 0 && (
              <div className="flex items-center justify-between px-1 shrink-0">
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Order Items</h4>
                <button onClick={() => setCart([])} className="text-[9px] font-black uppercase tracking-[0.1em] text-rose-500/60 hover:text-rose-500 transition-colors px-1.5 py-0.5 rounded-lg hover:bg-rose-50">Clear</button>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-200 py-16">
                <div className="w-16 h-16 bg-slate-200/50 rounded-full flex items-center justify-center mb-4 opacity-40">
                  <Utensils className="w-8 h-8" />
                </div>
                <p className="font-black uppercase tracking-[0.2em] text-[10px] opacity-30">Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-[22px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200/60 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", item.is_veg ? "bg-emerald-500" : "bg-red-500")} />
                          <h4 className="font-black text-slate-800 text-[13px] leading-tight truncate uppercase tracking-tight">{item.name}</h4>
                        </div>
                        <p className="text-slate-400 font-bold text-[10px] tracking-wider uppercase">₹{item.price}</p>
                      </div>
                      <button onClick={() => updateQuantity(item.id, -item.quantity)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center bg-slate-100/80 rounded-xl p-0.5 gap-0.5">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white shadow-sm rounded-lg transition-all text-slate-600 hover:text-teal-600 active:scale-90"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="w-8 text-center text-[11px] font-black text-slate-900 tabular-nums">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white shadow-sm rounded-lg transition-all text-slate-600 hover:text-teal-600 active:scale-90"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                      <span className="font-black text-slate-900 text-[14px] tracking-tighter">₹{item.price * item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fixed Bottom Section */}
          <div className="shrink-0 p-6 pt-0 space-y-4">
            {/* Pricing Card */}
            <div className="bg-white rounded-[24px] p-5 border border-slate-200/60 shadow-[0_12px_36px_rgba(0,0,0,0.06)] space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                  <span>Subtotal</span>
                  <span className="text-slate-700 tabular-nums">{formatCurrencySync(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                  <span>Tax (GST 5%)</span>
                  <span className="text-slate-700 tabular-nums">{formatCurrencySync(tax)}</span>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex justify-between items-center py-1 px-0.5">
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Total Payable</span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xs font-black text-slate-900 tracking-tighter">₹</span>
                  <span className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">{formatCurrencySync(totalRaw).replace('₹', '')}</span>
                </div>
              </div>
            </div>

            {/* Checkout Buttons */}
            <div className="flex gap-3 pb-2">
              <button
                onClick={handleSaveKOT}
                disabled={cart.length === 0 || isKOTSaving}
                className="flex-1 h-[60px] bg-[#0f172a] hover:bg-black disabled:bg-slate-200/50 disabled:text-slate-400 text-white font-black text-[11px] uppercase tracking-[0.25em] rounded-[22px] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-slate-200/50"
              >
                <span className="shrink-0">{isKOTSaving ? 'SAVING...' : 'KITCHEN'}</span>
                <Utensils className={cn("w-4 h-4 shrink-0", isKOTSaving ? "text-white/40" : "text-orange-400")} />
              </button>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="flex-[1.5] h-[60px] bg-teal-500 hover:bg-teal-600 disabled:bg-slate-100 disabled:text-slate-300 text-white font-black text-[11px] uppercase tracking-[0.25em] rounded-[22px] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-teal-500/20"
              >
                <span>SETTLE BILL</span>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
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
