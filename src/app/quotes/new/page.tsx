import QuoteBuilder from '@/components/quotes/QuoteBuilder'

export default function NewQuotePage() {
    return (
        <div className="w-full min-h-screen bg-black">
            {/* The component fetches its own data, so we don't pass any props */}
            <QuoteBuilder />
        </div>
    )
}