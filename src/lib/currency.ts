import { getSettings } from '@/app/(dashboard)/settings/actions';

export async function formatCurrency(amount: number) {
    const settings = await getSettings();
    const symbol = settings.currency === 'INR' ? '₹' : '$';
    return `${symbol}${amount.toLocaleString('en-IN')}`;
}

// Client-side version if needed
export function formatCurrencySync(amount: number, currency: string = 'INR') {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${amount.toLocaleString('en-IN')}`;
}
