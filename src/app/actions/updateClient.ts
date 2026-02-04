'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function updateClient(formData: FormData) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Non autorisé' };

    const clientId = formData.get('id') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const ice = formData.get('ice') as string;

    const { error } = await supabase
        .from('clients')
        .update({ name, email, phone, address, ice })
        .eq('id', clientId)
        .eq('owner_id', user.id); // Security: ensure you own this client

    if (error) {
        return { success: false, message: error.message };
    }

    revalidatePath('/clients');
    return { success: true, message: 'Client mis à jour avec succès' };
}