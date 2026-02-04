'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Explicitly define the return type for TypeScript
type ActionResponse =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createQuote(formData: FormData): Promise<ActionResponse> {
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

  // Authenticate the user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'User not authenticated' }
  }

  // Get the workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!workspace) return { success: false, error: 'Workspace not found' }

  try {
    const clientId = formData.get('client_id') as string
    const date = formData.get('date') as string
    const items = JSON.parse(formData.get('items') as string)

    // Generate Devis Number
    const { count } = await supabase.from('quotes').select('*', { count: 'exact', head: true })
    const number = `DEV-${new Date().getFullYear()}-${(count || 0) + 1}`

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        workspace_id: workspace.id,
        client_id: clientId,
        number,
        date,
        status: 'draft',
        total: items.reduce((acc: number, item: any) => acc + (item.total || 0), 0)
      })
      .select()
      .single()

    if (quoteError) throw quoteError

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
    return { success: true, id: quote.id }
  } catch (err: any) {
    return { success: false, error: err.message || 'Server error' }
  }
}