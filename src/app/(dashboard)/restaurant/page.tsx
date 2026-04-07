import { getRestaurantInsights } from './actions';
import RestaurantDashboardClient from './RestaurantDashboardClient';
import { formatCurrency } from '@/lib/currency';
import { TrendingUp, Landmark, Receipt, UtensilsCrossed, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RestaurantDashboardPage() {
  const res = await getRestaurantInsights();

  if (!res.success || !res.data) {
    return (
      <div className="p-20 text-center">
        <h2 className="text-xl font-bold text-slate-800">Error loading dashboard</h2>
        <p className="text-slate-500">{res.error || 'Unknown error'}</p>
      </div>
    );
  }

  const {
    todayRevenue,
    counterCollection,
    roomChargesTotal,
    ordersCount,
    tableOccupancy,
    topItems: serverTopItems
  } = res.data;

  // Process top items (aggregate by ID)
  const itemMap = new Map();
  (serverTopItems || []).forEach((row: any) => {
    const id = row.menu_item_id;
    if (!itemMap.has(id)) {
      itemMap.set(id, { name: row.item?.name || 'Unknown', count: 0 });
    }
    itemMap.get(id).count += row.quantity;
  });

  const processedTopItems = Array.from(itemMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const [formattedRevenue, formattedRoomCredit, aov] = await Promise.all([
    formatCurrency(todayRevenue),
    formatCurrency(roomChargesTotal),
    formatCurrency(ordersCount > 0 ? todayRevenue / ordersCount : 0)
  ]);

  const stats = [
    { label: "Today's Total Sales", value: formattedRevenue, icon: 'TrendingUp', color: 'text-emerald-600', trend: 'Live', activeGradient: 'from-white to-emerald-50/50 border-emerald-100 shadow-emerald-50', activeIconBg: 'bg-emerald-600 shadow-emerald-200' },
    { label: 'Room Credit', value: formattedRoomCredit, icon: 'Landmark', color: 'text-amber-600', trend: 'Folio', activeGradient: 'from-white to-amber-50/50 border-amber-100 shadow-amber-50', activeIconBg: 'bg-amber-600 shadow-amber-200' },
    { label: 'Total Orders', value: ordersCount.toString(), icon: 'Receipt', color: 'text-blue-600', trend: 'Today', activeGradient: 'from-white to-blue-50/50 border-blue-100 shadow-blue-50', activeIconBg: 'bg-blue-600 shadow-blue-200' },
    { label: 'Avg. Order Value', value: aov, icon: 'UtensilsCrossed', color: 'text-teal-600', trend: 'AOV', activeGradient: 'from-white to-teal-50/50 border-teal-100 shadow-teal-50', activeIconBg: 'bg-teal-600 shadow-teal-200' },
    { label: 'Table Occupancy', value: `${tableOccupancy}%`, icon: 'Users', color: 'text-purple-600', trend: 'Seats', activeGradient: 'from-white to-purple-50/50 border-purple-100 shadow-purple-50', activeIconBg: 'bg-purple-600 shadow-purple-200' },
  ];

  return (
    <RestaurantDashboardClient
      initialData={{ ...res.data, processedTopItems }}
      stats={stats}
    />
  );
}
