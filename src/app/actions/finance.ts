'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getOrCreateWorkspace } from '@/lib/workspace';

async function createClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );
}

// 1. UPLOAD RECEIPT & ADD EXPENSE
export async function addExpense(formData: FormData): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Auth — workspace_id is always derived from the session, never from the caller
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié.' };

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null);
    if (!workspaceId) return { success: false, error: 'Espace de travail introuvable.' };

    const amount = formData.get('amount');
    const description = formData.get('description');
    const category = formData.get('category');
    const receiptFile = formData.get('receipt') as File;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return { success: false, error: 'Montant invalide.' };
    }

    let receiptUrl = null;

    if (receiptFile && receiptFile.size > 0) {
        const fileName = `${Date.now()}-${receiptFile.name}`;
        const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(fileName, receiptFile);
        if (!uploadError) {
            const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
            receiptUrl = data.publicUrl;
        }
    }

    const { error } = await supabase.from('expenses').insert({
        workspace_id: workspaceId, // Always from session
        amount: Number(amount),
        description: description,
        category: category,
        receipt_url: receiptUrl,
        date: new Date().toISOString()
    });

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard');
    revalidatePath('/expenses');
    return { success: true };
}

// 2. PAY DEBT INSTALLMENT
export async function payDebtInstallment(debtId: string, amount: number, creditorName: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié.' };

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null);
    if (!workspaceId) return { success: false, error: 'Espace de travail introuvable.' };

    // Fetch and verify the debt belongs to the authenticated user's workspace
    const { data: debt, error: fetchError } = await supabase
        .from('debts')
        .select('remaining_amount')
        .eq('id', debtId)
        .eq('workspace_id', workspaceId) // IDOR guard
        .single();

    if (fetchError || !debt) return { success: false, error: 'Dette introuvable.' };

    const newRemaining = Math.max(0, Number(debt.remaining_amount) - Number(amount));
    const status = newRemaining <= 0 ? 'Paid' : 'Active';

    const { error: updateError } = await supabase
        .from('debts')
        .update({ remaining_amount: newRemaining, status })
        .eq('id', debtId)
        .eq('workspace_id', workspaceId);

    if (updateError) return { success: false, error: updateError.message };

    const { error: expenseError } = await supabase.from('expenses').insert({
        workspace_id: workspaceId,
        amount: amount,
        category: 'Dette',
        description: `Remboursement: ${creditorName}`,
        date: new Date().toISOString()
    });

    if (expenseError) return { success: false, error: `Paiement enregistré mais dépense non créée: ${expenseError.message}` };

    revalidatePath('/dashboard');
    revalidatePath('/expenses');
    return { success: true };
}

// 3. CREATE NEW DEBT
export async function createDebt(formData: FormData): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié.' };

    const workspaceId = await getOrCreateWorkspace(supabase, user.id).catch(() => null);
    if (!workspaceId) return { success: false, error: 'Espace de travail introuvable.' };

    const creditor = (formData.get('creditor') as string)?.trim();
    if (!creditor) return { success: false, error: 'Le nom du créancier est requis.' };

    const totalAmount = Number(formData.get('total_amount'));
    if (isNaN(totalAmount) || totalAmount <= 0) return { success: false, error: 'Montant total invalide.' };

    const monthlyPayment = Number(formData.get('monthly_payment'));
    if (isNaN(monthlyPayment) || monthlyPayment <= 0) return { success: false, error: 'Mensualité invalide.' };

    const dueDate = formData.get('due_date') as string;

    const { error } = await supabase.from('debts').insert({
        workspace_id: workspaceId, // Always from session
        creditor_name: creditor,
        total_amount: totalAmount,
        remaining_amount: totalAmount,
        monthly_payment: monthlyPayment,
        due_date: dueDate,
        status: 'Active'
    });

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard');
    revalidatePath('/expenses');
    return { success: true };
}
