// File: src/utils/syncEngine.ts

export type SyncItem = {
    line_uid?: string
    description: string
    quantity?: number
    quantity_delivered?: number
    unit_price?: number
    total?: number
    // Allow for loose typing since DB fields vary slightly
    [key: string]: any
}

export type DiffChange = {
    current: SyncItem
    new: SyncItem
    changes: string[]
    conflicts: string[]
}

export type DiffResult = {
    added: SyncItem[]
    removed: SyncItem[]
    changed: DiffChange[]
}

export function calculateDiff(upstreamItems: SyncItem[], downstreamItems: SyncItem[], docType: 'po' | 'dn' | 'invoice'): DiffResult {
    const added: SyncItem[] = []
    const removed: SyncItem[] = []
    const changed: DiffChange[] = []

    // 1. Map downstream items by line_uid for easy lookup
    const downstreamMap = new Map<string, SyncItem>()
    downstreamItems.forEach(item => {
        if (item.line_uid) downstreamMap.set(item.line_uid, item)
    })

    // 2. Detect CHANGES and ADDITIONS (Loop through Upstream / "Truth")
    upstreamItems.forEach(upItem => {
        if (!upItem.line_uid) return

        const downItem = downstreamMap.get(upItem.line_uid)

        if (!downItem) {
            // It exists upstream but not downstream -> IT WAS ADDED
            added.push(upItem)
        } else {
            // It exists in both -> CHECK FOR CHANGES
            const changes: string[] = []

            // Compare Description
            if (upItem.description !== downItem.description) {
                changes.push('description')
            }

            // Compare Quantity (Handle different field names)
            const upQty = Number(upItem.quantity ?? upItem.quantity_delivered ?? 0)
            const downQty = Number(downItem.quantity ?? downItem.quantity_delivered ?? 0)

            if (upQty !== downQty) {
                changes.push('quantity')
            }

            // Compare Price (Only relevant if downstream has price)
            if (downItem.unit_price !== undefined) {
                const upPrice = Number(upItem.unit_price ?? 0)
                const downPrice = Number(downItem.unit_price ?? 0)
                if (upPrice !== downPrice) changes.push('price')
            }

            if (changes.length > 0) {
                changed.push({
                    current: downItem,
                    new: upItem,
                    changes,
                    conflicts: []
                })
            }

            // Remove from map so we know we processed it
            downstreamMap.delete(upItem.line_uid)
        }
    })

    // 3. Detect REMOVALS (Whatever is left in the map exists downstream but not upstream)
    downstreamMap.forEach(downItem => {
        removed.push(downItem)
    })

    return { added, removed, changed }
}