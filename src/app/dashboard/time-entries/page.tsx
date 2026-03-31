import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import TimeEntryEditor from '@/components/admin/TimeEntryEditor';

export default async function TimeEntriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  const { data: employees } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('org_id', profile.org_id)
    .order('first_name', { ascending: true });

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, job_number')
    .eq('org_id', profile.org_id)
    .order('job_number', { ascending: true });

  return (
    <div>
      <div className="bg-surface border-b border-border-light px-4 sm:px-6 py-2">
        <div className="max-w-[1200px] mx-auto flex gap-4 overflow-x-auto">
          <Link href="/dashboard" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Time Clock</Link>
          <Link href="/dashboard/employees" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Employees</Link>
          <Link href="/dashboard/jobs" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Jobs</Link>
          <Link href="/dashboard/reports" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Job Cost Report</Link>
          <Link href="/dashboard/payroll" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Payroll</Link>
          <Link href="/dashboard/time-entries" className="text-[13px] font-medium text-accent border-b-2 border-accent pb-1 whitespace-nowrap">Time Entries</Link>
          <Link href="/dashboard/manager" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">Live View</Link>
          <Link href="/dashboard/quickbooks" className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1 whitespace-nowrap">QuickBooks</Link>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-[18px] font-bold text-text-primary mb-6">Time Entries</h1>
        <p className="text-[13px] text-text-secondary mb-4">View and manage employee time entries</p>
        <TimeEntryEditor orgId={profile.org_id} userId={profile.id} employees={employees || []} jobs={jobs || []} />
      </div>
    </div>
  );
}
