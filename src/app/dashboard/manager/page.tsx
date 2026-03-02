import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LiveDashboard from '@/components/manager/LiveDashboard';

export default async function ManagerDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single();

  if (!userProfile) {
    redirect('/login');
  }

  const isAdmin = userProfile.role === 'admin';
  const isManager = userProfile.role === 'manager';

  if (!isAdmin && !isManager) {
    redirect('/dashboard');
  }

  const orgId = userProfile.organization_id;

  return (
    <div className="min-h-screen bg-background">
      {isAdmin ? (
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
              className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1"
            >
              Time Entries
            </Link>
            <Link
              href="/dashboard/manager"
              className="text-[13px] font-medium text-accent border-b-2 border-accent pb-1"
            >
              Live View
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-surface border-b border-border-light px-4 sm:px-6 py-2">
          <div className="max-w-[1200px] mx-auto flex gap-4">
            <Link
              href="/dashboard"
              className="text-[13px] font-medium text-text-secondary hover:text-text-primary pb-1"
            >
              Time Clock
            </Link>
            <Link
              href="/dashboard/manager"
              className="text-[13px] font-medium text-accent border-b-2 border-accent pb-1"
            >
              Live View
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Live View</h1>
        <LiveDashboard orgId={orgId} />
      </div>
    </div>
  );
}
