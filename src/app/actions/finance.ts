'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// 1. UPLOAD RECEIPT & ADD EXPENSE
export async function addExpense(formData: FormData) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const amount = formData.get('amount');
    const description = formData.get('description');
    const category = formData.get('category');
    const receiptFile = formData.get('receipt') as File;
    const workspaceId = formData.get('workspace_id');

    let receiptUrl = null;

    // Handle Image Upload
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

    // Insert Expense
    const { error } = await supabase.from('expenses').insert({
        workspace_id: workspaceId,
        amount: amount,
        description: description,
        category: category,
        receipt_url: receiptUrl,
        date: new Date().toISOString()
    });

    if (error) console.error(error);

    revalidatePath('/dashboard');
    revalidatePath('/expenses');
}

// 2. PAY DEBT (The Synchronization Logic)
export async function payDebtInstallment(debtId: string, amount: number, creditorName: string, workspaceId: string) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    // A. Decrease Debt
    // We fetch first to calculate the new remaining amount
    const { data: debt } = await supabase.from('debts').select('remaining_amount').eq('id', debtId).single();

    if (!debt) return;

    const newRemaining = Number(debt.remaining_amount) - Number(amount);
    const status = newRemaining <= 0 ? 'Paid' : 'Active';

    await supabase.from('debts').update({
        remaining_amount: newRemaining,
        status: status
    }).eq('id', debtId);

    // B. AUTOMATICALLY ADD TO EXPENSES
    // This ensures your Treasury Chart updates instantly
    await supabase.from('expenses').insert({
        workspace_id: workspaceId,
        amount: amount,
        category: 'Dette',
        description: `Remboursement: ${creditorName}`,
        date: new Date().toISOString()
    });

    revalidatePath('/dashboard');
    revalidatePath('/expenses');
}

// 3. CREATE NEW DEBT
export async function createDebt(formData: FormData) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const creditor = formData.get('creditor') as string;
    const totalAmount = Number(formData.get('total_amount'));
    const monthlyPayment = Number(formData.get('monthly_payment'));
    const dueDate = formData.get('due_date') as string;
    const workspaceId = formData.get('workspace_id') as string;

    const { error } = await supabase.from('debts').insert({
        workspace_id: workspaceId,
        creditor_name: creditor,
        total_amount: totalAmount,
        remaining_amount: totalAmount, // Starts equal to total
        monthly_payment: monthlyPayment,
        due_date: dueDate,
        status: 'Active'
    });

    if (error) console.error('Error creating debt:', error);

    revalidatePath('/dashboard');
    revalidatePath('/expenses');
}