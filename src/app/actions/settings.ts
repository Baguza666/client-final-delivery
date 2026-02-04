'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// --- HELPER: Create Supabase Client ---
async function createClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { }
                }
            }
        }
    )
}

// --- 1. GENERAL SETTINGS (Updated with New Fields) ---
export async function updateSettings(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Non connecté" };

    // 1. Extract IDs and Basic Info
    const workspaceId = formData.get('workspace_id') as string;

    // 2. Extract All Fields (Old + New)
    const name = formData.get('name') as string;
    const email = formData.get('email') as string; // ✅ Primary Email
    const email_secondary = formData.get('email_secondary') as string; // ✅ Secondary Email
    const phone = formData.get('phone') as string; // ✅ Phone
    const address = formData.get('address') as string;
    const city = formData.get('city') as string;
    const country = formData.get('country') as string;

    // Legal & Banking
    const tax_id = formData.get('tax_id') as string; // IF
    const ice = formData.get('ice') as string; // ✅ ICE
    const rc = formData.get('rc') as string; // ✅ RC
    const bank_name = formData.get('bank_name') as string; // ✅ Bank
    const rib = formData.get('rib') as string; // ✅ RIB

    // 3. Handle Logo Upload (Your existing logic)
    const logoFile = formData.get('logo') as File;
    let logoUrl = formData.get('current_logo_url') as string;

    if (logoFile && logoFile.size > 0) {
        const fileName = `${workspaceId}-${Date.now()}`;
        const { error: uploadError } = await supabase.storage
            .from('logos') // Make sure this bucket exists in Supabase Storage
            .upload(fileName, logoFile, { upsert: true });

        if (uploadError) {
            console.error('Upload Error:', uploadError);
            return { error: "Erreur lors de l'upload du logo" };
        } else {
            const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
            logoUrl = data.publicUrl;
        }
    }

    // 4. Update Database
    const { error } = await supabase
        .from('workspaces')
        .update({
            name,
            email,
            email_secondary,
            phone,
            address,
            city,
            country,
            tax_id,
            ice,
            rc,
            bank_name,
            rib,
            logo_url: logoUrl,
            updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId)
        .eq('owner_id', user.id); // Security check

    // ✅ FIX: Return the error so the frontend can display it
    if (error) {
        console.error('Database Error:', error);
        return { error: error.message };
    }

    // Success
    revalidatePath('/settings');
    revalidatePath('/dashboard');
    revalidatePath('/invoices/new');

    return { success: true };
}

// --- 2. EMAIL / SMTP SETTINGS ---
export async function saveEmailSettings(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: "Non connecté" };

    // Find the workspace for this user
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();

    if (!workspace) return { success: false, message: "Aucun espace de travail trouvé" };

    // Prepare Settings Data
    const settings = {
        workspace_id: workspace.id,
        smtp_host: formData.get('smtp_host'),
        smtp_port: formData.get('smtp_port'),
        smtp_email: formData.get('smtp_email'),
        smtp_password: formData.get('smtp_password'),
        email_sender_name: formData.get('sender_name'),
        updated_at: new Date().toISOString()
    };

    // Upsert (Insert or Update) into the separate settings table
    const { error } = await supabase
        .from('workspace_settings')
        .upsert(settings, { onConflict: 'workspace_id' });

    if (error) return { success: false, message: "Erreur sauvegarde: " + error.message };

    revalidatePath('/settings');
    return { success: true, message: "Configuration email sauvegardée !" };
}