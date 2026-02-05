'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface QuoteResult {
  success: boolean
  id?: string
  error?: string
}

export async function createQuote(formData: FormData): Promise<QuoteResult> {
  const supabase = await createClient()

  // ✅ SECURE: Use getUser() instead of getSession() for server-side auth
  // getUser() validates the token with Supabase Auth server
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error('Auth Error:', authError?.message ?? 'No user found')
    return {
      success: false,
      error: 'Session expirée. Veuillez vous reconnecter.'
    }
  }

  // Fetch user's workspace
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (workspaceError || !workspace) {
    console.error('Workspace Error:', workspaceError?.message)
    return { success: false, error: 'Espace de travail introuvable.' }
  }

  try {
    // Parse form data
    const clientId = formData.get('client_id') as string
    const date = formData.get('date') as string
    const subtotal = parseFloat(formData.get('subtotal') as string)
    const discountRate = parseFloat(formData.get('discount_rate') as string)
    const netHT = parseFloat(formData.get('net_ht') as string)
    const totalTTC = parseFloat(formData.get('total_ttc') as string)
    const items = JSON.parse(formData.get('items') as string)

    // Generate quote number: DEV-YYYY-COUNT
    const { count } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)

    const year = new Date().getFullYear()
    const number = `DEV-${year}-${(count ?? 0) + 1}`

    // Insert quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        workspace_id: workspace.id,
        client_id: clientId,
        number,
        date,
        status: 'draft',
        subtotal,
        discount_rate: discountRate,
        net_ht: netHT,
        tax_rate: 20,
        total: totalTTC,
      })
      .select('id')
      .single()

    if (quoteError) {
      console.error('Quote Insert Error:', quoteError.message)
      throw new Error(quoteError.message)
    }

    // Insert quote items (NO UNIT COLUMN)
    const quoteItems = items.map((item: {
      description: string
      quantity: number
      unit_price: number
      total: number
    }) => ({
      quote_id: quote.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
    }))

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(quoteItems)

    if (itemsError) {
      console.error('Quote Items Insert Error:', itemsError.message)
      throw new Error(itemsError.message)
    }

    revalidatePath('/quotes')
    return { success: true, id: quote.id }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return { success: false, error: `Erreur DB: ${message}` }
  }
}