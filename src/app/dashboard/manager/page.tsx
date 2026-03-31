import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LiveDashboard from '@/components/manager/LiveDashboard';

export default async function ManagerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (!profile) redirect('/login');

  const isAdmin = profile.role === 'admin';
  const isManager = profile.role === 'manager';
  if (!isAdmin && !isManager) redirect('/dashboard');

  return (
    <div>
      {isAdmin ? (
        <div className="bg-surface border-b border-border-light px-4 sm:px-6 py-2">
          <div className="max-w-[1200px] mx-auto flex gap-4 overflow-x-auto">
            <Link href="/dashboard" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Time Clock</Link>
            <Link href="/dashboard/employees" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Employees</Link>
            <Link href="/dashboard/jobs" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Jobs</Link>
            <Link href="/dashboard/reports" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Job Cost Report</Link>
            <Link href="/dashboard/payroll" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Payroll</Link>
            <Link href="/dashboard/time-entries" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Time Entries</Link>
            <Link href="/dashboard/manager" className="text-[13px] font-medium text-accent border-b-2 border-accent pb-1 whitespace-nowrap">Live View</Link>
            <Link href="/dashboard/quickbooks" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">QuickBooks</Link>
          </div>
        </div>
      ) : (
        <div className="bg-surface border-b border-border-light px-4 sm:px-6 py-2">
          <div className="max-w-[1200px] mx-auto flex gap-4">
            <Link href="/dashboard" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1">Time Clock</Link>
            <Link href="/dashboard/manager" className="text-[13px] font-medium text-accent border-b-2 border-accent pb-1">Live View</Link>
          </div>
        </div>
      )}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-[18px] font-bold text-text-primary mb-6">Live View</h1>
        <LiveDashboard orgId={profile.org_id} />
      </div>
    </div>
  );
}
