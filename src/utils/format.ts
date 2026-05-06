/**
 * Centralised number, currency, and date formatting for the Moroccan locale.
 * Replaces ~14 inline `Intl.NumberFormat('fr-MA', ...)` call sites.
 */

const NUMBER_LOCALE = 'fr-MA';
const DATE_LOCALE = 'fr-FR';
const CURRENCY = 'MAD';

export function formatMAD(amount: number | null | undefined): string {
    return new Intl.NumberFormat(NUMBER_LOCALE, {
        style: 'currency',
        currency: CURRENCY,
    }).format(Number(amount) || 0);
}

export function formatNumber(amount: number | null | undefined, fractionDigits = 2): string {
    return new Intl.NumberFormat(NUMBER_LOCALE, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(Number(amount) || 0);
}

export function formatDate(
    input: string | Date | null | undefined,
    opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
    if (!input) return '-';
    const d = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(DATE_LOCALE, opts);
}

export function formatDateShort(input: string | Date | null | undefined): string {
    return formatDate(input, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatAmount(n: number, currency: string): string {
    const suffix = currency && currency !== 'MAD' ? ` ${currency}` : ' DH'
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + suffix
}
