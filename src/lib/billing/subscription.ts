import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tier } from '@/lib/tiers'

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired'
export type DunningState = 'soft' | 'hard' | 'expired' | null

export interface SubscriptionRow {
    id: string
    workspace_id: string
    tier: Tier
    status: SubscriptionStatus
    provider: string
    provider_subscription_id: string | null
    provider_customer_id: string | null
    cadence: 'monthly' | 'annual' | null
    first_paid_at: string
    current_period_start: string
    current_period_end: string
    cancel_at_period_end: boolean
    founding_code_redeemed: boolean
    decline_reason: string | null
    dunning_state: DunningState
    next_retry_at: string | null
    retry_attempts: number
    created_at: string
    updated_at: string
}

const MONEY_BACK_DAYS = 30

export async function getSubscription(
    supabase: SupabaseClient,
    workspaceId: string,
): Promise<SubscriptionRow | null> {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<SubscriptionRow>()
    if (error) return null
    return data
}

export function isInMoneyBackWindow(sub: Pick<SubscriptionRow, 'first_paid_at'>): boolean {
    const firstPaid = new Date(sub.first_paid_at).getTime()
    const cutoff = Date.now() - MONEY_BACK_DAYS * 24 * 60 * 60 * 1000
    return firstPaid >= cutoff
}

export function daysUntilRenewal(sub: Pick<SubscriptionRow, 'current_period_end'>): number {
    const end = new Date(sub.current_period_end).getTime()
    const diffMs = end - Date.now()
    return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
}

export function moneyBackDaysRemaining(sub: Pick<SubscriptionRow, 'first_paid_at'>): number {
    const firstPaid = new Date(sub.first_paid_at).getTime()
    const expiry = firstPaid + MONEY_BACK_DAYS * 24 * 60 * 60 * 1000
    const diffMs = expiry - Date.now()
    return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
}
