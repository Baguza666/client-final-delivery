'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function updateWorkspace(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    )

    // 1. Get current workspace (or create one if missing)
    let { data: workspace } = await supabase.from('workspaces').select('id').single()

    // If no workspace exists, create a dummy one to update
    if (!workspace) {
        const { data: newWs } = await supabase.from('workspaces').insert({}).select().single()
        workspace = newWs
    }

    // 🔴 THE FIX: TypeScript safety check
    // If for some reason it's STILL null, stop here.
    if (!workspace) {
        console.error('Critical: No workspace found or created.')
        return { error: 'Impossible de trouver ou créer un espace de travail.' }
    }

    // 2. Prepare data object
    const updates = {
        name: formData.get('name') as string,
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        country: formData.get('country') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        website: formData.get('website') as string,
        ice: formData.get('ice') as string,
        rc: formData.get('rc') as string,
        tax_id: formData.get('tax_id') as string, // "IF"
        cnss: formData.get('cnss') as string,
        tp: formData.get('tp') as string, // "Taxe Professionnelle"
        bank_name: formData.get('bank_name') as string,
        rib: formData.get('rib') as string,
        updated_at: new Date().toISOString(),
    }

    // 3. Update Database
    const { error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspace.id) // ✅ Error gone because we checked !workspace above

    if (error) {
        console.error('Error updating settings:', error)
        return { error: 'Failed to update settings' }
    }

    // 4. FORCE REFRESH
    revalidatePath('/settings')
    revalidatePath('/', 'layout')
    return { success: true }
}