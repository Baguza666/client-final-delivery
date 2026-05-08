'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const COMING_SOON: { error: string } = {
    error: 'Les invitations d\'équipe arrivent au Q3 2026. Cette fonctionnalité est temporairement désactivée.',
}

export async function updateUserRole(userId: string, newRole: string) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    // 1. Verify the requester is an ADMIN
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (currentUserProfile?.role !== 'admin') {
        return { error: 'Forbidden: You must be an admin.' };
    }

    // 2. Update the target user's role
    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

    if (error) {
        console.error(error);
        return { error: 'Failed to update role' };
    }

    revalidatePath('/settings');
    return { success: true };
}

// Multi-user invitations are deferred to Q3 2026. The implementations below
// remain in git history; the function bodies are stubbed to return a structured
// "coming soon" error so existing callers fail gracefully.

export async function inviteTeamMember(_email: string, _role: string) {
    return COMING_SOON
}

export async function revokeInvitation(_id: string) {
    return COMING_SOON
}