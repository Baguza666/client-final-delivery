import QuoteBuilder from '@/components/quotes/QuoteBuilder'

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return (
        <div className="w-full min-h-screen bg-black">
            <QuoteBuilder quoteId={id} />
        </div>
    )
}