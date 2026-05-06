/**
 * Centralised status taxonomy for all four document types.
 * One source of truth for labels, colour tones, and dropdown options.
 */

export type DocumentType = 'invoice' | 'quote' | 'purchase_order' | 'delivery_note';
export type StatusTone = 'paid' | 'pending' | 'overdue' | 'draft';

export interface StatusEntry {
    label: string;
    tone: StatusTone;
}

export const STATUS_CONFIG: Record<DocumentType, Record<string, StatusEntry>> = {
    invoice: {
        draft:   { label: 'Brouillon',          tone: 'draft' },
        pending: { label: 'En attente',          tone: 'pending' },
        sent:    { label: 'Envoyée',             tone: 'pending' },
        partial: { label: 'Paiement partiel',   tone: 'pending' },
        paid:    { label: 'Payée',               tone: 'paid' },
        overdue: { label: 'En retard',           tone: 'overdue' },
    },
    quote: {
        draft:    { label: 'Brouillon', tone: 'draft' },
        sent:     { label: 'Envoyé',    tone: 'pending' },
        accepted: { label: 'Accepté',   tone: 'paid' },
        rejected: { label: 'Refusé',    tone: 'overdue' },
    },
    purchase_order: {
        draft:     { label: 'Brouillon',  tone: 'draft' },
        pending:   { label: 'En attente', tone: 'pending' },
        validé:    { label: 'Validé',     tone: 'paid' },
        reçu:      { label: 'Reçu',       tone: 'paid' },
        cancelled: { label: 'Annulé',     tone: 'overdue' },
    },
    delivery_note: {
        draft:     { label: 'Brouillon',  tone: 'draft' },
        pending:   { label: 'En attente', tone: 'pending' },
        livré:     { label: 'Livré',      tone: 'paid' },
        delivered: { label: 'Livré',      tone: 'paid' },
        returned:  { label: 'Retourné',   tone: 'overdue' },
        cancelled: { label: 'Annulé',     tone: 'overdue' },
    },
};

export const TONE_CLASSES: Record<StatusTone, string> = {
    paid:    'bg-status-paid/10 text-status-paid border-status-paid/20',
    pending: 'bg-status-pending/10 text-status-pending border-status-pending/20',
    overdue: 'bg-status-overdue/10 text-status-overdue border-status-overdue/20',
    draft:   'bg-zinc-800 text-zinc-400 border-zinc-700',
};

export const TONE_DOT: Record<StatusTone, string> = {
    paid:    'bg-status-paid',
    pending: 'bg-status-pending',
    overdue: 'bg-status-overdue',
    draft:   'bg-zinc-500',
};

export function getStatusEntry(type: DocumentType, status: string | null | undefined): StatusEntry {
    const key = (status || 'draft').toString().toLowerCase();
    return (
        STATUS_CONFIG[type]?.[key] ??
        STATUS_CONFIG[type]?.draft ??
        { label: status || 'Brouillon', tone: 'draft' }
    );
}

export function getStatusOptions(type: DocumentType): Array<{ value: string; label: string; tone: StatusTone }> {
    return Object.entries(STATUS_CONFIG[type]).map(([value, { label, tone }]) => ({ value, label, tone }));
}
