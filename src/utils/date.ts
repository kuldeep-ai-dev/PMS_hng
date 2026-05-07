import { startOfDay, endOfDay, subDays, addHours, format, eachDayOfInterval } from 'date-fns';

/**
 * Date Utilities for IST (India Standard Time)
 * All time calculations in the PMS should explicitly use 'Asia/Kolkata'.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

const istDateFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
});

const istTimeFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
});

const istLongDateFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
});

const istDashboardDateFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: '2-digit',
    year: 'numeric'
});

/**
 * Format a date to IST string.
 */
export function formatISTDate(date: Date | string | number | null | undefined, variant: 'short' | 'long' | 'dashboard' = 'short'): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

    if (variant === 'long') return istLongDateFormatter.format(d);
    if (variant === 'dashboard') return istDashboardDateFormatter.format(d);
    return istDateFormatter.format(d);
}

/**
 * Format a date to IST time string (HH:MM:SS AM/PM)
 */
export function formatISTTime(date: Date | string | number | null | undefined): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return istTimeFormatter.format(d);
}

/**
 * Returns a new Date object representing the current "local" time in IST.
 * This object is useful when using libraries that call .getDate(), .getHours(), etc.
 * Note: Use with caution as the .toISOString() will be "wrong" because it's double-offset.
 */
export function getISTDate(): Date {
    const now = new Date();
    // UTC time + 5.5 hours
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utcTime + istOffset);
}

/**
 * Returns the current date in YYYY-MM-DD format based on IST.
 * This is the most reliable way to get the current IST date string.
 */
export function getTodayIST(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

/**
 * Returns the UTC range for 'Today' in Asia/Kolkata timezone.
 * India is UTC +5.5.
 */
export function getISTTodayRange() {
    const today = getTodayIST();
    // Convert IST boundaries to UTC ISO strings for safe comparison
    // 00:00:00 IST = previous day 18:30:00 UTC
    // 23:59:59 IST = 18:29:59 UTC
    const start = new Date(`${today}T00:00:00.000+05:30`).toISOString();
    const end = new Date(`${today}T23:59:59.999+05:30`).toISOString();
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
    // Align with start of day for the beginning of the range
    startDate.setHours(0, 0, 0, 0);

    return {
        start: startDate.toISOString(),
        end: endDate.toISOString()
    };
}

/**
 * Returns a short IST date string 'MMM dd' (e.g., 'May 08')
 */
export function formatISTShort(date: Date | string | number): string {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    const month = new Intl.DateTimeFormat('en-IN', { timeZone: IST_TIMEZONE, month: 'short' }).format(d);
    const day = new Intl.DateTimeFormat('en-IN', { timeZone: IST_TIMEZONE, day: '2-digit' }).format(d);
    return `${month} ${day}`;
}

/**
 * Returns a Javascript Date object correctly shifted to IST.
 * Useful for real-time comparisons and duration calculations.
 */
export function getISTNow(): Date {
    const now = new Date();
    // Use Intl specifically to get the string representation in Kolkata timezone
    const istStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    }).format(now);

    // Parse it back - "M/D/YYYY, HH:mm:ss"
    const [datePart, timePart] = istStr.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split(':');

    // Create UTC date first, then adjust to the extracted parts
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}
