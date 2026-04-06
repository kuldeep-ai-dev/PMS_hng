import { startOfDay, endOfDay, addHours } from 'date-fns';

/**
 * Returns the UTC range for 'Today' in Asia/Kolkata timezone.
 * India is UTC +5.5.
 */
export function getISTTodayRange() {
    const now = new Date();

    // Get year, month, day in IST (Asia/Kolkata)
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const parts = formatter.formatToParts(now);
    const y = parts.find(p => p.type === 'year')!.value;
    const m = parts.find(p => p.type === 'month')!.value;
    const d = parts.find(p => p.type === 'day')!.value;

    // Construct boundaries in IST, then convert to UTC ISO for safe comparison/storage
    // ISO-8601 strings with 'Z' are lexicographically comparable
    const start = new Date(`${y}-${m}-${d}T00:00:00.000+05:30`).toISOString();
    const end = new Date(`${y}-${m}-${d}T23:59:59.999+05:30`).toISOString();

    return { start, end };
}

/**
 * Returns the UTC range for the last N days in IST.
 */
export function getISTDateRange(daysBack: number) {
    const { end } = getISTTodayRange();
    const endDate = new Date(end);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    return {
        start: startDate.toISOString(),
        end: endDate.toISOString()
    };
}
