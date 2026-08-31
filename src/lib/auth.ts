import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Cached auth + profile fetch.
 * React.cache() deduplicates within a single server render,
 * so layout.tsx and page.tsx share one round-trip instead of two.
 */
export const getAuthProfile = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }

  const { data: profile } = await supabase
    .from('users')
    .select('*, organization:organizations(name)')
    .eq('auth_id', user.id)
    .single()

  return { user, profile }
})
