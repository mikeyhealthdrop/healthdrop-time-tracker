'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDuration } from '@/lib/utils'

interface PayPeriodHoursProps {
  userId: string
}

export function PayPeriodHours({ userId }: PayPeriodHoursProps) {
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [workedMinutes, setWorkedMinutes] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  useEffect(() => {
    async function loadPayPeriod() {
      // Get current pay period (bi-weekly, starting from a known date)
      // For simplicity, use current week (Mon-Sun)
      const now = new Date()
      const dayOfWeek = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
      monday.setHours(0, 0, 0, 0)

      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)

      const { data: entries } = await supabase
        .from('time_entries')
        .select('clock_in, clock_out, entry_type')
        .eq('user_id', userId)
        .gte('clock_in', monday.toISOString())
        .lte('clock_in', sunday.toISOString())

      if (entries) {
        let total = 0
        let lunch = 0
        entries.forEach((entry) => {
          const start = new Date(entry.clock_in).getTime()
          const end = entry.clock_out ? new Date(entry.clock_out).getTime() : Date.now()
          const mins = (end - start) / 1000 / 60
          total += mins
          if (entry.entry_type === 'lunch') lunch += mins
        })
        setTotalMinutes(total)
        setWorkedMinutes(total - lunch)
      }
      setLoading(false)
    }

    loadPayPeriod()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (loading) return null

  return (
    <div className="bg-surface border border-border rounded-[10px] p-5 shadow-sm">
      <div className="text-[14px] font-semibold text-text-primary mb-3">
        This Week
      </div>
      <div className="flex justify-between items-center py-2">
        <span className="text-[13px] text-text-secondary">Total Hours</span>
        <span className="text-[13px] font-medium text-text-primary tabular-nums">
          {formatDuration(totalMinutes)}
        </span>
      </div>
      <div className="flex justify-between items-center py-2">
        <span className="text-[13px] text-text-secondary">Worked (excl. lunch)</span>
        <span className="text-[13px] font-medium text-text-primary tabular-nums">
          {formatDuration(workedMinutes)}
        </span>
      </div>
    </div>
  )
}
