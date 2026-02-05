'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * FIXED: This action handles the server-side creation of quotes.
 * It now robustly checks for a session to fix the "User not authenticated" error.
 */
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

  // 1. AUTHENTICATION FIX: 
  // We check both getUser() and getSession() to ensure the server sees you.
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()

  const activeUser = user || session?.user

  if (!activeUser) {
    console.error("Auth Failure: No user or session found on server.")
    return { success: false, error: 'Erreur d\'authentification : Session introuvable.' }
  }

  // 2. WORKSPACE FETCH:
  // Every quote must be linked to your company workspace.
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', activeUser.id)
    .single()

  if (!workspace || wsError) {
    return { success: false, error: 'Espace de travail introuvable. Veuillez configurer vos paramètres.' }
  }

  try {
    // 3. DATA PREPARATION:
    // Extracting all fields including Discount and Totals as per your PDF
    const items = JSON.parse(formData.get('items') as string)
    const subtotal = Number(formData.get('subtotal'))
    const discount_rate = Number(formData.get('discount_rate'))
    const total_ttc = Number(formData.get('total_ttc'))
    const client_id = formData.get('client_id')
    const date = formData.get('date')
    const valid_until = formData.get('valid_until')

    // 4. GENERATE QUOTE NUMBER:
    // Automatically creates a format like DEV-2026-1
    const { count } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })

    const number = `DEV-${new Date().getFullYear()}-${(count || 0) + 1}`

    // 5. DATABASE INSERT (MAIN QUOTE):
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        workspace_id: workspace.id,
        client_id: client_id,
        number: number,
        date: date,
        valid_until: valid_until,
        status: 'draft',
        subtotal: subtotal,
        discount_rate: discount_rate,
        tax_rate: 20, // 20% TVA as seen in your document
        total: total_ttc
      })
      .select()
      .single()

    if (quoteError) throw quoteError

    // 6. DATABASE INSERT (QUOTE ITEMS):
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

    // 7. REFRESH AND RETURN:
    revalidatePath('/quotes')
    return { success: true, id: quote.id as string }

  } catch (err: any) {
    console.error("Database Error during quote creation:", err.message)
    return { success: false, error: err.message || 'Une erreur imprévue est survenue.' }
  }
}