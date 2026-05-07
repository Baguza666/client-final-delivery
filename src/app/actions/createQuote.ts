'use server'

import { revalidatePath } from 'next/cache'
import { withWorkspace } from '@/lib/action-wrapper'
import { z } from 'zod'

const QuoteItemSchema = z.object({
    description: z.string().min(1).max(500),
    unit:        z.string().max(50).nullable().optional(),
    quantity:    z.coerce.number().positive(),
    unit_price:  z.coerce.number().nonnegative(),
    tva_rate:    z.coerce.number().min(0).max(100).default(20),
    total:       z.coerce.number().nonnegative(),
})

const QuoteSchema = z.object({
    client_id:    z.string().uuid('ID client invalide'),
    number:       z.string().min(1).max(100),
    discount:     z.coerce.number().min(0).max(100).default(0),
    total_amount: z.coerce.number().nonnegative(),
    valid_until:  z.string().min(1),
    items:        z.array(QuoteItemSchema).min(1, 'Au moins un article requis'),
})

type QuotePayload = z.infer<typeof QuoteSchema>

export async function createQuote(rawData: QuotePayload) {
    const parsed = QuoteSchema.safeParse(rawData)
    if (!parsed.success) return { error: parsed.error.issues[0].message }
    const data = parsed.data

    return withWorkspace(async ({ supabase, workspaceId }) => {
        // 1. Create Quote
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .insert({
                workspace_id: workspaceId,
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
                tva_rate: item.tva_rate != null ? Number(item.tva_rate) : 20,
                total: item.total
            }))

            const { error: itemsError } = await supabase
                .from('quote_items')
                .insert(itemsToInsert)

            if (itemsError) return { error: "Items failed: " + itemsError.message }
        }

        revalidatePath('/quotes')
        return { success: true, quoteId: quote.id }
    })
}
