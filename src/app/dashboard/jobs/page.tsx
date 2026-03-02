import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import JobManagement from '@/components/admin/JobManagement';

export default async function JobsPage() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/login');
  }

  if (profile.role !== 'admin') {
    redirect('/dashboard');
  }

  const orgId = profile.org_id;

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
            className="text-[13px] font-medium text-accent border-b-2 border-accent pb-1"
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
            className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1"
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

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        <JobManagement orgId={orgId} userId={user.id} />
      </div>
    </div>
  );
}
