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
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch { }
        },
      },
    }
  )

  // 1. Force Check User
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Session expirée. Veuillez rafraîchir la page.' }
  }

  // 2. Get Workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!workspace) return { success: false, error: 'Espace de travail introuvable.' }

  try {
    const items = JSON.parse(formData.get('items') as string)

    // 3. Generate Number
    const { count } = await supabase.from('quotes').select('*', { count: 'exact', head: true })
    const number = `DEV-${new Date().getFullYear()}-${(count || 0) + 1}`

    // 4. Insert Quote
    const { data: quote, error: quoteError } = await supabase.from('quotes').insert({
      workspace_id: workspace.id,
      client_id: formData.get('client_id'),
      number,
      date: formData.get('date'),
      status: 'draft',
      subtotal: Number(formData.get('subtotal')),
      discount_rate: Number(formData.get('discount_rate')),
      tax_rate: 20,
      total: Number(formData.get('total_ttc'))
    }).select().single()

    if (quoteError) throw quoteError

    // 5. Insert Items (NO UNIT FIELD)
    const { error: itemsError } = await supabase.from('quote_items').insert(
      items.map((item: any) => ({
        quote_id: quote.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
      }))
    )

    if (itemsError) throw itemsError

    revalidatePath('/quotes')
    return { success: true, id: quote.id as string }

  } catch (err: any) {
    return { success: false, error: err.message }
  }
}