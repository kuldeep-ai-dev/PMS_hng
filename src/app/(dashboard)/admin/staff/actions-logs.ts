'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

export type AuditLogEntry = {
    id: string;
    action: string;
    details: string;
    created_at: string;
};

export async function getStaffActivityLogs(userId: string) {
    try {
        if (!userId) return { success: false, error: 'User ID is required' };

        const { data, error } = await supabaseAdmin
            .from('staff_activity_logs')
            .select('*')
            .eq('staff_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Logs fetch error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, logs: (data as AuditLogEntry[]) || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
