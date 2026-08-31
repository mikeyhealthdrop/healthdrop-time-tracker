import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import TimeEntryEditor from '@/components/admin/TimeEntryEditor'

export default async function TimeEntriesPage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'manager') redirect('/dashboard')

  const supabase = await createClient()
  const [employeesResult, jobsResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('org_id', profile.org_id)
      .eq('is_active', true)
      .order('first_name', { ascending: true }),
    supabase
      .from('jobs')
      .select('id, job_number')
      .eq('org_id', profile.org_id)
      .order('job_number', { ascending: true }),
  ])

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[18px] font-bold text-text-primary mb-6">Time Entries</h1>
      <p className="text-[13px] text-text-secondary mb-4">View and manage employee time entries</p>
      <TimeEntryEditor
        orgId={profile.org_id}
        userId={profile.id}
        employees={employeesResult.data || []}
        jobs={jobsResult.data || []}
      />
    </div>
  )
}
