'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export type SystemLog = {
    id: string;
    event_type: string;
    module: string;
    description: string;
    table_name?: string;
    record_id?: string;
    payload_before?: any;
    payload_after?: any;
    admin_id?: string;
    created_at: string;
    admin?: {
        name: string;
        role: string;
    };
};

export async function getSystemActivityLogs(filters?: {
    module?: string;
    eventType?: string;
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
}) {
    try {
        const supabase = await createClient();

        let query = supabase
            .from('system_activity_logs')
            .select(`
                *,
                admin:profiles(name, role)
            `)
            .order('created_at', { ascending: false });

        if (filters?.module) query = query.eq('module', filters.module);
        if (filters?.eventType) query = query.eq('event_type', filters.eventType);
        if (filters?.searchTerm) {
            query = query.or(`description.ilike.%${filters.searchTerm}%,table_name.ilike.%${filters.searchTerm}%`);
        }
        if (filters?.startDate) query = query.gte('created_at', filters.startDate);
        if (filters?.endDate) query = query.lte('created_at', filters.endDate);

        const limit = filters?.limit || 100;
        query = query.limit(limit);

        const { data, error } = await query;

        if (error) throw error;
        return { success: true, logs: data as SystemLog[] };
    } catch (err: any) {
        console.error('[Activity] Fetch failed:', err.message);
        return { success: false, error: err.message, logs: [] };
    }
}

/**
 * Manually log a system event (e.g., security, authentication, etc.)
 */
export async function logSystemEvent(event: {
    event_type: 'INFO' | 'ERROR' | 'WARNING' | 'SECURITY' | 'AUTH';
    module: string;
    description: string;
    metadata?: any;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('system_activity_logs')
            .insert({
                event_type: event.event_type,
                module: event.module,
                description: event.description,
                payload_after: event.metadata || {},
                admin_id: user?.id
            });

        if (error) throw error;
        revalidatePath('/master-control/logs');
        return { success: true };
    } catch (err: any) {
        console.error('[Activity] Logging failed:', err.message);
        return { success: false, error: err.message };
    }
}
