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
 * Variants: 
 * - 'short': 01-Oct-2023
 * - 'long': Sun, 01 Oct 2023
 * - 'dashboard': Oct 01, 2023
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
 * Combined Date and Time in IST
 */
export function formatISTDateTime(date: Date | string | number | null | undefined): string {
    if (!date) return 'N/A';
    return `${formatISTDate(date)} ${formatISTTime(date)}`;
}

/**
 * Returns a new Date object representing the current "local" time in IST,
 * even when running on a UTC-based server.
 * Note: This doesn't change the underlying UTC value, but helps in relative calculations
 * if the host environment is not in IST.
 */
export function getISTDate(): Date {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
}
