'use server';

import nodemailer from 'nodemailer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function sendEmail({
    to,
    cc, // <--- NEW: Accept a CC address
    subject,
    html
}: {
    to: string,
    cc?: string, // <--- NEW: Optional string
    subject: string,
    html: string
}) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    // 1. Get Logged In User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Non authentifié' };

    // 2. Fetch User's SMTP Settings
    const { data: config } = await supabase
        .from('email_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!config) {
        return { success: false, message: 'Configuration email manquante.' };
    }

    // 3. Configure Transporter
    const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_port === 465,
        auth: {
            user: config.smtp_user,
            pass: config.smtp_password,
        },
    });

    // 4. Send Email
    try {
        await transporter.sendMail({
            from: `"${config.sender_name || 'IMSAL Services'}" <${config.smtp_user}>`,
            to: to,
            cc: cc, // <--- NEW: Send the CC here
            subject: subject,
            html: html,
        });
        return { success: true, message: 'Email envoyé avec succès !' };
    } catch (error: any) {
        console.error('SMTP Error:', error);
        return { success: false, message: `Erreur d'envoi: ${error.message}` };
    }
}