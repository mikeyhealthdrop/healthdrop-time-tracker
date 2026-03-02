'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-20 px-5" style={{ background: '#f5f5f0' }}>
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
            H
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Healthdrop Time Tracker
          </div>
        </div>

        <div className="bg-surface border border-border rounded-[10px] p-8 shadow-md">
          <h1 className="text-xl font-bold text-center mb-1">Set New Password</h1>
          <p className="text-[13px] text-text-secondary text-center mb-6">
            Enter your new password below
          </p>

          <form onSubmit={handleUpdate}>
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-text-primary mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px] text-text-primary bg-surface focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-light transition-colors"
              />
            </div>

            <div className="mb-4">
              <label className="block text-[13px] font-medium text-text-primary mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px] text-text-primary bg-surface focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-light transition-colors"
              />
            </div>

            {error && (
              <div className="text-red text-[13px] mb-3 p-2 bg-red-light rounded-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-accent hover:bg-accent-hover text-white font-semibold text-[16px] rounded-[10px] transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
