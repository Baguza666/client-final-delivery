// Single source of truth for tier definitions, prices, and feature flags.
// All tier checks in the app should consult this module — never hard-code a tier name.

export type Tier = 'free' | 'pro' | 'business'

export const TIER_RANK: Record<Tier, number> = {
    free: 0,
    pro: 1,
    business: 2,
}

export type FeatureFlag =
    | 'quotes'
    | 'purchaseOrders'
    | 'deliveryNotes'
    | 'expenses'
    | 'reconciliation'
    | 'reports'
    | 'aiFeatures'
    | 'tvaReport'
    | 'accountantExport'
    | 'watermarkRemoved'

export interface TierConfig {
    name: string
    monthlyPriceMad: number
    annualPriceMad: number
    /** null = unlimited */
    monthlyInvoiceLimit: number | null
    /** null = unlimited; 0 = AI not available on this tier */
    monthlyAiMessageLimit: number | null
    features: Record<FeatureFlag, boolean>
}

const FREE_FEATURES: Record<FeatureFlag, boolean> = {
    quotes: false,
    purchaseOrders: false,
    deliveryNotes: false,
    expenses: false,
    reconciliation: false,
    reports: false,
    aiFeatures: false,
    tvaReport: false,
    accountantExport: false,
    watermarkRemoved: false,
}

const PRO_FEATURES: Record<FeatureFlag, boolean> = {
    quotes: true,
    purchaseOrders: true,
    deliveryNotes: true,
    expenses: true,
    reconciliation: true,
    reports: true,
    aiFeatures: true,
    tvaReport: false,
    accountantExport: false,
    watermarkRemoved: true,
}

const BUSINESS_FEATURES: Record<FeatureFlag, boolean> = {
    quotes: true,
    purchaseOrders: true,
    deliveryNotes: true,
    expenses: true,
    reconciliation: true,
    reports: true,
    aiFeatures: true,
    tvaReport: true,
    accountantExport: true,
    watermarkRemoved: true,
}

export const TIERS: Record<Tier, TierConfig> = {
    free: {
        name: 'Gratuit',
        monthlyPriceMad: 0,
        annualPriceMad: 0,
        monthlyInvoiceLimit: 10,
        monthlyAiMessageLimit: 0,
        features: FREE_FEATURES,
    },
    pro: {
        name: 'Pro',
        monthlyPriceMad: 99,
        annualPriceMad: 950,
        monthlyInvoiceLimit: null,
        monthlyAiMessageLimit: 200,
        features: PRO_FEATURES,
    },
    business: {
        name: 'Business',
        monthlyPriceMad: 249,
        annualPriceMad: 2390,
        monthlyInvoiceLimit: null,
        monthlyAiMessageLimit: 1000,
        features: BUSINESS_FEATURES,
    },
}

/** Annual savings, expressed as 12 × monthly − annual price. */
export function annualSavingsMad(tier: Tier): number {
    const t = TIERS[tier]
    return t.monthlyPriceMad * 12 - t.annualPriceMad
}

export function tierMeets(actual: Tier, required: Tier): boolean {
    return TIER_RANK[actual] >= TIER_RANK[required]
}

export function hasFeature(tier: Tier, feature: FeatureFlag): boolean {
    return TIERS[tier].features[feature]
}

/** No trial logic — effective tier is the stored tier. */
export function getEffectiveTier(workspace: { tier: Tier }): Tier {
    return workspace.tier
}

/**
 * Whether the workspace was previously on a paid tier and now sits on free.
 * These users get read-only access to their historical Pro-only data.
 */
export function hasHistoricalProAccess(workspace: { tier_at_peak: Tier }): boolean {
    return TIER_RANK[workspace.tier_at_peak] >= TIER_RANK.pro
}

export function isReadOnlyDowngrade(workspace: { tier: Tier; tier_at_peak: Tier }): boolean {
    return workspace.tier === 'free' && hasHistoricalProAccess(workspace)
}
