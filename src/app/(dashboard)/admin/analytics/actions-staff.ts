'use server';

import { createClient } from '@/utils/supabase/server';
import { differenceInMinutes, subDays, format } from 'date-fns';

export async function getStaffAnalytics() {
    const supabase = await createClient();

    // 1. Fetch cleaning assignments from last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

    const { data: tasks, error } = await supabase
        .from('cleaning_assignments')
        .select('*, profiles!staff_id(id, name)')
        .gte('assigned_at', thirtyDaysAgo);

    if (error) {
        console.error('[Staff Analytics] Error:', error.message);
        return null;
    }

    const all = tasks || [];
    const completedTasks = all.filter(t => t.status === 'completed' && t.assigned_at && t.completed_at);

    // 2. Performance by Staff Member
    const staffStats: Record<string, { name: string; count: number; totalMinutes: number; avgMinutes: number }> = {};

    completedTasks.forEach(t => {
        const staffId = t.staff_id;
        const staffName = t.profiles?.name || 'System';

        if (!staffStats[staffId]) {
            staffStats[staffId] = { name: staffName, count: 0, totalMinutes: 0, avgMinutes: 0 };
        }

        const minutes = differenceInMinutes(new Date(t.completed_at), new Date(t.assigned_at));
        staffStats[staffId].count++;
        staffStats[staffId].totalMinutes += minutes;
    });

    Object.values(staffStats).forEach(s => {
        s.avgMinutes = s.count > 0 ? Math.round(s.totalMinutes / s.count) : 0;
    });

    const staffPerformance = Object.values(staffStats).sort((a, b) => a.avgMinutes - b.avgMinutes);

    // 3. Efficiency Trend (Daily Avg Cleanup Time)
    const dailyEfficiency: Record<string, { date: string; avg: number; count: number }> = {};
    completedTasks.forEach(t => {
        const day = format(new Date(t.completed_at), 'dd MMM');
        if (!dailyEfficiency[day]) dailyEfficiency[day] = { date: day, avg: 0, count: 0 };

        const minutes = differenceInMinutes(new Date(t.completed_at), new Date(t.assigned_at));
        dailyEfficiency[day].avg += minutes;
        dailyEfficiency[day].count++;
    });

    const efficiencyTrend = Object.values(dailyEfficiency).map(d => ({
        date: d.date,
        avg: Math.round(d.avg / d.count)
    })).slice(-7); // Last 7 active days

    return {
        totalTasks: all.length,
        completedRate: all.length > 0 ? Math.round((all.filter(t => t.status === 'completed').length / all.length) * 100) : 0,
        avgCleanupTime: completedTasks.length > 0
            ? Math.round(completedTasks.reduce((acc, t) => acc + differenceInMinutes(new Date(t.completed_at), new Date(t.assigned_at)), 0) / completedTasks.length)
            : 0,
        staffPerformance,
        efficiencyTrend,
        taskDistribution: [
            { name: 'Completed', value: all.filter(t => t.status === 'completed').length },
            { name: 'Pending', value: all.filter(t => t.status === 'pending').length },
            { name: 'In Progress', value: all.filter(t => t.status === 'in_progress').length }
        ]
    };
}
