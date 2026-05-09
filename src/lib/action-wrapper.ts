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

export type TierLockedError = ActionError & {
    code: 'TIER_LOCKED'
    requiredTier: Tier
    fromKey: string
}

/**
 * Standalone tier gate for actions that bypass withWorkspace (e.g. those using
 * a raw createServerClient cookie session). Returns null on pass, TierLockedError
 * on lock. The action returns the error to its caller; the page boundary handles
 * the redirect.
 */
export async function gateTier(
    supabase: AppSupabaseClient,
    userId: string,
    required: Tier,
    fromKey: string,
): Promise<TierLockedError | null> {
    const workspaceId = await getOrCreateWorkspace(supabase, userId).catch(() => null)
    if (!workspaceId) {
        return {
            error: 'Espace de travail introuvable.',
            code: 'TIER_LOCKED',
            requiredTier: required,
            fromKey,
        }
    }
    const { data: workspace, error } = await supabase
        .from('workspaces')
        .select('tier')
        .eq('id', workspaceId)
        .single<{ tier: Tier }>()
    if (error || !workspace) {
        return {
            error: 'Espace de travail introuvable.',
            code: 'TIER_LOCKED',
            requiredTier: required,
            fromKey,
        }
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
    return null
}

export function isTierLockedError(value: unknown): value is TierLockedError {
    return !!value
        && typeof value === 'object'
        && 'code' in value
        && (value as { code?: string }).code === 'TIER_LOCKED'
}

/**
 * requireTier — inline tier check usable inside an existing withWorkspace handler.
 * Returns either the resolved tier context or a structured TierLockedError that
 * the action should return to its caller (the page boundary then redirects to
 * /pricing?from=<fromKey>).
 *
 * Usage:
 *   return withWorkspace(async (ctx) => {
 *     const gate = await requireTier(ctx, 'pro', 'quotes')
 *     if (isTierLockedError(gate)) return gate
 *     // ...handler logic with gate.tier / gate.tierAtPeak
 *   })
 */
export async function requireTier(
    ctx: WorkspaceContext,
    required: Tier,
    fromKey: string,
): Promise<TierLockedError | { tier: Tier; tierAtPeak: Tier }> {
    const { data: workspace, error } = await ctx.supabase
        .from('workspaces')
        .select('tier, tier_at_peak')
        .eq('id', ctx.workspaceId)
        .single<{ tier: Tier; tier_at_peak: Tier }>()
    if (error || !workspace) {
        return {
            error: 'Espace de travail introuvable.',
            code: 'TIER_LOCKED',
            requiredTier: required,
            fromKey,
        }
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
    return { tier: effective, tierAtPeak: workspace.tier_at_peak }
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
