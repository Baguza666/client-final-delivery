import { createClient } from '@/utils/supabase/server'

export async function getWishlistCount(): Promise<number> {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('get_wishlist_count')
        if (error) {
            console.warn('[wishlist] get_wishlist_count failed', error)
            return 0
        }
        return Number(data ?? 0)
    } catch (e) {
        console.warn('[wishlist] count fetch threw', e)
        return 0
    }
}
