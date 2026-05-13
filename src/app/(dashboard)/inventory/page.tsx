import { getInventoryItems, getInventoryCategories, getInventoryLedger } from '@/app/actions/inventory';
import InventoryClient from './InventoryClient';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getRooms } from '@/app/actions/rooms';
import { createClient } from '@/utils/supabase/server';

export default async function InventoryPage() {
  const supabase = await createClient();
  const [items, categories, ledger, rooms, { data: settings }] = await Promise.all([
    getInventoryItems(),
    getInventoryCategories(),
    getInventoryLedger(),
    getRooms(),
    supabase.from('hotel_settings').select('hotel_name').single(),
  ]);

  return (
    <DashboardShell hotelName={settings?.hotel_name || 'PMS'}>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
        </div>
        <InventoryClient
          initialItems={items || []}
          categories={categories || []}
          ledger={ledger || []}
          rooms={rooms || []}
        />
      </div>
    </DashboardShell>
  );
}
