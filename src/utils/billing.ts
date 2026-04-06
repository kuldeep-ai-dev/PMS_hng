/**
 * Generates a human-readable unique Invoice / Receipt Number
 * Format: INV-YYYYMMDD-XXXX
 */
export function generateInvoiceNo(id: string, date: string | Date = new Date()): string {
    const d = new Date(date);
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
    const shortId = id.slice(-4).toUpperCase();
    return `INV-${dateStr}-${shortId}`;
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
    }).format(amount);
}
