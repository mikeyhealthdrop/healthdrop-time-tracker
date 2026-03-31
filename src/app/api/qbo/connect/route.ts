import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizationUrl } from '@/lib/qbo'
import { randomBytes } from 'crypto'

/**
 * GET /api/qbo/connect
 * Initiates the QuickBooks OAuth2 flow.
 * Only admins can connect QBO.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role, org_id')
    .eq('auth_id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Generate a state parameter that includes the org_id for the callback
  const stateToken = randomBytes(16).toString('hex')
  const state = `${profile.org_id}:${stateToken}`

  const authUrl = getAuthorizationUrl(state)
  return NextResponse.redirect(authUrl)
}
