import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmployeeDashboard } from '@/components/employee/EmployeeDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <EmployeeDashboard
      userId={profile.id}
      orgId={profile.org_id}
      firstName={profile.first_name}
      role={profile.role}
    />
  )
}
