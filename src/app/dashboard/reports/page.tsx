import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { JobCostReport } from '@/components/reports/JobCostReport'

export default async function ReportsPage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile || profile.role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('job_number', { ascending: false })

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[18px] font-bold text-text-primary mb-6">Job Cost Report</h1>
      <JobCostReport orgId={profile.org_id} jobs={jobs || []} />
    </div>
  )
}
