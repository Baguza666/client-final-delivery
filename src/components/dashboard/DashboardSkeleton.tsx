export default function DashboardSkeleton() {
    return (
        <main className="px-4 sm:px-6 lg:px-8 py-6 md:py-8 animate-pulse">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
                <div>
                    <div className="h-3 w-32 bg-zinc-900 rounded mb-3" />
                    <div className="h-8 w-48 bg-zinc-900 rounded mb-2" />
                    <div className="h-4 w-64 bg-zinc-900 rounded" />
                </div>
                <div className="h-4 w-48 bg-zinc-900 rounded" />
            </header>

            {/* KPI strip */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-5">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 mb-4" />
                        <div className="h-3 w-20 bg-zinc-800 rounded mb-2" />
                        <div className="h-7 w-32 bg-zinc-800 rounded" />
                    </div>
                ))}
            </section>

            {/* Chart row */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6">
                    <div className="h-4 w-40 bg-zinc-800 rounded mb-2" />
                    <div className="h-5 w-32 bg-zinc-800 rounded mb-6" />
                    <div className="h-28 w-full bg-zinc-800/60 rounded" />
                </div>
                <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6">
                    <div className="h-4 w-32 bg-zinc-800 rounded mb-2" />
                    <div className="h-5 w-24 bg-zinc-800 rounded mb-6" />
                    <div className="h-7 w-32 bg-zinc-800 rounded mb-3" />
                    <div className="h-1.5 w-full bg-zinc-800 rounded mt-6" />
                </div>
            </section>

            {/* Activity */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="bg-white/[0.018] border border-white/[0.05] rounded-3xl p-6">
                        <div className="h-5 w-24 bg-zinc-800 rounded mb-6" />
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((__, j) => (
                                <div key={j} className="h-14 bg-zinc-800/50 rounded-xl" />
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </main>
    )
}
