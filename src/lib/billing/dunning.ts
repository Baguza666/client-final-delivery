import type { SupabaseClient } from '@supabase/supabase-js'
import type { SubscriptionRow } from './subscription'

export type DeclineSeverity = 'soft' | 'hard'

const SOFT_REASONS = new Set([
    'insufficient_funds',
    'exceeds_amount_limit',
    'do_not_honor',
    'transaction_not_permitted',
])

const HARD_REASONS = new Set([
    'expired_card',
    'card_not_supported',
    'stolen_card',
    'lost_card',
])

export function classifyDeclineReason(reason: string | null | undefined): DeclineSeverity {
    if (!reason) return 'hard'
    const r = reason.toLowerCase()
    if (SOFT_REASONS.has(r)) return 'soft'
    if (HARD_REASONS.has(r)) return 'hard'
    // Unknown reason: be conservative — treat as hard so we email the user.
    return 'hard'
}

const SOFT_RETRY_OFFSETS_DAYS = [1, 3, 7]
const HARD_RETRY_OFFSETS_DAYS = [3, 7, 14]

/**
 * Given the current attempt number, compute when the next retry should fire.
 * Returns null when the schedule is exhausted (caller should expire the subscription).
 */
export function nextRetryAt(severity: DeclineSeverity, attemptNumber: number, base: Date = new Date()): Date | null {
    const offsets = severity === 'soft' ? SOFT_RETRY_OFFSETS_DAYS : HARD_RETRY_OFFSETS_DAYS
    if (attemptNumber >= offsets.length) return null
    const next = new Date(base)
    next.setDate(next.getDate() + offsets[attemptNumber])
    return next
}

export function graceWindowDays(severity: DeclineSeverity): number {
    return severity === 'soft' ? 7 : 14
}

/**
 * Update the subscription row to enter the dunning state machine.
 * Caller should ensure idempotency by writing only when state changes.
 */
export async function enterDunning(
    supabase: SupabaseClient,
    subscription: SubscriptionRow,
    declineReason: string | null,
): Promise<{ severity: DeclineSeverity; nextRetry: Date | null }> {
    const severity = classifyDeclineReason(declineReason)
    const next = nextRetryAt(severity, subscription.retry_attempts ?? 0)
    await supabase.from('subscriptions').update({
        status: 'past_due',
        decline_reason: declineReason,
        dunning_state: severity,
        next_retry_at: next?.toISOString() ?? null,
    }).eq('id', subscription.id)
    return { severity, nextRetry: next }
}

/**
 * Increment attempt count and schedule next retry, or mark expired when exhausted.
 */
export async function recordRetryAttempt(
    supabase: SupabaseClient,
    subscription: SubscriptionRow,
): Promise<{ exhausted: boolean }> {
    const severity = (subscription.dunning_state as DeclineSeverity) ?? 'hard'
    const newAttempts = (subscription.retry_attempts ?? 0) + 1
    const next = nextRetryAt(severity, newAttempts)
    if (next === null) {
        await supabase.from('subscriptions').update({
            status: 'expired',
            dunning_state: 'expired',
            next_retry_at: null,
            retry_attempts: newAttempts,
        }).eq('id', subscription.id)
        // Workspace tier downgrade is handled by the webhook subscription_expired branch,
        // but we mirror it here in case the cron runs after exhaustion without an LS event.
        await supabase.from('workspaces').update({ tier: 'free' }).eq('id', subscription.workspace_id)
        return { exhausted: true }
    }
    await supabase.from('subscriptions').update({
        next_retry_at: next.toISOString(),
        retry_attempts: newAttempts,
    }).eq('id', subscription.id)
    return { exhausted: false }
}
