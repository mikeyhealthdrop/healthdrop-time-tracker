import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    const cookiesToSet: Array<{ name: string; value: string; options?: any }> = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookies) {
            cookies.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            cookiesToSet.push(...cookies)
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Determine redirect destination
      const redirectPath = type === 'recovery' ? '/auth/update-password' : '/dashboard'
      const response = NextResponse.redirect(`${origin}${redirectPath}`)

      // Copy session cookies to the redirect response
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })

      return response
    }
  }

  // If it's a password recovery without a code (or code exchange failed), still redirect
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/auth/update-password`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
