import { getInventoryItems } from '@/app/actions/inventory';
import { createAdminClient } from '@/utils/supabase/admin';
import HousekeepingInventoryClient from './HousekeepingInventoryClient';

export const dynamic = 'force-dynamic';

export default async function HousekeepingInventoryPage() {
    const admin = createAdminClient();

    // Fetch everything via admin client to allow access without system login
    // Staff will verify identity via password in the client component
    const [items, { data: rooms }, { data: staff }, { data: ledger }] = await Promise.all([
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
                quantity,
                created_at,
                staff_id,
                inventory_items (name),
                rooms (number)
            `)
            .gte('created_at', new Date().toISOString().split('T')[0])
            .order('created_at', { ascending: false })
    ]);

    // Map ledger to the format expected by the client component
    const mappedLedger = (ledger || []).map(l => ({
        item_name: (l.inventory_items as any)?.name || 'Unknown Item',
        room_number: (l.rooms as any)?.number || 'General',
        quantity: -l.quantity, // Usage is negative movement
        created_at: l.created_at,
        staff_id: l.staff_id
    }));

    return (
        <HousekeepingInventoryClient
            items={items || []}
            rooms={rooms || []}
            staff={staff || []}
            ledger={mappedLedger}
        />
    );
}
