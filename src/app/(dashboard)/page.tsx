import { ArrowUpRight, Users, BedDouble, CreditCard, Calendar, TrendingUp, LogIn, LogOut, LayoutGrid, UtensilsCrossed } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { DashboardChart } from '@/components/dashboard/DashboardChart';
import { format, subDays } from 'date-fns';
import { StaffDashboard } from '@/components/dashboard/StaffDashboard';
import { cn } from '@/lib/utils';

import { RealtimeRefresh } from '@/components/pms/RealtimeRefresh';
import { formatISTDate, getISTTodayRange, getTodayIST } from '@/utils/date';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { getAdminDashboardStats } from '@/app/actions/admin-dashboard';

// Revalidate every 30 seconds — fast enough for live operations, avoids full re-render every visit
export const revalidate = 30;

export default async function Dashboard() {
  const supabase = await createClient();

  // Auth + role check — layout already handles redirect if no user,
  // we just need the role for conditional rendering.
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, name')
    .eq('id', user?.id)
    .single();

  // Safety Redirection (if middleware is bypassed)
  if (profile?.role === 'master') {
    redirect('/master-control');
  }

  if (profile?.role === 'restaurant_staff') {
    redirect('/restaurant/pos');
  }

  const isHousekeeping = profile?.role === 'cleaning_staff' || profile?.role === 'housekeeping' || profile?.role?.toLowerCase().includes('clean');
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'manager';

  if (isHousekeeping) {
    return <StaffDashboard staffId={profile?.id ?? ''} staffName={profile?.name ?? ''} />;
  }

  if (isAdmin) {
    const adminStats = await getAdminDashboardStats();
    return <AdminDashboard stats={adminStats} />;
  }

  const { start: istStart, end: istEnd } = getISTTodayRange();
  const sevenDaysAgo = subDays(new Date(), 6).toISOString();

  // Parallel Data Fetching
  const [
    { data: rooms },
    { data: latestAudit },
    { data: todayPayments },
    { data: todayRestaurantSales },
    { count: arrivalsCount },
    { data: checkoutData, count: checkoutsCount },
    { data: recentPaymentsData },
    { data: recentRestaurantRevenueData },
    { data: recentBookings }
  ] = await Promise.all([
    supabase.from('rooms').select('status'),
    supabase.from('night_audit_logs').select('audit_date').order('audit_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('payments').select('amount, method').gte('created_at', istStart).lt('created_at', istEnd),
    supabase.from('restaurant_orders').select('total_amount, payment_status').in('payment_status', ['paid', 'charged_to_room']).eq('is_refund', false).gte('order_time', istStart).lt('order_time', istEnd),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('check_in_date', istStart).lt('check_in_date', istEnd).in('status', ['Confirmed', 'Advance_Booking']),
    supabase.from('bookings').select('id, rooms(number), guests(name), check_out_date', { count: 'exact' }).lt('check_out_date', istEnd).eq('status', 'Active'),
    supabase.from('payments').select('created_at, amount').gte('created_at', sevenDaysAgo),
    supabase.from('restaurant_orders').select('order_time, total_amount').in('payment_status', ['paid', 'charged_to_room']).eq('is_refund', false).gte('order_time', sevenDaysAgo),
    supabase.from('bookings').select(`id, check_in_date, status, guests(name), rooms(number)`).order('created_at', { ascending: false }).limit(5)
  ]);

  // --- Process Room Stats ---
  const totalRooms = rooms?.length || 0;
  const occupiedRooms = rooms?.filter(r => r.status === 'Occupied').length || 0;
  const availableRooms = rooms?.filter(r => r.status === 'Available').length || 0;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // --- Process Business Date ---
  const businessDateDisplay = formatISTDate(new Date(), 'dashboard');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // --- Process Revenue ---
  let todayRevenue = 0;
  todayPayments?.forEach(p => {
    todayRevenue += Number(p.amount || 0);
  });
  const restaurantTotalToday = todayRestaurantSales?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
  const formattedRestaurantSales = await formatCurrency(restaurantTotalToday);
  const formattedRevenue = await formatCurrency(todayRevenue);

  // --- Process Arrivals/Checkouts ---
  const pendingCheckouts = checkoutData?.filter(b => b.rooms) || [];

  // --- Process Chart Data ---
  const chartDataMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = subDays(today, i);
    chartDataMap.set(format(d, 'MMM dd'), 0);
  }

  recentPaymentsData?.forEach(p => {
    const dateStr = format(new Date(p.created_at), 'MMM dd');
    if (chartDataMap.has(dateStr)) {
      chartDataMap.set(dateStr, chartDataMap.get(dateStr)! + Number(p.amount || 0));
    }
  });

  recentRestaurantRevenueData?.forEach(order => {
    const dateStr = format(new Date(order.order_time), 'MMM dd');
    if (chartDataMap.has(dateStr)) {
      chartDataMap.set(dateStr, chartDataMap.get(dateStr)! + Number(order.total_amount || 0));
    }
  });

  const chartData = Array.from(chartDataMap.entries()).map(([date, revenue]) => ({
    date,
    revenue
  }));

  // Calculate Trend
  const yesterday = subDays(today, 1);
  const yesterdayRevenue = chartDataMap.get(format(yesterday, 'MMM dd')) || 0;
  let revenueTrend = '+0%';
  if (yesterdayRevenue > 0) {
    const diff = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
    revenueTrend = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
  } else if (todayRevenue > 0) {
    revenueTrend = '+100%';
  }

  // --- Chart Data End ---

  const stats = [
    { label: 'Total Occupancy', value: `${occupancyRate}%`, icon: Users, trend: '+0%', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Expected Arrivals', value: (arrivalsCount || 0).toString(), icon: LogIn, trend: 'Today', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Expected Checkouts', value: (checkoutsCount || 0).toString(), icon: LogOut, trend: 'Today', color: 'text-rose-600', bg: 'bg-rose-50', href: '/expected-checkouts' },
    { label: 'Available Rooms', value: availableRooms.toString(), icon: BedDouble, trend: 'Live', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Today\'s Revenue', value: formattedRevenue, icon: CreditCard, trend: revenueTrend, isRevenue: true, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Restaurant Sales', value: formattedRestaurantSales, icon: UtensilsCrossed, trend: `${todayRestaurantSales?.length || 0} orders`, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full pb-6 relative">
      <div className="lg:col-span-12 flex flex-col md:flex-row md:items-center justify-between mb-2 mt-2 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Daily Overview</h1>
          <p className="text-sm font-medium text-slate-500">Live PMS Pulse & Financial Metrics</p>
        </div>
        <div className="px-5 py-2.5 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.1)] text-sm font-bold flex items-center gap-3">
          <div className="p-1 rounded-full bg-blue-500/20">
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <span>Business Date: <span className="text-blue-300 ml-1">{businessDateDisplay}</span></span>
        </div>
      </div>

      {/* Real-time subscription listener */}
      <RealtimeRefresh />

      {/* Overstay / Checkout Alert Banner */}
      {pendingCheckouts.length > 0 && (
        <div className="lg:col-span-12">
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
            <div className="p-2 bg-blue-100 rounded-full shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-blue-800">Expected Checkouts Notification</h3>
              <p className="text-xs font-medium text-blue-600 mt-0.5">
                The following rooms are scheduled for checkout today or are pending:
                <span className="font-bold ml-1">
                  {pendingCheckouts.slice(0, 6).map((b: any) => `Room ${b.rooms?.number || 'N/A'} (${b.guests?.name || 'Unknown'})`).join(', ')}
                  {pendingCheckouts.length > 6 ? ` +${pendingCheckouts.length - 6} more` : ''}
                </span>
              </p>
            </div>
            <Link href="/expected-checkouts" className="shrink-0 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              Review Expected Checkouts
            </Link>
          </div>
        </div>
      )}

      {/* Top Stats — 6 equal cards on XL screens */}
      <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 items-stretch">
        {stats.map((stat, idx) => {
          const isRevenue = stat.isRevenue;

          // Map colors to gradients for each card
          const gradientMap: Record<string, string> = {
            'text-indigo-600': 'from-white to-indigo-50/50 border-indigo-100 shadow-indigo-50',
            'text-amber-600': 'from-white to-amber-50/50 border-amber-100 shadow-amber-50',
            'text-rose-600': 'from-white to-rose-50/50 border-rose-100 shadow-rose-50',
            'text-blue-600': 'from-white to-blue-50/50 border-blue-100 shadow-blue-50',
            'text-teal-600': 'from-white to-teal-50/50 border-teal-100 shadow-teal-50',
            'text-orange-600': 'from-white to-orange-50/50 border-orange-100 shadow-orange-50',
          };

          const iconBgMap: Record<string, string> = {
            'text-indigo-600': 'bg-indigo-600 shadow-indigo-200',
            'text-amber-600': 'bg-amber-600 shadow-amber-200',
            'text-rose-600': 'bg-rose-600 shadow-rose-200',
            'text-blue-600': 'bg-blue-600 shadow-blue-200',
            'text-teal-600': 'bg-teal-600 shadow-teal-200',
            'text-orange-600': 'bg-orange-600 shadow-orange-200',
          };

          const activeGradient = gradientMap[stat.color] || 'from-white to-slate-50';
          const activeIconBg = iconBgMap[stat.color] || 'bg-slate-600';

          const cardContent = (
            <div key={stat.label} className={cn(
              "relative bg-white border border-slate-200 shadow-sm rounded-[20px] p-5 h-full transition-all duration-500",
              "hover:shadow-2xl hover:shadow-slate-200/50 hover:border-slate-300 hover:-translate-y-1.5 group overflow-hidden bg-gradient-to-br",
              activeGradient,
              stat.href && "cursor-pointer"
            )}>
              <div className="flex flex-col h-full justify-between gap-6 relative z-10">
                <div className="flex justify-between items-start">
                  <div className={cn(
                    "p-3 rounded-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-lg",
                    activeIconBg
                  )}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 outline outline-1 outline-white/50",
                    stat.trend.startsWith('+') && stat.trend !== '+0%' ? "bg-emerald-50 text-emerald-600" :
                      stat.trend.startsWith('-') ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500",
                    "group-hover:bg-white group-hover:shadow-sm"
                  )}>
                    {stat.trend}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1 group-hover:text-slate-500 transition-colors">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className={cn(
                      "text-2xl font-black tracking-tighter text-slate-900 group-hover:scale-105 transition-transform duration-500 origin-left tabular-nums",
                      isRevenue && "text-teal-600"
                    )}>
                      {stat.value}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Enhanced Decorative Watermark */}
              <stat.icon className={cn(
                "absolute -bottom-4 -right-4 w-24 h-24 opacity-[0.03] -rotate-12 transition-all duration-1000 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.07]",
                stat.color
              )} />

              {/* Subtle side glow */}
              <div className={cn(
                "absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-transparent to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none",
                stat.color.replace('text', 'via')
              )} />
            </div>
          );

          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="block h-full">{cardContent}</Link>
          ) : (
            <div key={stat.label} className="h-full">{cardContent}</div>
          );
        })}
      </div>

      {/* Middle Row: Chart */}
      <div className="md:col-span-6 lg:col-span-9 p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-slate-800">Revenue Trend (Last 7 Days)</h2>
          <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md">Weekly Overview</span>
        </div>
        <DashboardChart data={chartData} />
      </div>

      {/* Quick Actions (Moves next to Chart on Desktop) */}
      <div className="lg:col-span-3 p-5 bg-white border border-slate-200 shadow-sm rounded-xl min-h-[400px]">
        <h2 className="text-md font-semibold mb-6 text-slate-800 uppercase tracking-wide text-xs">Quick Actions</h2>
        <div className="space-y-3">
          <Link href="/check-in" className="group flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-100 transition-all">
            <div className="p-2 bg-teal-500 text-white rounded-md shadow-sm group-hover:scale-110 transition-transform">
              <LogIn className="w-4 h-4" />
            </div>
            <span className="font-semibold text-teal-900 text-sm">New Check-in</span>
          </Link>

          <Link href="/front-desk" className="group flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all">
            <div className="p-2 bg-slate-200 text-slate-700 rounded-md group-hover:bg-slate-300 transition-colors">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="font-medium text-slate-700 text-sm">Check Out</span>
          </Link>

          <Link href="/rooms" className="group flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all">
            <div className="p-2 bg-slate-200 text-slate-700 rounded-md group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <span className="font-medium text-slate-700 text-sm">Room Grid</span>
          </Link>

          <Link href="/restaurant" className="group flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all">
            <div className="p-2 bg-slate-200 text-slate-700 rounded-md group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <span className="font-medium text-slate-700 text-sm">Restaurant POS</span>
          </Link>
        </div>

        {/* Small secondary tip area */}
        <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-800 block mb-1">Tip of the day</span>
            Always verify the guest's ID proof during the check-in process to stay compliant.
          </p>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="lg:col-span-12 p-6 bg-white border border-slate-200 shadow-sm rounded-xl min-h-[400px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-800">Recent Bookings</h2>
          <Link href="/rooms" className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
            View All <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {recentBookings && recentBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Guest</th>
                  <th className="pb-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Room</th>
                  <th className="pb-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Check-in</th>
                  <th className="pb-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentBookings.map((booking: any) => (
                  <tr key={booking.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="py-4 px-4 font-medium text-slate-900 group-hover:text-teal-600 transition-colors">
                      {booking.guests?.name}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      <span className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold">
                        {booking.rooms?.number || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium">
                      {formatISTDate(booking.check_in_date, 'dashboard')}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${booking.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                        booking.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                          booking.status === 'Completed' ? 'bg-slate-100 text-slate-700' :
                            'bg-slate-50 text-slate-600'
                        }`}>
                        {booking.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>}
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 h-[250px] border-2 border-dashed border-slate-100 rounded-lg bg-slate-50/50">
            <Calendar className="w-10 h-10 mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No recent bookings to display.</p>
            <p className="text-xs mt-1 text-slate-400">Bookings will appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
