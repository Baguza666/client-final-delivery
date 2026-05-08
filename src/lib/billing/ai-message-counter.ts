import { TIERS, type Tier } from '@/lib/tiers'
import { LimitExceededError, type WorkspaceContext } from '@/lib/action-wrapper'

function currentYearMonth(): string {
    const now = new Date()
    const m = String(now.getUTCMonth() + 1).padStart(2, '0')
    return `${now.getUTCFullYear()}-${m}`
}

export interface AiMessageUsage {
    used: number
    limit: number | null
    remaining: number
    pctUsed: number
    status: 'ok' | 'warning' | 'limit'
}

const WARNING_THRESHOLD = 0.8

export async function monthlyAiMessageCount(
    ctx: WorkspaceContext,
    yearMonth: string = currentYearMonth(),
): Promise<number> {
    const { data, error } = await ctx.supabase.rpc('monthly_ai_message_count', {
        p_workspace_id: ctx.workspaceId,
        p_year_month: yearMonth,
    })
    if (error) return 0
    return typeof data === 'number' ? data : 0
}

export async function getAiMessageUsage(
    ctx: WorkspaceContext,
    tier: Tier,
): Promise<AiMessageUsage> {
    const limit = TIERS[tier].monthlyAiMessageLimit
    const used = await monthlyAiMessageCount(ctx)
    if (limit === null) {
        return { used, limit: null, remaining: Infinity, pctUsed: 0, status: 'ok' }
    }
    if (limit === 0) {
        // AI not available on this tier; treat as immediately at cap.
        return { used, limit: 0, remaining: 0, pctUsed: 1, status: 'limit' }
    }
    const remaining = Math.max(0, limit - used)
    const pctUsed = used / limit
    const status: AiMessageUsage['status'] =
        used >= limit ? 'limit' : pctUsed >= WARNING_THRESHOLD ? 'warning' : 'ok'
    return { used, limit, remaining, pctUsed, status }
}

export async function checkAiMessageLimit(
    ctx: WorkspaceContext,
    tier: Tier,
    fromKey: string = 'ai_limit',
): Promise<void> {
    const usage = await getAiMessageUsage(ctx, tier)
    if (usage.limit !== null && usage.used >= usage.limit) {
        throw new LimitExceededError(usage.limit ?? 0, 'ai_messages', fromKey)
    }
}

/**
 * Append a user message row used by the monthly AI counter. Call once per user
 * prompt sent to the model.
 */
export async function recordAiUserMessage(
    ctx: WorkspaceContext,
    content: unknown,
): Promise<void> {
    await ctx.supabase.from('ai_chat_messages').insert({
        workspace_id: ctx.workspaceId,
        user_id: ctx.user.id,
        role: 'user',
        content: typeof content === 'string' ? { text: content } : content,
    })
}
