import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  // PKCE flow - code is in query params (server-side exchange)
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
      const redirectPath = type === 'recovery' ? '/auth/update-password' : '/dashboard'
      const response = NextResponse.redirect(`${origin}${redirectPath}`)

      // Copy session cookies to the redirect response
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })

      return response
    }
  }

  // Implicit flow - tokens are in the URL hash fragment (not visible server-side)
  // Return an HTML page that reads the hash and determines the correct destination
  // IMPORTANT: We must parse 'type' from the hash fragment on the CLIENT side
  // because the server cannot see hash fragments. For invite/recovery flows,
  // the type will be in the hash (e.g. #access_token=...&type=invite)

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Redirecting...</title></head>
<body>
<noscript>Redirecting... Please enable JavaScript.</noscript>
<script>
  // Parse the hash fragment to determine the correct redirect
  var hash = window.location.hash.substring(1);
  var params = new URLSearchParams(hash);
  var type = params.get('type');
  // For invite or recovery flows, go to password setup page
  var redirectPath = (type === 'recovery' || type === 'invite') ? '/auth/update-password' : '/dashboard';
  window.location.replace(redirectPath + window.location.hash);
</script>
</body></html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
