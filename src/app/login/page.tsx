'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setResetSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-20 px-5" style={{ background: '#f5f5f0' }}>
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
            H
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Healthdrop Time Tracker
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-surface border border-border rounded-[10px] p-8 shadow-md">
          {!showReset ? (
            <>
              <h1 className="text-xl font-bold text-center mb-1">Sign In</h1>
              <p className="text-[13px] text-text-secondary text-center mb-6">
                Use your Healthdrop email
              </p>

              <form onSubmit={handleLogin}>
                <div className="mb-4">
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@healthdrop.com"
                    required
                    className="w-full px-3.5 py-2.5 border border-border rounded-sm text-[14px] text-text-primary bg-surface focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-light transition-colors"
                  />
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[13px] font-medium text-text-primary">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowReset(true)}
                      className="text-[12px] text-accent hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-center mb-1">Reset Password</h1>
              <p className="text-[13px] text-text-secondary text-center mb-6">
                Enter your email and we&apos;ll send a reset link
              </p>

              {resetSent ? (
                <div className="text-center">
                  <div className="text-green text-[14px] mb-4 p-3 bg-green-light rounded-sm">
                    Check your email for a password reset link.
                  </div>
                  <button
                    onClick={() => { setShowReset(false); setResetSent(false) }}
                    className="text-[13px] text-accent hover:underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword}>
                  <div className="mb-4">
                    <label className="block text-[13px] font-medium text-text-primary mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@healthdrop.com"
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
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>

                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => setShowReset(false)}
                      className="text-[13px] text-accent hover:underline"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
