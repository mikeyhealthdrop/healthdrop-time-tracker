import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmployeeDashboard } from '@/components/employee/EmployeeDashboard'
import Link from 'next/link'

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
    <div>
      {/* Admin nav bar */}
      {profile.role === 'admin' && (
        <div className="bg-surface border-b border-border-light px-4 sm:px-6 py-2">
          <div className="max-w-[1200px] mx-auto flex gap-4 overflow-x-auto">
            <Link href="/dashboard" className="text-[13px] font-medium text-accent border-b-2 border-accent pb-1 whitespace-nowrap">Time Clock</Link>
            <Link href="/dashboard/employees" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Employees</Link>
            <Link href="/dashboard/jobs" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Jobs</Link>
            <Link href="/dashboard/reports" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Job Cost Report</Link>
            <Link href="/dashboard/payroll" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Payroll</Link>
            <Link href="/dashboard/time-entries" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Time Entries</Link>
            <Link href="/dashboard/manager" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Live View</Link>
            <Link href="/dashboard/quickbooks" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">QuickBooks</Link>
          </div>
        </div>
      )}

      {/* Manager nav bar */}
      {profile.role === 'manager' && (
        <div className="bg-surface border-b border-border-light px-4 sm:px-6 py-2">
          <div className="max-w-[1200px] mx-auto flex gap-4">
            <Link href="/dashboard" className="text-[13px] font-medium text-accent border-b-2 border-accent pb-1">Time Clock</Link>
            <Link href="/dashboard/manager" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1">Live View</Link>
          </div>
        </div>
      )}

      <EmployeeDashboard
        userId={profile.id}
        orgId={profile.org_id}
        firstName={profile.first_name}
        role={profile.role}
      />
    </div>
  )
}
