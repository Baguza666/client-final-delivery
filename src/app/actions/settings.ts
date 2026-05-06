'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getOrCreateWorkspace } from '@/lib/workspace';
import { z } from 'zod';

function isAllowedStorageUrl(url: string | null): boolean {
    if (!url) return true;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return typeof base === 'string' && url.startsWith(`${base}/storage/v1/object/public/`);
}

const optionalEmail = (msg: string) =>
    z.union([z.string().email(msg), z.literal('')]).optional().default('');

const EmailSettingsSchema = z.object({
    smtp_host:         z.string().max(253).optional().default(''),
    smtp_port:         z.coerce.number().int().min(1).max(65535).optional(),
    smtp_email:        optionalEmail('Adresse email SMTP invalide'),
    smtp_password:     z.string().max(200).optional().default(''),
    sender_name:       z.string().max(100).optional().default('Invoicify'),
    resend_api_key:    z.string().max(500).optional().default(''),
    resend_from_email: optionalEmail('Adresse email Resend invalide'),
});

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

    // Derive workspaceId from session — never trust the caller-provided value
    let workspaceId: string;
    try {
        workspaceId = await getOrCreateWorkspace(supabase, user.id);
    } catch (e: any) {
        return { error: e.message };
    }

    // Fetch existing trusted URLs from DB — never read these from formData
    const { data: existing } = await supabase
        .from('workspaces')
        .select('logo_url, signature_url')
        .eq('id', workspaceId)
        .eq('owner_id', user.id)
        .single();

    // 2. Extract All Fields (Old + New)
    const name = formData.get('name') as string;
    const email = formData.get('email') as string; // ✅ Primary Email
    const email_secondary = formData.get('email_secondary') as string; // ✅ Secondary Email
    const phone = formData.get('phone') as string; // ✅ Phone
    const address = formData.get('address') as string;
    const city = formData.get('city') as string;
    const country = formData.get('country') as string;

    const document_template = formData.get('document_template') as string;
    const brand_color       = formData.get('brand_color') as string || '#2563EB';

    // Legal & Banking
    const tax_id = formData.get('tax_id') as string;
    const ice = formData.get('ice') as string;
    const rc = formData.get('rc') as string;
    const cnss = formData.get('cnss') as string;
    const tp = formData.get('tp') as string;
    const bank_name = formData.get('bank_name') as string;
    const rib = formData.get('rib') as string;

    // 3. Handle Logo Upload
    const logoFile = formData.get('logo') as File;
    let logoUrl: string | null = existing?.logo_url ?? null;

    if (logoFile && logoFile.size > 0) {
        const fileName = `${workspaceId}-${Date.now()}`;
        const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(fileName, logoFile, { upsert: true });

        if (uploadError) {
            console.error('Upload Error:', uploadError);
            return { error: "Erreur lors de l'upload du logo" };
        } else {
            const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
            if (!isAllowedStorageUrl(data.publicUrl)) {
                return { error: "URL du logo invalide" };
            }
            logoUrl = data.publicUrl;
        }
    }

    // 4. Handle Signature Upload
    const sigFile = formData.get('signature') as File;
    let signatureUrl: string | null = existing?.signature_url ?? null;

    if (sigFile && sigFile.size > 0) {
        const sigFileName = `${workspaceId}-sig-${Date.now()}`;
        const { error: sigUploadError } = await supabase.storage
            .from('signatures')
            .upload(sigFileName, sigFile, { upsert: true });

        if (sigUploadError) {
            console.error('Signature Upload Error:', sigUploadError);
            return { error: "Erreur lors de l'upload de la signature" };
        } else {
            const { data } = supabase.storage.from('signatures').getPublicUrl(sigFileName);
            if (!isAllowedStorageUrl(data.publicUrl)) {
                return { error: "URL de la signature invalide" };
            }
            signatureUrl = data.publicUrl;
        }
    }

    // 5. Update Database
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
            cnss,
            tp,
            bank_name,
            rib,
            logo_url: logoUrl,
            signature_url: signatureUrl,
            document_template,
            brand_color,
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

    // Find (or auto-create) the workspace for this user
    let workspaceId: string;
    try {
        workspaceId = await getOrCreateWorkspace(supabase, user.id);
    } catch (e: any) {
        return { success: false, message: e.message };
    }

    const parsed = EmailSettingsSchema.safeParse({
        smtp_host:         formData.get('smtp_host'),
        smtp_port:         formData.get('smtp_port'),
        smtp_email:        formData.get('smtp_email'),
        smtp_password:     formData.get('smtp_password'),
        sender_name:       formData.get('sender_name'),
        resend_api_key:    formData.get('resend_api_key'),
        resend_from_email: formData.get('resend_from_email'),
    });
    if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

    const settings = {
        workspace_id:      workspaceId,
        smtp_host:         parsed.data.smtp_host || null,
        smtp_port:         parsed.data.smtp_port ?? null,
        smtp_email:        parsed.data.smtp_email || null,
        smtp_password:     parsed.data.smtp_password || null,
        email_sender_name: parsed.data.sender_name,
        resend_api_key:    parsed.data.resend_api_key || null,
        resend_from_email: parsed.data.resend_from_email || null,
        updated_at:        new Date().toISOString(),
    };

    // Upsert (Insert or Update) into the separate settings table
    const { error } = await supabase
        .from('workspace_settings')
        .upsert(settings, { onConflict: 'workspace_id' });

    if (error) return { success: false, message: "Erreur sauvegarde: " + error.message };

    revalidatePath('/settings');
    return { success: true, message: "Configuration email sauvegardée !" };
}