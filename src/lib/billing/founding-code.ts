import type { SupabaseClient } from '@supabase/supabase-js'
import { isFoundingCohortOpen } from '@/lib/launch-date'

export const FOUNDING_CODE = 'FOUNDER30'
export const FOUNDING_DISCOUNT_PCT = 30

export interface FoundingValidation {
    valid: boolean
    reason?: string
}

/**
 * Validate that an email is eligible for the FOUNDER30 cohort:
 * 1. The submitted code matches FOUNDER30.
 * 2. The email exists in wishlist_signups.
 * 3. We're still inside the 90-day post-launch window.
 *
 * The `supabase` client must be a service-role or RLS-bypassing instance —
 * this is intended to be called from the billing checkout server action.
 */
export async function validateFoundingCode(
    supabase: SupabaseClient,
    code: string,
    email: string,
): Promise<FoundingValidation> {
    if (code.trim().toUpperCase() !== FOUNDING_CODE) {
        return { valid: false, reason: 'INVALID_CODE' }
    }
    if (!isFoundingCohortOpen()) {
        return { valid: false, reason: 'COHORT_CLOSED' }
    }
    const normalised = email.trim().toLowerCase()
    const { data } = await supabase
        .from('wishlist_signups')
        .select('email')
        .eq('email', normalised)
        .maybeSingle<{ email: string }>()
    if (!data) {
        return { valid: false, reason: 'EMAIL_NOT_ON_WISHLIST' }
    }
    return { valid: true }
}
