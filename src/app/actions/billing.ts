'use server'

import { revalidatePath } from 'next/cache'
import { withWorkspace } from '@/lib/action-wrapper'
import { createCheckout, cancelSubscription as lsCancel, refundSubscription } from '@/lib/billing/lemonsqueezy'
import { getSubscription, isInMoneyBackWindow } from '@/lib/billing/subscription'
import { validateFoundingCode, FOUNDING_CODE } from '@/lib/billing/founding-code'
import type { Tier } from '@/lib/tiers'

export interface CreateCheckoutInput {
    tier: Exclude<Tier, 'free'>
    cadence: 'monthly' | 'annual'
    /** Optional discount code; if FOUNDER30, server validates wishlist + cohort window. */
    discountCode?: string
}

export async function createCheckoutSession(input: CreateCheckoutInput) {
    return withWorkspace(async ({ supabase, user, workspaceId }) => {
        let appliedCode: string | undefined

        if (input.discountCode) {
            if (input.discountCode.trim().toUpperCase() === FOUNDING_CODE) {
                if (!user.email) {
                    return { error: 'Email manquant pour valider le code FOUNDER30.' }
                }
                const validation = await validateFoundingCode(supabase, FOUNDING_CODE, user.email)
                if (!validation.valid) {
                    return {
                        error: 'Code FOUNDER30 invalide ou expiré pour cet email.',
                        reason: validation.reason,
                    }
                }
                appliedCode = FOUNDING_CODE
            } else {
                appliedCode = input.discountCode
            }
        }

        try {
            const { url } = await createCheckout({
                workspaceId,
                tier: input.tier,
                cadence: input.cadence,
                customerEmail: user.email ?? undefined,
                discountCode: appliedCode,
            })
            return { url }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur de création du checkout.'
            return { error: msg }
        }
    })
}

export async function cancelSubscription({ reason }: { reason?: string }) {
    return withWorkspace(async ({ supabase, workspaceId }) => {
        const sub = await getSubscription(supabase, workspaceId)
        if (!sub) return { error: 'Aucun abonnement actif.' }
        if (!sub.provider_subscription_id) {
            return { error: 'Identifiant Lemon Squeezy manquant.' }
        }

        const inWindow = isInMoneyBackWindow(sub)

        try {
            if (inWindow) {
                // Full refund + immediate downgrade.
                await refundSubscription(sub.provider_subscription_id)
                await supabase.from('subscriptions').update({
                    status: 'cancelled',
                    cancel_at_period_end: true,
                }).eq('id', sub.id)
                await supabase.from('workspaces').update({
                    tier: 'free',
                    subscription_id: null,
                }).eq('id', workspaceId)
            } else {
                await lsCancel(sub.provider_subscription_id)
                await supabase.from('subscriptions').update({
                    cancel_at_period_end: true,
                }).eq('id', sub.id)
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur Lemon Squeezy.'
            return { error: msg }
        }

        // Optional analytics: log cancellation reason.
        if (reason) {
            await supabase.from('cancellation_reasons').insert({
                workspace_id: workspaceId,
                subscription_id: sub.id,
                reason,
            }).select().maybeSingle().then(
                () => undefined,
                () => undefined, // table may not exist yet; ignore.
            )
        }

        revalidatePath('/billing')
        revalidatePath('/', 'layout')
        return {
            success: true,
            refunded: inWindow,
            periodEnd: sub.current_period_end,
        }
    })
}

export async function requestRefundEdgeCase({
    reason,
    explanation,
    evidenceUrl,
}: {
    reason: string
    explanation: string
    evidenceUrl?: string | null
}) {
    return withWorkspace(async ({ supabase, user, workspaceId }) => {
        // Insert a request row (table to be created as needed).
        await supabase.from('refund_requests').insert({
            workspace_id: workspaceId,
            user_id: user.id,
            reason,
            explanation,
            evidence_url: evidenceUrl ?? null,
        }).select().maybeSingle().then(
            () => undefined,
            () => undefined,
        )
        // TODO(phase8): wire to Resend → support@invoicify.ma.
        return { success: true }
    })
}
