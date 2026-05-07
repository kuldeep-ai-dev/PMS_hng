'use client';

import { useEffect } from 'react';
import { triggerWebsiteSync } from '@/app/actions/sync-bookings';

export function WebsiteBookingSyncProvider({ role }: { role: string }) {
    useEffect(() => {
        // Only run sync on client side, and only for authorized roles
        if (role !== 'admin' && role !== 'master' && role !== 'receptionist') return;

        const POLLING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

        const syncBookings = async () => {
            try {
                // Call the server action which fetches bookings and inserts them into website_bookings
                // triggerWebsiteSync acts as a push but there's also syncBookingsFromWebsite.
                // Wait, triggerWebsiteSync uses POST to website_api/pms/sync... 
                // Let's import and call syncBookingsFromWebsite directly, or triggerWebsiteSync.
                // Let's dynamically import to avoid sending unnecessary weight on initial load
                const { syncBookingsFromWebsite } = await import('@/app/actions/sync-bookings');
                const result = await syncBookingsFromWebsite();

                if (result.success && result.synced && result.synced > 0) {
                    console.log(`[PMS Background Sync] Synced ${result.synced} new incoming bookings from website.`);
                }
            } catch (err) {
                console.error('[PMS Background Sync] Error:', err);
            }
        };

        // Initial sync on mount
        setTimeout(syncBookings, 10000); // 10 seconds after mount to prioritize UI

        // Set up the interval
        const intervalId = setInterval(syncBookings, POLLING_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [role]);

    return null; // This component handles background logic only
}
