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
        get: (name) => cookieStore.get(name)?.value,
      },
    }
  )

  // 1. Authenticate the user session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { success: false, error: 'User not authenticated' }
  }

  const user = session.user

  // 2. Fetch the workspace associated with the user
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!workspace) return { success: false, error: 'Espace de travail introuvable.' }

  try {
    const items = JSON.parse(formData.get('items') as string)
    const subtotal = Number(formData.get('subtotal'))
    const discount_rate = Number(formData.get('discount_rate'))
    const tax_rate = 20 // Fixed at 20%
    const total_ttc = Number(formData.get('total_ttc'))

    // 3. Generate Quote Number (DEV-YEAR-COUNT)
    const { count } = await supabase.from('quotes').select('*', { count: 'exact', head: true })
    const number = `DEV-${new Date().getFullYear()}-${(count || 0) + 1}`

    // 4. Insert Quote into database
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        workspace_id: workspace.id,
        client_id: formData.get('client_id'),
        number,
        date: formData.get('date'),
        valid_until: formData.get('valid_until'),
        status: 'draft',
        subtotal: subtotal,
        discount_rate: discount_rate,
        tax_rate: tax_rate,
        total: total_ttc
      })
      .select()
      .single()

    if (quoteError) throw quoteError

    // 5. Insert individual items
    const { error: itemsError } = await supabase.from('quote_items').insert(
      items.map((item: any) => ({
        quote_id: quote.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        unit: item.unit || 'U'
      }))
    )

    if (itemsError) throw itemsError

    revalidatePath('/quotes')
    return { success: true, id: quote.id as string }

  } catch (err: any) {
    console.error("Database Error:", err)
    return { success: false, error: err.message }
  }
}