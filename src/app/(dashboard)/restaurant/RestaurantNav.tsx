'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MonitorSmartphone, ClipboardList, BookOpen, Utensils, LogOut, Receipt, Users, PackageSearch, Gift, History, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/app/login/actions';

// Navigation items moved into component to avoid serialization errors

interface RestaurantNavProps {
  initials?: string;
  displayName?: string;
  role?: string;
  isFixed?: boolean;
}

export function RestaurantNav({ initials = '??', displayName = 'User', role = 'Restaurant', isFixed = false }: RestaurantNavProps) {
  const navItems = [
    { name: 'Dashboard', href: '/restaurant', icon: LayoutDashboard },
    { name: 'POS Counter', href: '/restaurant/pos', icon: MonitorSmartphone },
    { name: 'Order Control', href: '/restaurant/orders', icon: ClipboardList },
    { name: 'Reservations', href: '/restaurant/reservations', icon: Calendar },
    { name: 'Money Receipts', href: '/restaurant/money-receipts', icon: Receipt },
    { name: 'Customers', href: '/restaurant/customers', icon: Users },
    { name: 'Menu Editor', href: '/restaurant/menu', icon: BookOpen },
    { name: 'Loyalty Wallet', href: '/restaurant/loyalty', icon: Gift },
    { name: 'Order History', href: '/restaurant/order-history', icon: History },
    { name: 'Inventory & Stock', href: '/restaurant/inventory', icon: PackageSearch },
    { name: 'Tables & QR', href: '/restaurant/tables', icon: Utensils },
  ];

  const pathname = usePathname();

  const navContent = (
    <div className={cn(
      "flex flex-col h-full bg-white border-r border-slate-200 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)] overflow-hidden",
      !isFixed && "rounded-2xl"
    )}>
      {/* Header with Logo */}
      <div className="flex items-center justify-center px-4 py-8 border-b border-slate-100">
        <Link href="/restaurant">
          <img
            src="/pmslogo.svg"
            alt="Geny PMS"
            className="w-32 h-auto object-contain"
          />
        </Link>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        <div className="mb-4 px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-70">
            Restaurant Terminal
          </h2>
        </div>

        <nav className="space-y-1 flex flex-col">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/restaurant' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group w-full",
                  isActive
                    ? "bg-teal-500 text-white font-bold shadow-lg shadow-teal-100"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-teal-600")} />
                <span className="text-[13px] tracking-tight whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Logout at Bottom */}
      <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex shrink-0 items-center justify-center font-bold text-slate-500 text-sm shadow-inner">
              {initials}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold text-slate-700 truncate">{displayName}</span>
              <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">
                {role.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (isFixed) {
    return (
      <>
        <aside className="hidden md:flex fixed top-0 left-0 bottom-0 z-40 w-64 flex-col">
          {navContent}
        </aside>
        <div className="hidden md:block shrink-0 w-64" />
      </>
    );
  }

  return navContent;
}
