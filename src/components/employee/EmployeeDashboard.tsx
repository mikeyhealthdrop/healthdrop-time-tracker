'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clockIn, clockOut, switchJob, startLunch, endLunch } from '@/app/actions/time-entries'
import { ClockDisplay } from './ClockDisplay'
import { TimerSection } from './TimerSection'
import { TodayLog } from './TodayLog'
import { PayPeriodHours } from './PayPeriodHours'
import type { Job, TimeEntry } from '@/lib/types'

interface EmployeeDashboardProps {
  userId: string
  orgId: string
  firstName: string
  role: string
}

export function EmployeeDashboard({ userId, orgId, firstName, role }: EmployeeDashboardProps) {
  const [activeJobs, setActiveJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [activeEntry, setActiveEntry] = useState<(TimeEntry & { job?: { job_number: string } }) | null>(null)
  const [todayEntries, setTodayEntries] = useState<(TimeEntry & { job?: { job_number: string } })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showJobSwitch, setShowJobSwitch] = useState(false)
  const [switchJobId, setSwitchJobId] = useState('')

  // Use ref for stable reference — createClient() returns a singleton but
  // calling it in render body creates a new reference each time
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const isClockedIn = !!activeEntry
  const isOnLunch = activeEntry?.entry_type === 'lunch'

  const loadData = useCallback(async () => {
    // Load active jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('job_number', { ascending: false })

    if (jobs) setActiveJobs(jobs)

    // Load active entry
    const { data: active } = await supabase
      .from('time_entries')
      .select('*, job:jobs(job_number)')
      .eq('user_id', userId)
      .is('clock_out', null)
      .maybeSingle()

    setActiveEntry(active)

    // Load today's entries
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { data: entries } = await supabase
      .from('time_entries')
      .select('*, job:jobs(job_number)')
      .eq('user_id', userId)
      .gte('clock_in', startOfDay.toISOString())
      .order('clock_in', { ascending: true })

    if (entries) setTodayEntries(entries)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('time-entries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loadData])

  async function handleClockIn() {
    if (!selectedJobId) {
      setError('Please select a job first')
      return
    }
    setError('')
    setLoading(true)

    const result = await clockIn(userId, orgId, selectedJobId)
    if (result.error) {
      setError(result.error)
    } else {
      setSelectedJobId('')
    }

    await loadData()
    setLoading(false)
  }

  async function handleClockOut() {
    setError('')
    setLoading(true)
    const result = await clockOut(userId)
    if (result.error) setError(result.error)
    await loadData()
    setLoading(false)
  }

  async function handleSwitchJob() {
    if (!switchJobId) {
      setError('Please select a job to switch to')
      return
    }
    setError('')
    setLoading(true)
    const result = await switchJob(userId, orgId, switchJobId)
    if (result.error) {
      setError(result.error)
    } else {
      setShowJobSwitch(false)
      setSwitchJobId('')
    }
    await loadData()
    setLoading(false)
  }

  async function handleStartLunch() {
    setError('')
    setLoading(true)
    const result = await startLunch(userId, orgId)
    if (result.error) setError(result.error)
    await loadData()
    setLoading(false)
  }

  async function handleEndLunch() {
    setError('')
    setLoading(true)
    const result = await endLunch(userId, orgId)
    if (result.error) setError(result.error)
    await loadData()
    setLoading(false)
  }

  return (
    <div className="max-w-[420px] mx-auto px-4 pt-5 pb-8">
      {/* Greeting */}
      <div className="text-[13px] text-text-secondary mb-4">
        {getGreeting()}, {firstName}
      </div>

      {/* Main Clock Card */}
      <div className="bg-surface border border-border rounded-[10px] p-5 shadow-sm mb-4">
        <ClockDisplay isClockedIn={isClockedIn} isOnLunch={isOnLunch} />

        {!isClockedIn ? (
          /* === CLOCKED OUT STATE === */
          <div>
            <div className="mt-5">
              <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
                Select Job
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-sm text-[15px] text-text-primary bg-surface cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236b6960' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 16px center',
                }}
              >
                <option value="">— Choose a job —</option>
                {activeJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.job_number}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleClockIn}
              disabled={loading || !selectedJobId}
              className="w-full mt-5 py-4 bg-green hover:bg-[#15803d] text-white font-semibold text-[16px] rounded-[10px] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>&#9654;</span> Clock In
            </button>
          </div>
        ) : (
          /* === CLOCKED IN STATE === */
          <div>
            <TimerSection
              activeEntry={activeEntry!}
              isOnLunch={isOnLunch}
            />

            {/* Action Buttons */}
            <div className="mt-3 flex gap-2 justify-center">
              {!isOnLunch ? (
                <>
                  <button
                    onClick={() => {
                      setShowJobSwitch(!showJobSwitch)
                      setSwitchJobId('')
                    }}
                    className="px-4 py-2 bg-white border border-green-bg rounded-sm text-[13px] font-medium text-green cursor-pointer hover:bg-green-light transition-colors"
                  >
                    &#8644; Switch Job
                  </button>
                  <button
                    onClick={handleStartLunch}
                    disabled={loading}
                    className="px-4 py-2 bg-white border border-[#fed7aa] rounded-sm text-[13px] font-medium text-orange cursor-pointer hover:bg-orange-light transition-colors disabled:opacity-50"
                  >
                    &#9749; Lunch Break
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEndLunch}
                  disabled={loading}
                  className="px-4 py-2 bg-green text-white rounded-sm text-[13px] font-medium cursor-pointer hover:bg-[#15803d] transition-colors disabled:opacity-50"
                >
                  &#9654; End Lunch
                </button>
              )}
            </div>

            {/* Switch Job Dropdown */}
            {showJobSwitch && (
              <div className="mt-3 p-3 bg-surface-alt border border-border-light rounded-sm">
                <select
                  value={switchJobId}
                  onChange={(e) => setSwitchJobId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-sm text-[14px] text-text-primary bg-surface mb-2"
                >
                  <option value="">— Select new job —</option>
                  {activeJobs
                    .filter((j) => j.id !== activeEntry?.job_id)
                    .map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.job_number}
                      </option>
                    ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleSwitchJob}
                    disabled={loading || !switchJobId}
                    className="flex-1 py-2 bg-accent text-white rounded-sm text-[13px] font-medium disabled:opacity-50 hover:bg-accent-hover transition-colors"
                  >
                    Confirm Switch
                  </button>
                  <button
                    onClick={() => setShowJobSwitch(false)}
                    className="px-4 py-2 border border-border rounded-sm text-[13px] text-text-secondary hover:bg-surface-alt transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Clock Out Button */}
            <button
              onClick={handleClockOut}
              disabled={loading}
              className="w-full mt-5 py-4 bg-red hover:bg-[#b91c1c] text-white font-semibold text-[16px] rounded-[10px] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              &#9632; Clock Out
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-3 text-red text-[13px] p-2 bg-red-light rounded-sm text-center">
            {error}
          </div>
        )}
      </div>

      {/* Today's Log */}
      {todayEntries.length > 0 && (
        <TodayLog entries={todayEntries} />
      )}

      {/* Pay Period Hours */}
      <PayPeriodHours userId={userId} />
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
