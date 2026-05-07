import { createClient } from '@/utils/supabase/server'

type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>

export async function generateNextNumber(
    supabase: AppSupabaseClient,
    table: string,
    column: string,
    prefix: string,
): Promise<string> {
    const year = new Date().getFullYear()
    const { data } = await supabase
        .from(table)
        .select(column)
        .ilike(column, `${prefix}-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    let nextIndex = 1
    if (data?.[column as keyof typeof data]) {
        const parts = (data[column as keyof typeof data] as string).split('-')
        const lastNum = parseInt(parts[parts.length - 1])
        if (!isNaN(lastNum)) nextIndex = lastNum + 1
    }
    return `${prefix}-${year}-${nextIndex.toString().padStart(4, '0')}`
}
