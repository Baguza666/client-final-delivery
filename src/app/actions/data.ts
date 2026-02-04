'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// --- CLIENTS ACTIONS ---

export async function createClient(formData: FormData) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const workspaceId = formData.get('workspace_id') as string;

    const { error } = await supabase.from('clients').insert({
        workspace_id: workspaceId,
        name,
        email,
        phone,
        address
    });

    if (error) console.error('Error creating client:', error);
    revalidatePath('/clients');
}

export async function deleteClient(id: string) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    await supabase.from('clients').delete().eq('id', id);
    revalidatePath('/clients');
}

// --- PRODUCTS ACTIONS ---

export async function createProduct(formData: FormData) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const name = formData.get('name') as string;
    const price = formData.get('price');
    const unit = formData.get('unit') as string;
    const description = formData.get('description') as string;
    const workspaceId = formData.get('workspace_id') as string;

    const { error } = await supabase.from('products').insert({
        workspace_id: workspaceId,
        name,
        price,
        unit,
        description
    });

    if (error) console.error('Error creating product:', error);
    revalidatePath('/products');
}

export async function deleteProduct(id: string) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    await supabase.from('products').delete().eq('id', id);
    revalidatePath('/products');
}