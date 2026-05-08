import { createClient } from '@/utils/supabase/server'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { getEffectiveTier, tierMeets, type Tier } from '@/lib/tiers'
import type { User } from '@supabase/supabase-js'

type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>

export type WorkspaceContext = {
    supabase: AppSupabaseClient
    user: User
    workspaceId: string
}

export type TierWorkspaceContext = WorkspaceContext & {
    tier: Tier
    tierAtPeak: Tier
}

export type ActionError = { error: string; code?: string }

export class TierLockError extends Error {
    constructor(public required: Tier, public actual: Tier, public from: string) {
        super(`Feature requires ${required}; workspace is on ${actual}`)
        this.name = 'TierLockError'
    }
}

export class LimitExceededError extends Error {
    constructor(public limit: number, public scope: 'invoices' | 'ai_messages', public from: string) {
        super(`${scope} limit ${limit} exceeded`)
        this.name = 'LimitExceededError'
    }
}

export async function withWorkspace<T>(
    handler: (ctx: WorkspaceContext) => Promise<T>,
): Promise<T | ActionError> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }
    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }
    return handler({ supabase, user, workspaceId })
}

/**
 * withTier wraps a server action with a minimum-tier check. The wrapped handler
 * receives the live workspace tier so it can branch (e.g. enforce per-tier caps).
 *
 * On tier lock, returns { error, code: 'TIER_LOCKED', requiredTier, fromKey }
 * which the page boundary uses to redirect to /pricing?from=<fromKey>.
 */
export function withTier<T>(
    required: Tier,
    handler: (ctx: TierWorkspaceContext) => Promise<T>,
    fromKey: string = 'unknown',
): () => Promise<T | (ActionError & { requiredTier?: Tier; fromKey?: string })> {
    return async () => {
        return withWorkspace(async (ctx) => {
            const { data: workspace, error } = await ctx.supabase
                .from('workspaces')
                .select('tier, tier_at_peak')
                .eq('id', ctx.workspaceId)
                .single<{ tier: Tier; tier_at_peak: Tier }>()
            if (error || !workspace) {
                return { error: 'Espace de travail introuvable.' } as ActionError
            }
            const effective = getEffectiveTier(workspace)
            if (!tierMeets(effective, required)) {
                return {
                    error: `Cette fonctionnalité requiert le tier ${required}.`,
                    code: 'TIER_LOCKED',
                    requiredTier: required,
                    fromKey,
                } satisfies ActionError & { requiredTier: Tier; fromKey: string }
            }
            return handler({ ...ctx, tier: effective, tierAtPeak: workspace.tier_at_peak })
        }) as Promise<T | (ActionError & { requiredTier?: Tier; fromKey?: string })>
    }
}

/**
 * withTierAction wraps an action that takes an arguments object (FormData or
 * a typed payload) and enforces a tier gate before invoking the handler.
 */
export function withTierAction<TArg, TResult>(
    required: Tier,
    handler: (ctx: TierWorkspaceContext, arg: TArg) => Promise<TResult>,
    fromKey: string = 'unknown',
): (arg: TArg) => Promise<TResult | (ActionError & { requiredTier?: Tier; fromKey?: string })> {
    return async (arg: TArg) => {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Non authentifié.' } satisfies ActionError
        const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
        if (!workspaceId) return { error: 'Espace de travail introuvable.' } satisfies ActionError

        const { data: workspace, error } = await supabase
            .from('workspaces')
            .select('tier, tier_at_peak')
            .eq('id', workspaceId)
            .single<{ tier: Tier; tier_at_peak: Tier }>()
        if (error || !workspace) {
            return { error: 'Espace de travail introuvable.' } satisfies ActionError
        }
        const effective = getEffectiveTier(workspace)
        if (!tierMeets(effective, required)) {
            return {
                error: `Cette fonctionnalité requiert le tier ${required}.`,
                code: 'TIER_LOCKED',
                requiredTier: required,
                fromKey,
            }
        }

        return handler(
            { supabase, user, workspaceId, tier: effective, tierAtPeak: workspace.tier_at_peak },
            arg,
        )
    }
}
