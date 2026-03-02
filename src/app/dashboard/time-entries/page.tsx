import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import TimeEntryEditor from '@/components/admin/TimeEntryEditor';

export const metadata = {
  title: 'Time Entries - Healthdrop Time Tracker',
};

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface Job {
  id: string;
  job_number: string;
}

export default async function TimeEntriesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: orgUser } = await supabase
    .from('org_users')
    .select('role, organization_id')
    .eq('user_id', user.id)
    .single();

  if (!orgUser) {
    redirect('/dashboard');
  }

  if (orgUser.role !== 'admin') {
    redirect('/dashboard');
  }

  const orgId = orgUser.organization_id;

  const { data: employees } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('organization_id', orgId)
    .order('first_name', { ascending: true });

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, job_number')
    .eq('organization_id', orgId)
    .order('job_number', { ascending: true });

  const employeeList: Employee[] = employees || [];
  const jobList: Job[] = jobs || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-surface border-b border-border-light px-4 sm:px-6 py-2">
        <div className="max-w-[1200px] mx-auto flex gap-4">
          <Link
            href="/dashboard"
            className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1"
          >
            Time Clock
          </Link>
          <Link
            href="/dashboard/employees"
            className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1"
          >
            Employees
          </Link>
          <Link
            href="/dashboard/jobs"
            className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1"
          >
            Jobs
          </Link>
          <Link
            href="/dashboard/reports"
            className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1"
          >
            Reports
          </Link>
          <Link
            href="/dashboard/time-entries"
            className="text-[13px] font-medium text-accent border-b-2 border-accent pb-1"
          >
            Time Entries
          </Link>
          <Link
            href="/dashboard/manager"
            className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1"
          >
            Live View
          </Link>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Time Entries</h1>
            <p className="text-[13px] text-text-secondary mt-1">
              View and manage employee time entries
            </p>
          </div>

          <TimeEntryEditor
            orgId={orgId}
            userId={user.id}
            employees={employeeList}
            jobs={jobList}
          />
        </div>
      </div>
    </div>
  );
}
