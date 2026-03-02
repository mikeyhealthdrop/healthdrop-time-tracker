import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PayrollReport from '@/components/reports/PayrollReport';

export default async function PayrollPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, user_id')
    .eq('user_id', user.id)
    .single();

  if (!org || org.user_id !== user.id) {
    redirect('/dashboard');
  }

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
            Job Cost Report
          </Link>
          <Link
            href="/dashboard/payroll"
            className="text-[13px] font-medium text-accent border-b-2 border-accent pb-1"
          >
            Payroll
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

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Payroll Report</h1>
          <p className="text-[13px] text-text-secondary mt-1">View and export payroll data by employee</p>
        </div>
        <PayrollReport orgId={org.id} />
      </main>
    </div>
  );
}
