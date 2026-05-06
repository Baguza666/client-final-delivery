import { DocumentType, getStatusEntry, TONE_CLASSES, TONE_DOT } from '@/utils/status';

interface StatusPillProps {
    type: DocumentType;
    status: string | null | undefined;
    showDot?: boolean;
    className?: string;
}

export default function StatusPill({ type, status, showDot = false, className = '' }: StatusPillProps) {
    const entry = getStatusEntry(type, status);
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${TONE_CLASSES[entry.tone]} ${className}`}
        >
            {showDot && <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[entry.tone]}`} />}
            {entry.label}
        </span>
    );
}
