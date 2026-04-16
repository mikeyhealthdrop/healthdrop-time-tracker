import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/TopBar'
import Link from 'next/link'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*, organization:organizations(name)')
    .eq('auth_id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const adminLinks = [
    { href: '/dashboard', label: 'Time Clock' },
    { href: '/dashboard/employees', label: 'Employees' },
    { href: '/dashboard/jobs', label: 'Jobs' },
    { href: '/dashboard/reports', label: 'Job Cost Report' },
    { href: '/dashboard/payroll', label: 'Payroll' },
    { href: '/dashboard/time-entries', label: 'Time Entries' },
    { href: '/dashboard/manager', label: 'Live View' },
    { href: '/dashboard/quickbooks', label: 'QuickBooks' },
  ]

  const managerLinks = [
    { href: '/dashboard', label: 'Time Clock' },
    { href: '/dashboard/jobs', label: 'Jobs' },
    { href: '/dashboard/reports', label: 'Job Cost Report' },
    { href: '/dashboard/manager', label: 'Live View' },
  ]

  const navLinks = profile.role === 'admin' ? adminLinks : profile.role === 'manager' ? managerLinks : []

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f0' }}>
      <TopBar
        userName={`${profile.first_name} ${profile.last_name}`}
        role={profile.role}
        orgName={profile.organization?.name || 'Healthdrop'}
      />
      {navLinks.length > 0 && (
        <nav className="bg-white border-b px-6 py-2 flex gap-4 flex-wrap">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
      <main>
        {children}
      </main>
    </div>
  )
}
