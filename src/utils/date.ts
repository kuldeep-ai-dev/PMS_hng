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
 */
export function getISTDate(): Date {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utcTime + istOffset);
}

/**
 * Returns the current date in YYYY-MM-DD format based on IST.
 */
export function getTodayIST(): string {
    const d = getISTDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Returns the UTC range for 'Today' in Asia/Kolkata timezone.
 * India is UTC +5.5.
 */
export function getISTTodayRange() {
    const today = getTodayIST();
    // Convert IST boundaries to UTC ISO strings for safe comparison
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
    startDate.setHours(0, 0, 0, 0);

    return {
        start: startDate.toISOString(),
        end: endDate.toISOString()
    };
}
