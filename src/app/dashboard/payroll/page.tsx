import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/auth'
import PayrollReport from '@/components/reports/PayrollReport'

export default async function PayrollPage() {
  const { user, profile } = await getAuthProfile()
  if (!user || !profile || profile.role !== 'admin') redirect('/dashboard')

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[18px] font-bold text-text-primary mb-6">Payroll Report</h1>
      <p className="text-[13px] text-text-secondary mb-4">View and export payroll data by employee</p>
      <PayrollReport orgId={profile.org_id} />
    </div>
  )
}
