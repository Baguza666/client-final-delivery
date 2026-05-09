// Single source of truth for the launch timestamp.
// FOUNDER30 cohort window = launch + 90 days.
// Update this once a launch date is locked in.

export const LAUNCH_DATE = new Date(process.env.NEXT_PUBLIC_LAUNCH_DATE ?? '2026-06-01T08:00:00+01:00')

export const FOUNDING_COHORT_DAYS = 90

export function foundingCohortClosesAt(): Date {
    const closes = new Date(LAUNCH_DATE)
    closes.setDate(closes.getDate() + FOUNDING_COHORT_DAYS)
    return closes
}

export function isFoundingCohortOpen(now: Date = new Date()): boolean {
    return now < foundingCohortClosesAt()
}
