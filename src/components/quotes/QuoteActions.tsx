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
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { }
        },
      },
    }
  )

  // 1. ATTEMPT AUTH
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user ? user.id : 'demo-user-id'

  if (!user) {
    console.log("No authenticated user found. Using Demo ID:", userId)
  }

  // 2. Fetch Workspace
  let workspaceId = null
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .single()

  if (workspace) {
    workspaceId = workspace.id
  } else {
    const { data: anyWs } = await supabase.from('workspaces').select('id').limit(1).single()
    workspaceId = anyWs?.id
  }

  if (!workspaceId) return { success: true, id: 'demo-mode-no-db' }

  try {
    const items = JSON.parse(formData.get('items') as string)

    // 3. Generate Quote Number
    const { count } = await supabase.from('quotes').select('*', { count: 'exact', head: true })
    const number = `DEV-${new Date().getFullYear()}-${(count || 0) + 1}`

    // 4. Insert Quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        workspace_id: workspaceId,
        client_id: formData.get('client_id'),
        number,
        date: formData.get('date'),
        status: 'draft',
        subtotal: Number(formData.get('subtotal')),
        discount_rate: Number(formData.get('discount_rate')),
        tax_rate: 20,
        total: Number(formData.get('total_ttc'))
      })
      .select()
      .single()

    if (quoteError) throw quoteError

    // 5. Insert Items
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

// ✅ NEW: Update an existing quote
export async function updateQuote(quoteId: string, formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch { }
        },
      },
    }
  )

  try {
    const items = JSON.parse(formData.get('items') as string)

    // 1. Update the main quote record
    const { error: quoteError } = await supabase
      .from('quotes')
      .update({
        client_id: formData.get('client_id'),
        date: formData.get('date'),
        subtotal: Number(formData.get('subtotal')),
        discount_rate: Number(formData.get('discount_rate')),
        total: Number(formData.get('total_ttc')),
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)

    if (quoteError) throw quoteError

    // 2. Delete existing items
    const { error: deleteError } = await supabase
      .from('quote_items')
      .delete()
      .eq('quote_id', quoteId)

    if (deleteError) throw deleteError

    // 3. Insert new items
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