'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

interface QuotePayload {
    client_id: string
    number: string
    discount: number // ✅ New Field
    total_amount: number
    valid_until: string
    items: any[]
}

export async function createQuote(data: QuotePayload) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    const { data: authData, error: authError } = await supabase.auth.getUser()
    const user = authData?.user

    if (authError || !user) return { error: "User not authenticated" }

    const { data: workspace } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).single()
    if (!workspace) return { error: "No workspace found" }

    // 1. Create Quote
    const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
            workspace_id: workspace.id,
            client_id: data.client_id,
            number: data.number,
            discount: data.discount || 0, // ✅ Save Discount
            total_amount: data.total_amount, // QuoteBuilder should calculate this correctly as TTC
            valid_until: data.valid_until,
            status: 'draft',
            created_at: new Date().toISOString()
        })
        .select()
        .single()

    if (quoteError) return { error: quoteError.message }

    // 2. Create Items
    if (data.items && data.items.length > 0) {
        const itemsToInsert = data.items.map((item) => ({
            quote_id: quote.id,
            description: item.description,
            unit: item.unit || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total
        }))

        const { error: itemsError } = await supabase
            .from('quote_items')
            .insert(itemsToInsert)

        if (itemsError) return { error: "Items failed: " + itemsError.message }
    }

    revalidatePath('/quotes')
    return { success: true, quoteId: quote.id }
}