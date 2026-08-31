import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { EmployeeDashboard } from '@/components/employee/EmployeeDashboard'

export default async function DashboardPage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) redirect('/login')

  // Prefetch data server-side to avoid client-side loading delay
  const supabase = await createClient()

  const [jobsResult, activeResult, todayResult] = await Promise.all([
    supabase
      .from('jobs')
      .select('*')
      .eq('org_id', profile.org_id)
      .eq('is_active', true)
      .order('job_number', { ascending: false }),
    supabase
      .from('time_entries')
      .select('*, job:jobs(job_number)')
      .eq('user_id', profile.id)
      .is('clock_out', null)
      .maybeSingle(),
    (() => {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      return supabase
        .from('time_entries')
        .select('*, job:jobs(job_number)')
        .eq('user_id', profile.id)
        .gte('clock_in', startOfDay.toISOString())
        .order('clock_in', { ascending: true })
    })(),
  ])

  return (
    <EmployeeDashboard
      userId={profile.id}
      orgId={profile.org_id}
      firstName={profile.first_name}
      role={profile.role}
      initialJobs={jobsResult.data || []}
      initialActiveEntry={activeResult.data || null}
      initialTodayEntries={todayResult.data || []}
    />
  )
}
