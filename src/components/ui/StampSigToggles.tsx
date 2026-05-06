interface StampSigTogglesProps {
    showStamp: boolean
    showSignature: boolean
    onStampChange: (val: boolean) => void
    onSigChange: (val: boolean) => void
}

export default function StampSigToggles({ showStamp, showSignature, onStampChange, onSigChange }: StampSigTogglesProps) {
    return (
        <>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white select-none">
                <input
                    type="checkbox"
                    checked={showStamp}
                    onChange={(e) => onStampChange(e.target.checked)}
                    className="accent-[#3B82F6] w-4 h-4 cursor-pointer"
                />
                Cachet
            </label>
            <div className="w-px h-4 bg-zinc-700" />
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer hover:text-white select-none">
                <input
                    type="checkbox"
                    checked={showSignature}
                    onChange={(e) => onSigChange(e.target.checked)}
                    className="accent-[#3B82F6] w-4 h-4 cursor-pointer"
                />
                Signature
            </label>
        </>
    )
}
