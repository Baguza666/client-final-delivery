import React from 'react'

interface DocumentActionBarProps {
    left: React.ReactNode
    center?: React.ReactNode
    right: React.ReactNode
}

export default function DocumentActionBar({ left, center, right }: DocumentActionBarProps) {
    return (
        <div className="w-full max-w-[210mm] flex flex-wrap items-center gap-x-3 gap-y-2 mb-6 print:hidden">
            {/* Navigation + status actions — stays left, never wraps first */}
            <div className="flex items-center gap-2 min-w-0">
                {left}
            </div>

            {/* Document controls (stamps, templates) — wraps to its own line when crowded */}
            {center && (
                <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800 flex-wrap">
                    {center}
                </div>
            )}

            {/* Action buttons — pushed to the right, individual buttons wrap among themselves */}
            <div className="flex items-center gap-2 flex-wrap ml-auto">
                {right}
            </div>
        </div>
    )
}
