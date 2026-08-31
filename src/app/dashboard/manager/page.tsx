import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/auth'
import LiveDashboard from '@/components/manager/LiveDashboard'

export default async function ManagerPage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'manager') redirect('/dashboard')

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[18px] font-bold text-text-primary mb-6">Live View</h1>
      <LiveDashboard orgId={profile.org_id} />
    </div>
  )
}
