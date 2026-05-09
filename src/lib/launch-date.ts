// Single source of truth for the launch timestamp.
// FOUNDER30 cohort window = launch + 90 days.
// Override in production via NEXT_PUBLIC_LAUNCH_DATE env var.

export const LAUNCH_DATE = new Date(
    process.env.NEXT_PUBLIC_LAUNCH_DATE ?? '2026-05-28T09:00:00+01:00',
)

export const FOUNDING_COHORT_DAYS = 90

export function daysUntilLaunch(now: Date = new Date()): number {
    const ms = LAUNCH_DATE.getTime() - now.getTime()
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function formattedLaunchDate(): string {
    return LAUNCH_DATE.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Africa/Casablanca',
    })
}

export function foundingCohortClosesAt(): Date {
    const closes = new Date(LAUNCH_DATE)
    closes.setDate(closes.getDate() + FOUNDING_COHORT_DAYS)
    return closes
}

export function isFoundingCohortOpen(now: Date = new Date()): boolean {
    return now < foundingCohortClosesAt()
}
