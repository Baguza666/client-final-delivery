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

    const name = formData.get('name') as string

    // Removed 'website' to prevent DB crash
    const updates: any = {
        name: name,
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        country: formData.get('country') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        ice: formData.get('ice') as string,
        rc: formData.get('rc') as string,
        tax_id: formData.get('tax_id') as string,
        cnss: formData.get('cnss') as string,
        tp: formData.get('tp') as string,
        bank_name: formData.get('bank_name') as string,
        rib: formData.get('rib') as string,
        updated_at: new Date().toISOString(),
    }

    try {
        const { data: existingWs } = await supabase.from('workspaces').select('id').single()

        if (existingWs) {
            await supabase.from('workspaces').update(updates).eq('id', existingWs.id)
        } else {
            await supabase.from('workspaces').insert([updates])
        }

        // Success path
        revalidatePath('/settings')
        revalidatePath('/', 'layout')
        return { success: true }

    } catch (err: any) {
        console.error("DB Update failed:", err)
        // ✅ FIX: Return error so TypeScript is happy
        return { success: false, error: err.message || 'Erreur inconnue' }
    }
}