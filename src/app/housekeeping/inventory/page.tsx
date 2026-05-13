import { getInventoryItems } from '@/app/actions/inventory';
import { createAdminClient } from '@/utils/supabase/admin';
import HousekeepingInventoryClient from './HousekeepingInventoryClient';

export const dynamic = 'force-dynamic';

export default async function HousekeepingInventoryPage() {
    const admin = createAdminClient();

    // Fetch everything via admin client to allow access without system login
    // Staff will verify identity via password in the client component
    const [items, { data: rooms }, { data: staff }] = await Promise.all([
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
    ]);

    return (
        <HousekeepingInventoryClient
            items={items || []}
            rooms={rooms || []}
            staff={staff || []}
        />
    );
}
