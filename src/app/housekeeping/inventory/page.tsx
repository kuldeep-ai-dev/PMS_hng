import { getInventoryItems } from '@/app/actions/inventory';
import { createAdminClient } from '@/utils/supabase/admin';
import HousekeepingInventoryClient from './HousekeepingInventoryClient';

export const dynamic = 'force-dynamic';

export default async function HousekeepingInventoryPage() {
    const admin = createAdminClient();

    // Fetch everything via admin client to allow access without system login
    // Staff will verify identity via password in the client component
    const [items, { data: rooms }, { data: staff, error: staffError }, { data: ledger }] = await Promise.all([
        getInventoryItems(),
        admin
            .from('rooms')
            .select('id, number')
            .order('number', { ascending: true }),
        admin
            .from('profiles')
            .select('id, name, role')
            .eq('role', 'cleaning_staff')
            .eq('status', 'active')
            .order('name'),
        admin
            .from('inventory_usage')
            .select(`
                id,
                quantity,
                created_at,
                staff_id,
                inventory_items (name, unit),
                rooms (number)
            `)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
    ]);

    // Map ledger to the format expected by the client component
    const formattedLedger = (ledger || []).map((l: any) => ({
        id: l.id,
        quantity: -l.quantity,
        item_name: (Array.isArray(l.inventory_items) ? l.inventory_items[0]?.name : l.inventory_items?.name) || 'Unknown',
        room_number: (Array.isArray(l.rooms) ? l.rooms[0]?.number : l.rooms?.number),
        created_at: l.created_at,
        user_id: l.staff_id
    }));

    return (
        <HousekeepingInventoryClient
            items={items || []}
            rooms={rooms || []}
            staff={staff || []}
            ledger={formattedLedger}
        />
    );
}
