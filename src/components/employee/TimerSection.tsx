'use client'

import { useState, useEffect } from 'react'
import { formatTimer } from '@/lib/utils'
import type { TimeEntry } from '@/lib/types'

interface TimerSectionProps {
  activeEntry: TimeEntry & { job?: { job_number: string } }
  isOnLunch: boolean
}

export function TimerSection({ activeEntry, isOnLunch }: TimerSectionProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    function updateElapsed() {
      const start = new Date(activeEntry.clock_in).getTime()
      const now = Date.now()
      setElapsed(Math.max(0, Math.floor((now - start) / 1000)))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [activeEntry.clock_in])

  if (isOnLunch) {
    return (
      <div className="text-center mt-6 p-5 bg-orange-light rounded-[10px] border border-[#fed7aa]">
        <div className="text-[12px] font-medium text-orange uppercase tracking-wide">
          Lunch Break
        </div>
        <div className="text-[36px] font-bold text-orange tabular-nums mt-1">
          {formatTimer(elapsed)}
        </div>
        <div className="text-[14px] text-text-secondary mt-1">
          Tap &quot;End Lunch&quot; to resume work
        </div>
      </div>
    )
  }

  return (
    <div className="text-center mt-6 p-5 bg-green-light rounded-[10px] border border-green-bg">
      <div className="text-[12px] font-medium text-green uppercase tracking-wide">
        Current Job Timer
      </div>
      <div className="text-[36px] font-bold text-green tabular-nums mt-1">
        {formatTimer(elapsed)}
      </div>
      <div className="text-[14px] text-text-secondary mt-1">
        {activeEntry.job?.job_number || 'No job selected'}
      </div>
    </div>
  )
}
