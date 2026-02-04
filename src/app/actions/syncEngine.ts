// src/utils/syncEngine.ts

export interface SyncItem {
    id?: string;
    line_uid: string;
    description: string;
    quantity?: number;
    quantity_delivered?: number;
    quantity_billed?: number;
    unit_price?: number;
    total?: number;
    sort_order?: number;
}

export type DiffResult = {
    added: SyncItem[];
    removed: SyncItem[];
    changed: {
        current: SyncItem;
        new: SyncItem;
        conflicts: string[];
        changes: string[];
    }[];
};

export function calculateDiff(
    upstream: SyncItem[],
    downstream: SyncItem[],
    docType: 'po' | 'dn' | 'invoice'
): DiffResult {
    const diff: DiffResult = { added: [], removed: [], changed: [] };
    const upMap = new Map(upstream.map(i => [i.line_uid, i]));
    const downMap = new Map(downstream.map(i => [i.line_uid, i]));

    // 1. Added
    upstream.forEach(up => {
        if (!downMap.has(up.line_uid)) diff.added.push(up);
    });

    // 2. Removed
    downstream.forEach(down => {
        if (!upMap.has(down.line_uid)) diff.removed.push(down);
    });

    // 3. Changed
    downstream.forEach(down => {
        const up = upMap.get(down.line_uid);
        if (!up) return;

        const changes: string[] = [];
        const conflicts: string[] = [];

        // Normalize quantities for comparison
        const qUp = up.quantity ?? up.quantity_delivered ?? 0;
        const qDown = down.quantity ?? down.quantity_billed ?? down.quantity_delivered ?? 0;

        if (qUp !== qDown) changes.push("Quantity");
        if (up.description !== down.description) changes.push("Description");

        if (changes.length > 0) {
            diff.changed.push({ current: down, new: up, conflicts, changes });
        }
    });

    return diff;
}