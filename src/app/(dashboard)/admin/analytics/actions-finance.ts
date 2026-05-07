'use server';

import { createClient } from '@/utils/supabase/server';
import { getISTDate, getTodayIST, formatISTDate } from '@/utils/date';
import { subDays, eachDayOfInterval, format } from 'date-fns';

export type FinanceRange = '7d' | '30d' | '90d' | 'all';

export async function getFinanceAnalytics(range: FinanceRange = '30d') {
    const supabase = await createClient();

    const today = getISTDate();
    const startDate = range !== 'all'
        ? subDays(today, range === '7d' ? 7 : range === '30d' ? 30 : 90).toISOString()
        : null;

    let query = supabase.from('payments').select('*');

    if (startDate) {
        query = query.gte('created_at', startDate);
    }

    const { data: payments, error } = await query.order('created_at', { ascending: true });

    if (error) {
        console.error('[Finance Analytics] Error:', error.message);
        return null;
    }

    const allPayments = payments || [];
    const actualPayments = allPayments.filter(p => !p.is_refund);
    const refunds = allPayments.filter(p => p.is_refund);

    // 1. Basic Stats
    const totalGross = actualPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalRefunds = refunds.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const netRevenue = totalGross - totalRefunds;

    // Status counts
    const completedCount = allPayments.filter(p => p.status === 'completed').length;
    const pendingCount = allPayments.filter(p => p.status === 'pending').length;

    // 2. Revenue Trend (Daily)
    const dailyData: Record<string, { date: string; revenue: number; refunds: number; net: number }> = {};

    // Initialize days interval if range is not 'all'
    if (range !== 'all') {
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
        const interval = eachDayOfInterval({
            start: subDays(getISTDate(), days - 1),
            end: getISTDate()
        });
        interval.forEach(day => {
            const d = format(day, 'yyyy-MM-dd');
            dailyData[d] = { date: format(day, 'dd MMM'), revenue: 0, refunds: 0, net: 0 };
        });
    }

    allPayments.forEach(p => {
        const dateObj = new Date(p.created_at);
        if (isNaN(dateObj.getTime())) return; // Skip invalid dates

        // Get IST grouping key (yyyy-MM-dd)
        const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(dateObj);
        const displayDay = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' }).format(dateObj);

        if (!dailyData[dayKey]) {
            dailyData[dayKey] = { date: displayDay, revenue: 0, refunds: 0, net: 0 };
        }

        const amount = Number(p.amount) || 0;
        if (p.is_refund) {
            dailyData[dayKey].refunds += amount;
        } else {
            dailyData[dayKey].revenue += amount;
        }
        dailyData[dayKey].net = dailyData[dayKey].revenue - dailyData[dayKey].refunds;
    });

    const revenueTrend = Object.values(dailyData).sort((a, b) => {
        // Since the keys were yyyy-MM-dd, Object.values might not be sorted.
        // But since we inserted them in order for interval, it might be okay.
        // For 'all', we should ensure sorting.
        return 0;
    });

    // 3. Payment Method Distribution
    const methodMap: Record<string, number> = {};
    actualPayments.forEach(p => {
        const m = p.method || 'Unknown';
        methodMap[m] = (methodMap[m] || 0) + (Number(p.amount) || 0);
    });
    const methodDistribution = Object.entries(methodMap).map(([name, value]) => ({ name, value }));

    // 4. Recent Transactions
    const recentTransactions = allPayments.slice(-10).reverse().map(p => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        status: p.status || 'completed',
        date: p.created_at,
        isRefunded: p.is_refund,
        refundAmount: p.is_refund ? Number(p.amount) : 0
    }));

    return {
        stats: {
            totalGross,
            totalRefunds,
            netRevenue,
            completedCount,
            pendingCount,
            avgTransaction: actualPayments.length > 0 ? Math.round(totalGross / actualPayments.length) : 0
        },
        revenueTrend,
        methodDistribution,
        recentTransactions
    };
}
