import { TIERS, type Tier } from '@/lib/tiers'
import { LimitExceededError, type WorkspaceContext } from '@/lib/action-wrapper'

function currentYearMonth(): string {
    const now = new Date()
    const m = String(now.getUTCMonth() + 1).padStart(2, '0')
    return `${now.getUTCFullYear()}-${m}`
}

export interface InvoiceUsage {
    used: number
    limit: number | null
    remaining: number
    /** 0..1 ratio; 1.0 = at cap; >1.0 = over cap (shouldn't happen but defensive). */
    pctUsed: number
    status: 'ok' | 'warning' | 'limit'
}

const WARNING_THRESHOLD = 0.8

export async function monthlyInvoiceCount(
    ctx: WorkspaceContext,
    yearMonth: string = currentYearMonth(),
): Promise<number> {
    const { data, error } = await ctx.supabase.rpc('monthly_invoice_count', {
        p_workspace_id: ctx.workspaceId,
        p_year_month: yearMonth,
    })
    if (error) return 0
    return typeof data === 'number' ? data : 0
}

export async function getInvoiceUsage(
    ctx: WorkspaceContext,
    tier: Tier,
): Promise<InvoiceUsage> {
    const limit = TIERS[tier].monthlyInvoiceLimit
    const used = await monthlyInvoiceCount(ctx)
    if (limit === null) {
        return { used, limit: null, remaining: Infinity, pctUsed: 0, status: 'ok' }
    }
    const remaining = Math.max(0, limit - used)
    const pctUsed = limit > 0 ? used / limit : 0
    const status: InvoiceUsage['status'] =
        used >= limit ? 'limit' : pctUsed >= WARNING_THRESHOLD ? 'warning' : 'ok'
    return { used, limit, remaining, pctUsed, status }
}

/**
 * Throws LimitExceededError if creating one more invoice would exceed the tier cap.
 * Call inside the action handler before insert.
 */
export async function checkInvoiceLimit(
    ctx: WorkspaceContext,
    tier: Tier,
    fromKey: string = 'invoice_limit',
): Promise<void> {
    const usage = await getInvoiceUsage(ctx, tier)
    if (usage.limit !== null && usage.used >= usage.limit) {
        throw new LimitExceededError(usage.limit, 'invoices', fromKey)
    }
}
