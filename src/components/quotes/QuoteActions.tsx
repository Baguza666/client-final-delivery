'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function createQuote(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user ? user.id : 'demo-user-id'

  let workspaceId = null
  const { data: workspace } = await supabase.from('workspaces').select('id').eq('owner_id', userId).single()

  if (workspace) workspaceId = workspace.id
  else {
    const { data: anyWs } = await supabase.from('workspaces').select('id').limit(1).single()
    workspaceId = anyWs?.id
  }

  if (!workspaceId) return { success: true, id: 'demo-mode-no-db' }

  try {
    const items = JSON.parse(formData.get('items') as string)

    // ✅ Check if a custom number was provided, else auto-generate
    let number = formData.get('number') as string
    if (!number || number.trim() === '') {
      const { count } = await supabase.from('quotes').select('*', { count: 'exact', head: true })
      number = `DEV-${new Date().getFullYear()}-${(count || 0) + 1}`
    }

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        workspace_id: workspaceId,
        client_id: formData.get('client_id'),
        number, // ✅ Use custom or generated number
        date: formData.get('date'),
        status: 'draft',
        subtotal: Number(formData.get('subtotal')),
        discount_rate: Number(formData.get('discount_rate')),
        tax_rate: 20,
        notes: formData.get('notes') as string,
        total: Number(formData.get('total_ttc'))
      })
      .select()
      .single()

    if (quoteError) throw quoteError

    const { error: itemsError } = await supabase.from('quote_items').insert(
      items.map((item: any) => ({
        quote_id: quote.id,
        description: item.description,
        unit: item.unit || 'u',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
      }))
    )

    if (itemsError) throw itemsError

    revalidatePath('/quotes')
    return { success: true, id: quote.id as string }

  } catch (err: any) {
    console.error("DB Error:", err)
    return { success: false, error: `Erreur DB: ${err.message}` }
  }
}

export async function updateQuote(quoteId: string, formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { }
        },
      },
    }
  )

  try {
    const items = JSON.parse(formData.get('items') as string)
    const number = formData.get('number') as string // ✅ Extract custom number

    const { error: quoteError } = await supabase
      .from('quotes')
      .update({
        client_id: formData.get('client_id'),
        ...(number ? { number: number } : {}), // ✅ Update number if provided
        date: formData.get('date'),
        subtotal: Number(formData.get('subtotal')),
        discount_rate: Number(formData.get('discount_rate')),
        notes: formData.get('notes') as string,
        total: Number(formData.get('total_ttc')),
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)

    if (quoteError) throw quoteError

    const { error: deleteError } = await supabase.from('quote_items').delete().eq('quote_id', quoteId)
    if (deleteError) throw deleteError

    const { error: insertError } = await supabase.from('quote_items').insert(
      items.map((item: any) => ({
        quote_id: quoteId,
        description: item.description,
        unit: item.unit || 'u',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
      }))
    )

    if (insertError) throw insertError

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${quoteId}`)
    return { success: true, id: quoteId }

  } catch (err: any) {
    console.error("DB Error:", err)
    return { success: false, error: `Erreur DB: ${err.message}` }
  }
}