'use server';

import nodemailer from 'nodemailer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getOrCreateWorkspace } from '@/lib/workspace';

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/

function isValidEmail(addr: string): boolean {
    return EMAIL_RE.test(addr.trim())
}

export async function sendEmail({
    to,
    cc,
    subject,
    html,
    attachments,
    senderName,
}: {
    to: string,
    cc?: string,
    subject: string,
    html: string,
    attachments?: Array<{ filename: string; content: Buffer }>,
    senderName?: string,
}) {
    // Validate addresses to prevent SMTP header injection
    if (!isValidEmail(to)) return { success: false, message: 'Adresse email destinataire invalide.' }
    if (cc && !isValidEmail(cc)) return { success: false, message: 'Adresse CC invalide.' }
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    // 1. Get Logged In User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Non authentifié' };

    // 2. Find (or auto-create) workspace
    let wsId: string;
    try {
        wsId = await getOrCreateWorkspace(supabase, user.id);
    } catch (e: any) {
        return { success: false, message: e.message };
    }

    // 3. Fetch SMTP settings from workspace_settings
    const { data: config } = await supabase
        .from('workspace_settings')
        .select('*')
        .eq('workspace_id', wsId)
        .single();

    // 4a. SMTP path
    if (config?.smtp_email) {
        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: Number(config.smtp_port),
            secure: Number(config.smtp_port) === 465,
            auth: {
                user: config.smtp_email,
                pass: config.smtp_password,
            },
        });

        try {
            await transporter.sendMail({
                from: `"${config.email_sender_name || senderName || 'Invoicify'}" <${config.smtp_email}>`,
                to,
                cc,
                subject,
                html,
                attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content })),
            });
            return { success: true, message: 'Email envoyé avec succès !' };
        } catch (error: unknown) {
            console.error('SMTP Error:', error);
            const msg = error instanceof Error ? error.message : 'Erreur inconnue'
            return { success: false, message: `Erreur d'envoi SMTP: ${msg}` };
        }
    }

    // 4b. Resend fallback (credentials stored per-workspace in DB)
    const resendKey = config?.resend_api_key
    if (resendKey) {
        const { Resend } = await import('resend')
        const resend = new Resend(resendKey)
        const displayName = config?.email_sender_name || senderName || 'Invoicify'
        const fromAddr = config?.resend_from_email
            ? `${displayName} <${config.resend_from_email}>`
            : 'Invoicify <onboarding@resend.dev>'

        const { error: sendError } = await resend.emails.send({
            from: fromAddr,
            to,
            subject,
            html,
            attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content })),
        })

        if (sendError) {
            console.error('Resend error:', sendError)
            const msg = (sendError as { message?: string }).message ?? "Erreur lors de l'envoi."
            return { success: false, message: msg }
        }
        return { success: true, message: 'Email envoyé avec succès !' }
    }

    return {
        success: false,
        message: 'Aucune configuration email trouvée. Veuillez configurer vos paramètres SMTP dans Paramètres.',
    }
}