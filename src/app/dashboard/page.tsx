import { Suspense } from 'react'
import DashboardUI from '@/components/dashboard/DashboardUI'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import { getDashboardStats } from '@/app/actions/dashboard'

export const dynamic = 'force-dynamic'

async function DashboardLoader() {
    const data = await getDashboardStats()
    return <DashboardUI {...data} />
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardLoader />
        </Suspense>
    )
}
