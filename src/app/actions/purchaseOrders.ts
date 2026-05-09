'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { withWorkspace, requireTier, isTierLockedError } from '@/lib/action-wrapper'
import { generateNextNumber } from '@/lib/document-numbering'

export async function createPurchaseOrder(formData: FormData) {
    return withWorkspace(async (ctx) => {
        const { supabase, user, workspaceId } = ctx
        const gate = await requireTier(ctx, 'pro', 'purchase_orders')
        if (isTierLockedError(gate)) return gate
        const clientId = formData.get('client_id')
        const rawDate = formData.get('date') as string | null
        const date = rawDate?.trim() || new Date().toISOString().split('T')[0]
        const notes = (formData.get('notes') as string | null)?.trim() || null

        const itemsJson = formData.get('items') as string
        const items: { description: string; unit?: string | null; quantity: number; unit_price: number; tva_rate?: number | null }[] = itemsJson ? JSON.parse(itemsJson) : []

        const number = await generateNextNumber(supabase, 'purchase_orders', 'number', 'BC')

        const totalHT = items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
        const totalTVA = items.reduce((sum, item) => {
            const lineHT = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
            const rate = item.tva_rate != null ? Number(item.tva_rate) : 20
            return sum + lineHT * (rate / 100)
        }, 0)
        const totalTTC = totalHT + totalTVA

        const { data: po, error: poError } = await supabase
            .from('purchase_orders')
            .insert({ workspace_id: workspaceId, client_id: clientId, owner_id: user.id, number, date, status: 'draft', total_ht: totalHT, total_ttc: totalTTC, notes })
            .select()
            .single()

        if (poError) return { error: `Erreur DB: ${poError.message}` }

        if (items.length > 0) {
            const { error: itemsError } = await supabase.from('purchase_order_items').insert(
                items.map(item => ({
                    purchase_order_id: po.id,
                    description: item.description,
                    unit: item.unit || null,
                    quantity: Number(item.quantity) || 0,
                    unit_price: Number(item.unit_price) || 0,
                    total: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
                }))
            )
            if (itemsError) {
                await supabase.from('purchase_orders').delete().eq('id', po.id)
                return { error: `Erreur lignes: ${itemsError.message}` }
            }
        }

        revalidatePath('/purchase-orders')
        redirect(`/purchase-orders/${po.id}`)
    })
}

export async function updatePurchaseOrder(id: string, formData: FormData) {
    return withWorkspace(async (ctx) => {
        const { supabase, workspaceId } = ctx
        const gate = await requireTier(ctx, 'pro', 'purchase_orders')
        if (isTierLockedError(gate)) return gate
        const clientId = formData.get('client_id')
        const number = formData.get('number') as string
        const date = formData.get('date')
        const status = formData.get('status')

        const itemsJson = formData.get('items') as string
        const items: { description: string; unit?: string | null; quantity: number; unit_price: number; tva_rate?: number | null }[] = itemsJson ? JSON.parse(itemsJson) : []

        const totalHT = items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
        const totalTVA = items.reduce((sum, item) => {
            const lineHT = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
            const rate = item.tva_rate != null ? Number(item.tva_rate) : 20
            return sum + lineHT * (rate / 100)
        }, 0)
        const totalTTC = totalHT + totalTVA

        const { error: poError } = await supabase
            .from('purchase_orders')
            .update({
                client_id: clientId,
                number: number,
                date: date,
                status: status,
                total_ht: totalHT,
                total_ttc: totalTTC
            })
            .eq('id', id)
            .eq('workspace_id', workspaceId) // IDOR guard

        if (poError) return { error: poError.message }

        await supabase.from('purchase_order_items').delete().eq('purchase_order_id', id)

        if (items.length > 0) {
            await supabase.from('purchase_order_items').insert(
                items.map((item) => ({
                    purchase_order_id: id,
                    description: item.description,
                    unit: item.unit || null,
                    quantity: Number(item.quantity) || 0,
                    unit_price: Number(item.unit_price) || 0,
                    total: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
                }))
            )
        }

        revalidatePath(`/purchase-orders/${id}`)
        revalidatePath('/purchase-orders')
        redirect(`/purchase-orders/${id}`)
    })
}
