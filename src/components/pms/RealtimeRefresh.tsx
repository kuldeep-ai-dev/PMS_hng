'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export function RealtimeRefresh() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        // Subscribe to changes across ALL relevant tables for the PMS
        const channel = supabase
            .channel('pms_realtime_sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bookings' },
                () => router.refresh()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'rooms' },
                () => router.refresh()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'payments' },
                () => router.refresh()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'restaurant_orders' },
                () => router.refresh()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'cleaning_assignments' },
                () => router.refresh()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'expenses' },
                () => router.refresh()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, router]);

    return null;
}
