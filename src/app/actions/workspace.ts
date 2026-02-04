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

    // 1. Prepare data (Extracting ALL fields from form)
    const name = formData.get('name') as string
    const logoFile = formData.get('logo') as File

    const updates: any = {
        name: name,
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        country: formData.get('country') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        website: formData.get('website') as string,

        // Legal Info (Footer)
        ice: formData.get('ice') as string,
        rc: formData.get('rc') as string,
        tax_id: formData.get('tax_id') as string, // I.F.
        cnss: formData.get('cnss') as string,
        tp: formData.get('tp') as string,         // Patente

        // Banking
        bank_name: formData.get('bank_name') as string,
        rib: formData.get('rib') as string,

        updated_at: new Date().toISOString(),
    }

    // 2. Handle Logo Upload
    if (logoFile && logoFile.size > 0) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `logo-${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(fileName, logoFile)

        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(fileName)
            updates.logo_url = publicUrl
        }
    }

    // 3. Find or Create Workspace (Fixing the "Null" error)
    const { data: existingWs } = await supabase.from('workspaces').select('id').single()

    if (existingWs) {
        const { error } = await supabase.from('workspaces').update(updates).eq('id', existingWs.id)
        if (error) return { error: "Update failed: " + error.message }
    } else {
        // If creating new, we use the updates object which now GUARANTEES 'name' is present
        const { error } = await supabase.from('workspaces').insert([updates])
        if (error) return { error: "Insert failed: " + error.message }
    }

    revalidatePath('/settings')
    revalidatePath('/', 'layout')
    return { success: true }
}