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

  // 1. Triple-check Session for production reliability
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  const finalUser = user || session?.user

  if (!finalUser) {
    return { success: false, error: 'Session introuvable sur le serveur. Veuillez vous reconnecter.' }
  }

  // 2. Retrieve Workspace linked to user
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', finalUser.id)
    .single()

  if (!workspace) return { success: false, error: 'Espace de travail introuvable.' }

  try {
    const items = JSON.parse(formData.get('items') as string)

    // 3. Generate Devis Number (DEV-YEAR-COUNT)
    const { count } = await supabase.from('quotes').select('*', { count: 'exact', head: true })
    const number = `DEV-${new Date().getFullYear()}-${(count || 0) + 1}`

    // 4. Database Insert including all PDF fields 
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        workspace_id: workspace.id,
        client_id: formData.get('client_id'),
        number,
        date: formData.get('date'),
        valid_until: formData.get('valid_until'),
        status: 'draft',
        subtotal: Number(formData.get('subtotal')),
        discount_rate: Number(formData.get('discount_rate')),
        tax_rate: 20, // 20% TVA 
        total: Number(formData.get('total_ttc'))
      })
      .select()
      .single()

    if (quoteError) throw quoteError

    // 5. Insert Quote Items
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
    return { success: false, error: `Erreur base de données: ${err.message}` }
  }
}