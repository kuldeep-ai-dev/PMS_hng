'use server';

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client for bypassing RLS where necessary
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

import { getTodayIST } from '@/utils/date';

export type AttendanceRecord = {
    id: string;
    staff_id: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'half_day';
    check_in_time: string | null;
    check_out_time: string | null;
    created_at: string;
};

export async function getStaffAttendanceLogs(staffId: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from('staff_attendance')
            .select('*')
            .eq('staff_id', staffId)
            .order('date', { ascending: false })
            .limit(30);

        if (error) throw error;
        return { success: true, records: data as AttendanceRecord[] };
    } catch (error: any) {
        console.error('Error fetching staff attendance:', error);
        return { success: false, error: error.message };
    }
}

export async function getDailyAttendanceStats(dateStr?: string) {
    try {
        // use today if no date provided
        const targetDate = dateStr || getTodayIST();

        const { data, error } = await supabaseAdmin
            .from('staff_attendance')
            .select('status')
            .eq('date', targetDate);

        if (error) throw error;

        const stats = {
            present: 0,
            absent: 0,
            late: 0,
            half_day: 0,
            total_recorded: 0
        };

        if (data) {
            data.forEach((r: any) => {
                if (stats[r.status as keyof typeof stats] !== undefined) {
                    stats[r.status as keyof typeof stats]++;
                    stats.total_recorded++;
                }
            });
        }

        return { success: true, stats, targetDate };
    } catch (error: any) {
        console.error('Error fetching daily attendance stats:', error);
        return { success: false, error: error.message };
    }
}
