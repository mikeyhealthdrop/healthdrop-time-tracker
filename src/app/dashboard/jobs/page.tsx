import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/auth'
import JobManagement from '@/components/admin/JobManagement'

export default async function JobsPage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile || profile.role !== 'admin') redirect('/dashboard')

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[18px] font-bold text-text-primary mb-6">Job Management</h1>
      <JobManagement orgId={profile.org_id} userId={profile.id} />
    </div>
  )
}
