import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/TopBar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*, organization:organizations(name)')
    .eq('auth_id', user.id)
    .single()

  if (!profile) {
    // User exists in auth but not in our users table - shouldn't happen
    // but handle gracefully
    redirect('/login')
  }

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f0' }}>
      <TopBar
        userName={`${profile.first_name} ${profile.last_name}`}
        role={profile.role}
        orgName={profile.organization?.name || 'Healthdrop'}
      />
      <main>
        {children}
      </main>
    </div>
  )
}
