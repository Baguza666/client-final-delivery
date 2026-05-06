'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getOrCreateWorkspace } from '@/lib/workspace'

async function createSupabaseClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } }
            }
        }
    )
}

async function generateNextNumber(supabase: any, table: string, column: string, prefix: string) {
    const year = new Date().getFullYear()
    const { data } = await supabase.from(table).select(column).ilike(column, `${prefix}-${year}-%`).order('created_at', { ascending: false }).limit(1).single()
    let nextIndex = 1
    if (data?.[column]) {
        const parts = (data[column] as string).split('-')
        const lastNum = parseInt(parts[parts.length - 1])
        if (!isNaN(lastNum)) nextIndex = lastNum + 1
    }
    return `${prefix}-${year}-${nextIndex.toString().padStart(4, '0')}`
}

export async function createPurchaseOrder(formData: FormData) {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }

    const clientId = formData.get('client_id')
    const rawDate = formData.get('date') as string | null
    const date = rawDate?.trim() || new Date().toISOString().split('T')[0]
    const notes = (formData.get('notes') as string | null)?.trim() || null

    const itemsJson = formData.get('items') as string
    const items: any[] = itemsJson ? JSON.parse(itemsJson) : []

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
}

export async function updatePurchaseOrder(id: string, formData: FormData) {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null)
    if (!workspaceId) return { error: 'Espace de travail introuvable.' }

    const clientId = formData.get('client_id')
    const number = formData.get('number') as string
    const date = formData.get('date')
    const status = formData.get('status')

    const itemsJson = formData.get('items') as string
    const items = itemsJson ? JSON.parse(itemsJson) : []

    const totalHT = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0)
    const totalTVA = items.reduce((sum: number, item: any) => {
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
            items.map((item: any) => ({
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
}
