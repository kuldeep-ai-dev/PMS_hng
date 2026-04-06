/**
 * Converts a number into its English word representation (Indian numbering system).
 */
export function numberToWords(num: number): string {
    if (num === 0) return 'ZERO';

    const singleDigits = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const teenDigits = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const doubleDigits = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

    function convert(n: number): string {
        let str = '';
        if (n >= 100) {
            str += singleDigits[Math.floor(n / 100)] + ' HUNDRED ';
            n %= 100;
        }
        if (n >= 10 && n < 20) {
            str += teenDigits[n - 10] + ' ';
        } else {
            if (n >= 20) {
                str += doubleDigits[Math.floor(n / 10)] + ' ';
                n %= 10;
            }
            if (n > 0) {
                str += singleDigits[n] + ' ';
            }
        }
        return str;
    }

    let result = '';
    const crores = Math.floor(num / 10000000);
    num %= 10000000;
    const lakhs = Math.floor(num / 100000);
    num %= 100000;
    const thousands = Math.floor(num / 1000);
    num %= 1000;
    const remaining = Math.floor(num);
    const decimals = Math.round((num - remaining) * 100);

    if (crores > 0) result += convert(crores) + 'CRORE ';
    if (lakhs > 0) result += convert(lakhs) + 'LAKH ';
    if (thousands > 0) result += convert(thousands) + 'THOUSAND ';
    if (remaining > 0) result += convert(remaining);

    if (decimals > 0) {
        result += 'AND ' + convert(decimals) + 'PAISE ';
    }

    return result.trim() || 'ZERO';
}
