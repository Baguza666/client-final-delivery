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

    // 1. Get current workspace
    let { data: workspace, error: fetchError } = await supabase.from('workspaces').select('id').single()

    // If it doesn't exist, try to create one
    if (!workspace) {
        console.log("No workspace found, creating one...")
        const { data: newWs, error: createError } = await supabase.from('workspaces').insert({}).select().single()

        if (createError) {
            console.error("Create Error:", createError)
            return { error: "Erreur création: " + createError.message }
        }
        workspace = newWs
    }

    // SAFETY CHECK: If it's still null, we stop.
    if (!workspace) {
        return { error: "Impossible de trouver l'espace de travail." }
    }

    // 2. Prepare data
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
        tax_id: formData.get('tax_id') as string,
        cnss: formData.get('cnss') as string,
        tp: formData.get('tp') as string,
        bank_name: formData.get('bank_name') as string,
        rib: formData.get('rib') as string,
        updated_at: new Date().toISOString(),
    }

    // 3. Update with the ID we found
    const { error: updateError } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspace.id)

    if (updateError) {
        console.error("Update Error:", updateError)
        return { error: "Erreur update: " + updateError.message }
    }

    revalidatePath('/settings')
    revalidatePath('/', 'layout')
    return { success: true }
}