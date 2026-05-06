'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getOrCreateWorkspace } from '@/lib/workspace'

async function getSupabase() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(c) {
                    try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { }
                },
            },
        },
    )
}

export interface ProductActionResult {
    success: boolean
    message?: string
    id?: string
}

export async function createProduct(formData: FormData): Promise<ProductActionResult> {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Vous devez être connecté.' }

    const name = (formData.get('name') as string)?.trim()
    if (!name) return { success: false, message: 'Le nom est requis.' }

    const price = parseFloat(formData.get('price') as string)
    if (isNaN(price) || price < 0) return { success: false, message: 'Prix invalide.' }

    let workspaceId: string
    try {
        workspaceId = await getOrCreateWorkspace(supabase, user.id)
    } catch (e: any) {
        return { success: false, message: e.message }
    }

    const baseCurrency = ((formData.get('base_currency') as string) || 'MAD').toUpperCase()

    const { data, error } = await supabase.from('products').insert({
        workspace_id: workspaceId,
        name,
        price,
        unit: (formData.get('unit') as string) || 'Unité',
        description: ((formData.get('description') as string) || '').trim() || null,
        base_currency: baseCurrency,
    }).select().single()

    if (error) {
        if (error.code === '23505') return { success: false, message: 'Un produit avec ce nom existe déjà.' }
        return { success: false, message: `Erreur base de données: ${error.message}` }
    }

    revalidatePath('/products')
    return { success: true, id: data.id }
}

export async function updateProduct(id: string, formData: FormData): Promise<ProductActionResult> {
    const supabase = await getSupabase()
    if (!id) return { success: false, message: 'ID manquant.' }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Non authentifié.' }

    let workspaceId: string
    try { workspaceId = await getOrCreateWorkspace(supabase, user.id) }
    catch (e: any) { return { success: false, message: e.message } }

    const name = (formData.get('name') as string)?.trim()
    if (!name) return { success: false, message: 'Le nom est requis.' }

    const price = parseFloat(formData.get('price') as string)
    if (isNaN(price) || price < 0) return { success: false, message: 'Prix invalide.' }

    const baseCurrency = ((formData.get('base_currency') as string) || 'MAD').toUpperCase()

    const { error } = await supabase.from('products').update({
        name,
        price,
        unit: (formData.get('unit') as string) || 'Unité',
        description: ((formData.get('description') as string) || '').trim() || null,
        base_currency: baseCurrency,
    }).eq('id', id).eq('workspace_id', workspaceId)

    if (error) return { success: false, message: `Erreur base de données: ${error.message}` }

    revalidatePath('/products')
    return { success: true }
}

export async function deleteProduct(id: string): Promise<ProductActionResult> {
    const supabase = await getSupabase()
    if (!id) return { success: false, message: 'ID manquant.' }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Non authentifié.' }

    let workspaceId: string
    try { workspaceId = await getOrCreateWorkspace(supabase, user.id) }
    catch (e: any) { return { success: false, message: e.message } }

    const { error } = await supabase.from('products').delete().eq('id', id).eq('workspace_id', workspaceId)

    if (error) {
        if (error.code === '23503') return { success: false, message: 'Ce produit est utilisé dans des documents existants.' }
        return { success: false, message: `Erreur base de données: ${error.message}` }
    }

    revalidatePath('/products')
    return { success: true }
}
