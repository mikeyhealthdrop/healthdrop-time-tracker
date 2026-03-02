import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // If it's a password recovery, redirect to the update password page
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/auth/update-password`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
