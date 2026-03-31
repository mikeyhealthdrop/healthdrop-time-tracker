import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/qbo'

/**
 * GET /api/qbo/callback
 * OAuth2 callback from QuickBooks.
 * Exchanges the auth code for tokens and stores them.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const realmId = url.searchParams.get('realmId')
  const error = url.searchParams.get('error')

  // Handle user cancellation or errors
  if (error) {
    return NextResponse.redirect(
      new URL('/dashboard/quickbooks?error=connection_denied', request.url)
    )
  }

  if (!code || !state || !realmId) {
    return NextResponse.redirect(
      new URL('/dashboard/quickbooks?error=missing_params', request.url)
    )
  }

  // Extract org_id from state
  const orgId = state.split(':')[0]
  if (!orgId) {
    return NextResponse.redirect(
      new URL('/dashboard/quickbooks?error=invalid_state', request.url)
    )
  }

  // Verify the user is authenticated and is admin of this org
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, org_id')
    .eq('auth_id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || profile.org_id !== orgId) {
    return NextResponse.redirect(
      new URL('/dashboard/quickbooks?error=unauthorized', request.url)
    )
  }

  try {
    // Exchange auth code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Use service client to bypass RLS for upsert
    const { createServiceClient } = await import('@/lib/supabase/server')
    const serviceClient = await createServiceClient()

    // Store/update the connection
    const { error: upsertError } = await serviceClient
      .from('qbo_connections')
      .upsert(
        {
          org_id: orgId,
          realm_id: realmId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id' }
      )

    if (upsertError) {
      console.error('Failed to store QBO tokens:', upsertError)
      return NextResponse.redirect(
        new URL('/dashboard/quickbooks?error=storage_failed', request.url)
      )
    }

    // Redirect back to QuickBooks page with success
    return NextResponse.redirect(
      new URL('/dashboard/quickbooks?connected=true', request.url)
    )
  } catch (err: any) {
    console.error('QBO callback error:', err)
    return NextResponse.redirect(
      new URL('/dashboard/quickbooks?error=token_exchange_failed', request.url)
    )
  }
}
