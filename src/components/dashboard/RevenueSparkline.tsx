'use client'

interface RevenueSparklineProps {
    values: number[]
    labels?: string[]
    className?: string
}

/**
 * Honest revenue sparkline. Renders an SVG curve from the last N monthly
 * revenue values. Falls back to a flat "no data" line when everything is zero.
 */
export default function RevenueSparkline({ values, labels, className = '' }: RevenueSparklineProps) {
    const max = Math.max(...values, 0)
    const hasData = max > 0
    const w = 100
    const h = 32
    const stepX = values.length > 1 ? w / (values.length - 1) : w

    const points = values.map((v, i) => {
        const x = i * stepX
        const y = hasData ? h - (v / max) * h * 0.9 - 1 : h / 2
        return [x, y] as const
    })

    const linePath = points
        .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
        .join(' ')
    const areaPath = `${linePath} L${w},${h} L0,${h} Z`

    const lastIdx = values.length - 1
    const lastPoint = points[lastIdx]

    return (
        <div className={`relative w-full ${className}`} aria-label={hasData ? 'Tendance des revenus' : 'Aucun historique de revenus'}>
            <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-full">
                <defs>
                    <linearGradient id="sparklineFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {hasData ? (
                    <>
                        <path d={areaPath} fill="url(#sparklineFill)" />
                        <path
                            d={linePath}
                            fill="none"
                            stroke="#3B82F6"
                            strokeWidth="0.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                        {lastPoint && (
                            <circle cx={lastPoint[0]} cy={lastPoint[1]} r="1.4" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="0.4" />
                        )}
                    </>
                ) : (
                    <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
                )}
            </svg>

            {!hasData && (
                <p className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-widest text-zinc-600 font-bold pointer-events-none">
                    Pas encore d’historique
                </p>
            )}

            {hasData && labels && labels.length === values.length && (
                <div className="flex justify-between text-[9px] text-zinc-600 font-bold mt-1.5 px-0.5">
                    <span>{labels[0]}</span>
                    <span>{labels[lastIdx]}</span>
                </div>
            )}
        </div>
    )
}
